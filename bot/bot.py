"""Bot Telegram LabMedis — assistant conversationnel OpenAI + MCP.

Reçoit les messages Telegram, contrôle l'accès via whitelist chat_id,
appelle l'API OpenAI avec les outils exposés par le serveur MCP interne
(http://mcp:8080/), boucle sur les tool_calls jusqu'à obtenir une réponse texte.
"""

from __future__ import annotations

import json
import logging
import os
from datetime import date
from typing import Any

from mcp import ClientSession
from mcp.client.streamable_http import streamable_http_client
from openai import AsyncOpenAI
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
OPENAI_API_KEY = os.environ["OPENAI_API_KEY"]
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
MCP_URL = os.getenv("MCP_URL", "http://mcp:8080/")
MAX_HISTORY_MESSAGES = int(os.getenv("MAX_HISTORY_MESSAGES", "20"))
MAX_TOKENS = int(os.getenv("MAX_TOKENS", "2048"))
MAX_TOOL_ITERATIONS = 8  # garde-fou anti-boucle infinie

ALLOWED_CHAT_IDS: set[int] = {
    int(x.strip())
    for x in os.getenv("ALLOWED_TELEGRAM_CHAT_IDS", "").split(",")
    if x.strip()
}

SYSTEM_PROMPT_TEMPLATE = """Tu es l'assistant LabMedis, société grossiste dépositaire pharmaceutique basée à Lomé (Togo).
Tu réponds aux questions du personnel sur : produits, stock, lots, dates de péremption, fournisseurs, clients, commandes clients et fournisseurs, factures, livraisons, mouvements d'inventaire, KPIs business.

Date du jour : {today} (YYYY-MM-DD). Utilise-la pour résoudre toute expression temporelle relative :
- "aujourd'hui" → {today}
- "hier" → date de la veille
- "ce mois" / "ce mois-ci" → du 1er du mois courant à {today}
- "le mois dernier" → du 1er au dernier jour du mois précédent
- "cette année" → du 1er janvier de l'année courante à {today}
Passe systématiquement les dates aux outils au format YYYY-MM-DD.

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


def _system_prompt() -> str:
    return SYSTEM_PROMPT_TEMPLATE.format(today=date.today().isoformat())

# Historique conversationnel par chat (en mémoire, RAZ au redémarrage du bot).
history: dict[int, list[dict[str, Any]]] = {}

# Cache statique des tools MCP (récupéré au démarrage, au format OpenAI).
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
    """Récupère la liste des tools MCP au format OpenAI (type=function)."""
    async with streamable_http_client(MCP_URL) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            response = await session.list_tools()
            return [
                {
                    "type": "function",
                    "function": {
                        "name": t.name,
                        "description": t.description or "",
                        "parameters": t.input_schema or {"type": "object", "properties": {}},
                    },
                }
                for t in response.tools
            ]


# ── Boucle OpenAI + MCP ───────────────────────────────────────────────────────


async def _run_openai_conversation(
    openai_client: AsyncOpenAI,
    messages: list[dict[str, Any]],
) -> str:
    """Envoie la conversation à OpenAI, exécute les tool_calls via MCP en boucle, retourne le texte final."""
    async with streamable_http_client(MCP_URL) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()

            for iteration in range(MAX_TOOL_ITERATIONS):
                api_messages = [{"role": "system", "content": _system_prompt()}] + messages
                response = await openai_client.chat.completions.create(
                    model=OPENAI_MODEL,
                    max_tokens=MAX_TOKENS,
                    tools=mcp_tools_cache or None,
                    messages=api_messages,
                )
                assistant = response.choices[0].message

                # Sérialise le message assistant pour l'historique
                assistant_msg: dict[str, Any] = {
                    "role": "assistant",
                    "content": assistant.content,
                }
                if assistant.tool_calls:
                    assistant_msg["tool_calls"] = [
                        {
                            "id": tc.id,
                            "type": "function",
                            "function": {
                                "name": tc.function.name,
                                "arguments": tc.function.arguments,
                            },
                        }
                        for tc in assistant.tool_calls
                    ]
                messages.append(assistant_msg)

                if not assistant.tool_calls:
                    return (assistant.content or "").strip() or "(pas de réponse texte)"

                # Exécute tous les tool_calls
                for tc in assistant.tool_calls:
                    tool_name = tc.function.name
                    try:
                        tool_input = json.loads(tc.function.arguments or "{}")
                    except json.JSONDecodeError as e:
                        messages.append({
                            "role": "tool",
                            "tool_call_id": tc.id,
                            "content": f"ERREUR : arguments JSON invalides ({e})",
                        })
                        continue

                    logger.info(
                        "call_tool name=%s args=%s (iter %d)",
                        tool_name, tool_input, iteration,
                    )
                    try:
                        result = await session.call_tool(tool_name, tool_input)
                        result_text = _tool_result_to_text(result.content)
                    except Exception as e:  # noqa: BLE001
                        logger.exception("tool call failed: %s", tool_name)
                        result_text = f"ERREUR côté outil : {e}"

                    messages.append({
                        "role": "tool",
                        "tool_call_id": tc.id,
                        "content": result_text or "(résultat vide)",
                    })

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
            f"Ton chat_id : <code>{chat_id}</code>\n\n"
            "Commandes : /reset pour effacer l'historique.",
            parse_mode="HTML",
        )
    else:
        await update.message.reply_text(
            f"Accès refusé.\n\nCommunique ce chat_id à l'admin pour qu'il t'autorise :\n<code>{chat_id}</code>",
            parse_mode="HTML",
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
    lines = [
        f"• <code>{t['function']['name']}</code> — {t['function']['description'][:80]}"
        for t in mcp_tools_cache
    ]
    text = f"<b>{len(mcp_tools_cache)} outils MCP disponibles :</b>\n\n" + "\n".join(lines)
    for chunk in [text[i:i + 4000] for i in range(0, len(text), 4000)]:
        await update.message.reply_text(chunk, parse_mode="HTML")


def _trim_history(chat_id: int) -> None:
    """Trim l'historique en coupant sur une frontière saine (un message user texte).

    OpenAI rejette un historique qui commence par un `tool` orphelin ou un `assistant`
    avec `tool_calls` sans les réponses. On cherche le premier vrai tour utilisateur
    dans la queue.
    """
    msgs = history.get(chat_id, [])
    if len(msgs) <= MAX_HISTORY_MESSAGES:
        return
    cut = len(msgs) - MAX_HISTORY_MESSAGES
    while cut < len(msgs):
        m = msgs[cut]
        if m.get("role") == "user" and isinstance(m.get("content"), str):
            break
        cut += 1
    history[chat_id] = msgs[cut:]


async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not update.effective_chat or not update.message or not update.message.text:
        return
    chat_id = update.effective_chat.id
    user_text = update.message.text.strip()

    if not _is_authorized(chat_id):
        await update.message.reply_text(
            f"Accès refusé. chat_id à communiquer à l'admin : <code>{chat_id}</code>",
            parse_mode="HTML",
        )
        logger.warning("unauthorized chat=%s text=%s", chat_id, user_text[:100])
        return

    await context.bot.send_chat_action(chat_id=chat_id, action=ChatAction.TYPING)

    messages = history.setdefault(chat_id, [])
    messages.append({"role": "user", "content": user_text})

    try:
        openai_client: AsyncOpenAI = context.application.bot_data["openai"]
        final_text = await _run_openai_conversation(openai_client, messages)
    except Exception as e:  # noqa: BLE001
        logger.exception("error handling message chat=%s", chat_id)
        # On retire le dernier message user pour éviter d'empoisonner l'historique.
        messages.pop()
        await update.message.reply_text(f"Erreur : {e}")
        return

    _trim_history(chat_id)

    # Split si > 4096 (limite Telegram).
    for chunk in [final_text[i:i + 4000] for i in range(0, len(final_text), 4000)]:
        await update.message.reply_text(chunk)


# ── Bootstrap ─────────────────────────────────────────────────────────────────


async def _post_init(app: Application) -> None:
    """Charge les tools MCP au démarrage + instancie le client OpenAI."""
    logger.info("Fetching MCP tools from %s...", MCP_URL)
    try:
        tools = await _fetch_mcp_tools()
        mcp_tools_cache.extend(tools)
        logger.info("Loaded %d MCP tools", len(tools))
    except Exception as e:  # noqa: BLE001
        logger.exception("Failed to load MCP tools — bot will start but tool calls will fail: %s", e)

    app.bot_data["openai"] = AsyncOpenAI(api_key=OPENAI_API_KEY)


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
        OPENAI_MODEL, MCP_URL,
        sorted(ALLOWED_CHAT_IDS) if ALLOWED_CHAT_IDS else "ALL (public!)",
    )
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
