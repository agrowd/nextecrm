# 🌐 SYSTEM ROOT

## Project: Gmaps Leads Scraper (Rascafull CRM) & Multi-Agent Architecture
- **Core Stack:** Node.js, Express, Puppeteer (WhatsApp Bots), MongoDB Atlas, Docker
- **Architecture:** Multi-Agente Inteligente + Microservices-lite (Central Server + Independent Bot Containers)
- **VPS:** Debian Linux, Docker Compose, MongoDB Atlas

## 📌 Estado Global
- **Current Phase:** Pipeline Multi-Agente con Memoria Persistente de Zonas GPS, Calificación Pre-Ingesta y Ofertas Especializadas a Medida
- **Last Sync:** 2026-10-08 10:30 Argentina
- **Pending:** Despliegue en VPS (`git pull`, rebuild sin caché y arranque del contenedor)

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
| Agente 1 (Geo-Grid Planner & Memory) | `server/services/geoGridScanner.js` & `server/models/ScannedZone.js` | Memoria persistente de cuadrículas GPS y rubros explorados; sugiere objetivos virgen sin repetición |
| Validador Telefónico & Calificador | `server/services/phoneValidator.js` | Sanitización estricta de móviles argentinos (549), descarte preventivo de líneas fijas y entes públicos |
| Agente 2 (Auditor Forense) | `server/services/webScraper.js` | Extracción profunda de web, tecnologías, pixeles, redes y reseñas de Google |
| Agente 3 (Estratega de Oferta) | `server/services/painAnalyzer.js` | Minería de fricciones operativas y generación del Dossier Comercial personalizado |
| Agente 4 (Prospector Consultivo) | `bot/services/aiTextGenerator.js` | Generador de mensajes dinámicos no robóticos enfocados en la solución real requerida por el negocio |
| Agente 5 (Copiloto Closer) | `server/services/closerCopilot.js` | Clasificador de intenciones en tiempo real y sugerencias de cierre de 1 clic en el CRM |
| Central Server | `server/index.js` | API central, gestión de prospectos, WebSockets y endpoints de agentes |
| Dashboard CRM | `crm-dashboard/` | Frontend unificado: chat en vivo, copiloto IA, previsualización de secuencia, dossiers y planificador GPS |
| Bot 1 | `bot/` | Bot principal de WhatsApp (git master) |
| Bot 2-4 | `bot_2/`, `bot_3/`, `bot_4/` | Bots secundarios sincronizados de la flota |
| Local duplicate | `bot_1/` | ⚠️ NOT USED in production |

