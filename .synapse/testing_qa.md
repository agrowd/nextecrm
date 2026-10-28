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

### ISSUE-07: Combo Discount Math Discrepancy & Template Syntax Error (2026-05-24)
- **Root Cause:** Corrupted overwrite of `advancedTemplateGenerator.js` during the previous pricing refactor broke syntax and left older arrays containing wrong `$180.000` discount savings instead of `$530.000`.
- **Fix:** Cleaned, consolidated and escaped the `this.propuestas` array to contain exactly 10 correct autumn proposals stating `$530.000` combo savings, synchronized all bots, and verified with `node -c`.
- **Status:** ✅ RESOLVED

### ISSUE-08: Chrome Hanging or Crashing on Multi-Bot Launch (TargetCloseError & Naive pkill) (2026-05-24)
- **Root Cause:** Puppeteer v22+ used the unstable new headless Chrome, hanging `client.initialize()`. Additionally, starting `bot_2` called `pkill -9 -f chromium`, killing `bot_1`'s browser process inside the shared container.
- **Fix:** Map `HEADLESS=true` to stable `headless: 'shell'`. Modify `profileManager.js` to target only `browser-${instanceId}` processes to isolate each bot's Chromium instance.
- **Status:** ✅ RESOLVED



## 📋 Verification Checklist (Post-Deploy)
After VPS rebuild, verify:
1. [ ] bot_1 starts sending at 08:00 Argentina (not skipping)
2. [ ] bot_2 reaches "ready" state (no WAPhoneUtils error)
3. [ ] Dashboard shows correct status for all bots

### ISSUE-09: Auditoría Integral Extensión, Bot y Backend (2026-10-28)
- **Hallazgos en Extensión (`extension/`):**
  1. `background.js` (L78): `chrome.tabs.onActivated` detiene el scrapeo si el usuario cambia de pestaña.
  2. `content.js` (L502/584): `stopRequested` nunca se resetea a `false` al iniciar una nueva cola (`startScrapingQueue`).
  3. `content.js` (L382): `openAndExtract` lee el `h1` de la tarjeta anterior porque el DOM de Maps tarda en actualizar tras el click, descartando tarjetas nuevas como falsos duplicados.
  4. `popup.js` (L62): `queue(k, l)` no realiza producto cartesiano entre rubros y ubicaciones.
  5. Falta botón en `popup.html` para "Raspar Vista Actual" y "Sincronizar con Agente 1 (VPS)" enviando `zoneId`.
- **Hallazgos en Envío de Mensajes (`bot/index.js`):**
  1. `L1366`: El doble-check `/lead/check-messages` detecta mensajes previos pero NO aborta el envío.
  2. `L1467`: Inyección de un 5to mensaje legacy (`salesPitches`) cuando detecta auto-respuesta, rompiendo la secuencia de 4 mensajes IA.
  3. `L1608`: Al terminar el loop `for` (incluso tras `break` por respuesta/rechazo en vivo), sobrescribe el estado del lead a `'contacted'`, pisando `'interested'` o `'not_interested'`.
  4. `L1594`: Si falla el envío de un mensaje de la secuencia (ej. Msg 1), hace `continue` y envía el Msg 2 sin saludo previo.
  5. `L2216`: `ReferenceError: msg is not defined` (debe ser `message.getContact()`) al resolver LIDs.
  6. `L677 & L728`: Doble llamada a `this.client.initialize()` y doble definición de `log()` (`L274 & L926`).
- **Hallazgos en Backend (`server/index.js`):**
  1. Rutas duplicadas (`/next`, `/ingest`, `/logs`, `/lead/by-phone/:phone`, `/api/bot/:id/start`) y rutas declaradas después del middleware 404 (`L4665`).
  2. `POST /send-message` (`L4001`) guarda en BD pero no emite a Socket.io hacia el bot.
  3. Falta watchdog para liberar leads atascados en `status: 'processing'` (>15 min) y condición de carrera entre `/ingest` (Dossier background) y `/next`.
- **Status:** ✅ RESOLVED & DEPLOYED (2026-10-28)
