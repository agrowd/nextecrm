# ⚡ LOGIC FLOWS

## 🤖 Bot Lifecycle
`POST /api/bot/:id/start` -> **PM2 (vps)** -> `bot/index.js`
1. **Init:** Load Config -> Connect MongoDB -> Init `Client` (Puppeteer).
2. **Auth:** Check `LocalAuth` -> If no session -> `emit('qr')` -> Dashboard.
3. **Ready:** Scan QR -> `authenticated` -> `ready` -> `socket.emit('bot_ready')`.
4. **Loop:** Listen for messages -> Process via `AI Service` (Gemini) -> Reply.

## 🔄 Lead Processing
`Extension (Chrome)` -> `POST /ingest` -> **Server** -> `MongoDB`
1. **Ingest:** Save Lead -> Trigger `bot_process_queue`?
2. **Contact:** Bot (via Cron/Queue) picks pending leads -> Sends Intro Message.

## 🛠️ Debugging Flow (Authenticated Loop)
If `Authenticated` fires but `Ready` never comes:
1. Verify `whatsapp-web.js` version (Must be compatible with current WA Web).
2. Check Browser Console Utils (`WAPhoneUtils` error = incompatible).
3. **Fix:** Switch to `purpule-fox` fork/branch.
