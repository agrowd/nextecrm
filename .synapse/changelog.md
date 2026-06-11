# 📜 SYSTEM CHANGELOG

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
