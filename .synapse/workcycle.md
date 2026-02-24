# 🔄 WORK CYCLE LOG

## Current Session: 2026-02-23 (12:00-12:30 Argentina)
- **Objective:** Fix Bot 2 inactivity, status@broadcast DB crash, and Bot 1 hands.
- **Status:** ✅ ALL FIXES DEPLOYED.
- **Git Info:** Changes not yet committed.
- **Deploy:** Ready for deployment via Docker build.

## Previous Session: 2026-02-18 (02:00-05:10 Argentina)

## Estado Actual de los Bots (FUNCIONANDO)
| Bot | Número | Status | Fixes Aplicados |
|:---|:---|:---|:---|
| Bot 1 (`bot/`) | +549 11 5735-1676 | ✅ ready | isQuickAutoReply + ack msg + smart discard + retry counter |
| Bot 2 (`bot_2/`) | +549 11 2817-9269 | ✅ ready | isQuickAutoReply + ack msg (no necesitaba smart discard) |

## Validación en Producción
```
🤖 Auto-reply ignorado en análisis de rechazo: "No comprendí tu mensaje. Si deseás ser atendido por un aseso..."
```
↑ Esto apareció en los logs inmediatamente al prender Bot 1. El fix funciona.

## Fixes Applied This Session

### 19. Fix Bot 2 Inactivity (ERR-13, RateLimiter instanceId bug)
- **Problema:** Bot 2 se quedaba inactivo ("ready" pero durmiendo +600 mins por `outside_business_hours`).
- **Solución:** Descubrimos que `IntelligentRateLimiter` necesitaba el `instanceId` en su inicialización (`new IntelligentRateLimiter(this.instanceId)`). Al no enviarlo, los bots compartían el archivo de estado `global`, pisándose las cuotas. Corregido en los 4 bots.
- **Archivos:** `bot/index.js`, `bot_2/index.js`, `bot_3/index.js`, `bot_4/index.js`.

### 20. Fix `status@broadcast` DB Crash (ERR-14)
- **Problema:** Errores 500 y promesas rotas en Node.js al guardar mensajes en la DB, causadas por estados de WhatsApp (`status@broadcast`). Al no tener formato de teléfono válido, crasheaba al limpiarlo en el server.
- **Solución:** Filtro en `handleIncomingMessage` y `saveMessageToBackend` para abortar si el emisor/receptor es `status@broadcast`. Validación de `null`/`undefined` phone en el endpoint de Express `/messages`.
- **Archivos:** `bot/index.js`, `bot_2/index.js`, `bot_3/index.js`, `bot_4/index.js`, `server/index.js`.

### 21. Multi-Bot Services Synchronization & Quarantine List
- **Problema:** Desincronización de código, causando falsos positivos de QuickVerify y faltaba mecanismo para aislar leads problemáticos.
- **Solución:** Copiados los `bot_2/services` hacia el resto, con parcheos correctos de "Sales Pitch injection". Implementado script `export-manual-review.js` y estado BD de Quarantine (`manual_review`).

## Previous Fixes (2026-02-18)

### 15. Auto-Reply Detection + Acknowledgment (ERR-09, D-21, D-23)
- **Problema:** Auto-replies de WhatsApp Business abortaban la secuencia.
- **Solución:** `isQuickAutoReply()` detecta por keywords/estructura/timing. Si es auto-reply → bot envía "Veo que tienen respuesta automática" y sigue. Si es respuesta real → corta secuencia.
- **Archivos:** `bot/index.js`, `bot_2/index.js`

### 16. Smart Lead Discard — No Infinite Loop (ERR-10, D-22)
- **Problema:** `no_phone`/`invalid_phone` → `pending` → loop infinito.
- **Solución:** `no_phone`/`invalid_phone` → `discarded` (permanente). `internal_error` → retry 3x con `retryCount`, después `failed`.
- **Archivos:** `bot/index.js`, `server/models/Lead.js`

### 17. Bot 2 Sync (ERR-11)
- **Problema:** bot_2 no tenía ninguno de los fixes.
- **Solución:** Sincronizado `isQuickAutoReply()` + guards + ack msg + `autoReplyDetected` flag.
- **Bug encontrado:** `else` perdido en el if/else del handler → corregido.
- **Archivos:** `bot_2/index.js`

### 18. Auto-Reply Timestamp Bugfix (ERR-12)
- **Problema:** Auto-respuesta triggeraba en mensajes muy antiguos (ej: +24hs) al reiniciarse el bot o recargar el chat.
- **Solución:** Agregado check `isRecent` (últimos 5 minutos) en `bot_1`, `bot_2`, `bot_3` y `bot_4`.
- **Incidente:** El parcheo inicial rompió la sintaxis en los 4 bots (ERR-12). Se arregló usando `node -c` para validar.
- **Archivos:** `bot/index.js`, `bot_2/index.js`, `bot_3/index.js`, `bot_4/index.js`

## Lecciones Clave de Esta Sesión
1. **NUNCA poner errores permanentes como `pending`** — crea loops infinitos. Usar `discarded`.
2. **Cada bot tiene código independiente (D-11)** — SIEMPRE verificar que fixes estén en TODOS los bots (incluyendo bot 3 y 4).
3. **Al hacer multi-replace en el mismo archivo, verificar que el if/else no se rompa** — además, cuidado con los cierres de corchetes `{}` al agregar nuevas condiciones.
4. **Validar sintaxis antes de dar por terminado** — siempre correr `node -c [archivo]` después de refactors.
5. **`docker system prune -af --volumes`** libera espacio (43GB en este caso) cuando el build falla por `no space left on device`.

## Previous Session: 2026-02-11 (20:00 Argentina)
- **Objective:** Fix 3 critical bot issues causing lead burning.
- **Status:** ✅ FIXES PUSHED (3 commits).

## Fixes Applied This Session

### 11. session_dead Detection Fix (ERR-06)
- **Commit:** `ee23cb3` — Inner catch blocks now detect detached/closed errors and return `session_dead`.

### 12. QuickVerify False Negatives Fix (ERR-07, D-19)
- **Commit:** `41b7e10` + `872359d` — When quickVerify says no, check last 100 messages. If we already sent → `contacted`. If no history → `check_failed`.
- **⚠️ Lección:** `sendMessage('.')` crea chats para CUALQUIER número. No es verificación válida.

### 13. In-Memory Lead Tracking + Stop on Response (ERR-08, D-20)
- **Commit:** `41b7e10` — `currentlyProcessingLead` con flag `stopSending`. Message handler resuelve LID y compara. Secuencia se corta al recibir respuesta.

### 14. Recovery Script (Bot 1)
- **Archivo:** `server/recover-burned-bot1.js` — 6 leads quemados por falsos negativos.

---

## Previous Session: 2026-02-05 (08:40 Argentina)
- **Objective:** Fix bot_1 not sending + bot_2 WAPhoneUtils error.
- **Status:** ✅ FIXES PUSHED.

## Fixes Applied This Session

### 1. Timezone Bug in rateLimiter.js (ERR-01)
- **Problema:** `getNextBusinessHour()` y `getSmartDelay()` usaban hora UTC.
- **Solución:** Cambiado a usar `getArgentinaHour()` y `getArgentinaDay()`.
- **Commit:** `e7010e4`

### 2. WAPhoneUtils Error in bot_2 (ERR-02)  
- **Evolución del diagnóstico:**
  1. purpule-fox fork → tarball 404
  2. npm ^1.34.6 → NO tiene el fix
  3. **DESCUBIERTO:** bot_1 funciona porque usa git master
- **Solución:** `bot_2/package.json` ahora usa:
  ```
  "whatsapp-web.js": "git+https://github.com/pedroslopez/whatsapp-web.js.git"
  "puppeteer": "^22.15.0"
  ```
- **Commit:** `6eeea0f`

### 3. Anti-Spam URLs in Templates (MSG 3)
- **Problema:** URLs como `www.tunegocio.com.ar` pueden ser marcadas como spam.
- **Solución:** Reemplazado por `tunegocio punto com punto ar` y removidas comillas de URL.
- **Commit:** `912a752`

### 4. Anniversary Promo & Urgency (MSG 3 & 5)
- **Cambio:** Agregada mención "ANIVERSARIO: SOLO HOY" en Propuestas y CTAs.
- **Objetivo:** Generar urgencia y justificar el descuento.
- **Commit:** `912a752`

## VPS Deploy Commands (Para el Usuario)
```bash
cd /srv/rascafull
git pull
docker compose down
docker compose build --no-cache
docker compose up -d
docker compose logs -f
```

### 5. Smart Sleep Loop (Zero Dead Time)
- **Problema:** El bot dormía intervalos random de 15m aunque el RateLimiter pidiera esperar solo 2m.
- **Solución:** Implementado `Smart Loop` en `startLeadProcessing` que duerme el tiempo EXACTO (`nextAvailable - now`) + pequeño jitter.
- **Script:** `update-sleep-logic.js`

### 6. Fix for Validator & DB Repair (CRITICAL)
- **Problem:** Validator was corrupting valid numbers by double-prefixing.
- **Problem 2:** Fix script crashed on `E11000 duplicate key` when correcting numbers to an existing phone.
- **Problem 3:** Scripts failed in Docker due to local URI default vs Atlas requirement.
- **Solution:** 
  1. Updated Validator regex.
  2. Updated `fix-all-leads.js` to DELETE duplicates instead of crashing.
  3. Updated scripts to load `.env` correctly from `server/` to access Atlas URI.
- **Result:** Script successfully processed 4595 leads, fixing/cleaning 2427 of them. System is healthy.

### 6. Fix Phone Validator (Double Prefix)
- **Problema:** Números válidos eran rechazados porque el validador forzaba `549` incluso si ya lo tenían (ej: `549 + 54911...` = 15 dígitos).
- **Solución:** Detectar si ya empieza con `549` o `54` y limpiarlo antes de formatear.
- **Script:** `update-validator.js`

## Decisions Locked This Session
- **D-02 UPDATED:** Use git master for whatsapp-web.js (not npm)
- **D-09 UPDATED:** npm v1.34.6 does NOT fix WAPhoneUtils
- **D-10 NEW:** Timezone bug fixed in rateLimiter.js
- **D-12 NEW:** Anti-Spam URLs implemented
- **D-13 NEW:** Anniversary Promo urgency added
- **D-14 NEW:** Smart Sleep Loop (Exact Wait Times)
- **D-15 NEW:** Validator Fix (Prevent Double Prefix)

### 7. Code Synchronization (CRITICAL)
- **Problem:** `bot_2` runs from `bot_2/` folder, but fixes were applied to `bot/`.
- **Solution:** Copied `bot/services/whatsappChecker.js` (with Retry V2) to `bot_2/`, `bot_3/`, and `bot_4/`.
- **Commit:** `sync-bots`

### 8. Manual Stats Reset (Bot 1)
- **Problem:** Bot 1 stopped at 50/50 leads, but user reported only 22 sent (likely counted from previous tests).
- **Solution:** Manually reset `leadsProcessed` to 22 via `docker exec`.
- **Discovery:** Stats file is `/app/bot/stats/daily-limits.json` (global), NOT `daily-limits-bot_1.json`.

### 9. Zombie Leads Recovery (CRITICAL)
- **Problem:** User reported `0` pending leads but database had ~4800 total.
- **Diagnosis:** 3285 leads were stuck in `processing` and 5 in `queued` (zombies from previous crash/restart).
- **Solution:** Created `recover.js` script to reset `processing/queued` -> `pending`.
- **Result:** **3290 leads recovered** and available for processing.

### 10. Recovery Script (recover-leads.js)
- **Objetivo:** Analizar la DB y corregir leads que quedaron como `failed` o `phoneInvalid` por el bug del doble prefijo.
- **Script:** `/gmaps-leads-scraper/server/recover-leads.js`
- **Backup:** Solo modifica leads inválidos y los pone en `pending`.

### 22. Add NexteMarketing Services List to 4th Message
- **Problem:** The user requested to add the Nexte Marketing services after the promotion message (Message 3), meaning a 5-message sequence total.
- **Solution:** Edited `bot/services/advancedTemplateGenerator.js` to include 10 variations of 'serviciosCompletos' and ensured the script returns 5 messages instead of 4. Updated `aiTextGenerator.js` fallback array from 4 to 5 messages to match. Synced bots.
- **Archivos:** `bot/services/advancedTemplateGenerator.js`, `bot/services/aiTextGenerator.js`, `scripts/sync-bots.js`

### 23. Remove Promo Expiration from Message 5 (CTA)
- **Problem:** The user requested the removal of the urgency clauses (promo valid until Saturday) from the final call to action message.
- **Solution:** Edited `bot/services/advancedTemplateGenerator.js` to remove the  clauses from all 10 CTA variations. Synced bots.
- **Archivos:** `bot/services/advancedTemplateGenerator.js`, `scripts/sync-bots.js`

### 24. Heavy Refactor of Bot Messages (B2B, Short, No Emojis)
- **Problem:** The user requested the removal of all long, spam-looking texts and legacy unused arrays from the bot's messaging system, moving to a short, serious, B2B tone with dynamic variables.
- **Solution:** Fully rewrote `bot/services/advancedTemplateGenerator.js`. Removed legacy `saludos`, `introsNegocio`, `categoryKeywords`, `categoryPhrases`, and old fallback arrays. Created 5 clean arrays (`mensajes1ConWeb`, `mensajes1NoWeb`, `mensajes2Presentacion`, `mensajes3Propuesta`, `mensajes4Precios`, `mensajes5Cta`) with 10 high-quality variations each. Added support for `{rubro}`, `{rating}`, and `{reviews}` injection strings by extracting data directly from the lead object. Updated `aiTextGenerator.js` fallback to match the serious tone. Synced bots.
- **Archivos:** `bot/services/advancedTemplateGenerator.js`, `bot/services/aiTextGenerator.js`
