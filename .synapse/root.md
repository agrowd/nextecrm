# 🌐 SYSTEM ROOT

## Project: Gmaps Leads Scraper (Rascafull CRM) & Multi-Agent Architecture
- **Core Stack:** Node.js, Express, Puppeteer (WhatsApp Bots), MongoDB Atlas, Docker
- **Architecture:** Multi-Agente Inteligente + Microservices-lite (Central Server + Independent Bot Containers)
- **VPS:** Debian Linux, Docker Compose, MongoDB Atlas

## 📌 Estado Global
- **Current Phase:** Fases 1 a 5 Multi-Agente Completadas (Minero Masivo GPS, Auditor Web/Reseñas, Estratega de Oferta, Prospector Consultivo y Copiloto de Cierre)
- **Last Sync:** 2026-10-07 15:15 Argentina
- **Pending:** Despliegue en VPS (`git pull`, limpieza de docker context y rebuild)

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

## Key Components & Multi-Agent Engine
| Component | Path | Description |
|:---|:---|:---|
| Agente 1 (Geo-Grid Scanner) | `server/services/geoGridScanner.js` | Barrido masivo por micro-cuadrículas GPS superando el límite de 120 de Google Maps |
| Agente 2 (Auditor Forense) | `server/services/webScraper.js` | Extracción profunda de web, tecnologías, pixeles, redes y reseñas de Google |
| Agente 3 (Estratega de Oferta) | `server/services/painAnalyzer.js` | Minería de fricciones operativas y generación del Dossier Comercial personalizado |
| Agente 4 (Prospector Consultivo) | `bot/services/aiTextGenerator.js` | Generador de 4 mensajes dinámicos con ChatGPT anclados al dolor y oferta |
| Agente 5 (Copiloto Closer) | `server/services/closerCopilot.js` | Clasificador de intenciones en tiempo real y sugerencias de cierre de 1 clic en el CRM |
| Central Server | `server/index.js` | API central, gestión de prospectos, WebSockets y endpoints de agentes |
| Dashboard CRM | `crm-dashboard/` | Frontend unificado: chat en vivo, copiloto IA, previsualización de secuencia y dossiers |
| Bot 1 | `bot/` | Bot principal de WhatsApp (git master) |
| Bot 2-4 | `bot_2/`, `bot_3/`, `bot_4/` | Bots secundarios sincronizados de la flota |
| Local duplicate | `bot_1/` | ⚠️ NOT USED in production |

