# 🧪 QA PROTOCOL & ISSUE TRACKER

## ✅ Test Cases (Regresión)
- [ ] **QR Generation:** Start bot -> Dashboard shows QR within 10s.
- [ ] **Auth Persistence:** Restart container -> Bot reconnects without QR.
- [ ] **Message Sending:** `/test` command triggers automatic reply.
- [ ] **Timezone:** Bot sends messages between 08:00-21:00 Argentina time.

## 🐛 Issue Tracker

### ISSUE-01: bot_2 Authenticated Loop (WAPhoneUtils)
- **Root Cause:** npm v1.34.6 does NOT have the fix. Must use git master.
- **Fix:** Changed `bot_2/package.json` to use `git+https://github.com/pedroslopez/whatsapp-web.js.git`
- **Commit:** `6eeea0f`
- **Status:** 🟡 PENDING VPS REBUILD

### ISSUE-02: SSH Permission Denied on VPS npm install
- **Fix:** Use HTTPS URLs in package.json (D-05)
- **Status:** ✅ FIXED

### ISSUE-03: Chromium Code 21 (Profile Lock)
- **Fix:** Removed `.wwebjs_auth` from Dockerfile COPY + manual session cleanup
- **Status:** ✅ FIXED

### ISSUE-04: Bot 1 not sending during business hours
- **Root Cause:** `rateLimiter.js` used UTC time instead of Argentina time.
- **Fix:** `getNextBusinessHour()` and `getSmartDelay()` now use `getArgentinaHour()`
- **Commit:** `e7010e4`
- **Status:** 🟡 PENDING VPS REBUILD

### ISSUE-05: docker compose build bot_2 fails silently
- **Root Cause:** docker-compose.yml has only ONE service called `app`
- **Fix:** Always use `docker compose build --no-cache` without service name
- **Decision:** D-06 LOCKED
- **Status:** ✅ DOCUMENTED

### ISSUE-06: Sync Drift in Bot Services (2026-04-07)
- **Root Cause:** `scripts/sync-bots.js` was too restrictive.
- **Fix:** Rewrote `sync-bots.js` to use `bot/` as source and sync the entire `services/` directory.
- **Status:** ✅ RESOLVED

## 📋 Verification Checklist (Post-Deploy)
After VPS rebuild, verify:
1. [ ] bot_1 starts sending at 08:00 Argentina (not skipping)
2. [ ] bot_2 reaches "ready" state (no WAPhoneUtils error)
3. [ ] Dashboard shows correct status for all bots
