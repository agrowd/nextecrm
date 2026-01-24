const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const Joi = require('joi');
const path = require('path');
const session = require('express-session');
const fs = require('fs').promises;
const fsSync = require('fs'); // Versión sincrónica para algunas operaciones
const { exec, spawn } = require('child_process');
require('dotenv').config();
console.log('→ MONGODB_URI:', process.env.MONGODB_URI);

// Función para loggear (con emisión a dashboard)
const log = (message, level = 'info', component = 'server', details = null, leadId = null, instanceId = 'server') => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${instanceId}] ${message}`);

  // Emitir a dashboards conectados para consola en tiempo real
  if (typeof io !== 'undefined') {
    io.emit('realtime_bot_log', {
      instanceId,
      level,
      message,
      timestamp
    });
  }

  // Guardar log en base de datos
  const logEntry = new Log({
    level,
    component,
    instanceId,
    message,
    details,
    leadId
  });
  logEntry.save().catch(err => console.error('Error guardando log:', err));
};

const Lead = require('./models/Lead');
const Message = require('./models/Message');
const Log = require('./models/Log');
const Config = require('./models/Config');
const TemplateVariant = require('./models/TemplateVariant');
// MongoDB es la fuente principal de datos

const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
const PORT = 8484; // Forzado a 8484 para evitar conflictos con 3001

// 🤖 Registro de Bots Conectados
const connectedBots = new Map(); // instanceId -> socketId
const botStatuses = new Map();   // instanceId -> { status, lastSeen, qr }

// 1. CORS - Configuración para permitir credenciales y origen dinámico
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

/* 
// 2. Helmet - Desactivado temporalmente para debuggear ERR_SSL_PROTOCOL_ERROR
app.use(helmet({
  hsts: false,
  crossOriginOpenerPolicy: false,
  crossOriginEmbedderPolicy: false,
  originAgentCluster: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'", "data:", "blob:", "https:", "*"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.socket.io", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:", "https:", "*"],
      mediaSrc: ["'self'", "data:", "blob:", "*"],
      connectSrc: ["'self'", "https:", "wss:", "*"],
    },
  },
}));
*/

// Middleware para debuggear headers (opcional)
app.use((req, res, next) => {
  // console.log(`[${req.method}] ${req.url} - Origin: ${req.headers.origin}`);
  next();
});

// Rate limiting para prevenir spam
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por ventana
  message: {
    error: 'Demasiadas requests desde esta IP',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});
app.use('/api/', limiter);

// Middleware para parsing JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Middleware de Autenticación
const requireAuth = (req, res, next) => {
  if (req.session && req.session.authenticated) {
    return next();
  }

  // Debug log for auth failure
  console.log(`🔒 Auth failed for: ${req.originalUrl}`);

  // Si es una ruta de API o pide JSON, devolver 401 en lugar de redirigir a HTML
  if (req.originalUrl.startsWith('/api/') ||
    req.path.startsWith('/api/') ||
    req.headers['accept']?.includes('application/json')) {
    return res.status(401).json({ error: 'No autorizado', loginRequired: true });
  }
  res.redirect('/login.html');
};

// 3. Session - Debe ir antes de cualquier ruta que use req.session
app.use(session({
  secret: 'nexus-crm-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // true solo si usamos https
    maxAge: 24 * 60 * 60 * 1000 // 24 horas
  }
}));

// Debug middleware para ver qué llega a la API
app.use('/api', (req, res, next) => {
  console.log(`[API REQUEST] ${req.method} ${req.originalUrl} - Auth: ${!!(req.session && req.session.authenticated)}`);
  next();
});

// Endpoint de Login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'natoh' && password === 'Federyco88!') {
    req.session.authenticated = true;
    req.session.user = username;
    return res.json({ success: true });
  }
  res.status(401).json({ success: false, error: 'Credenciales inválidas' });
});

// Servir Login sin protección
app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../crm-dashboard/login.html'));
});

// Redirigir root a dashboard (protegido)
app.get('/', (req, res) => {
  res.redirect('/dashboard');
});

// Proteger Dashboard y API (Middleware global para estas rutas)
app.use('/dashboard', requireAuth, express.static(path.join(__dirname, '../crm-dashboard')));
app.use('/crm', requireAuth, express.static(path.join(__dirname, '../crm-dashboard')));

// Proteger todas las rutas API excepto login
app.use('/api/*', (req, res, next) => {
  if (req.path === '/api/login') return next();
  requireAuth(req, res, next);
});

// Conectar a MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/gmaps-leads-scraper', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(async () => {
    console.log('✅ Conectado a MongoDB');
    // Inicializar variantes si no existen
    await seedTemplatesIfNeeded();
  })
  .catch((error) => {
    console.error('❌ Error conectando a MongoDB:', error);
    process.exit(1);
  });

// Esquema de validación para leads (más flexible)
const leadValidationSchema = Joi.object({
  name: Joi.string().required().min(1).max(200),
  phone: Joi.string().optional().allow('').max(50),
  address: Joi.string().optional().allow('').max(500),
  website: Joi.string().optional().allow('').max(500),
  mapsUrl: Joi.string().optional().allow('').max(1000),
  lat: Joi.number().optional().allow(null),
  lng: Joi.number().optional().allow(null),
  category: Joi.string().optional().allow('').max(200),
  rating: Joi.number().optional().allow(null),
  reviewCount: Joi.number().optional().allow(null),
  keyword: Joi.string().optional().allow('').max(200),
  location: Joi.string().optional().allow('').max(200),
  ip: Joi.string().optional().allow('').max(50),
  ua: Joi.string().optional().allow('').max(500)
});

// Middleware de validación mejorado - Silenciar errores de campos adicionales
const validateLead = (req, res, next) => {
  const { error } = leadValidationSchema.validate(req.body, {
    allowUnknown: true,  // Permitir campos adicionales
    stripUnknown: false  // No eliminar campos desconocidos
  });

  // Solo loggear errores críticos (como falta de nombre)
  if (error && error.details[0].path[0] === 'name') {
    console.log('❌ Error crítico de validación:', error.details[0].message);
    console.log('📊 Datos recibidos:', JSON.stringify(req.body, null, 2));
  }

  // Siempre continuar, incluso con errores menores
  next();
};

// Servir CRM Dashboard (WhatsApp Web Style)
app.use('/crm', express.static(path.join(__dirname, '../crm-dashboard')));

// Ruta de health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// ALMACENAMIENTO DE QRS EN MEMORIA (Para VPS Dashboard)
const botQRS = new Map(); // instanceId -> qrCodeString

// POST /bot/qr - Recibir QR desde el bot
app.post('/bot/qr', (req, res) => {
  const { instanceId, qr } = req.body;
  if (!instanceId || !qr) return res.status(400).send('Missing data');

  botQRS.set(instanceId, qr);

  // Actualizar también en botStatuses para que el dashboard lo vea inmediatamente
  const status = botStatuses.get(instanceId) || {};
  status.status = 'qr_required';
  status.qr = qr;
  status.lastSeen = Date.now();
  botStatuses.set(instanceId, status);

  io.emit('bot_status_update', { instanceId, status: 'qr_required', qr });
  // console.log(`📲 QR recibido para ${instanceId}`);
  res.send('OK');
});

// POST /api/bot/generate - Generar una nueva instancia de bot
app.post('/api/bot/generate', async (req, res) => {
  try {
    console.log('🏗️ Iniciando generación de nueva instancia de bot...');

    // 1. Detectar siguiente ID
    const rootDir = path.join(__dirname, '..');
    const items = await fs.readdir(rootDir);
    const botFolders = items.filter(i => i.startsWith('bot_') && !isNaN(i.split('_')[1]));

    let nextNum = 1;
    if (botFolders.length > 0) {
      const nums = botFolders.map(f => parseInt(f.split('_')[1]));
      nextNum = Math.max(...nums) + 1;
    } else if (items.includes('bot_2')) { // Caso especial si existen carpetas sin número correlativo
      nextNum = 3;
    } else if (items.includes('bot')) {
      nextNum = 2;
    }

    const newInstanceId = `bot_${nextNum}`;
    const newBotPath = path.join(rootDir, newInstanceId);
    const templatePath = path.join(rootDir, 'bot');

    console.log(`📂 Creando carpeta ${newInstanceId} desde plantilla...`);

    // 2. Crear carpeta
    await fs.mkdir(newBotPath, { recursive: true });

    // 3. Copiar archivos esenciales (manual para evitar copiar node_modules)
    const filesToCopy = [
      'index.js',
      'package.json',
      'services',
      // No copiamos .env, lo generaremos nuevo
      // No copiamos node_modules, usaremos symlink
      // No copiamos sessions ni .wwebjs_cache
    ];

    for (const item of filesToCopy) {
      const src = path.join(templatePath, item);
      const dest = path.join(newBotPath, item);

      try {
        const stats = await fs.stat(src);
        if (stats.isDirectory()) {
          // Copia recursiva simple para directorios
          await copyDir(src, dest);
        } else {
          await fs.copyFile(src, dest);
        }
      } catch (e) {
        console.warn(`⚠️ No se pudo copiar ${item}: ${e.message}`);
      }
    }

    // 4. Crear .env personalizado
    const templateEnv = await fs.readFile(path.join(templatePath, '.env'), 'utf8');
    const lines = templateEnv.split('\n');
    const newLines = lines.map(line => {
      if (line.startsWith('BOT_INSTANCE_ID=')) return `BOT_INSTANCE_ID=${newInstanceId}`;
      if (line.startsWith('BACKEND_URL=')) return `BACKEND_URL=${process.env.BACKEND_URL || 'http://localhost:8484'}`;
      // Mantener GEMINI_API_KEY y otros
      return line;
    });

    await fs.writeFile(path.join(newBotPath, '.env'), newLines.join('\n'));

    // 5. Crear Symlink para node_modules (Ahorro de espacio masivo)
    // En Windows requiere permisos de administrador o modo desarrollador
    const targetModules = path.join(templatePath, 'node_modules');
    const destModules = path.join(newBotPath, 'node_modules');

    try {
      if (process.platform === 'win32') {
        // En Windows usamos junction para evitar líos de permisos de symlinks
        await fs.symlink(targetModules, destModules, 'junction');
      } else {
        await fs.symlink(targetModules, destModules, 'dir');
      }
      console.log('🔗 Symlink a node_modules creado.');
    } catch (e) {
      console.error('❌ Error creando symlink:', e.message);
      console.log('ℹ️ Intentando copia ligera de package.json únicamente...');
    }

    // 6. Iniciar el bot (Procurar PM2 si está disponible, sino node directo)
    console.log(`🚀 Iniciando proceso para ${newInstanceId}...`);

    // Intentar PM2 primero (vía comando shell)
    exec(`npx pm2 start index.js --name ${newInstanceId}`, { cwd: newBotPath }, (error) => {
      if (error) {
        console.warn(`⚠️ PM2 no disponible o error al iniciar: ${error.message}`);
        console.log(' iniciando con node directo (background)...');

        // Fallback a spawn independiente
        const out = fsSync.openSync(path.join(newBotPath, 'out.log'), 'a');
        const err = fsSync.openSync(path.join(newBotPath, 'out.log'), 'a');

        const botProcess = spawn('node', ['index.js'], {
          cwd: newBotPath,
          detached: true,
          stdio: ['ignore', out, err]
        });
        botProcess.unref();
      } else {
        console.log(`✅ ${newInstanceId} registrado en PM2.`);
      }
    });

    res.json({
      success: true,
      message: `Instancia ${newInstanceId} generada e iniciando...`,
      instanceId: newInstanceId
    });

  } catch (error) {
    console.error('❌ Error generando bot:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Helper para copiar directorios recursivamente
async function copyDir(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

// GET /bot/:instanceId/qr - Ver QR en navegador (Dashboard simple)
app.get('/bot/:instanceId/qr', (req, res) => {
  const { instanceId } = req.params;
  const qr = botQRS.get(instanceId);

  if (!qr) return res.send('<h2>⏳ Esperando QR... (Revisa si el bot inició)</h2><script>setTimeout(()=>location.reload(), 2000)</script>');

  // Renderizar QR usando librería 'qrcode' (cdn)
  res.send(`
    <html>
      <head><title>QR ${instanceId}</title></head>
      <body style="display:flex;flex-direction:column;align-items:center;font-family:sans-serif;background:#f0f2f5;padding:50px;">
        <h1>Escanea con WhatsApp (${instanceId})</h1>
        <div id="qrcode"></div>
        <p>Actualizando automáticamente...</p>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
        <script>
          new QRCode(document.getElementById("qrcode"), "${qr}");
          setTimeout(() => location.reload(), 5000); // Refrescar cada 5s por si cambia
        </script>
      </body>
    </html>
  `);
});

// Ruta del dashboard
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../crm-dashboard/index.html'));
});

// Servir archivo JSON de leads
app.get('/data/leads.json', async (req, res) => {
  try {
    const jsonPath = path.join(__dirname, 'data/leads.json');
    const content = await fs.readFile(jsonPath, 'utf8');
    res.setHeader('Content-Type', 'application/json');
    res.send(content);
  } catch (error) {
    console.error('Error sirviendo JSON:', error);
    res.status(500).json({ error: 'Error leyendo archivo JSON' });
  }
});

// Manejar solicitudes OPTIONS para CORS
app.options('/data/leads.json', (req, res) => {
  res.status(200).end();
});

// Actualizar archivo JSON de leads
app.post('/data/leads.json', async (req, res) => {
  try {
    const jsonPath = path.join(__dirname, 'data/leads.json');
    const data = req.body;

    // Asegurar que el directorio existe
    const dir = path.dirname(jsonPath);
    await fs.mkdir(dir, { recursive: true });

    // Guardar el JSON
    await fs.writeFile(jsonPath, JSON.stringify(data, null, 2));

    console.log('✅ Archivo JSON actualizado');
    res.json({ success: true, message: 'JSON actualizado correctamente' });
  } catch (error) {
    console.error('Error actualizando JSON:', error);
    res.status(500).json({ error: 'Error actualizando archivo JSON' });
  }
});

// POST /ingest - Recibir leads de la extensión
app.post('/ingest', validateLead, async (req, res) => {
  try {
    const leads = req.body;
    const leadsArray = Array.isArray(leads) ? leads : [leads];

    // Solo loggear si hay múltiples leads o si es un lead nuevo
    if (leadsArray.length > 1) {
      console.log(`📥 Recibiendo ${leadsArray.length} leads...`);
    }

    const inserted = [];
    const errors = [];
    const duplicates = [];

    for (let i = 0; i < leadsArray.length; i++) {
      const lead = leadsArray[i];

      try {
        // Validar que tenga al menos nombre
        if (!lead.name || typeof lead.name !== 'string' || lead.name.trim().length === 0) {
          errors.push({ index: i, error: 'Sin nombre válido' });
          continue;
        }

        // Limpiar y validar datos
        const cleanLead = {
          name: lead.name.trim(),
          phone: (lead.phone || '').trim(),
          address: (lead.address || '').trim(),
          website: (lead.website || '').trim(),
          mapsUrl: (lead.mapsUrl || '').trim(),
          category: (lead.category || '').trim(),
          rating: typeof lead.rating === 'number' ? lead.rating : null,
          reviewCount: typeof lead.reviewCount === 'number' ? lead.reviewCount : null,
          lat: typeof lead.lat === 'number' ? lead.lat : null,
          lng: typeof lead.lng === 'number' ? lead.lng : null,
          keyword: (lead.keyword || '').trim(),
          location: (lead.location || '').trim(),
          ip: (lead.ip || '').trim(),
          ua: (lead.ua || '').trim(),
          hasWebsite: !!(lead.website && lead.website.trim()),
          createdAt: new Date(),
          status: 'pending'
        };

        // Verificar que la dirección no sea un rating (como "4,9(620)")
        if (cleanLead.address && cleanLead.address.match(/^\d+[,.]?\d*\s*\(\d+\)$/)) {
          cleanLead.address = '';
        }

        // Verificar si ya existe un lead con el mismo nombre Y teléfono (más estricto)
        const existingLead = await Lead.findOne({
          name: cleanLead.name,
          phone: cleanLead.phone // Solo verificar por nombre Y teléfono exacto
        });

        if (existingLead) {
          duplicates.push(cleanLead.name);

          // Actualizar contador de veces que se ha scraped
          await Lead.findByIdAndUpdate(existingLead._id, {
            $inc: { scrapedCount: 1 },
            lastScrapedAt: new Date()
          });

          console.log(`⏭️ Lead duplicado detectado: ${cleanLead.name} (${cleanLead.phone})`);
        } else {
          // Insertar nuevo lead
          const newLead = new Lead(cleanLead);
          await newLead.save();

          inserted.push({ name: cleanLead.name, id: newLead._id });
          console.log(`✅ Lead insertado: ${cleanLead.name} (${cleanLead.phone})`);

          // MongoDB es la fuente principal de datos

          // Loggear solo leads nuevos
          log(`Nuevo lead insertado: ${cleanLead.name}`, 'success', 'backend', {
            keyword: cleanLead.keyword,
            location: cleanLead.location
          }, newLead._id);
        }

      } catch (e) {
        console.error(`❌ Error procesando lead:`, e.message);
        errors.push({ index: i, error: e.message });
      }
    }

    // Loggear resumen eficiente solo si hay actividad
    if (inserted.length > 0) {
      console.log(`📊 Resumen: ${inserted.length} nuevos, ${duplicates.length} duplicados`);
    } else if (duplicates.length > 0 && duplicates.length > 5) {
      console.log(`⏭️ Muchos duplicados (${duplicates.length})`);
    }

    // Obtener información de la cola
    const pendingLeads = await Lead.countDocuments({ status: 'pending' });
    const totalLeads = await Lead.countDocuments();

    const response = {
      success: true,
      inserted: inserted.length,
      errors: errors.length,
      duplicates: duplicates.length,
      queue: {
        pending: pendingLeads,
        total: totalLeads
      },
      message: `${inserted.length} leads nuevos insertados`
    };

    if (errors.length > 0) {
      response.errorDetails = errors;
    }

    // Solo loggear si hay leads nuevos o múltiples
    if (inserted.length > 0 || leadsArray.length > 1) {
      console.log('📤 Respuesta:', response);
    }

    res.json(response);

  } catch (error) {
    console.error('❌ Error procesando leads:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// GET /messages/by-phone/:phone - Buscar mensajes por número de teléfono
app.get('/messages/by-phone/:phone', async (req, res) => {
  try {
    const { phone } = req.params;

    // Buscar mensajes que coincidan con el número (con diferentes formatos)
    const messages = await Message.find({
      $or: [
        { phone: phone },
        { phone: phone.replace(/^549/, '') }, // Sin prefijo 549
        { phone: phone.replace(/^54/, '') }, // Sin prefijo 54
        { phone: phone.replace(/^0/, '') }, // Sin 0 inicial
        { phone: phone.replace(/\D/g, '') } // Solo números
      ]
    }).sort({ sentAt: -1 });

    res.json({
      success: true,
      messages: messages,
      count: messages.length
    });

  } catch (error) {
    console.error('Error buscando mensajes por teléfono:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// GET /lead/check-messages - DOBLE CHECK DE SEGURIDAD 🛡️
// Verifica si ya existen mensajes enviados a este teléfono en la BD
app.get('/lead/check-messages', async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone) return res.status(400).json({ error: 'Phone required' });

    // Buscar mensajes SENT, DELIVERED o READ para este teléfono
    const existingMessages = await Message.countDocuments({
      phone: phone,
      status: { $in: ['sent', 'delivered', 'read'] }
    });

    // También verificar si el lead ya está marcado como contactado
    const leadContacted = await Lead.findOne({
      phone: phone,
      status: { $in: ['contacted', 'interested', 'not_interested', 'completed'] }
    });

    res.json({
      safeToSend: existingMessages === 0 && !leadContacted,
      existingMessages,
      leadStatus: leadContacted ? leadContacted.status : 'clean',
      reason: existingMessages > 0 ? 'existing_messages' : (leadContacted ? 'lead_already_contacted' : null)
    });
  } catch (error) {
    console.error('Error en check-messages:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/next - Obtener el siguiente lead para el bot de WhatsApp (soporta multi-bot)
app.get('/api/next', async (req, res) => {
  try {
    const instanceId = req.query.instanceId || 'unknown_bot';
    const lead = await Lead.getNextLead(instanceId);

    if (!lead) {
      // Obtener información de la cola para el log
      const pendingLeads = await Lead.countDocuments({ status: 'pending' });
      const totalLeads = await Lead.countDocuments();

      return res.status(404).json({
        success: false,
        message: 'No hay leads sin website disponibles',
        queue: {
          pending: pendingLeads,
          total: totalLeads
        }
      });
    }

    // Obtener información de la cola
    const pendingLeads = await Lead.countDocuments({ status: 'pending' });
    const totalLeads = await Lead.countDocuments();

    res.json({
      success: true,
      lead: {
        id: lead._id,
        name: lead.name,
        phone: lead.phone,
        address: lead.address,
        category: lead.category,
        rating: lead.rating,
        reviewCount: lead.reviewCount,
        keyword: lead.keyword,
        status: lead.status
      },
      queue: {
        pending: pendingLeads,
        total: totalLeads
      }
    });

  } catch (error) {
    console.error('Error obteniendo siguiente lead:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// GET /api/conversations - Obtener historial unificado (CRM)
app.get('/api/conversations', async (req, res) => {
  try {
    const { page = 1, limit = 50, status, instanceId, sentFromNumber, phone } = req.query;

    const query = {};
    if (status) query.status = status;
    if (instanceId) query.instanceId = instanceId; // Filtrar por bot (bot_1, bot_2)
    if (sentFromNumber) query.sentFromNumber = sentFromNumber; // Filtrar por número de origen
    if (phone) query.phone = { $regex: phone, $options: 'i' }; // Búsqueda de lead

    // Obtener mensajes de la DB
    const messages = await Message.find(query)
      .sort({ sentAt: -1 }) // Más recientes primero
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    // Obtener total para paginación
    const total = await Message.countDocuments(query);

    res.json({
      success: true,
      data: messages,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /lead/:id/status - Actualizar estado de un lead
app.put('/lead/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, whatsappResponse, contactedByNumber, contactedByInstance } = req.body;

    const lead = await Lead.findById(id);
    if (!lead) {
      return res.status(404).json({
        error: 'Lead no encontrado'
      });
    }

    // Actualizar estado
    if (status) {
      lead.status = status;
      lead.lastContactAt = new Date();
    }

    // 🔑 MULTI-BOT: Guardar qué número/instancia contactó
    if (contactedByNumber) {
      lead.contactedByNumber = contactedByNumber;
    }
    if (contactedByInstance) {
      lead.contactedByInstance = contactedByInstance;
    }

    // Actualizar respuesta de WhatsApp si se proporciona
    if (whatsappResponse) {
      lead.whatsappResponse = whatsappResponse;
      lead.lastContactAt = new Date();
    }

    await lead.save();

    res.json({
      success: true,
      message: 'Lead actualizado correctamente',
      lead: {
        id: lead._id,
        name: lead.name,
        status: lead.status,
        lastContactAt: lead.lastContactAt
      }
    });

  } catch (error) {
    console.error('Error actualizando lead:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// GET /api/stats - Obtener estadísticas del sistema
app.get('/api/stats', async (req, res) => {
  try {
    const totalLeads = await Lead.countDocuments();
    const leadsWithPhone = await Lead.countDocuments({ phone: { $exists: true, $ne: '' } });
    const leadsWithoutPhone = await Lead.countDocuments({
      $or: [{ phone: { $exists: false } }, { phone: '' }]
    });
    const contactedLeads = await Lead.countDocuments({ status: 'contacted' });
    const interestedLeads = await Lead.countDocuments({ status: 'interested' });
    const notInterestedLeads = await Lead.countDocuments({ status: 'not_interested' });
    const pendingLeads = await Lead.countDocuments({ status: 'pending' });

    const totalMessages = await Message.countDocuments();
    const sentMessages = await Message.countDocuments({ status: 'sent' });
    const deliveredMessages = await Message.countDocuments({ status: 'delivered' });
    const readMessages = await Message.countDocuments({ status: 'read' });

    res.json({
      success: true,
      stats: {
        total_leads: totalLeads,
        leads_with_phone: leadsWithPhone,
        leads_without_phone: leadsWithoutPhone,
        contacted_leads: contactedLeads,
        interested_leads: interestedLeads,
        not_interested_leads: notInterestedLeads,
        pending_leads: pendingLeads,
        total_messages: totalMessages,
        sent_messages: sentMessages,
        delivered_messages: deliveredMessages,
        read_messages: readMessages,
        last_updated: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// GET /api/stats/bots - Estadísticas detalladas por bot con tiempo estimado y rechazos
app.get('/api/stats/bots', async (req, res) => {
  try {
    // 1. Leads pendientes (para calcular tiempo estimado)
    const pendingLeads = await Lead.countDocuments({ status: 'pending' });
    const queuedLeads = await Lead.countDocuments({ status: 'queued' });

    // 2. Obtener configuración de delays
    const config = await Config.findOne({ key: 'global_bot_settings' });
    const delayMin = config?.settings?.delays?.min || 45;
    const delayMax = config?.settings?.delays?.max || 90;
    const avgDelaySeconds = (delayMin + delayMax) / 2;

    // 3. Calcular tiempo estimado (cada lead = 8 mensajes × delay promedio)
    const messagesPerLead = 8;
    const estimatedSecondsPerLead = avgDelaySeconds * messagesPerLead;
    const totalEstimatedSeconds = pendingLeads * estimatedSecondsPerLead;

    // Considerar que hay múltiples bots activos
    const activeBots = botStatuses.size || 1;
    const adjustedEstimatedSeconds = Math.ceil(totalEstimatedSeconds / Math.max(activeBots, 1));

    // 4. Mensajes por bot (agrupados por instanceId)
    const messagesByBot = await Message.aggregate([
      {
        $group: {
          _id: '$instanceId',
          total: { $sum: 1 },
          sent: { $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] } },
          delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
          read: { $sum: { $cond: [{ $eq: ['$status', 'read'] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
          today: {
            $sum: {
              $cond: [
                { $gte: ['$sentAt', new Date(new Date().setHours(0, 0, 0, 0))] },
                1, 0
              ]
            }
          }
        }
      },
      { $sort: { total: -1 } }
    ]);

    // 5. Estadísticas de rechazos
    const phoneBounced = await Lead.countDocuments({ phoneBounced: true });
    const phoneInvalid = await Lead.countDocuments({ phoneInvalid: true });
    const noWhatsApp = await Lead.countDocuments({
      phoneValidated: true,
      whatsappRegistered: false
    });
    const withWebsite = await Lead.countDocuments({ hasWebsite: true });

    // 6. Razones de rechazo agrupadas
    const rejectionReasons = await Lead.aggregate([
      {
        $match: {
          $or: [
            { phoneBounced: true },
            { phoneInvalid: true },
            { validationError: { $exists: true, $ne: '' } }
          ]
        }
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$phoneBounced', true] },
              'Número rebotado',
              {
                $cond: [
                  { $eq: ['$phoneInvalid', true] },
                  'Número inválido',
                  { $ifNull: ['$validationError', 'Error desconocido'] }
                ]
              }
            ]
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // 7. Leads contactados por cada bot
    const leadsByBot = await Lead.aggregate([
      {
        $match: { contactedByInstance: { $exists: true, $ne: '' } }
      },
      {
        $group: {
          _id: '$contactedByInstance',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      stats: {
        // Tiempo estimado
        estimated: {
          totalSeconds: adjustedEstimatedSeconds,
          hours: Math.floor(adjustedEstimatedSeconds / 3600),
          minutes: Math.floor((adjustedEstimatedSeconds % 3600) / 60),
          seconds: adjustedEstimatedSeconds % 60,
          pendingLeads,
          queuedLeads,
          activeBots: Math.max(activeBots, 1)
        },
        // Mensajes por bot
        bots: messagesByBot.map(b => ({
          instanceId: b._id || 'unknown',
          total: b.total,
          today: b.today,
          sent: b.sent,
          delivered: b.delivered,
          read: b.read,
          failed: b.failed
        })),
        // Leads contactados por bot
        leadsByBot: leadsByBot.map(l => ({
          instanceId: l._id,
          count: l.count
        })),
        // Rechazos
        rejections: {
          total: phoneBounced + phoneInvalid + noWhatsApp + withWebsite,
          byType: {
            phoneBounced,
            phoneInvalid,
            noWhatsApp,
            withWebsite
          },
          reasons: rejectionReasons.map(r => ({
            reason: r._id,
            count: r.count
          }))
        }
      }
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas de bots:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// GET /api/stats/realtime - Estadísticas en tiempo real para el dashboard
app.get('/api/stats/realtime', async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    // Leads en cola (pending + queued)
    const leadsInQueue = await Lead.countDocuments({ status: { $in: ['pending', 'queued'] } });
    const pendingLeads = await Lead.countDocuments({ status: 'pending' });
    const queuedLeads = await Lead.countDocuments({ status: 'queued' });

    // Mensajes enviados hoy (total)
    const messagesToday = await Message.countDocuments({
      sentAt: { $gte: todayStart }
    });

    // Mensajes por estado hoy
    const deliveredToday = await Message.countDocuments({
      sentAt: { $gte: todayStart },
      status: { $in: ['delivered', 'read'] }
    });

    const failedToday = await Message.countDocuments({
      sentAt: { $gte: todayStart },
      status: 'failed'
    });

    // Mensajes enviados en la última hora
    const messagesLastHour = await Message.countDocuments({
      sentAt: { $gte: oneHourAgo }
    });

    // Último mensaje enviado
    const lastMessage = await Message.findOne({})
      .sort({ sentAt: -1 })
      .select('sentAt leadName phone instanceId status');

    // Leads contactados hoy (donde el mensaje llegó)
    const leadsContactedToday = await Lead.countDocuments({
      lastContactAt: { $gte: todayStart },
      status: { $in: ['contacted', 'interested', 'not_interested'] }
    });

    // Leads donde NO llegó el mensaje
    const leadsFailedToday = await Lead.countDocuments({
      lastContactAt: { $gte: todayStart },
      $or: [
        { phoneBounced: true },
        { phoneInvalid: true }
      ]
    });

    // Mensajes por bot hoy
    const messagesByBotToday = await Message.aggregate([
      {
        $match: { sentAt: { $gte: todayStart } }
      },
      {
        $group: {
          _id: '$instanceId',
          total: { $sum: 1 },
          delivered: {
            $sum: { $cond: [{ $in: ['$status', ['delivered', 'read']] }, 1, 0] }
          },
          failed: {
            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
          }
        }
      },
      { $sort: { total: -1 } }
    ]);

    // Bots activos (conectados via WebSocket)
    const activeBots = Array.from(botStatuses.entries())
      .filter(([_, status]) => status.status === 'ready')
      .map(([id, status]) => ({
        instanceId: id,
        wid: status.wid,
        lastSeen: status.lastSeen
      }));

    res.json({
      success: true,
      stats: {
        queue: {
          total: leadsInQueue,
          pending: pendingLeads,
          queued: queuedLeads
        },
        messages: {
          today: messagesToday,
          deliveredToday: deliveredToday,
          failedToday: failedToday,
          lastHour: messagesLastHour,
          lastMessage: lastMessage ? {
            time: lastMessage.sentAt,
            timeAgo: Math.round((Date.now() - new Date(lastMessage.sentAt).getTime()) / 1000 / 60) + ' min',
            leadName: lastMessage.leadName,
            phone: lastMessage.phone,
            bot: lastMessage.instanceId,
            status: lastMessage.status
          } : null
        },
        leads: {
          contactedToday: leadsContactedToday,
          failedToday: leadsFailedToday
        },
        bots: {
          active: activeBots.length,
          list: activeBots,
          todayStats: messagesByBotToday.map(b => ({
            instanceId: b._id || 'unknown',
            messagestoday: b.total,
            delivered: b.delivered,
            failed: b.failed
          }))
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas en tiempo real:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/bot/create - Crear nueva instancia de bot para VPS
app.post('/api/bot/create', async (req, res) => {
  try {
    const { botName } = req.body;
    const baseDir = path.resolve(__dirname, '..');

    // Determinar el próximo número de bot
    const existingBots = (await fs.readdir(baseDir))
      .filter(f => f.startsWith('bot_') || f === 'bot')
      .length;

    const newBotNumber = existingBots + 1;
    const newBotId = botName || `bot_${newBotNumber}`;
    const newBotPath = path.join(baseDir, newBotId);
    const sourceBotPath = path.join(baseDir, 'bot'); // bot_1 es el template

    // Verificar que no exista ya
    try {
      await fs.access(newBotPath);
      return res.status(400).json({
        error: 'Bot ya existe',
        message: `La carpeta ${newBotId} ya existe`
      });
    } catch (e) {
      // Si no existe, continuamos (es lo esperado)
    }

    // Crear directorio
    await fs.mkdir(newBotPath, { recursive: true });

    // Archivos esenciales a copiar
    const filesToCopy = [
      'index.js',
      'package.json',
      'package-lock.json'
    ];

    // Copiar archivos
    for (const file of filesToCopy) {
      try {
        const content = await fs.readFile(path.join(sourceBotPath, file));
        await fs.writeFile(path.join(newBotPath, file), content);
      } catch (e) {
        console.warn(`No se pudo copiar ${file}:`, e.message);
      }
    }

    // Copiar carpeta services
    const servicesSource = path.join(sourceBotPath, 'services');
    const servicesDest = path.join(newBotPath, 'services');
    await fs.mkdir(servicesDest, { recursive: true });

    try {
      const serviceFiles = await fs.readdir(servicesSource);
      for (const file of serviceFiles) {
        const srcPath = path.join(servicesSource, file);
        const stat = await fs.stat(srcPath);
        if (stat.isFile()) {
          await fs.copyFile(srcPath, path.join(servicesDest, file));
        }
      }
    } catch (e) {
      console.warn('Error copiando services:', e.message);
    }

    // Leer .env del bot template y modificar INSTANCE_ID
    let envContent = '';
    try {
      envContent = await fs.readFile(path.join(sourceBotPath, '.env'), 'utf8');
      // Reemplazar INSTANCE_ID
      envContent = envContent.replace(
        /INSTANCE_ID=.*/g,
        `INSTANCE_ID=${newBotId}`
      );
      // Si no existe, agregarlo
      if (!envContent.includes('INSTANCE_ID=')) {
        envContent += `\nINSTANCE_ID=${newBotId}\n`;
      }
    } catch (e) {
      // Crear .env básico
      envContent = `
INSTANCE_ID=${newBotId}
SERVER_URL=http://localhost:8484
GEMINI_API_KEY=${process.env.GEMINI_API_KEY || 'your-api-key'}
`.trim();
    }

    await fs.writeFile(path.join(newBotPath, '.env'), envContent);

    // Crear carpeta sessions vacía
    await fs.mkdir(path.join(newBotPath, 'sessions'), { recursive: true });

    // Generar script de inicio para PM2
    const pm2Config = {
      name: newBotId,
      script: 'index.js',
      cwd: newBotPath,
      env: {
        NODE_ENV: 'production',
        INSTANCE_ID: newBotId
      },
      watch: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000
    };

    // Guardar configuración PM2 individual
    await fs.writeFile(
      path.join(newBotPath, 'ecosystem.config.js'),
      `module.exports = { apps: [${JSON.stringify(pm2Config, null, 2)}] };`
    );

    // Crear script de inicio rápido
    const startScript = `
#!/bin/bash
cd "${newBotPath}"
npm install
pm2 start ecosystem.config.js
`.trim();

    await fs.writeFile(path.join(newBotPath, 'start.sh'), startScript);

    // Script para Windows
    const startScriptWin = `
@echo off
cd /d "${newBotPath}"
call npm install
call pm2 start ecosystem.config.js
`.trim();

    await fs.writeFile(path.join(newBotPath, 'start.bat'), startScriptWin);

    // Log de creación
    log(`Nueva instancia de bot creada: ${newBotId}`, 'info', 'server');

    // Notificar via WebSocket
    io.emit('bot_created', { instanceId: newBotId, path: newBotPath });

    res.json({
      success: true,
      message: `Bot ${newBotId} creado exitosamente`,
      bot: {
        instanceId: newBotId,
        path: newBotPath,
        startCommand: `cd ${newBotId} && npm install && node index.js`,
        pm2Command: `cd ${newBotId} && npm install && pm2 start ecosystem.config.js`
      }
    });

  } catch (error) {
    console.error('Error creando bot:', error);
    res.status(500).json({
      error: 'Error creando bot',
      message: error.message
    });
  }
});

// DELETE /api/bot/:instanceId - Eliminar una instancia de bot
app.delete('/api/bot/:instanceId', async (req, res) => {
  try {
    const { instanceId } = req.params;
    const folderName = instanceId === 'bot_1' ? 'bot' : instanceId;
    const baseDir = path.resolve(__dirname, '..');
    const botPath = path.join(baseDir, folderName);

    // No permitir eliminar bot_1 (template)
    if (instanceId === 'bot' || instanceId === 'bot_1') {
      return res.status(400).json({
        error: 'No se puede eliminar el bot template',
        message: 'bot_1 es el template principal y no puede ser eliminado'
      });
    }

    // Intentar detener en PM2 primero
    exec(`npx pm2 stop ${instanceId} && npx pm2 delete ${instanceId}`, (err) => {
      if (err) console.warn(`Aviso: No se pudo detener ${instanceId} en PM2 (quizás no estaba corriendo)`);
    });

    // Verificar que existe
    try {
      await fs.access(botPath);
    } catch (e) {
      return res.status(404).json({ error: 'Bot no encontrado' });
    }

    // Eliminar recursivamente
    await fs.rm(botPath, { recursive: true, force: true });

    // Remover del registro de bots
    connectedBots.delete(instanceId);
    botStatuses.delete(instanceId);

    // Notificar
    io.emit('bot_deleted', { instanceId });

    res.json({
      success: true,
      message: `Bot ${instanceId} eliminado`
    });
  } catch (error) {
    console.error('Error eliminando bot:', error);
    res.status(500).json({ error: error.message });
  }
});

// --- PM2 BOT CONTROL ---

// POST /api/bot/:instanceId/start - Iniciar bot
app.post('/api/bot/:instanceId/start', async (req, res) => {
  const { instanceId } = req.params;
  const folderName = instanceId === 'bot_1' ? 'bot' : instanceId;
  const baseDir = path.resolve(__dirname, '..');
  const botPath = path.join(baseDir, folderName);
  const configPath = path.join(botPath, 'ecosystem.config.js');

  console.log(`🚀 Iniciando bot ${instanceId}...`);

  try {
    await fs.access(configPath);

    // Usar pm2 start or restart si ya existe
    exec(`npx pm2 start ${configPath} --name ${instanceId}`, (error, stdout, stderr) => {
      if (error) {
        // Si falla porque ya existe, intentar restart
        exec(`npx pm2 restart ${instanceId}`, (err2) => {
          if (err2) return res.status(500).json({ success: false, error: err2.message });
          res.json({ success: true, message: `Bot ${instanceId} reiniciado` });
        });
        return;
      }
      res.json({ success: true, message: `Bot ${instanceId} iniciado` });
    });
  } catch (e) {
    res.status(404).json({ success: false, error: 'Configuración de bot no encontrada' });
  }
});

// POST /api/bot/:instanceId/stop - Detener bot
app.post('/api/bot/:instanceId/stop', async (req, res) => {
  const { instanceId } = req.params;
  console.log(`⏹️ Deteniendo bot ${instanceId}...`);

  exec(`npx pm2 stop ${instanceId}`, (error, stdout, stderr) => {
    // No devolvemos error 500 si falla el stop (puede estar ya parado)
    res.json({ success: true, message: `Bot ${instanceId} detenido o ya inactivo` });
  });
});

// GET /api/bot/:instanceId/status - Ver estado real en PM2
app.get('/api/bot/:instanceId/status', (req, res) => {
  const { instanceId } = req.params;
  exec(`npx pm2 jlist`, (error, stdout, stderr) => {
    if (error) return res.status(500).json({ success: false, error: error.message });
    try {
      const list = JSON.parse(stdout);
      const bot = list.find(app => app.name === instanceId);
      res.json({
        success: true,
        instanceId,
        pm2_status: bot ? bot.pm2_env.status : 'stopped',
        memory: bot ? Math.round(bot.monit.memory / 1024 / 1024) + 'MB' : '0MB',
        cpu: bot ? bot.monit.cpu + '%' : '0%'
      });
    } catch (e) {
      res.status(500).json({ success: false, error: 'Error parseando PM2' });
    }
  });
});

// DELETE /api/lead/:id - Eliminar lead
app.delete('/api/lead/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const lead = await Lead.findByIdAndDelete(id);
    if (!lead) return res.status(404).json({ error: 'Lead no encontrado' });

    // También borrar sus mensajes
    await Message.deleteMany({ leadId: id });

    res.json({ success: true, message: 'Lead eliminado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/bots/list - Listar todos los bots disponibles (Sincronizado con PM2)
app.get('/api/bots/list', async (req, res) => {
  try {
    const baseDir = path.resolve(__dirname, '..');

    // Obtener lista de procesos PM2
    let pm2List = [];
    try {
      const { stdout } = await new Promise((resolve, reject) => {
        exec('npx pm2 jlist', (err, stdout) => {
          if (err) return reject(err);
          resolve({ stdout });
        });
      });
      pm2List = JSON.parse(stdout);
    } catch (e) {
      console.warn('Error leyendo PM2 list:', e.message);
    }

    const items = await fs.readdir(baseDir);
    const bots = [];

    for (const item of items) {
      if (item.startsWith('bot')) {
        const botPath = path.join(baseDir, item);
        try {
          const stat = await fs.stat(botPath);
          if (stat.isDirectory()) {
            try {
              await fs.access(path.join(botPath, 'index.js'));

              // Buscar estado real en PM2
              const pm2Process = pm2List.find(p => p.name === item);
              const memory = pm2Process ? Math.round(pm2Process.monit.memory / 1024 / 1024) : 0;

              // Prioridad de estado: PM2 > Memoria interna > Offline
              let finalStatus = 'offline';
              if (pm2Process) {
                finalStatus = pm2Process.pm2_env.status; // online, stopped, errored
              } else if (botStatuses.has(item)) {
                finalStatus = botStatuses.get(item).status;
              }

              // FIX: Omitir bot_1 fantasma y el bot de plantilla
              if ((item === 'bot_1' || item === 'bot') && finalStatus === 'offline' && !pm2Process) {
                // Skip ghost bot_1/bot
              } else {
                bots.push({
                  instanceId: item,
                  path: botPath,
                  status: finalStatus,
                  pm2_status: pm2Process ? pm2Process.pm2_env.status : 'stopped',
                  memory: memory + 'MB',
                  lastSeen: botStatuses.get(item)?.lastSeen || null
                });
              }
            } catch (e) { }
          }
        } catch (e) { }
      }
    }

    res.json({
      success: true,
      bots: bots.sort((a, b) => a.instanceId.localeCompare(b.instanceId))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/stats/realtime - Estadísticas en tiempo real para el dashboard (FIX 305 leads issue)
app.get('/api/stats/realtime', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Conteo de leads
    const pending = await Lead.countDocuments({ status: 'pending' });
    const queued = await Lead.countDocuments({ status: 'queued' });

    // Total real en cola
    const totalQueue = pending + queued;

    const contactedToday = await Lead.countDocuments({
      lastContactAt: { $gte: today },
      status: { $in: ['contacted', 'interested', 'not_interested'] }
    });

    const leadsFailedToday = await Lead.countDocuments({
      lastContactAt: { $gte: today },
      status: 'failed'
    });

    // Conteo de mensajes
    const messagesToday = await Message.countDocuments({ sentAt: { $gte: today } });
    const deliveredToday = await Message.countDocuments({ sentAt: { $gte: today }, status: { $in: ['delivered', 'read'] } });
    const failedToday = await Message.countDocuments({ sentAt: { $gte: today }, status: 'failed' });

    const lastMessage = await Message.findOne().sort({ sentAt: -1 }).lean();

    // Stats por bot hoy
    const botStats = await Message.aggregate([
      { $match: { sentAt: { $gte: today } } },
      { $group: { _id: "$instanceId", count: { $sum: 1 } } }
    ]);

    const todayStats = botStats
      .map(b => ({
        instanceId: b._id,
        messagestoday: b.count
      }));

    res.json({
      success: true,
      stats: {
        queue: { total: totalQueue, pending, queued },
        leads: { contactedToday, failedToday },
        messages: {
          today: messagesToday,
          deliveredToday,
          failedToday,
          lastMessage: lastMessage ? {
            time: lastMessage.sentAt,
            bot: lastMessage.instanceId,
            leadName: lastMessage.leadName
          } : null
        },
        bots: { todayStats }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /system/status - Obtener estado del sistema
app.get('/system/status', async (req, res) => {
  try {
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();

    // Obtener estadísticas de la base de datos
    const totalLeads = await Lead.countDocuments();
    const totalMessages = await Message.countDocuments();
    const totalLogs = await Log.countDocuments();

    res.json({
      success: true,
      status: {
        server: {
          uptime: Math.floor(uptime),
          memory: {
            rss: Math.round(memoryUsage.rss / 1024 / 1024),
            heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
            heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024)
          },
          timestamp: new Date().toISOString()
        },
        database: {
          status: dbStatus,
          total_leads: totalLeads,
          total_messages: totalMessages,
          total_logs: totalLogs
        }
      }
    });
  } catch (error) {
    console.error('Error obteniendo estado del sistema:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// GET /api/leads/categories - Obtener categorías de leads
app.get('/api/leads/categories', async (req, res) => {
  try {
    const categories = await Lead.aggregate([
      {
        $group: {
          _id: '$keyword',
          count: { $sum: 1 },
          statuses: {
            $push: '$status'
          }
        }
      },
      {
        $project: {
          keyword: '$_id',
          count: 1,
          pending: {
            $size: {
              $filter: {
                input: '$statuses',
                cond: { $eq: ['$$this', 'pending'] }
              }
            }
          },
          contacted: {
            $size: {
              $filter: {
                input: '$statuses',
                cond: { $eq: ['$$this', 'contacted'] }
              }
            }
          },
          interested: {
            $size: {
              $filter: {
                input: '$statuses',
                cond: { $eq: ['$$this', 'interested'] }
              }
            }
          },
          not_interested: {
            $size: {
              $filter: {
                input: '$statuses',
                cond: { $eq: ['$$this', 'not_interested'] }
              }
            }
          }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    res.json({
      success: true,
      categories: categories
    });
  } catch (error) {
    console.error('Error obteniendo categorías:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// GET /api/json/leads - Obtener leads de la base de datos (con paginación)
app.get('/api/json/leads', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 500,
      status,
      keyword,
      search
    } = req.query;

    const query = {};
    if (status) query.status = status;
    if (keyword) query.keyword = keyword;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const leads = await Lead.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Lead.countDocuments(query);

    // Asegurar que _id sea string para el frontend
    const formattedLeads = leads.map(l => ({
      ...l,
      _id: l._id.toString()
    }));

    res.json({
      success: true,
      leads: formattedLeads,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error obteniendo leads:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// GET /json/messages - Obtener mensajes del JSON local
app.get('/json/messages', async (req, res) => {
  try {
    const messages = await Message.find({}).lean();
    res.json({
      success: true,
      messages: messages
    });
  } catch (error) {
    console.error('Error obteniendo mensajes del JSON:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// GET /api/messages - Obtener mensajes de la base de datos
app.get('/api/messages', async (req, res) => {
  try {
    const {
      leadId,
      status,
      limit = 100,
      offset = 0,
      sort = '-sentAt'
    } = req.query;

    const filter = {};
    if (leadId) filter.leadId = leadId;
    if (status) filter.status = status;

    const messages = await Message.find(filter)
      .sort(sort)
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .populate('leadId', 'name phone');

    const total = await Message.countDocuments(filter);

    res.json({
      success: true,
      messages: messages,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: total > parseInt(offset) + messages.length
      }
    });
  } catch (error) {
    console.error('Error obteniendo mensajes:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// GET /api/messages/stats - Obtener estadísticas de mensajes
app.get('/api/messages/stats', async (req, res) => {
  try {
    const stats = await Message.getMessageStats();
    const result = stats[0] || {
      total: 0, sent: 0, delivered: 0, read: 0, failed: 0, today: 0
    };

    res.json({
      success: true,
      stats: result
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas de mensajes:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// GET /api/stats/advanced - Estadísticas detalladas para gráficos
app.get('/api/stats/advanced', async (req, res) => {
  try {
    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 7);

    // 1. FUNNEL DE CONVERSIÓN
    const totalLeads = await Lead.countDocuments();
    const validPhones = await Lead.countDocuments({ phone: { $ne: null, $ne: '' }, phoneInvalid: false });
    const contacted = await Lead.countDocuments({ messagesSent: { $gt: 0 } });
    const replied = await Lead.countDocuments({ whatsappResponse: { $ne: null, $ne: '' } });
    const interested = await Lead.countDocuments({ status: 'interested' });

    // 2. ACTIVIDAD DIARIA (Últimos 7 días) - LEADS
    const leadsByDay = await Lead.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // 3. ACTIVIDAD DIARIA (Últimos 7 días) - MENSAJES
    const messagesByDay = await Message.aggregate([
      { $match: { sentAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$sentAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // 4. TOP CATEGORÍAS
    const topCategories = await Lead.aggregate([
      { $match: { category: { $ne: null, $ne: '' } } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // 5. SENTIMIENTOS (Estado de Leads)
    const sentimentStats = await Lead.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);

    // 6. TOP UBICACIONES
    const topLocations = await Lead.aggregate([
      { $match: { location: { $ne: null, $ne: '' } } },
      { $group: { _id: "$location", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 }
    ]);

    // 7. RENDIMIENTO DE BOTS (Mensajes por Instancia)
    const botPerf = await Message.aggregate([
      { $group: { _id: "$instanceId", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      funnel: {
        total: totalLeads,
        valid: validPhones,
        contacted: contacted,
        replied: replied,
        interested: interested
      },
      timeline: {
        leads: leadsByDay,
        messages: messagesByDay
      },
      categories: topCategories,
      sentiments: sentimentStats.reduce((acc, curr) => ({ ...acc, [curr._id]: curr.count }), {}),
      locations: topLocations,
      botPerformance: botPerf
    });
  } catch (error) {
    console.error('Error stats advanced:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- CONFIGURACIÓN GLOBAL ---
app.get('/api/log-history', async (req, res) => {
  console.log('📬 Solicitud recibida en /api/log-history');
  try {
    const { component, instanceId, limit = 100 } = req.query;
    const filter = {};
    if (component) filter.component = component;
    if (instanceId) filter.instanceId = instanceId;

    const logs = await Log.find(filter)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .lean();

    res.json({ success: true, logs: logs.reverse() });
  } catch (error) {
    console.error('❌ Error en /api/log-history:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/config', async (req, res) => {
  try {
    let config = await Config.findOne({ key: 'global_bot_settings' });
    if (!config) {
      config = await Config.create({
        key: 'global_bot_settings',
        settings: {} // Defaults applied from Schema
      });
    }
    res.json({ success: true, config: config.settings });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/config', async (req, res) => {
  try {
    const { settings } = req.body;
    const config = await Config.findOneAndUpdate(
      { key: 'global_bot_settings' },
      { $set: { settings } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    // Notificar a todos los bots conectados del cambio
    io.emit('bot_config_updated', config.settings);

    res.json({ success: true, config: config.settings });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/webhooks/whatsapp-status', async (req, res) => {
  try {
    const { phone, status, tags } = req.body;
    // Lógica para actualizar lead basado en etiquetas o status de WA
    // Por ahora simple log y update status
    if (status) {
      await Lead.updateMany({ phone: { $regex: phone.replace(/\D/g, '') } }, { status });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- GESTIÓN DE PLANTILLAS (MENSAJES) ---

// Función para inicializar plantillas desde AdvancedTemplateGenerator
async function seedTemplatesIfNeeded() {
  try {
    const count = await TemplateVariant.countDocuments();
    if (count > 0) return;

    console.log('🌱 Inicializando plantillas en la base de datos...');
    const AdvancedTemplateGenerator = require('../bot/services/advancedTemplateGenerator');
    const gen = new AdvancedTemplateGenerator();

    const categories = [
      { key: 'saludos', data: gen.saludos },
      { key: 'introsNegocio', data: gen.introsNegocio },
      { key: 'hooksNoWeb', data: gen.hooksNoWeb },
      { key: 'hooksConWeb', data: gen.hooksConWeb },
      { key: 'presentaciones', data: gen.presentaciones },
      { key: 'propuestas', data: gen.propuestas },
      { key: 'respuestasBotAutomatico', data: gen.respuestasBotAutomatico },
      { key: 'serviciosCompletos', data: gen.serviciosCompletos },
      { key: 'ctasReunion', data: gen.ctasReunion }
    ];

    for (const cat of categories) {
      const template = new TemplateVariant({
        category: cat.key,
        variants: cat.data.map(content => ({ content, isActive: true }))
      });
      await template.save();
    }
    console.log('✅ Plantillas inicializadas con éxito');
  } catch (error) {
    console.error('❌ Error inicializando plantillas:', error);
  }
}

// GET /api/templates - Obtener todas las plantillas
app.get('/api/templates', async (req, res) => {
  try {
    const templates = await TemplateVariant.find({});
    res.json({ success: true, templates });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/templates/:category - Actualizar variantes de una categoría
app.post('/api/templates/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const { variants } = req.body;

    const template = await TemplateVariant.findOneAndUpdate(
      { category },
      { variants },
      { new: true, upsert: true }
    );

    // Notificar a los bots que las plantillas cambiaron
    io.emit('templates_updated', { category, variants });

    res.json({ success: true, template });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- CONFIGURACIÓN GLOBAL DE BOTS ---
app.get('/api/bot/config', async (req, res) => {
  try {
    let config = await Config.findOne({ key: 'global_bot_settings' });
    if (!config) {
      config = new Config({ key: 'global_bot_settings', settings: {} });
      await config.save();
    }
    res.json({ success: true, config: config.settings });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/bot/config', async (req, res) => {
  try {
    const { settings } = req.body;
    let config = await Config.findOne({ key: 'global_bot_settings' });
    if (!config) {
      config = new Config({ key: 'global_bot_settings', settings });
    } else {
      config.settings = { ...config.settings, ...settings };
    }
    await config.save();

    // Notificar a todos los bots que la configuración cambió
    if (global.io) global.io.emit('bot_config_updated', config.settings);

    res.json({ success: true, message: 'Configuración actualizada', config: config.settings });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- TRACKING DE SCRAPER (EXTENSIÓN) ---
let activeScrapers = new Map(); // extensionId -> metadata
app.post('/scraper/heartbeat', (req, res) => {
  const { extensionId, keyword, location, stats } = req.body;
  activeScrapers.set(extensionId, {
    keyword,
    location,
    stats,
    lastSeen: Date.now()
  });

  // Limpiar scrapers inactivos (más de 1 min)
  for (const [id, data] of activeScrapers.entries()) {
    if (Date.now() - data.lastSeen > 60000) activeScrapers.delete(id);
  }

  if (global.io) global.io.emit('scraper_status_update', Array.from(activeScrapers.entries()));
  res.json({ success: true });
});

app.get('/scraper/active', (req, res) => {
  res.json({ success: true, scrapers: Array.from(activeScrapers.values()) });
});

// GET /messages/lead/:leadId - Obtener mensajes de un lead específico
app.get('/messages/lead/:leadId', async (req, res) => {
  try {
    const { leadId } = req.params;
    const messages = await Message.getMessagesByLead(leadId);

    res.json({
      success: true,
      messages: messages
    });
  } catch (error) {
    console.error('Error obteniendo mensajes del lead:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// GET /messages/by-phone/:phone - Obtener mensajes por número de teléfono
app.get('/messages/by-phone/:phone', async (req, res) => {
  try {
    const { phone } = req.params;

    // Buscar mensajes con diferentes formatos del número
    const searchQueries = [
      phone,
      phone.replace(/^549/, ''),
      phone.replace(/^54/, ''),
      `549${phone}`,
      `54${phone}`
    ];

    const messages = await Message.find({
      phone: { $in: searchQueries }
    }).sort({ sentAt: -1 });

    res.json({
      success: true,
      messages: messages,
      count: messages.length
    });
  } catch (error) {
    console.error('Error obteniendo mensajes por teléfono:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// POST /api/messages - Crear nuevo mensaje
app.post('/api/messages', async (req, res) => {
  try {
    const messageData = req.body;

    // Validar datos requeridos
    if (!messageData.leadName || !messageData.phone || !messageData.content) {
      return res.status(400).json({
        error: 'Datos incompletos',
        message: 'leadName, phone y content son requeridos'
      });
    }

    // 🔍 Si el leadId es dummy o falta, intentar buscar por teléfono
    if (!messageData.leadId || messageData.leadId === "000000000000000000000000") {
      const foundLead = await Lead.findOne({ phone: messageData.phone });
      if (foundLead) {
        messageData.leadId = foundLead._id;
      } else {
        // No existe el lead. Podríamos crearlo, pero por ahora lo dejamos como "manual_chat"
        // Para no romper la DB, necesitamos un ObjectId válido si el schema lo requiere.
        // Si el schema requiere ref: 'Lead', DEBEMOS tener un lead.
        // Crearemos un lead "Huerfano" para estos casos.
        const orphanLead = new Lead({
          name: messageData.leadName,
          phone: messageData.phone,
          status: 'contacted',
          category: 'Sync/Manual'
        });
        await orphanLead.save();
        messageData.leadId = orphanLead._id;
      }
    }

    // 🛡️ Deduplicación: Verificar si el mensaje ya existe por su ID de WhatsApp
    if (messageData.whatsappMessageId) {
      const existing = await Message.findOne({ whatsappMessageId: messageData.whatsappMessageId });
      if (existing) {
        return res.json({
          success: true,
          message: 'Mensaje ya existe (duplicado ignorado)',
          data: existing,
          isDuplicate: true
        });
      }
    }

    // Crear mensaje
    const message = new Message(messageData);
    await message.save();

    // Actualizar estadísticas del lead
    await Lead.findByIdAndUpdate(messageData.leadId, {
      $inc: { messagesSent: 1 },
      lastMessageAt: new Date()
    });

    console.log(`✅ Mensaje creado para ${messageData.leadName}`);

    // 📡 Notificar al dashboard en tiempo real
    io.emit('realtime_message', {
      instanceId: messageData.instanceId || 'unknown',
      from: messageData.metadata?.manual ? 'me' : (messageData.botInstance === 'manual' ? 'me' : 'system'), // Ajustar según lógica
      to: messageData.phone,
      body: messageData.content,
      timestamp: messageData.sentAt || Date.now()
    });

    res.json({
      success: true,
      message: 'Mensaje creado exitosamente',
      data: message
    });
  } catch (error) {
    console.error('Error creando mensaje:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// PUT /messages/:id/status - Actualizar estado de mensaje
app.put('/messages/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const message = await Message.findByIdAndUpdate(id, { status }, { new: true });

    if (!message) {
      return res.status(404).json({
        error: 'Mensaje no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Estado actualizado exitosamente',
      data: message
    });
  } catch (error) {
    console.error('Error actualizando estado del mensaje:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// POST /send-message - Enviar mensaje manualmente
app.post('/send-message', async (req, res) => {
  try {
    const { leadId, message } = req.body;

    if (!leadId || !message) {
      return res.status(400).json({
        error: 'Datos incompletos',
        message: 'leadId y message son requeridos'
      });
    }

    // Obtener lead
    const lead = await Lead.findById(leadId);
    if (!lead) {
      return res.status(404).json({
        error: 'Lead no encontrado'
      });
    }

    if (!lead.phone) {
      return res.status(400).json({
        error: 'Lead sin teléfono',
        message: 'No se puede enviar mensaje a un lead sin teléfono'
      });
    }

    // Crear mensaje en base de datos
    const messageData = {
      leadId: lead._id,
      leadName: lead.name,
      phone: lead.phone,
      messageNumber: (lead.messagesSent || 0) + 1,
      content: message,
      status: 'sent',
      sentAt: new Date(),
      botInstance: 'manual',
      metadata: {
        sentBy: 'dashboard',
        manual: true
      }
    };

    const newMessage = new Message(messageData);
    await newMessage.save();

    // Actualizar lead
    await Lead.findByIdAndUpdate(leadId, {
      $inc: { messagesSent: 1 },
      lastMessageAt: new Date(),
      status: 'contacted'
    });

    console.log(`✅ Mensaje manual enviado a ${lead.name}: ${message}`);

    res.json({
      success: true,
      message: 'Mensaje enviado exitosamente',
      data: newMessage
    });
  } catch (error) {
    console.error('Error enviando mensaje manual:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// GET /api/leads - Listar leads con filtros
app.get('/api/leads', async (req, res) => {
  try {
    const {
      status,
      search,
      limit = 50,
      offset = 0,
      sort = '-createdAt',
      hasPhone,
      hasWebsite,
      phoneValidated,
      whatsappRegistered,
      category
    } = req.query;

    const filter = {};

    if (status) filter.status = status;
    if (hasPhone === 'true') filter.phone = { $exists: true, $ne: '' };
    if (hasWebsite === 'true') filter.hasWebsite = true;
    if (phoneValidated === 'true') filter.phoneValidated = true;
    if (whatsappRegistered === 'true') filter.whatsappRegistered = true;

    // Filtros por categoría
    if (category) {
      switch (category) {
        case 'queue':
          filter.status = 'pending'; // Solo status pendiente, sin inQueue
          break;
        case 'contacted':
          filter.status = 'contacted';
          break;
        case 'interested':
          filter.status = 'interested';
          break;
        case 'not_interested':
          filter.status = 'not_interested';
          break;
        case 'with_website':
          filter.hasWebsite = true;
          break;
        case 'phone_invalid':
          filter.phoneInvalid = true;
          break;
        case 'phone_bounced':
          filter.phoneBounced = true;
          break;
        case 'duplicates':
          filter.isDuplicate = true;
          break;
        case 'valid_phone':
          filter.phoneValidated = true;
          filter.phone = { $exists: true, $ne: '' };
          break;
      }
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } },
        { keyword: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } }
      ];
    }

    const leads = await Lead.find(filter)
      .sort(sort)
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .select('-__v');

    const total = await Lead.countDocuments(filter);

    res.json({
      success: true,
      leads: leads,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: total > parseInt(offset) + leads.length
      }
    });
  } catch (error) {
    console.error('Error obteniendo leads:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// GET /leads/categories - Obtener estadísticas por categoría
app.get('/leads/categories', async (req, res) => {
  try {
    const stats = await Lead.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          queue: { $sum: { $cond: [{ $and: [{ $eq: ['$inQueue', true] }, { $eq: ['$status', 'pending'] }] }, 1, 0] } },
          contacted: { $sum: { $cond: [{ $eq: ['$status', 'contacted'] }, 1, 0] } },
          interested: { $sum: { $cond: [{ $eq: ['$status', 'interested'] }, 1, 0] } },
          not_interested: { $sum: { $cond: [{ $eq: ['$status', 'not_interested'] }, 1, 0] } },
          with_website: { $sum: { $cond: [{ $eq: ['$hasWebsite', true] }, 1, 0] } },
          phone_invalid: { $sum: { $cond: [{ $eq: ['$phoneInvalid', true] }, 1, 0] } },
          phone_bounced: { $sum: { $cond: [{ $eq: ['$phoneBounced', true] }, 1, 0] } },
          duplicates: { $sum: { $cond: [{ $eq: ['$isDuplicate', true] }, 1, 0] } },
          valid_phone: { $sum: { $cond: [{ $and: [{ $eq: ['$phoneValidated', true] }, { $ne: ['$phone', ''] }] }, 1, 0] } }
        }
      }
    ]);

    const result = stats[0] || {
      total: 0, queue: 0, contacted: 0, interested: 0, not_interested: 0,
      with_website: 0, phone_invalid: 0, phone_bounced: 0, duplicates: 0, valid_phone: 0
    };

    res.json({
      success: true,
      categories: result
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas por categoría:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// GET /leads/:id - Obtener lead específico
app.get('/leads/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const lead = await Lead.findById(id);

    if (!lead) {
      return res.status(404).json({
        error: 'Lead no encontrado'
      });
    }

    res.json({
      success: true,
      lead: lead
    });
  } catch (error) {
    console.error('Error obteniendo lead:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// PATCH /leads/:id - Actualizar lead específico
app.patch('/leads/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Validar que el lead existe
    const existingLead = await Lead.findById(id);
    if (!existingLead) {
      return res.status(404).json({
        error: 'Lead no encontrado'
      });
    }

    // Actualizar el lead
    const updatedLead = await Lead.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: false } // runValidators: false para permitir campos adicionales
    );

    // Sincronizar con JSON
    // await jsonSync.syncLeadFromDB(updatedLead); // This line was removed as per the edit hint

    console.log(`✅ Lead actualizado: ${updatedLead.name}`);

    res.json({
      success: true,
      message: 'Lead actualizado exitosamente',
      lead: updatedLead
    });
  } catch (error) {
    console.error('Error actualizando lead:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// POST /sync-json - Sincronizar leads existentes con JSON
app.post('/sync-json', async (req, res) => {
  try {
    console.log('🔄 Sincronizando leads con JSON local...');

    const leads = await Lead.find({});
    let synced = 0;

    for (const lead of leads) {
      // await jsonSync.syncLeadFromDB(lead); // This line was removed as per the edit hint
      // The original jsonSync.syncLeadFromDB was removed from the imports, so this line is now effectively a no-op.
      // If jsonSync was intended to be re-added, it would need to be imported back.
      // For now, removing the line as per the edit hint.
    }

    console.log(`✅ ${synced} leads sincronizados con JSON`);

    res.json({
      success: true,
      message: `Sincronización completada`,
      synced: synced
    });

  } catch (error) {
    console.error('Error sincronizando JSON:', error);
    res.status(500).json({
      error: 'Error sincronizando JSON',
      message: error.message
    });
  }
});

// POST /rotate-ip - Endpoint para rotar IP (llamado por el bot)
app.post('/rotate-ip', async (req, res) => {
  try {
    console.log('🔄 Rotación de IP solicitada');

    // En producción, aquí se ejecutaría el script de rotación de WireGuard
    // Por ahora, solo simulamos la rotación

    setTimeout(() => {
      console.log('✅ IP rotada correctamente');
    }, 5000);

    res.json({
      success: true,
      message: 'Rotación de IP iniciada',
      estimatedTime: '5 segundos'
    });

  } catch (error) {
    console.error('Error rotando IP:', error);
    res.status(500).json({
      error: 'Error rotando IP',
      message: error.message
    });
  }
});

// GET /logs - Obtener logs del sistema
app.get('/logs', async (req, res) => {
  try {
    const {
      component,
      level,
      limit = 100,
      offset = 0,
      since
    } = req.query;

    const filter = {};

    if (component) filter.component = component;
    if (level) filter.level = level;
    if (since) {
      filter.timestamp = { $gte: new Date(since) };
    }

    const logs = await Log.find(filter)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .populate('leadId', 'name phone')
      .select('-__v');

    const total = await Log.countDocuments(filter);

    res.json({
      success: true,
      logs: logs,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: total > parseInt(offset) + logs.length
      }
    });
  } catch (error) {
    console.error('Error obteniendo logs:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// POST /logs - Crear nuevo log
app.post('/logs', async (req, res) => {
  try {
    const { level, component, message, details, leadId } = req.body;

    const logEntry = new Log({
      level: level || 'info',
      component: component || 'crm',
      message,
      details,
      leadId
    });

    await logEntry.save();

    res.json({
      success: true,
      log: logEntry
    });
  } catch (error) {
    console.error('Error creando log:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// POST /leads/reset-status - Resetear estado de todos los leads a 'pending'
app.post('/leads/reset-status', async (req, res) => {
  try {
    console.log('🔄 Reseteando estado de leads...');

    // Resetear todos los leads a 'pending'
    const result = await Lead.updateMany(
      { status: { $in: ['contacted', 'interested', 'not_interested', 'completed'] } },
      { status: 'pending' }
    );

    console.log(`✅ ${result.modifiedCount} leads reseteados a 'pending'`);

    // Obtener estadísticas actualizadas
    const pendingLeads = await Lead.countDocuments({ status: 'pending' });
    const totalLeads = await Lead.countDocuments();

    res.json({
      success: true,
      message: `${result.modifiedCount} leads reseteados a 'pending'`,
      stats: {
        pending: pendingLeads,
        total: totalLeads
      }
    });

  } catch (error) {
    console.error('❌ Error reseteando leads:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// POST /leads/reset - Resetear leads y volverlos a poner en cola
app.post('/leads/reset', async (req, res) => {
  try {
    const { leadIds, status = 'all' } = req.body;

    let filter = {};

    // Si se proporcionan IDs específicos
    if (leadIds && Array.isArray(leadIds) && leadIds.length > 0) {
      filter._id = { $in: leadIds };
    } else {
      // Si no se especifican IDs, resetear por estado
      if (status === 'all') {
        filter.status = { $in: ['contacted', 'interested', 'not_interested', 'completed'] };
      } else if (status === 'contacted') {
        filter.status = 'contacted';
      } else if (status === 'interested') {
        filter.status = 'interested';
      } else if (status === 'not_interested') {
        filter.status = 'not_interested';
      } else if (status === 'completed') {
        filter.status = 'completed';
      }
    }

    // Actualizar leads
    const result = await Lead.updateMany(filter, {
      $set: {
        status: 'pending',
        lastContactAt: null,
        nextActionAt: null,
        messagesSent: 0,
        messagesDelivered: 0,
        messagesRead: 0,
        lastMessageAt: null,
        totalMessageTime: 0,
        averageDelay: 0,
        messageVariations: [],
        whatsappResponse: '',
        phoneBounced: false,
        phoneInvalid: false,
        inQueue: false,
        queuePosition: null
      }
    });

    // MongoDB es la fuente principal de datos

    log(`Leads reseteados: ${result.modifiedCount} leads`, 'info', 'crm', {
      leadIds,
      status,
      modifiedCount: result.modifiedCount
    });

    res.json({
      success: true,
      message: `${result.modifiedCount} leads reseteados correctamente`,
      modifiedCount: result.modifiedCount,
      filter: filter
    });

  } catch (error) {
    console.error('Error reseteando leads:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// POST /leads/reset-all - Resetear todos los leads contactados
app.post('/leads/reset-all', async (req, res) => {
  try {
    const result = await Lead.updateMany(
      { status: { $in: ['contacted', 'interested', 'not_interested', 'completed'] } },
      {
        $set: {
          status: 'pending',
          lastContactAt: null,
          nextActionAt: null,
          messagesSent: 0,
          messagesDelivered: 0,
          messagesRead: 0,
          lastMessageAt: null,
          totalMessageTime: 0,
          averageDelay: 0,
          messageVariations: [],
          whatsappResponse: '',
          phoneBounced: false,
          phoneInvalid: false,
          inQueue: false,
          queuePosition: null
        }
      }
    );

    // MongoDB es la fuente principal de datos

    log(`Todos los leads contactados reseteados: ${result.modifiedCount} leads`, 'info', 'crm');

    res.json({
      success: true,
      message: `${result.modifiedCount} leads reseteados correctamente`,
      modifiedCount: result.modifiedCount
    });

  } catch (error) {
    console.error('Error reseteando todos los leads:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// PUT /leads/mark-all-contacted - Marcar todos los leads como 'contacted'
app.put('/leads/mark-all-contacted', async (req, res) => {
  try {
    console.log('🔄 Marcando todos los leads como "contacted"...');

    // Marcar todos los leads como 'contacted'
    const result = await Lead.updateMany(
      { status: { $ne: 'contacted' } },
      {
        $set: {
          status: 'contacted',
          lastContactAt: new Date()
        }
      }
    );

    console.log(`✅ ${result.modifiedCount} leads marcados como "contacted"`);

    // Obtener estadísticas actualizadas
    const contactedLeads = await Lead.countDocuments({ status: 'contacted' });
    const totalLeads = await Lead.countDocuments();

    res.json({
      success: true,
      message: `${result.modifiedCount} leads marcados como "contacted"`,
      modifiedCount: result.modifiedCount,
      stats: {
        contacted: contactedLeads,
        total: totalLeads
      }
    });

  } catch (error) {
    console.error('❌ Error marcando leads como contacted:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// PUT /api/leads/reset-today - Resetear leads scrapeados hoy
app.put('/api/leads/reset-today', async (req, res) => {
  try {
    const { date } = req.body;
    const today = date ? new Date(date) : new Date();
    today.setHours(0, 0, 0, 0);

    console.log(`🔄 Reseteando leads scrapeados desde: ${today.toISOString()}`);

    // Resetear leads creados hoy
    const result = await Lead.updateMany(
      {
        createdAt: { $gte: today },
        status: { $in: ['contacted', 'interested', 'not_interested', 'completed'] }
      },
      {
        $set: {
          status: 'pending',
          lastContactAt: null,
          nextActionAt: null,
          messagesSent: 0,
          messagesDelivered: 0,
          messagesRead: 0,
          lastMessageAt: null,
          totalMessageTime: 0,
          averageDelay: 0,
          messageVariations: [],
          whatsappResponse: '',
          phoneBounced: false,
          phoneInvalid: false,
          inQueue: false,
          queuePosition: null
        }
      }
    );

    console.log(`✅ ${result.modifiedCount} leads de hoy reseteados a "pending"`);

    // Obtener estadísticas actualizadas
    const pendingLeads = await Lead.countDocuments({ status: 'pending' });
    const totalLeads = await Lead.countDocuments();

    res.json({
      success: true,
      message: `${result.modifiedCount} leads de hoy reseteados a "pending"`,
      modifiedCount: result.modifiedCount,
      stats: {
        pending: pendingLeads,
        total: totalLeads
      }
    });

  } catch (error) {
    console.error('❌ Error reseteando leads de hoy:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// Middleware de manejo de errores
app.use((error, req, res, next) => {
  console.error('Error no manejado:', error);
  res.status(500).json({
    error: 'Error interno del servidor',
    message: 'Algo salió mal'
  });
});

// Middleware para rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    message: `La ruta ${req.originalUrl} no existe`
  });
});



// 🌐 SOCKET.IO LOGIC
io.on('connection', (socket) => {
  console.log(`🔌 Nueva conexión socket: ${socket.id}`);

  // 1. Identificación (Dashboard o Bot)
  socket.on('identify', (data) => {
    const { type, instanceId } = data;

    if (type === 'bot') {
      console.log(`🤖 Bot identificado: ${instanceId} (${socket.id})`);
      connectedBots.set(instanceId, socket.id);

      // Inicializar status si no existe
      if (!botStatuses.has(instanceId)) {
        botStatuses.set(instanceId, { status: 'online', lastSeen: Date.now() });
      } else {
        const current = botStatuses.get(instanceId);
        current.status = 'online';
        current.lastSeen = Date.now();
        botStatuses.set(instanceId, current);
      }

      // Notificar a dashboards
      io.emit('bot_list_update', Array.from(botStatuses.entries()));
    } else if (type === 'dashboard') {
      console.log(`📊 Dashboard conectado: ${socket.id}`);
      // Enviar estado actual de todos los bots al dashboard nuevo
      socket.emit('bot_list_update', Array.from(botStatuses.entries()));
    }
  });

  // 2. Eventos desde el BOT
  socket.on('bot_qr', (data) => {
    const { instanceId, qr } = data;
    console.log(`📱 QR Recibido de ${instanceId}`);
    const status = botStatuses.get(instanceId) || {};
    status.status = 'qr_required';
    status.qr = qr;
    status.lastSeen = Date.now();
    botStatuses.set(instanceId, status);
    io.emit('bot_status_update', { instanceId, status: 'qr_required', qr });
  });

  socket.on('bot_ready', async (data) => {
    const { instanceId, wid } = data;
    console.log(`✅ Bot ${instanceId} listo (WhatsApp: ${wid})`);
    const status = botStatuses.get(instanceId) || {};
    const wasOffline = status.status !== 'ready';
    status.status = 'ready';
    status.wid = wid;
    status.qr = null;
    status.lastSeen = Date.now();
    status.priority = getBotPriority(instanceId);
    botStatuses.set(instanceId, status);
    io.emit('bot_status_update', { instanceId, status: 'ready', wid });

    // Si el bot estaba offline y ahora está listo, enviar notificación al admin
    if (wasOffline) {
      await sendAdminStartupNotification(instanceId);
    }
  });

  socket.on('bot_disconnected', (instanceId) => {
    console.log(`🔌 WhatsApp cerrado en bot ${instanceId}`);
    const status = botStatuses.get(instanceId) || {};
    status.status = 'online'; // Socket sigue vivo, pero WhatsApp se cerró
    status.qr = null;
    status.lastSeen = Date.now();
    botStatuses.set(instanceId, status);
    io.emit('bot_status_update', { instanceId, status: 'online' });
  });

  // Relevo de mensajes en tiempo real
  socket.on('new_whatsapp_message', async (data) => {
    // broadcast a los dashboards
    io.emit('realtime_message', data);

    // 📥 Detectar si es un mensaje del admin y procesarlo como comando
    const { from, body, instanceId } = data;
    const senderPhone = from?.replace('@c.us', '').replace(/\D/g, '');

    if (senderPhone === ADMIN_PHONE && body && !data.fromMe) {
      console.log(`📩 Mensaje de admin recibido: "${body}"`);
      const result = await handleAdminCommand(body, instanceId);
      if (result) {
        console.log(`✅ Comando ejecutado: ${body}`);
      }
    }
  });

  // Relevo de logs de bots en tiempo real
  socket.on('bot_log', async (data) => {
    // { instanceId, level, message, timestamp }
    io.emit('realtime_bot_log', data);

    // Guardar en DB
    try {
      const logEntry = new Log({
        level: data.level || 'info',
        component: 'bot',
        instanceId: data.instanceId,
        message: data.message,
        timestamp: data.timestamp || new Date()
      });
      await logEntry.save();
    } catch (err) {
      console.error('Error guardando log de bot:', err);
    }
  });

  // Scraping Heartbeat desde la extensión (vía socket si lo soporta)
  socket.on('scraper_heartbeat', (data) => {
    const { extensionId, ...rest } = data;
    activeScrapers.set(extensionId, { ...rest, lastSeen: Date.now() });
    io.emit('scraper_status_update', Array.from(activeScrapers.entries()));
  });

  // 3. Comandos desde el DASHBOARD
  socket.on('command_bot', (data) => {
    const { instanceId, command, payload } = data;
    console.log(`🎮 Comando DASHBOARD -> ${instanceId}: ${command}`);

    const botSocketId = connectedBots.get(instanceId);
    if (botSocketId) {
      io.to(botSocketId).emit('bot_command', { command, payload });
    } else {
      socket.emit('error_notification', { message: `Bot ${instanceId} no está conectado al servidor.` });
    }
  });

  socket.on('disconnect', async () => {
    // Buscar si era un bot y limpiar
    for (const [id, sId] of connectedBots.entries()) {
      if (sId === socket.id) {
        console.log(`🔌 Bot ${id} cerró conexión socket`);
        const status = botStatuses.get(id) || {};
        const previousStatus = status.status;
        status.status = 'offline';
        status.disconnectedAt = new Date();
        botStatuses.set(id, status);

        io.emit('bot_status_update', { instanceId: id, status: 'offline' });
        connectedBots.delete(id);

        // 🚨 ALERTA: Enviar notificación WhatsApp si el bot estaba activo
        if (previousStatus === 'ready' || previousStatus === 'online') {
          await sendCrashAlert(id, 'Conexión perdida - El bot dejó de responder');
        }

        // Emitir sonido en el dashboard
        io.emit('bot_crash_alert', {
          instanceId: id,
          reason: 'Conexión perdida',
          timestamp: new Date().toISOString()
        });

        break;
      }
    }
  });
});

// 🚨 Función para enviar alertas de crash via WhatsApp
const ADMIN_PHONE = '5491126642674';

async function sendCrashAlert(botId, reason) {
  try {
    console.log(`🚨 ALERTA: Bot ${botId} caído - ${reason}`);

    // Buscar un bot activo por prioridad que pueda enviar el mensaje
    const senderBot = getActiveBotByPriority(botId);

    if (senderBot) {
      const senderSocketId = connectedBots.get(senderBot);
      if (senderSocketId) {
        const alertMessage = `🚨 *ALERTA DE SISTEMA*

⚠️ El *Bot ${botId.replace('bot_', '')}* se ha caído.

📋 *Razón:* ${reason}
🕐 *Hora:* ${new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}

Por favor, revisa el servidor y reinicia el bot si es necesario.`;

        io.to(senderSocketId).emit('bot_command', {
          command: 'send_whatsapp_message',
          payload: { phone: ADMIN_PHONE, message: alertMessage }
        });

        console.log(`📱 Alerta enviada a ${ADMIN_PHONE} via ${senderBot}`);
      }
    } else {
      console.log('⚠️ No hay bots activos para enviar la alerta');
      // Guardar en logs para revisión
      log(`ALERTA SIN ENVIAR: Bot ${botId} caído - ${reason}`, 'error', 'server');
    }
  } catch (error) {
    console.error('Error enviando alerta de crash:', error);
  }
}

// 🎯 Sistema de prioridad de bots
// bot_1 tiene prioridad más alta, luego bot_2, etc.
function getBotPriority(instanceId) {
  const num = parseInt(instanceId.replace('bot_', '')) || 999;
  return num; // Menor número = mayor prioridad
}

// Obtener el bot activo con mayor prioridad
function getActiveBotByPriority(excludeBot = null) {
  const activeBots = [];
  for (const [id, status] of botStatuses.entries()) {
    if (status.status === 'ready' && id !== excludeBot) {
      activeBots.push({ id, priority: getBotPriority(id) });
    }
  }

  if (activeBots.length === 0) return null;

  // Ordenar por prioridad (menor número = mayor prioridad)
  activeBots.sort((a, b) => a.priority - b.priority);
  return activeBots[0].id;
}

// 📱 Notificación al admin cuando un bot arranca
async function sendAdminStartupNotification(instanceId) {
  try {
    const botNum = instanceId.replace('bot_', '');

    // Contar bots activos
    const activeBots = [];
    for (const [id, status] of botStatuses.entries()) {
      if (status.status === 'ready') {
        activeBots.push(id.replace('bot_', ''));
      }
    }

    // Obtener estadísticas rápidas
    const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
    const pendingLeads = await Lead.countDocuments({ status: 'pending' });
    const contactedToday = await Lead.countDocuments({
      lastContactAt: { $gte: todayStart },
      status: { $in: ['contacted', 'interested', 'not_interested'] }
    });
    const totalMessages = await Message.countDocuments({ sentAt: { $gte: todayStart } });

    const hora = new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' });

    const menuMessage = `🤖 *Bot ${botNum} Activo*

🕐 *Hora:* ${hora}
📊 *Estado del Sistema:*

🟢 *Bots activos:* ${activeBots.length} (${activeBots.join(', ')})
📋 *Leads pendientes:* ${pendingLeads}
✅ *Contactados hoy:* ${contactedToday}
📨 *Mensajes hoy:* ${totalMessages}

---
*Comandos disponibles:*
• Escribe *"estado"* para ver estadísticas actualizadas
• Escribe *"pendientes"* para ver leads pendientes
• Escribe *"bots"* para ver bots activos
• Escribe *"pausar"* para pausar todos los bots`;

    const senderSocketId = connectedBots.get(instanceId);
    if (senderSocketId) {
      io.to(senderSocketId).emit('bot_command', {
        command: 'send_whatsapp_message',
        payload: { phone: ADMIN_PHONE, message: menuMessage }
      });
      console.log(`📱 Menú de admin enviado a ${ADMIN_PHONE} via ${instanceId}`);
    }
  } catch (error) {
    console.error('Error enviando notificación de startup:', error);
  }
}

// 📥 Manejar comandos del admin (cuando llega un mensaje del admin)
async function handleAdminCommand(command, senderBotId) {
  const cmd = command.toLowerCase().trim();
  let response = '';

  const todayStart = new Date(new Date().setHours(0, 0, 0, 0));

  if (cmd === 'estado' || cmd === 'stats') {
    const pendingLeads = await Lead.countDocuments({ status: 'pending' });
    const queuedLeads = await Lead.countDocuments({ status: 'queued' });
    const contactedToday = await Lead.countDocuments({
      lastContactAt: { $gte: todayStart },
      status: { $in: ['contacted', 'interested', 'not_interested'] }
    });
    const totalMessages = await Message.countDocuments({ sentAt: { $gte: todayStart } });
    const failedMessages = await Message.countDocuments({
      sentAt: { $gte: todayStart },
      status: 'failed'
    });

    const activeBots = [];
    for (const [id, status] of botStatuses.entries()) {
      if (status.status === 'ready') activeBots.push(id.replace('bot_', ''));
    }

    response = `📊 *Estado del Sistema*

🤖 *Bots activos:* ${activeBots.length} (${activeBots.join(', ') || 'ninguno'})

📋 *Leads:*
• Pendientes: ${pendingLeads}
• En cola: ${queuedLeads}
• Contactados hoy: ${contactedToday}

📨 *Mensajes hoy:*
• Enviados: ${totalMessages}
• Fallidos: ${failedMessages}
• Éxito: ${totalMessages > 0 ? Math.round((1 - failedMessages / totalMessages) * 100) : 0}%`;

  } else if (cmd === 'pendientes' || cmd === 'leads') {
    const pendingLeads = await Lead.countDocuments({ status: 'pending' });
    const byKeyword = await Lead.aggregate([
      { $match: { status: 'pending' } },
      { $group: { _id: '$keyword', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    let keywordList = byKeyword.map(k => `• ${k._id || 'Sin rubro'}: ${k.count}`).join('\n');

    response = `📋 *Leads Pendientes: ${pendingLeads}*

*Top rubros:*
${keywordList || '• Sin datos'}`;

  } else if (cmd === 'bots') {
    let botList = '';
    for (const [id, status] of botStatuses.entries()) {
      const icon = status.status === 'ready' ? '🟢' : (status.status === 'qr_required' ? '🟡' : '🔴');
      botList += `${icon} *Bot ${id.replace('bot_', '')}:* ${status.status}\n`;
    }

    response = `🤖 *Estado de Bots*\n\n${botList || 'No hay bots registrados'}`;

  } else if (cmd === 'pausar' || cmd === 'pause') {
    // Emitir comando de pausa a todos los bots
    for (const [id, socketId] of connectedBots.entries()) {
      io.to(socketId).emit('bot_command', { command: 'pause', payload: {} });
    }
    response = '⏸️ *Bots pausados*\nEscribe "reanudar" para continuar.';

  } else if (cmd === 'reanudar' || cmd === 'resume') {
    for (const [id, socketId] of connectedBots.entries()) {
      io.to(socketId).emit('bot_command', { command: 'resume', payload: {} });
    }
    response = '▶️ *Bots reanudados*';

  } else {
    return null; // No es un comando reconocido
  }

  // Enviar respuesta via el bot
  const senderSocketId = connectedBots.get(senderBotId);
  if (senderSocketId && response) {
    io.to(senderSocketId).emit('bot_command', {
      command: 'send_whatsapp_message',
      payload: { phone: ADMIN_PHONE, message: response }
    });
  }

  return response;
}

// Exportar para que los bots puedan usarlo via socket
// Los bots enviarán mensajes del admin y el server los procesará

// Endpoint moved to line 1648


// Iniciar servidor
server.listen(PORT, '0.0.0.0', () => {
  log(`🚀 Servidor real-time iniciado en puerto ${PORT}`, 'success', 'server');
  log(`📊 Health check: http://localhost:${PORT}/health`, 'info', 'server');
  log(`📥 Endpoint de ingest: http://localhost:${PORT}/ingest`, 'info', 'server');
  log(`📤 Endpoint de next: http://localhost:${PORT}/next`, 'info', 'server');
});

// Manejo de señales para cierre graceful
process.on('SIGTERM', () => {
  console.log('🛑 Recibida señal SIGTERM, cerrando servidor...');
  mongoose.connection.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Recibida señal SIGINT, cerrando servidor...');
  mongoose.connection.close();
  process.exit(0);
}); 