# 🌐 SYSTEM ROOT

## Project: Gmaps Leads Scraper (Rascafull CRM)
- **Core Stack:** Node.js, Express, Puppeteer (WhatsApp Bots), MongoDB, Docker
- **Architecture:** Microservices-lite (Central Server + Independent Bot Containers)
- **VPS:** Debian Linux, Docker Compose, MongoDB Atlas

## 📌 Estado Global
- **Current Phase:** Logs & Flota CRM Connectivity Alignment
- **Last Sync:** 2026-06-11 08:45 Argentina
- **Pending:** VPS rebuild to deploy fixes

## Active Shards
| Shard | Purpose |
|:---|:---|
| `decisions.md` | Technical decisions and their WHY (Vallas de Chesterton) |
| `env_manager.md` | Local vs Production environment configs |
| `flows_graph.md` | Logic flow diagrams |
| `testing_qa.md` | QA protocol and issue tracker |
| `workcycle.md` | Current session work log |
| `changelog.md` | Version history |
| `errores.md` | **Error log with solutions (NEW)** |

## Key Components
| Component | Path | Description |
|:---|:---|:---|
| Server | `server/` | Central API, lead management, dashboard backend |
| Bot 1 | `bot/` | Primary WhatsApp bot (git master) |
| Bot 2-4 | `bot_2/`, `bot_3/`, `bot_4/` | Secondary bots (mounted via docker volumes) |
| Dashboard | `crm-dashboard/` | Frontend for monitoring and control |
| Local duplicate | `bot_1/` | ⚠️ NOT USED in production |
