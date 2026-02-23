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

---

## ERR-09: Auto-reply de WhatsApp Business abortaba secuencia (2026-02-17)
**Síntoma:** Bot 1 recibía auto-respuestas de WhatsApp Business (menús, bienvenidas) y las interpretaba como respuestas humanas. Esto causaba: `⛔ SECUENCIA ABORTADA` tras el primer mensaje, `isRejection()` clasificaba auto-replies como rechazos y enviaba disculpas.
**Root Cause:** `handleIncomingMessage` no distinguía entre auto-replies y respuestas reales. CUALQUIER mensaje del número actual → `stopSending = true` + `abortCurrentSequence = true`. Además `isRejection()` procesaba auto-replies y los clasificaba como rechazos.
**Solución (3 partes):**
1. `isQuickAutoReply()` — Nuevo método con detección por keywords ("gracias por comunicarte", "bienvenido", "menú"), estructura (3+ `?`, emojis numerados 1️⃣2️⃣), y timing (<5s para mensajes >300 chars).
2. Guard en response detection — Si `isQuickAutoReply()` → NO setear `stopSending`/`abortCurrentSequence`. Bot envía reconocimiento ("Veo que tienen respuesta automática") y sigue.
3. Guard antes de `isRejection()` — Si auto-reply → `return` sin pasar por análisis de rechazo.
**Validación en producción:** `🤖 Auto-reply ignorado en análisis de rechazo: "No comprendí tu mensaje. Si deseás ser atendido por un aseso..."` ← FUNCIONANDO
**Commit:** `350b108`
**Estado:** ✅ FIXED

---

## ERR-10: Loop infinito de leads sin teléfono / número inválido (2026-02-18)
**Síntoma:** Leads con `no_phone` o `invalid_phone` volvían a status `pending` → bot los procesaba de nuevo → mismo error → `pending` → loop eterno.
**Root Cause:** Fix anterior (sesión 2026-02-17) cambió `not_interested`/`failed` a `pending` SIN distinguir entre errores transitorios y permanentes. Un lead SIN teléfono nunca va a tener teléfono.
**Solución (Smart Discard):**
- `no_phone` → `discarded` (PERMANENTE, no vuelve a cola)
- `invalid_phone` → `discarded` (PERMANENTE, formato no va a cambiar)
- `internal_error` → `pending` con contador `retryCount` (max 3, después `failed`)
- Nuevo status `discarded` agregado al enum de Lead schema.
**Archivos modificados:** `bot/index.js`, `server/models/Lead.js`
**Commit:** `350b108`
**Estado:** ✅ FIXED

---

## ERR-11: bot_2 no tenía los fixes de bot_1 (2026-02-18)
**Síntoma:** bot_2 seguía abortando secuencias por auto-replies porque no tenía `isQuickAutoReply()` ni los guards.
**Root Cause:** D-11 (cada bot tiene código independiente). Fixes aplicados solo a `bot/index.js` no aplican a `bot_2/index.js`.
**Solución:** Sincronizados manualmente: `isQuickAutoReply()`, guards en handler, auto-reply acknowledgment, `autoReplyDetected` flag.
**Bug encontrado durante sync:** Al aplicar el segundo chunk del fix, el `else` se perdió, causando que el branch de auto-reply Y el de respuesta real se ejecutaran juntos. Corregido inmediatamente.
**Commit:** `350b108`
**Estado:** ✅ FIXED

---

## ERR-12: Syntax errors by naive string replacement in bot files (Current Session)
**Síntoma:** `SyntaxError: Missing catch or finally after try` o `Unexpected token }` al correr los bots.
**Root Cause:** Añadir el bloque `if (isRecent)` usando reemplazo de texto puro rompió el anidamiento de corchetes e incluso borró líneas accidentalmente en `bot_4`.
**Solución:** Validar siempre con `node -c bot/index.js` tras cada parche masivo. Restauración de corchetes manual en los 4 bots.
**Estado:** ✅ FIXED

---

## ERR-13: Bot stays inactive, sleeping 600+ minutes (2026-02-23)
**Síntoma:** Bot inicia correctamente con status "ready" pero el Smart Loop pausa inmediatamente reportando `Rate Limit (outside_business_hours)` a una hora en la que debería trabajar.
**Root Cause:** Los bots instanciaban `new IntelligentRateLimiter()` sin el atributo `this.instanceId`. El limiter caía en el fallback "global", guardando todos los stats en el mismo `daily-limits-global.json`. Por lo tanto, un bot (ej. Bot 1) gastaba la cuota o alteraba la fecha/fase forzando a los demás (Bot 2, 3, 4) al límite.
**Solución:** Inicializar siempre pasándole la variable correcta: `this.rateLimiter = new IntelligentRateLimiter(this.instanceId)`.
**Estado:** ✅ FIXED

---

## ERR-14: Endpoint POST /messages 500 TypeError (2026-02-23)
**Síntoma:** Excepciones no capturadas rompiendo el proceso o impidiendo procesados futuros. Error TypeError con `replace()` is not a function al llamar a la BD.
**Root Cause:** Mensajes nativos de sistema de WhatsApp (`status@broadcast` - estados y actualizaciones de canales) entran por el event listener de `message`. Como no traen un JID estándar numeríco, al llegar al backend, `req.body.phone` venía inválido o nulo.
**Solución:** Abortar el flujo temprano chequeando `if (message.from === 'status@broadcast') return;` directamente en los bots. Y agregar un if validando `!phone` en `/messages` de `server/index.js` retornando un Bad Request (400) en lugar de un Error 500.
**Estado:** ✅ FIXED
