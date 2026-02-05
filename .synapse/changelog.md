# 📜 SYSTEM CHANGELOG

## [Unreleased] - 2026-02-05
### Added
- **Smart Sleep Loop:** Bot now sleeps exact duration required by RateLimiter instead of random polling. Zero dead time.
- **Recovery Scripts:** `server/recover-leads.js` and `fix-all-leads.js` to repair DB data.

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
