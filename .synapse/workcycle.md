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

### 7. Recovery Script (recover-leads.js)
- **Objetivo:** Analizar la DB y corregir leads que quedaron como `failed` o `phoneInvalid` por el bug del doble prefijo.
- **Script:** `/gmaps-leads-scraper/server/recover-leads.js`
- **Backup:** Solo modifica leads inválidos y los pone en `pending`.
