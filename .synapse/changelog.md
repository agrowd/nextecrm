# 📜 SYSTEM CHANGELOG

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
