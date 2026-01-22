# ═══════════════════════════════════════════════════════════════════
# 🚀 GUÍA RÁPIDA DE CONFIGURACIÓN
# ═══════════════════════════════════════════════════════════════════

## 📝 Pasos para configurar:

1. **Copiar este archivo:**
   ```bash
   # En Windows (PowerShell):
   Copy-Item bot\.env.example bot\.env
   
   # En Linux/Mac:
   cp bot/.env.example bot/.env
   ```

2. **Obtener Gemini API Key (GRATIS):**
   - Ir a: https://makersuite.google.com/app/apikey
   - Click "Create API Key"
   - Copiar la key (empieza con "AIza...")
   - Pegar en `GEMINI_API_KEY=` del archivo `bot/.env`

3. **Configurar backend:**
   - Si el backend está en otro puerto, cambiar `BACKEND_URL`
   - Por defecto usa `http://localhost:3001`

4. **Ajustar rate limiting (opcional):**
   - `DAILY_MESSAGE_LIMIT`: Máximo de leads por día (default: 200)
   - `HOURLY_MESSAGE_LIMIT`: Máximo de mensajes por hora (default: 15)
   - Sistema escala gradualmente: 50→75→100→150→200 leads/día

5. **Configurar horarios (opcional):**
   - `BUSINESS_HOURS_START`: Hora de inicio (default: 9 = 9:00 AM)
   - `BUSINESS_HOURS_END`: Hora de fin (default: 21 = 9:00 PM)

---

## ⚠️ Variables CRÍTICAS (deben estar configuradas):

✅ **GEMINI_API_KEY** - Sin esto, los mensajes NO se generarán con IA

❌ Las demás son opcionales, tienen valores por defecto

---

## 🔍 Verificar configuración:

```bash
cd bot
npm start
```

Debe mostrar:
```
✅ Gemini API configurada correctamente
⏱️ Rate Limiter: 50 leads/día (escalando gradualmente)
```

Si muestra:
```
❌ GEMINI_API_KEY no configurada en .env
```
= Falta configurar la API key

---

## 📊 Valores Recomendados para Producción:

```env
GEMINI_API_KEY=AIzaSy... # TU KEY AQUÍ
BACKEND_URL=http://localhost:3001
DAILY_MESSAGE_LIMIT=200
HOURLY_MESSAGE_LIMIT=15
BUSINESS_HOURS_START=9
BUSINESS_HOURS_END=21
```

---

## 🆘 Troubleshooting:

**Error: "Cannot find .env file"**
→ Copiar `.env.example` a `.env` en carpeta `bot/`

**Error: "Invalid API key"**
→ Verificar que la key empiece con "AIza" y esté completa

**Bot no envía mensajes**
→ Verificar que `BACKEND_URL` apunte al servidor correcto

**Rate limit muy restrictivo**
→ Aumentar `HOURLY_MESSAGE_LIMIT` (máximo recomendado: 20)
