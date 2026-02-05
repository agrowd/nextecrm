# 🔄 WORK CYCLE LOG

## Current Session: 2026-02-05 (08:40 Argentina)
- **Objective:** Fix bot_1 not sending + bot_2 WAPhoneUtils error.
- **Status:** ✅ FIXES PUSHED - Awaiting VPS rebuild.

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

### 3. Updated Ariadne Memory (This Action)
- Creado `errores.md` con log de errores
- Actualizado `decisions.md` con D-10 (timezone fix)
- Actualizado este archivo `workcycle.md`

## VPS Deploy Commands (Para el Usuario)
```bash
cd /srv/rascafull
git pull
rm -rf /srv/rascafull/bot_2/sessions
docker compose down
docker compose build --no-cache
docker compose up -d
docker compose logs -f
```

## Decisions Locked This Session
- **D-02 UPDATED:** Use git master for whatsapp-web.js (not npm)
- **D-09 UPDATED:** npm v1.34.6 does NOT fix WAPhoneUtils
- **D-10 NEW:** Timezone bug fixed in rateLimiter.js
