# Bot Telegram LabMedis

Assistant conversationnel Telegram propulsé par Claude + le serveur MCP interne.
Mode consultation uniquement : produits, stock, lots, péremption, clients, fournisseurs,
commandes, factures, livraisons, mouvements, KPIs.

## Architecture

```
Utilisateur Telegram
        │
        ▼ (polling)
labmedis-telegram-bot ────────────► API Anthropic (Claude)
        │                                    │
        │  (client MCP interne HTTP)         │  (tool_use blocks)
        ▼                                    ▼
labmedis-mcp ─────────► labmedis-postgres (read-only)
```

Le bot :
1. Reçoit un message Telegram.
2. Vérifie que le `chat_id` est dans la whitelist.
3. Récupère la liste des tools MCP (au démarrage, en cache).
4. Envoie le message + tools à Claude.
5. Si Claude demande d'appeler un tool → proxy vers le MCP local, renvoie le résultat.
6. Boucle jusqu'à obtenir une réponse texte finale, l'envoie sur Telegram.

Le MCP n'est **jamais exposé publiquement** — seul le bot y accède via le réseau
Docker interne `labmedis-net`.

## Setup pas à pas

### 1. Créer un bot Telegram

- Ouvre Telegram, cherche `@BotFather`.
- `/newbot` → nom du bot (ex : "LabMedis Assistant") → username (ex : `labmedis_assistant_bot`).
- BotFather te donne un **token** (`123456:AAExxxxxxxxxx`) — c'est ta `TELEGRAM_BOT_TOKEN`.

### 2. Obtenir ta clé Anthropic

- Va sur https://console.anthropic.com → **API Keys** → **Create Key**.
- Copie la clé (`sk-ant-api03-xxx`) — c'est ta `ANTHROPIC_API_KEY`.

### 3. Configurer le `.env` à la racine du projet

Ajoute ces lignes au `.env` (à la racine `LabMedis/`, pas dans `bot/`) :

```
TELEGRAM_BOT_TOKEN=123456:AAExxxxxxxxxx
ANTHROPIC_API_KEY=sk-ant-api03-xxx
ANTHROPIC_MODEL=claude-sonnet-4-5
# Laisser VIDE au premier démarrage — tu obtiendras ton chat_id à l'étape 5
ALLOWED_TELEGRAM_CHAT_IDS=
```

### 4. Démarrer le bot (dev ou prod)

**Dev :**
```bash
docker compose up -d --build mcp telegram-bot
docker compose logs -f telegram-bot
```

**Prod :**
```bash
docker compose -f docker-compose.prod.yml up -d --build mcp telegram-bot
docker compose -f docker-compose.prod.yml logs -f telegram-bot
```

Log attendu :
```
Starting bot — model=claude-sonnet-4-5 mcp=http://mcp:8080/ allowed_chat_ids=ALL (public!)
Loaded 22 MCP tools
```

### 5. Récupérer ton chat_id + fermer l'accès

- Trouve ton bot sur Telegram (via le username défini à l'étape 1).
- Envoie `/start` — le bot te répond avec ton `chat_id` (ex : `123456789`).
- Ajoute-le à `ALLOWED_TELEGRAM_CHAT_IDS` dans `.env` (plusieurs séparés par `,`).
- Redémarre le bot :
  ```bash
  docker compose restart telegram-bot          # dev
  docker compose -f docker-compose.prod.yml restart telegram-bot  # prod
  ```

Toute personne dont le `chat_id` n'est pas dans la liste reçoit un refus poli avec son chat_id à communiquer.

## Commandes bot

| Commande | Effet |
|---|---|
| `/start` | Message d'accueil + rappel du chat_id |
| `/reset` | Efface l'historique conversationnel |
| `/tools` | Liste des outils MCP disponibles (debug) |
| *(texte libre)* | Question au bot |

## Exemples de questions

- « Combien de produits proche péremption ? »
- « Détail du produit code 020201001 »
- « Liste des commandes clients en attente »
- « Détail de la commande CMD-2026-000123 »
- « Quels lots ont été livrés au client XYZ pour cette commande ? »
- « Ventes du mois dernier »
- « Stock du produit lait 400g »
- « Factures fournisseur impayées »

## Variables d'environnement

| Var | Défaut | Description |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | *(obligatoire)* | Token BotFather |
| `ANTHROPIC_API_KEY` | *(obligatoire)* | Clé API Anthropic |
| `ANTHROPIC_MODEL` | `claude-sonnet-4-5` | ID du modèle Claude |
| `MCP_URL` | `http://mcp:8080/` | URL du serveur MCP (interne) |
| `ALLOWED_TELEGRAM_CHAT_IDS` | *(vide)* | Chat IDs autorisés, séparés par `,` |
| `MAX_HISTORY_MESSAGES` | `20` | Historique conversationnel max par chat |
| `MAX_TOKENS` | `2048` | Tokens de sortie max par réponse Claude |

## Ajouter un utilisateur autorisé plus tard

1. La personne parle au bot une première fois → refus + affichage de son chat_id.
2. Elle communique ce chat_id.
3. Tu l'ajoutes dans `ALLOWED_TELEGRAM_CHAT_IDS` (séparés par `,`).
4. `docker compose restart telegram-bot` (ou variante prod).

## Coût

Chaque message = 1+ appel Claude (plus si Claude enchaîne plusieurs outils).
Ordre de grandeur avec Sonnet 4.5 : ~0.005–0.02 USD par question typique.
Pour réduire les coûts, passer à Haiku 4.5 via `ANTHROPIC_MODEL=claude-haiku-4-5`.

## Extension future WhatsApp

Le bot est structuré autour de `_run_claude_conversation()` qui ne dépend pas de
Telegram. Pour WhatsApp, garder cette fonction et remplacer la couche `python-telegram-bot`
par `whatsapp-web.js` (Node) ou l'API officielle WhatsApp Business (webhook FastAPI).
