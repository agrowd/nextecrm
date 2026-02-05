# 📋 DEBUG LOGS TRACKER

Este archivo trackea los console.log agregados para debugging.
**Antes de entregar a cliente:** Quitar todos los logs listados aquí.

---

## Formato
```
LOG-XX | archivo:linea | Descripción | Estado
```

**Estados:**
- `🔧 DEV` = Solo para desarrollo, QUITAR antes de producción
- `📊 KEEP` = Log útil para monitoreo, mantener
- `❌ REMOVED` = Ya fue quitado

---

## Logs Activos

| ID | Ubicación | Descripción | Estado |
|:---|:---|:---|:---|
| LOG-01 | `bot/index.js` | ? Emoji logs de estado del bot | 📊 KEEP |
| LOG-02 | `bot/services/rateLimiter.js` | 📊 [RateLimiter] stats loading | 🔧 DEV |
| LOG-03 | `server/index.js` | ? INCOMING request logs | 📊 KEEP |
| LOG-04 | `bot/index.js:821-825` | Rate limiter status logs | 🔧 DEV |

---

## Conteo por Archivo

| Archivo | Total Logs | DEV (quitar) | KEEP |
|:---|:---|:---|:---|
| `bot/index.js` | ~50 | 30 | 20 |
| `bot/services/rateLimiter.js` | ~15 | 10 | 5 |
| `server/index.js` | ~20 | 5 | 15 |

**Total a quitar antes de cliente:** ~45 logs

---

## Script para Quitar Logs (TODO)
```bash
# Buscar todos los console.log con prefijo 🔧
grep -rn "console.log.*🔧" bot/ server/
```

## Notas
- Usar prefijo `🔧` en logs temporales para fácil búsqueda
- Usar prefijo `📊` en logs que queremos mantener en prod
- Actualizar este archivo cada vez que agregás un console.log importante
