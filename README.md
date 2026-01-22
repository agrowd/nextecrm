# Google Maps Leads Scraper

Sistema completo para extraer leads de Google Maps y contactarlos automáticamente por WhatsApp.

## 🏗️ Arquitectura

### 1. **Extensión de Chrome** (`extension/`)
- **content.js**: Scrapper que extrae datos del panel derecho de Google Maps
- **popup.html/js**: Interfaz para configurar búsquedas (rubros + ubicaciones)
- **background.js**: Maneja la comunicación entre componentes

### 2. **Backend** (`server/`)
- **index.js**: API REST para recibir y procesar leads
- **models/Lead.js**: Modelo de datos con validación mejorada y tracking
- **services/jsonSync.js**: Sincronización con JSON local
- Endpoints: `/ingest`, `/next`, `/stats`, `/health`, `/leads`, `/messages`

### 3. **Bot de WhatsApp** (`bot/`)
- **index.js**: Bot automático que contacta leads
- **services/phoneValidator.js**: Validación de números argentinos
- **services/whatsappChecker.js**: Verificación de números en WhatsApp
- Usa `whatsapp-web.js` + `puppeteer`
- Secuencia de mensajes con delays aleatorios y variaciones
- Manejo automático de respuestas y actualización de estados

### 4. **Dashboard CRM** (`dashboard/`)
- **index.html**: Interfaz web completa con Bootstrap y Chart.js
- **crm.js**: Lógica del CRM con filtros y búsqueda
- Vista en tiempo real de leads, mensajes y estadísticas
- Envío manual de mensajes desde el frontend

## 🚀 Instalación

### 1. Backend
```bash
cd server
npm install
npm start
```

### 2. Bot de WhatsApp
```bash
cd bot
npm install
npm start
```

### 3. Extensión
1. Abrir Chrome → `chrome://extensions/`
2. Activar "Modo desarrollador"
3. Cargar carpeta `extension/`
4. Ir a Google Maps y usar la extensión

### 4. Dashboard CRM
1. Abrir `dashboard/index.html` en el navegador
2. El CRM se conecta automáticamente al backend
3. Ver estadísticas, leads y mensajes en tiempo real

## 📋 Flujo de Trabajo

### 1. **Configuración de Búsquedas**
- Abrir popup de la extensión
- Ingresar rubros (separados por coma): `peluquería, barbería, spa`
- Ingresar ubicaciones (separadas por coma): `Palermo, Recoleta, Belgrano`
- Hacer clic en "Iniciar Scraping"

### 2. **Scraping Automático**
- El scrapper recorre cada combinación rubro+ubicación
- Para cada negocio en el listado:
  - Hace clic en la tarjeta
  - Espera que cargue el panel derecho
  - Extrae: nombre, dirección, teléfono, web, rating, etc.
  - Envía al backend via `/ingest`

### 3. **Procesamiento en Backend**
- Valida y limpia los datos
- Detecta direcciones inválidas (como ratings)
- Evita duplicados
- Almacena en MongoDB

### 4. **Bot de WhatsApp**
- Consulta `/next` cada 60 segundos
- Obtiene leads sin website
- Valida números telefónicos argentinos
- Verifica números en WhatsApp antes de enviar
- Envía secuencia de mensajes con delays aleatorios (12-20s)
- Maneja respuestas automáticamente y actualiza estados

### 5. **Dashboard CRM**
- Interfaz web completa para gestionar todo el sistema
- Filtros por categorías: en cola, contactados, interesados, etc.
- Vista de mensajes con estados: enviado, entregado, leído, fallido
- Envío manual de mensajes desde el frontend
- Estadísticas en tiempo real con gráficos
- Detalle de leads con chat integrado

## 🔧 Configuración

### Variables de Entorno
```bash
# server/.env
MONGODB_URI=mongodb://localhost:27017/gmaps-leads-scraper
PORT=3001

# bot/.env
BACKEND_URL=http://localhost:3001
BOT_INTERVAL=60000
MESSAGE_SEQUENCE_DELAY=5000
SLACK_WEBHOOK_URL=opcional
```

## 🛡️ Características Anti-Bot

- **Delays aleatorios**: 6-12 segundos entre acciones
- **Detección de CAPTCHA**: Pausa automática si detecta bloqueo
- **Logs detallados**: Para debugging y monitoreo
- **User-Agent real**: Usa el navegador del usuario
- **Scroll suave**: Simula comportamiento humano

## 📊 Monitoreo

### Backend
- `/health`: Estado del servidor
- `/stats`: Estadísticas de leads
- `/system/status`: Estado completo del sistema
- Logs detallados en consola

### Bot
- QR code para autenticación
- Logs de mensajes enviados/recibidos
- Validación de números telefónicos
- Notificaciones a Slack (opcional)

### Dashboard CRM
- Estadísticas en tiempo real
- Filtros avanzados de leads
- Vista de mensajes con estados
- Gráficos de actividad y distribución

## 🐛 Solución de Problemas

### Error de Puppeteer
```bash
cd bot
npm install puppeteer
```

### Backend no responde
```bash
cd server
npm install
npm start
```

### Extensión no funciona
- Verificar que esté cargada en Chrome
- Revisar consola del navegador
- Verificar que el backend esté corriendo

## 📈 Próximas Mejoras

- [x] Interfaz web para monitoreo (CRM Dashboard)
- [x] Más opciones de mensajes con variaciones
- [x] Filtros avanzados de leads
- [x] Integración con CRM
- [x] Métricas de conversión
- [x] Validación de números telefónicos
- [x] Verificación de WhatsApp
- [ ] Integración con otros CRMs
- [ ] Campañas personalizadas
- [ ] Métricas de ROI

## 📝 Notas

- El scrapper extrae datos del **panel derecho** de Google Maps
- Los leads se procesan automáticamente por el bot
- El sistema es resistente a bloqueos y CAPTCHAs
- Todos los datos se almacenan en MongoDB 