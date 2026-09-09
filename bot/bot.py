"""Bot Telegram LabMedis — assistant conversationnel Claude + MCP.

Reçoit les messages Telegram, contrôle l'accès via whitelist chat_id,
appelle l'API Anthropic (Messages API) avec les outils exposés par le serveur MCP
interne (http://mcp:8080/), boucle sur les tool_use blocks jusqu'à obtenir une
réponse texte finale.
"""

from __future__ import annotations

import logging
import os
from datetime import date
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
ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-6")
MCP_URL = os.getenv("MCP_URL", "http://mcp:8080/")
MAX_HISTORY_MESSAGES = int(os.getenv("MAX_HISTORY_MESSAGES", "20"))
MAX_TOKENS = int(os.getenv("MAX_TOKENS", "2048"))
MAX_TOOL_ITERATIONS = 8  # garde-fou anti-boucle infinie

ALLOWED_CHAT_IDS: set[int] = {
    int(x.strip())
    for x in os.getenv("ALLOWED_TELEGRAM_CHAT_IDS", "").split(",")
    if x.strip()
}

# Partie statique du system prompt — cachée (cache_control ephemeral).
# Toute modification ici invalide le cache pour toutes les conversations.
SYSTEM_RULES = """Tu es l'assistant LabMedis, société grossiste dépositaire pharmaceutique basée à Lomé (Togo).
Tu réponds aux questions du personnel sur : produits, stock, lots, dates de péremption, fournisseurs, clients, commandes clients et fournisseurs, factures, livraisons, mouvements d'inventaire, KPIs business.

Tu disposes d'outils MCP en lecture seule pour interroger la base de données. Appelle-les dès que la question porte sur des données réelles ; n'invente rien.

Spécificité importante du modèle de données LabMedis : les bons de livraison (BL) ne sont PAS persistés en base — ce sont juste des PDF imprimés depuis les commandes. La table `deliveries` est vide en pratique. Donc :
- « livraisons livrées », « commandes livrées », « BL de ce mois » → appelle `list_customer_orders` avec status="Terminée" (une commande Terminée = physiquement livrée au client).
- N'utilise `list_deliveries` / `get_delivery` que si l'utilisateur cite explicitement une référence BL-XXX.

Règles de style pour tes réponses :
- Réponds toujours en français.
- Sois concis et opérationnel — l'utilisateur est sur Telegram.
- Formate les chiffres XOF avec des espaces (ex : 1 250 000 XOF).
- Dates au format JJ/MM/AAAA.
- Utilise des listes à puces quand tu retournes plusieurs éléments.
- Si un outil ne retourne rien, dis-le clairement au lieu d'inventer.
- Si la question est ambiguë (ex : "les commandes de Toto" et plusieurs clients contiennent "Toto"), demande une précision."""

# Bloc daté (change chaque jour) — placé APRÈS le bloc caché, donc non caché.
DATE_INSTRUCTIONS_TEMPLATE = """Date du jour : {today} (YYYY-MM-DD). Utilise-la pour résoudre toute expression temporelle relative :
- "aujourd'hui" → {today}
- "hier" → date de la veille
- "ce mois" / "ce mois-ci" → du 1er du mois courant à {today}
- "le mois dernier" → du 1er au dernier jour du mois précédent
- "cette année" → du 1er janvier de l'année courante à {today}
Passe systématiquement les dates aux outils au format YYYY-MM-DD."""


def _system_blocks() -> list[dict[str, Any]]:
    """Renvoie le system prompt en deux blocs : règles statiques (cachées) + date du jour."""
    today = date.today().isoformat()
    return [
        {
            "type": "text",
            "text": SYSTEM_RULES,
            "cache_control": {"type": "ephemeral"},
        },
        {
            "type": "text",
            "text": DATE_INSTRUCTIONS_TEMPLATE.format(today=today),
        },
    ]


# Historique conversationnel par chat (en mémoire, RAZ au redémarrage du bot).
# Format Anthropic : liste de {"role": "user"|"assistant", "content": str | list[block]}.
history: dict[int, list[dict[str, Any]]] = {}

# Cache statique des tools MCP (récupéré au démarrage, au format Anthropic).
mcp_tools_cache: list[dict[str, Any]] = []


# ── Helpers MCP ───────────────────────────────────────────────────────────────


def _is_authorized(chat_id: int) -> bool:
    return not ALLOWED_CHAT_IDS or chat_id in ALLOWED_CHAT_IDS


def _tool_result_to_text(content: Any) -> str:
    """Concatène les blocs de contenu MCP (TextContent, ImageContent...) en une string."""
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
    """Récupère la liste des tools MCP au format Anthropic (name/description/input_schema)."""
    async with streamable_http_client(MCP_URL) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            response = await session.list_tools()
            return [
                {
                    "name": t.name,
                    "description": t.description or "",
                    "input_schema": t.input_schema or {"type": "object", "properties": {}},
                }
                for t in response.tools
            ]


def _tools_with_cache() -> list[dict[str, Any]]:
    """Renvoie les outils MCP avec cache_control sur le dernier — cache tools + system-rules."""
    if not mcp_tools_cache:
        return []
    tools = [dict(t) for t in mcp_tools_cache]
    tools[-1] = {**tools[-1], "cache_control": {"type": "ephemeral"}}
    return tools


# ── Boucle Claude + MCP ───────────────────────────────────────────────────────


async def _run_claude_conversation(
    client: AsyncAnthropic,
    messages: list[dict[str, Any]],
) -> str:
    """Envoie la conversation à Claude, exécute les tool_use blocks via MCP en boucle, retourne le texte final."""
    async with streamable_http_client(MCP_URL) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()

            for iteration in range(MAX_TOOL_ITERATIONS):
                kwargs: dict[str, Any] = {
                    "model": ANTHROPIC_MODEL,
                    "max_tokens": MAX_TOKENS,
                    "system": _system_blocks(),
                    "messages": messages,
                }
                tools = _tools_with_cache()
                if tools:
                    kwargs["tools"] = tools

                response = await client.messages.create(**kwargs)

                # Ajoute la réponse assistant à l'historique (blocs tel quels : text + tool_use).
                messages.append({"role": "assistant", "content": response.content})

                if response.stop_reason != "tool_use":
                    text_parts = [b.text for b in response.content if b.type == "text"]
                    return "\n".join(text_parts).strip() or "(pas de réponse texte)"

                # Exécute tous les tool_use blocks de ce tour et renvoie les résultats en une user turn.
                tool_results: list[dict[str, Any]] = []
                for block in response.content:
                    if block.type != "tool_use":
                        continue
                    logger.info(
                        "call_tool name=%s args=%s (iter %d)",
                        block.name, block.input, iteration,
                    )
                    try:
                        result = await session.call_tool(block.name, block.input)
                        result_text = _tool_result_to_text(result.content)
                        tool_results.append({
                            "type": "tool_result",
                            "tool_use_id": block.id,
                            "content": result_text or "(résultat vide)",
                        })
                    except Exception as e:  # noqa: BLE001
                        logger.exception("tool call failed: %s", block.name)
                        tool_results.append({
                            "type": "tool_result",
                            "tool_use_id": block.id,
                            "content": f"ERREUR côté outil : {e}",
                            "is_error": True,
                        })

                messages.append({"role": "user", "content": tool_results})

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
        f"• <code>{t['name']}</code> — {(t['description'] or '')[:80]}"
        for t in mcp_tools_cache
    ]
    text = f"<b>{len(mcp_tools_cache)} outils MCP disponibles :</b>\n\n" + "\n".join(lines)
    for chunk in [text[i:i + 4000] for i in range(0, len(text), 4000)]:
        await update.message.reply_text(chunk, parse_mode="HTML")


def _trim_history(chat_id: int) -> None:
    """Trim l'historique en coupant sur une frontière saine (un message user texte).

    Anthropic rejette un historique qui commence par un tool_result orphelin ou un
    assistant avec tool_use sans les résultats. On cherche le premier vrai tour
    utilisateur (content en string) dans la queue.
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
        client: AsyncAnthropic = context.application.bot_data["anthropic"]
        final_text = await _run_claude_conversation(client, messages)
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
    """Charge les tools MCP au démarrage + instancie le client Anthropic."""
    logger.info("Fetching MCP tools from %s...", MCP_URL)
    try:
        tools = await _fetch_mcp_tools()
        mcp_tools_cache.extend(tools)
        logger.info("Loaded %d MCP tools", len(tools))
    except Exception as e:  # noqa: BLE001
        logger.exception("Failed to load MCP tools — bot will start but tool calls will fail: %s", e)

    # AsyncAnthropic lit automatiquement ANTHROPIC_API_KEY depuis l'environnement.
    app.bot_data["anthropic"] = AsyncAnthropic()


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
