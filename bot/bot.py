"""Bot Telegram LabMedis — assistant conversationnel Claude + MCP.

Reçoit les messages Telegram, contrôle l'accès via whitelist chat_id,
appelle l'API Anthropic avec les outils exposés par le serveur MCP interne
(http://mcp:8080/), boucle sur les tool_use jusqu'à obtenir une réponse texte.
"""

from __future__ import annotations

import asyncio
import logging
import os
from typing import Any

from anthropic import AsyncAnthropic
from mcp import ClientSession
from mcp.client.streamable_http import streamable_http_client
from telegram import Update
from telegram.constants import ChatAction
from telegram.ext import (
    Application,
    CommandHandler,
    ContextTypes,
    MessageHandler,
    filters,
)

# ── Config ────────────────────────────────────────────────────────────────────

logging.basicConfig(
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger("labmedis-bot")

TELEGRAM_BOT_TOKEN = os.environ["TELEGRAM_BOT_TOKEN"]
ANTHROPIC_API_KEY = os.environ["ANTHROPIC_API_KEY"]
ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-5")
MCP_URL = os.getenv("MCP_URL", "http://mcp:8080/")
MAX_HISTORY_MESSAGES = int(os.getenv("MAX_HISTORY_MESSAGES", "20"))
MAX_TOKENS = int(os.getenv("MAX_TOKENS", "2048"))
MAX_TOOL_ITERATIONS = 8  # garde-fou anti-boucle infinie

ALLOWED_CHAT_IDS: set[int] = {
    int(x.strip())
    for x in os.getenv("ALLOWED_TELEGRAM_CHAT_IDS", "").split(",")
    if x.strip()
}

SYSTEM_PROMPT = """Tu es l'assistant LabMedis, société grossiste dépositaire pharmaceutique basée à Lomé (Togo).
Tu réponds aux questions du personnel sur : produits, stock, lots, dates de péremption, fournisseurs, clients, commandes clients et fournisseurs, factures, livraisons, mouvements d'inventaire, KPIs business.

Tu disposes d'outils MCP en lecture seule pour interroger la base de données. Appelle-les dès que la question porte sur des données réelles ; n'invente rien.

Règles de style pour tes réponses :
- Réponds toujours en français.
- Sois concis et opérationnel — l'utilisateur est sur Telegram.
- Formate les chiffres XOF avec des espaces (ex : 1 250 000 XOF).
- Dates au format JJ/MM/AAAA.
- Utilise des listes à puces quand tu retournes plusieurs éléments.
- Si un outil ne retourne rien, dis-le clairement au lieu d'inventer.
- Si la question est ambiguë (ex : "les commandes de Toto" et plusieurs clients contiennent "Toto"), demande une précision.
"""

# Historique conversationnel par chat (en mémoire, RAZ au redémarrage du bot).
history: dict[int, list[dict[str, Any]]] = {}

# Cache statique des tools MCP (récupéré au démarrage).
mcp_tools_cache: list[dict[str, Any]] = []


# ── Helpers MCP ───────────────────────────────────────────────────────────────


def _is_authorized(chat_id: int) -> bool:
    return not ALLOWED_CHAT_IDS or chat_id in ALLOWED_CHAT_IDS


def _tool_result_to_text(content: Any) -> str:
    """Concatène les blocs de contenu (TextContent, ImageContent...) en une string."""
    if content is None:
        return ""
    if isinstance(content, str):
        return content
    parts: list[str] = []
    for block in content:
        text = getattr(block, "text", None)
        if text:
            parts.append(text)
    return "\n".join(parts)


async def _fetch_mcp_tools() -> list[dict[str, Any]]:
    """Récupère la liste des tools MCP (nom, description, input_schema) au format Anthropic."""
    async with streamable_http_client(MCP_URL) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            response = await session.list_tools()
            return [
                {
                    "name": t.name,
                    "description": t.description or "",
                    "input_schema": t.input_schema,
                }
                for t in response.tools
            ]


# ── Boucle Claude + MCP ───────────────────────────────────────────────────────


async def _run_claude_conversation(
    anthropic_client: AsyncAnthropic,
    messages: list[dict[str, Any]],
) -> str:
    """Envoie la conversation à Claude, exécute les tool_use via MCP en boucle, retourne le texte final."""
    async with streamable_http_client(MCP_URL) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()

            for iteration in range(MAX_TOOL_ITERATIONS):
                response = await anthropic_client.messages.create(
                    model=ANTHROPIC_MODEL,
                    max_tokens=MAX_TOKENS,
                    system=SYSTEM_PROMPT,
                    tools=mcp_tools_cache,
                    messages=messages,
                )

                # Ajoute la réponse assistant à l'historique (contenu = liste de blocs).
                messages.append({"role": "assistant", "content": response.content})

                if response.stop_reason != "tool_use":
                    # Fin de la conversation : extraire le texte.
                    text_parts = [b.text for b in response.content if b.type == "text"]
                    return "\n".join(text_parts).strip() or "(pas de réponse texte)"

                # Exécute tous les tool_use blocks
                tool_results: list[dict[str, Any]] = []
                for block in response.content:
                    if block.type != "tool_use":
                        continue
                    tool_name = block.name
                    tool_input = block.input or {}
                    logger.info(
                        "call_tool name=%s args=%s (iter %d)",
                        tool_name, tool_input, iteration,
                    )
                    try:
                        result = await session.call_tool(tool_name, tool_input)
                        result_text = _tool_result_to_text(result.content)
                        tool_results.append({
                            "type": "tool_result",
                            "tool_use_id": block.id,
                            "content": result_text or "(résultat vide)",
                        })
                    except Exception as e:  # noqa: BLE001
                        logger.exception("tool call failed: %s", tool_name)
                        tool_results.append({
                            "type": "tool_result",
                            "tool_use_id": block.id,
                            "content": f"ERREUR côté outil : {e}",
                            "is_error": True,
                        })

                messages.append({"role": "user", "content": tool_results})

            # Boucle trop longue — on renvoie un message d'excuse.
            return "Désolé, la requête dépasse la limite d'itérations. Reformule plus simplement ou utilise /reset."


# ── Handlers Telegram ─────────────────────────────────────────────────────────


async def cmd_start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not update.effective_chat or not update.message:
        return
    chat_id = update.effective_chat.id
    if _is_authorized(chat_id):
        await update.message.reply_text(
            "Bonjour ! Je suis l'assistant LabMedis. Pose-moi tes questions sur les produits, "
            "clients, commandes, stock, livraisons, factures ou KPIs.\n\n"
            f"Ton chat_id : `{chat_id}`\n\n"
            "Commandes : /reset pour effacer l'historique.",
            parse_mode="Markdown",
        )
    else:
        await update.message.reply_text(
            f"Accès refusé.\n\nCommunique ce chat_id à l'admin pour qu'il t'autorise :\n`{chat_id}`",
            parse_mode="Markdown",
        )


async def cmd_reset(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not update.effective_chat or not update.message:
        return
    chat_id = update.effective_chat.id
    if not _is_authorized(chat_id):
        return
    history.pop(chat_id, None)
    await update.message.reply_text("Historique effacé. Nouvelle conversation.")


async def cmd_tools(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Debug : liste les outils MCP disponibles."""
    if not update.effective_chat or not update.message:
        return
    chat_id = update.effective_chat.id
    if not _is_authorized(chat_id):
        return
    lines = [f"• `{t['name']}` — {t['description'][:80]}" for t in mcp_tools_cache]
    text = f"*{len(mcp_tools_cache)} outils MCP disponibles :*\n\n" + "\n".join(lines)
    for chunk in [text[i:i + 4000] for i in range(0, len(text), 4000)]:
        await update.message.reply_text(chunk, parse_mode="Markdown")


async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not update.effective_chat or not update.message or not update.message.text:
        return
    chat_id = update.effective_chat.id
    user_text = update.message.text.strip()

    if not _is_authorized(chat_id):
        await update.message.reply_text(
            f"Accès refusé. chat_id à communiquer à l'admin : `{chat_id}`",
            parse_mode="Markdown",
        )
        logger.warning("unauthorized chat=%s text=%s", chat_id, user_text[:100])
        return

    await context.bot.send_chat_action(chat_id=chat_id, action=ChatAction.TYPING)

    messages = history.setdefault(chat_id, [])
    messages.append({"role": "user", "content": user_text})

    try:
        anthropic_client: AsyncAnthropic = context.application.bot_data["anthropic"]
        final_text = await _run_claude_conversation(anthropic_client, messages)
    except Exception as e:  # noqa: BLE001
        logger.exception("error handling message chat=%s", chat_id)
        # On retire le dernier message user pour éviter d'empoisonner l'historique.
        messages.pop()
        await update.message.reply_text(f"Erreur : {e}")
        return

    # Trim historique.
    if len(messages) > MAX_HISTORY_MESSAGES:
        history[chat_id] = messages[-MAX_HISTORY_MESSAGES:]

    # Split si > 4096 (limite Telegram).
    for chunk in [final_text[i:i + 4000] for i in range(0, len(final_text), 4000)]:
        await update.message.reply_text(chunk)


# ── Bootstrap ─────────────────────────────────────────────────────────────────


async def _post_init(app: Application) -> None:
    """Charge les tools MCP au démarrage + instancie le client Anthropic."""
    logger.info("Fetching MCP tools from %s...", MCP_URL)
    try:
        tools = await _fetch_mcp_tools()
        mcp_tools_cache.extend(tools)
        logger.info("Loaded %d MCP tools", len(tools))
    except Exception as e:  # noqa: BLE001
        logger.exception("Failed to load MCP tools — bot will start but tool calls will fail: %s", e)

    app.bot_data["anthropic"] = AsyncAnthropic(api_key=ANTHROPIC_API_KEY)


def main() -> None:
    app = (
        Application.builder()
        .token(TELEGRAM_BOT_TOKEN)
        .post_init(_post_init)
        .build()
    )
    app.add_handler(CommandHandler("start", cmd_start))
    app.add_handler(CommandHandler("reset", cmd_reset))
    app.add_handler(CommandHandler("tools", cmd_tools))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

    logger.info(
        "Starting bot — model=%s mcp=%s allowed_chat_ids=%s",
        ANTHROPIC_MODEL, MCP_URL,
        sorted(ALLOWED_CHAT_IDS) if ALLOWED_CHAT_IDS else "ALL (public!)",
    )
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
