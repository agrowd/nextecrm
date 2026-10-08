# 📜 SYSTEM CHANGELOG

## [2026-10-08] - Memoria Persistente de Zonas GPS, Calificación de Leads y Mensajes Ultra-Especializados
### Added
- **Memoria Persistente de Zonas GPS (`ScannedZone.js` & `geoGridScanner.js`):**
  - Mongoose Model `ScannedZone` con índice único `{ zoneId, keyword }` que persiste métricas de barrido (fecha, leads encontrados, calificados y descartados).
  - Algoritmo autónomo `getNextRecommendedTarget(city)` que analiza la base de datos y selecciona la siguiente micro-zona virgen o menos reciente, generando el enlace directo de Google Maps listo para el scraper.
  - Endpoints de control: `GET /api/scraper/next-target`, `GET /api/scraper/zones-history` y `POST /api/scraper/mark-scanned`.
- **Filtro Temprano de Calificación & Sanitizador (`phoneValidator.js`):**
  - En `POST /ingest`, sanitiza números a formato móvil argentino `549...` y descarta preventivamente números fijos o inválidos.
  - Exclusión automática de entidades públicas y no comerciales (comisarías, ministerios, embajadas, hospitales públicos).
  - Leads no viables ingresan como `status: 'discarded'`, `isQualified: false`, manteniendo la cola `pending` 100% limpia para Bot 1.
  - Endpoint `GET /api/leads/qualification-stats` con tasa porcentual de calificación.
- **Frontend CRM (Dashboard & Planificador GPS):**
  - Widget interactivo "Agente 1: Planificador Autónomo de Zonas GPS" en el CRM: indica zona, rubro, solución recomendada y permite abrir directamente en Google Maps con 1 clic o cambiar de sugerencia.
  - Tarjeta en tiempo real "Leads Calificados" con contador de válidos vs descartados.
- **Secuencia No Robótica Especializada (`aiTextGenerator.js`):**
  - Eliminado el folleto genérico de 6 servicios en el Mensaje 3. Ahora ofrece con precisión quirúrgica el servicio que el lead necesita según su rubro y auditoría (Web Express si no tiene web, Rediseño si es obsoleta, Turnos a Medida para salud/estética, o Carta QR sin comisiones para gastronomía).

## [2026-10-07] - Multi-Agente IA: Arquitectura Completa Fases 1 a 5 (Geo-Grid, Dossier, Secuencia 4 Mensajes y Copiloto Closer)
### Added
- **Agente 1 (Geo-Grid Scanner GPS):** Micro-servicio `geoGridScanner.js` con catálogo de 9 regiones de alta densidad de Argentina para eludir el límite de 120 resultados de Google Maps mediante micro-coordenadas. Endpoints `/api/scraper/cities` y `/api/scraper/generate-grid`.
- **Agente 2 & 3 (Auditor Forense & Estratega de Oferta):** Esquema de reseñas y `dossier` comercial en `Lead.js`. Micro-servicio `painAnalyzer.js` (`gpt-4o-mini` + motor determinista) para detección de cuellos de botella y ganchos consultivos.
- **Agente 4 (Prospector Consultivo):** Secuencia de 4 mensajes contextuales con ChatGPT y tarifas Otoño 2026. Endpoint `/api/leads/:id/preview-sequence`.
- **Agente 5 (Copiloto Closer Híbrido):** Micro-servicio `closerCopilot.js` con clasificación de 7 intenciones y generación en vivo de respuestas sugeridas de 1 clic en el CRM. Endpoint `/api/conversations/:phone/copilot-suggestion`.
- **Dashboard UI & Interacción:**
  - Componente de Copiloto IA (`closerCopilotBox`) en el chat con regeneración, inserción en input y envío directo de 1 clic.
  - Modal de previsualización de 4 mensajes (`sequencePreviewModal`) con diseño de burbujas interactivas y copia al portapapeles.
  - Badges de colores por servicio en tabla de leads (`[⚙️ Turnos / IA]`, `[🌐 Web Express]`, etc.).
  - Botón de análisis individual en modal de lead y botón de análisis masivo (`btnBatchDossier`).
- **Optimización de Despliegue Docker:** Reglas ampliadas en `.dockerignore` (`sessions/**`, `**/Default/**`, `chrome-profile/**`, `bot_1/`) para erradicar el desborde de 4.5 GB de build context y prevenir el error `no space left on device` en VPS.

### Changed
- **Socket.io Handlers:** Manejador `lead_updated` en `app.js` optimizado para actualizar reactivamente `currentState.leads` y perfiles activos.
- **Flota Sincronizada:** Sincronizados todos los bots (`bot_1`, `bot_2`, `bot_3`, `bot_4`) con el nuevo generador de textos.


## [2026-06-12] - Ingested Audit Data Exposure, AI Intent Badges & Bot Dimming
### Added
- **AI Tracking Fields in Schema:** Added `aiIntent`, `aiConfidence`, and `aiReason` explicitly to the Lead model.
- **AI Intent Badges in Dashboard:** Added visual HSL-colored badges with Material Icons showing AI intention (Interest, Question, Neutral, Rejection, Anger, Auto-Reply) in the leads table and chat inbox.
- **Web Audit Data Display:** Exposed Meta Pixel `[FB]` and Google Pixel/GTM `[GG]` status badges in the Leads table and detailed view.
- **Social Media Quick Links:** Dynamic link buttons for Instagram 📸 and Facebook 👤 in the detailed lead view if audited in the background.
- **Active Fleet Dimming:** Reduced opacity of inactive (`not_running`) bots to 55% with interactive hover highlights.

### Changed
- **Conversations Population:** Updated `/api/conversations` query to populate `leadId`, enabling real-time lead and AI intent tracking in the chat list.
- **Bot Analysis Integration:** Updated the bot's lead update payload to send intent classification metadata (confidence, reason) to the backend.

## [2026-06-11] - Year & Duration Template Correction (2026 Update)
### Changed
- **Messaging Templates Update:** Updated all references of Nexte's duration from "10 años" to "más de 10 años" (and similar) to reflect the current year 2026.
- **Year Ranges Update:** Updated year references from "(2015-2025)" to "(2015-2026)" across all template generating files.
- **Promo Code/Name Update:** Updated categoric promo tags from "PROMO 2025" and similar to "PROMO 2026" to align with the current campaign year.
- **Bot Message Detection:** Updated keyword matches and years check in `bot/index.js` to recognize "2015-2026" for message sequence detection and tracking.

## [2026-06-11] - Logs & Flota CRM Connectivity Alignment
### Added
- **Global Console Interception:** Hijacked `console.log`, `console.error`, `console.warn` globally on both central server and bot templates. Captured logs are saved to MongoDB (`Log` collection) and forwarded to Socket.io live console.
- **Bot 4 Console UI:** Added individual console window markup (`consoleBot4Output`) in `crm-dashboard/index.html`.
- **Global Socket Reference:** Exposed socket instance in bots via `global.botSocket = this.socket`.

### Fixed
- **Dashboard Redundancy:** Removed first set of duplicate console helper functions in `crm-dashboard/app.js`.
- **Console Cleaning Bug:** Fixed `clearAllConsoles()` to clear static bot consoles (`Bot 1` to `Bot 4`) in addition to general logs.

## [2026-02-11] - Lead Burning Prevention
### Fixed
- **session_dead Detection:** Inner catch blocks in `quickVerify` now detect browser crashes and return `session_dead` instead of false `quick_not_registered`. (`ee23cb3`)
- **QuickVerify False Negatives:** Replaced blind trust in `isRegisteredUser()` with message history check (`fetchMessages`). No longer burns WhatsApp Business accounts. (`872359d`)
- **Response Detection via LID:** In-memory lead tracking replaces broken HTTP lookup. Bot now stops sending when client responds. (`41b7e10`)

### Added
- **Recovery Script:** `server/recover-burned-bot1.js` for 6 leads burned by quickVerify false negatives.
- **`currentlyProcessingLead` Property:** All 4 bots track the active lead in memory with `stopSending` flag.

### ⚠️ Lessons Learned
- `sendMessage('.')` as trial verification is WRONG — creates chats for any number, even invalid ones. (D-19)
- `isRegisteredUser()` returns ~43% false negatives for WhatsApp Business accounts.

## [Unreleased] - 2026-02-05
### Added
- **Smart Sleep Loop:** Bot now sleeps exact duration required by RateLimiter instead of random polling. Zero dead time.
- **Recovery Scripts:** `server/recover-leads.js` and `fix-all-leads.js` to repair DB data (includes Duplicate auto-deletion).
- **Environment:** Scripts now auto-detect Docker vs Local to use correct Atlas URI.

### Fixed
- **Phone Validator Bug:** Fixed double-prefix issue where valid `549` numbers were getting another `549` added.
- **Bot Idle Time:** Reduced accumulated delay from 30+ mins to <1 min.
- **Lead Skipped Perception:** Confirmed skipping is due to Load Balancing (valid behavior).

### Changed
- `.synapse/` architecture for context management.
- `purpule-fox` fork for `bot_2` to fix `WAPhoneUtils` error.

### Changed
- **Critical:** Switched `whatsapp-web.js` dependency from SSH to HTTPS URL in `bot_2/package.json`.
- Removed `webVersionCache` usage in `bot_2`.
- Removed `.wwebjs_auth` from `docker-compose` volumes to fix Profile Lock.

### Fixed
- Chromium `Code: 21` error by cleaning up auth files.
- NPM install `Error 128` (SSH Permission Denied) on VPS.
- **D-06 DISCOVERED:** User's `docker compose build bot_2` was FAILING SILENTLY because docker-compose.yml has only ONE service: `app`. Changes were never deployed.

## [Legacy]
- Previous bot implementation using `pedroslopez` mainline.
