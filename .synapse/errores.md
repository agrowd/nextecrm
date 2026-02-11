# 🐛 ERROR LOG & SOLUTIONS

Este archivo documenta errores encontrados y sus soluciones para NO repetirlos.

---

## ERR-01: `outside_business_hours` cuando estamos en horario (2026-02-05)
**Síntoma:** Bot 1 muestra `⚠️ Rate limit alcanzado: outside_business_hours` a las 08:18 Argentina.
**Root Cause:** `rateLimiter.js` funciones `getNextBusinessHour()` y `getSmartDelay()` usaban `new Date().getHours()` que retorna hora UTC del servidor, NO hora Argentina.
**Solución:** Cambiar a usar `this.getArgentinaHour()` y `this.getArgentinaDay()`.
**Commit:** `e7010e4` - `fix: timezone bug in rateLimiter - now uses Argentina time`
**Estado:** ✅ FIXED

---

## ERR-02: `WAPhoneUtils` module not found (2026-02-05)
**Síntoma:** bot_2 se autentica pero nunca llega a "ready", loop infinito de errores `Requiring unknown module "WAPhoneUtils"`.
**Root Cause (EVOLUCIÓN):**
1. Primero creímos que era por usar `pedroslopez` fork viejo → probamos `purpule-fox` fork
2. El tarball de `purpule-fox` daba 404 → probamos npm `^1.34.6`
3. npm `^1.34.6` NO tiene el fix → comparamos con bot_1 que SÍ funciona
4. **DESCUBRIMIENTO:** bot_1 usa `git+https://github.com/pedroslopez/whatsapp-web.js.git` (git master)

**Solución FINAL:** Usar git master, NO npm:
```json
"whatsapp-web.js": "git+https://github.com/pedroslopez/whatsapp-web.js.git"
"puppeteer": "^22.15.0"
```
**Commit:** `6eeea0f` - `fix: bot_2 now uses git master whatsapp-web.js like bot_1`
**Estado:** 🟡 PENDING VPS REBUILD

---

## ERR-03: `docker compose build bot_2` falla silenciosamente
**Síntoma:** El comando retorna éxito pero no hace nada. Los cambios en `bot_2/package.json` nunca se desplegaron.
**Root Cause:** `docker-compose.yml` tiene UN solo servicio llamado `app`. El comando `docker compose build bot_2` dice "no such service" pero SILENCIOSAMENTE.
**Solución:** SIEMPRE usar `docker compose build --no-cache` sin nombre de servicio.
**Decisión:** D-06 LOCKED
**Estado:** ✅ DOCUMENTED

---

## ERR-04: `Code 21` Chromium Profile Lock
**Síntoma:** `The profile appears to be in use by another Chromium process`
**Root Cause:** Sesiones anteriores dejaron archivos lock en `/app/bot_X/sessions/`.
**Solución:** Limpiar manualmente: `rm -rf /srv/rascafull/bot_2/sessions` + `docker compose restart`
**Decisión:** D-03 LOCKED (no copiar `.wwebjs_auth` al Dockerfile)
**Estado:** ✅ DOCUMENTED

---

## ERR-05: `daily-limits.json` location confusion (2026-02-06)
**Síntoma:** `docker exec` failed finding `/app/bot/stats/daily-limits-bot_1.json`.
**Root Cause:** The `rateLimiter.js` logic defaults to `global` instanceId unless explicitly overridden in constructor. The file is actually named `daily-limits.json` (without `global` prefix in some versions, or `daily-limits-global.json`).
**Discovery:** Actual file on VPS was `daily-limits.json` inside `/app/bot/stats`.
**Solución:** Always check `ls /app/bot/stats` before assuming filename.
**Estado:** ✅ DOCUMENTED

---

## ERR-06: `session_dead` tragado como `quick_not_registered` (2026-02-10)
**Síntoma:** Bot_2 marcó 50+ leads como `not_interested` en ráfaga durante crash de Chromium.
**Root Cause:** Errors `detached Frame`, `Target closed` en los catch INTERNOS de `isRegisteredUser`/`getNumberId` no eran detectados. Caían al return genérico `quick_not_registered`.
**Solución:** Añadir detección de errores de sesión en catches internos + retornar `session_dead` inmediato.
**Commit:** `ee23cb3`
**Estado:** ✅ FIXED

---

## ERR-07: quickVerify falsos negativos ~43% con WhatsApp Business (2026-02-11)
**Síntoma:** Bot_1 marcaba leads válidos como `quick_not_registered` sin crash de sesión. 6 de 14 leads afectados.
**Root Cause:** `isRegisteredUser()` de wwebjs es poco confiable con cuentas WhatsApp Business. Retorna `false` para números que SÍ tienen WhatsApp.
**Solución:** Cuando quickVerify dice no → revisar últimos 100 mensajes del chat con `fetchMessages()`. Si hay mensajes nuestros → falso negativo confirmado, marcar `contacted`. Si no hay historial → marcar `check_failed` para reintento.
**⚠️ NO usar `sendMessage('.')` como trial**: crea chats para cualquier número, incluso inválidos.
**Commit:** `872359d`
**Estado:** ✅ FIXED

---

## ERR-08: Lead no encontrado cuando responde vía LID (2026-02-11)
**Síntoma:** Bot recibe respuesta de WhatsApp Business (`@lid`), resuelve el número real, pero `/leads?search=` no lo encuentra. Bot sigue enviando 4 mensajes completos.
**Root Cause:** La búsqueda HTTP del lead por teléfono no matchea con el formato guardado en la DB.
**Solución:** Tracking in-memory del lead actual (`this.currentlyProcessingLead`). El message handler compara directamente el número entrante (resolviendo LID) con el lead en proceso. Flag `stopSending` corta la secuencia.
**Commit:** `41b7e10`
**Estado:** ✅ FIXED
