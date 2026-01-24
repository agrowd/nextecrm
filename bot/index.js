const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const cron = require('node-cron');
const path = require('path');
const fs = require('fs');
require('dotenv').config();
const { io } = require('socket.io-client');

// 🩹 MONKEY PATCH: Fix para evitar crash por EBUSY en Windows al cerrar sesión
// Esto captura el error cuando Puppeteer intenta borrar archivos bloqueados
const originalLogout = LocalAuth.prototype.logout;
LocalAuth.prototype.logout = async function () {
  try {
    await originalLogout.call(this);
  } catch (err) {
    // Ignorar error EBUSY (típico de Windows)
    if (err.message && (err.message.includes('EBUSY') || err.code === 'EBUSY')) {
      console.log('🛡️ EBUSY error interceptado en logout (Windows file lock) - Ignorando para mantener bot vivo');
    } else {
      console.error('Error en LocalAuth.logout:', err);
      // No relanzar para evitar crash fatal
    }
  }
};

// Importar servicios
const phoneValidator = require('./services/phoneValidator');
const WhatsAppChecker = require('./services/whatsappChecker');
const StatsTracker = require('./services/statsTracker');

// ✅ NUEVOS SERVICIOS INTEGRADOS
const AITextGenerator = require('./services/aiTextGenerator');
const IntelligentRateLimiter = require('./services/rateLimiter');
const HumanBehaviorSimulator = require('./services/humanBehavior');
const ResponseAnalyzer = require('./services/responseAnalyzer');
const StealthBrowserManager = require('./services/stealthBrowser');
const Scheduler = require('./services/scheduler');

class WhatsAppBot {
  constructor() {
    this.client = null;
    this.isReady = false;
    this.isStarted = false; // Flag para saber si Puppeteer ya inició
    this.isProcessing = false; // Flag para evitar procesamiento simultáneo
    this.isSendingMessages = false; // Flag para evitar envío simultáneo de mensajes
    this.backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
    this.interval = parseInt(process.env.BOT_INTERVAL) || 300000; // 5 minutos default
    this.messageDelay = parseInt(process.env.MESSAGE_SEQUENCE_DELAY) || 45000; // 45 segundos default
    this.slackWebhook = process.env.SLACK_WEBHOOK_URL;
    this.whatsappChecker = null;
    this.lastNoLeadsLog = null; // Para controlar logs de "no hay leads"

    // 🔑 MULTI-BOT: Identificador único de esta instancia
    console.log(`🔍 [INIT] Checking Identity... ENV_ID: '${process.env.BOT_INSTANCE_ID}'`);
    if (!process.env.BOT_INSTANCE_ID) {
      console.warn('⚠️ BOT_INSTANCE_ID missing from environment. Generating random ID...');
    }
    this.instanceId = process.env.BOT_INSTANCE_ID || `bot_${Date.now().toString(36)}`;
    this.connectedNumber = null; // Se llena cuando WhatsApp conecta
    this.lastMessageTimestamps = new Map(); // ⏱️ Tiempos de envío para detectar auto-replies
    console.log(`🤖 Instancia de bot INICIADA: ${this.instanceId}`);

    // Sistema para detectar leads atascados
    this.stuckLeads = new Map(); // Almacena leads que se están procesando repetidamente
    this.lastProcessedLead = null; // Último lead procesado
    this.consecutiveAttempts = 0; // Contador de intentos consecutivos

    // Sistema de demo dental
    this.demoSessions = new Map(); // Almacena sesiones activas de demo

    // Sistema de estadísticas
    this.statsTracker = new StatsTracker();

    // ⚙️ CONFIGURACIÓN REMOTA
    this.config = {
      delays: { min: 45, max: 90 },
      humanBehavior: { typingSpeed: 1, readingSpeed: 1 },
      ai: { model: 'gemini-1.5-flash', enabled: true },
      sequences: { maxMessagesPerDay: 200, coolOffPeriod: 15 }
    };

    // ✅ NUEVOS SERVICIOS INTEGRADOS
    this.aiGenerator = null; // Se inicializa después cuando WhatsApp esté ready
    this.rateLimiter = null; // Se inicializa después
    this.behaviorSimulator = new HumanBehaviorSimulator();
    this.responseAnalyzer = new ResponseAnalyzer();
    this.scheduler = new Scheduler(this.config); // Inicializar scheduler
    this.stealthBrowser = null; // Se inicializa antes de puppeteer

    // 📡 Conexión Real-time con el Servidor
    this.socket = io(this.backendUrl.replace('/api', ''));
    this.setupSocketHandlers();

    // Cargar configuración inicial
    this.fetchRemoteConfig();

    // Secuencia de mensajes con variaciones para evitar spam
    this.messageSequences = [
      // MENSAJES ACTIVOS 

      // Mensaje 1 - Saludo con nombre del negocio
      [
        "Hola, soy Juan Cruz de Nexte Marketing. Estuve viendo su negocio {businessName} y me pareció muy interesante",
        "¡Hola! Soy Juan Cruz, de Nexte Marketing 👋 Estuve revisando {businessName} y quería contactarte",
        "Hola! Te saludo, soy Juan Cruz de Nexte Marketing. Estuve viendo {businessName} y me llamó la atención",
        "¡Buen día! Soy Juan Cruz, de Nexte Marketing 😊 Estuve revisando {businessName} y quería saludarte",
        "Hola! Un placer, soy Juan Cruz de Nexte Marketing. Estuve viendo {businessName} y me pareció interesante proponerte un servicio"
      ],
      // Mensaje 2 - Presentación
      [
        "Desde 2015 hasta hoy hemos ayudado a clínicas de salud, fábricas de acero y tiendas de carteras en cinco países. Creamos anuncios que atraen a la persona indicada, páginas ligeras que cargan rápido y mensajes automáticos que confirman turnos o pedidos mientras dormís. Todo se resume en un tablero claro con el número de nuevas citas y ventas cada semana.",

        "Diez años de práctica nos enseñaron que cada negocio necesita su propia receta. Por eso equipamos a centros estéticos, vendedores de paneles solares y cursos online con publicidad sencilla, webs explicativas y chats que filtran preguntas en segundos. El resultado: más agendas llenas, más carritos cerrados y menos tiempo perdido.",

        "Nuestro recorrido 2015‑2025 pasa por cinco países y muchos rubros: kinesiología, muebles de acero a medida, moda y ONG educativas. Trabajamos con la misma fórmula: atraer, explicar y acompañar al cliente. Te mostramos los avances en gráficos fáciles de leer y afinamos la inversión para no gastar de más.",

        "Arrancamos ayudando a un consultorio. Diez años después apoyamos a laboratorios, talleres metalúrgicos y tiendas de CBD. Combinamos anuncios en buscadores y redes con webs claras y recordatorios por WhatsApp que hacen volver a los clientes cada seis meses.",

        "En 2015 éramos un estudio chico; hoy somos un equipo completo que opera en Argentina, Chile, Paraguay, Estados Unidos y Colombia. Hemos lanzado campañas para clínicas de rehabilitación, venta de mesas industriales y programas de formación online. Cada peso se controla con reportes simples para que veas dónde rinde.",

        "Durante esta década vimos cómo una buena página y un mensaje a tiempo pueden cambiar un negocio. Lo aplicamos tanto a spas estéticos como a fábricas de metal ligero y proyectos de real estate. Nuestro sistema avisa al instante cuántas consultas nuevas llegaron y qué anuncio las trajo.",

        "Trabajamos con marcas de bienestar, jugueterías inclusivas y proveedores de energía solar. Montamos anuncios que salen primeros, textos que responden dudas y robots de chat que reservan turnos sin intervención humana. Así, el dueño se dedica a atender mientras la máquina genera demanda.",

        "Del 2015 al 2025 convertimos aprendizajes en soluciones prácticas. Creamos webs rápidas para tiendas online, campañas directas para instituciones de salud y correos que recuerdan revisiones periódicas. Todo con un lenguaje claro y pasos fáciles de seguir.",

        "Nuestra experiencia abarca desde la sala de espera de un consultorio hasta la línea de montaje de una fábrica. En cada caso ajustamos la publicidad, el sitio web y la atención automática para que más personas pidan turno o realicen una compra. Los resultados quedan anotados en números grandes y fáciles de entender.",

        "Con diez años de trabajo, entendemos tanto las necesidades de un nutricionista como las de un fabricante de acero inoxidable. Unimos publicidad efectiva, páginas sencillas y mensajes automáticos que nutren la relación con el cliente. Así el crecimiento se ve y se siente en el día a día."
      ],
      // Mensaje 3 - Promo Web Express (más claro)
      [
        "🚀 Te ofrecemos un sitio web completo por $150.000: incluye diseño personalizado, dominio .com, hosting por 1 año y adaptado a tu marca. Si no tenés marca, te la diseñamos. Todo en 2 días!",
        "💻 Sitio web completo por $150.000: diseño personalizado, dominio .com, hosting por 1 año y adaptado a tu marca, aparecerá en Google. Si no tenés marca, te la creamos. Listo en 2 días!",
        "⚡ Sitio web completo por $150.000: diseño personalizado, dominio .com, hosting por 1 año y adaptado a tu marca, aparecerá en Google. Si no tenés marca, te la diseñamos. En 2 días!",
        "🎯 Sitio web completo por $150.000: diseño personalizado, dominio .com, hosting por 1 año y adaptado a tu marca, aparecerá en Google. Si no tenés marca, te la creamos. Listo en 2 días!",
        "🌟 Sitio web completo por $150.000: diseño personalizado, dominio .com, hosting por 1 año y adaptado a tu marca, aparecerá en Google. Si no tenés marca, te la diseñamos. En 2 días!"
      ],
      // Mensaje 4 - Plan Web Premium (más claro)
      [
        "💎 Para negocios que quieren destacar: sitio web premium por $500.000 con diseño exclusivo, animaciones avanzadas y optimizado para Google. Incluye branding completo.",
        "🏆 Para negocios que quieren destacar: sitio web premium por $500.000 con diseño exclusivo, animaciones avanzadas y optimizado para Google. Incluye branding completo.",
        "⭐ Para negocios que quieren destacar: sitio web premium por $500.000 con diseño exclusivo, animaciones avanzadas y optimizado para Google. Incluye branding completo.",
        "✨ Para negocios que quieren destacar: sitio web premium por $500.000 con diseño exclusivo, animaciones avanzadas y optimizado para Google. Incluye branding completo.",
        "💎 Para negocios que quieren destacar: sitio web premium por $500.000 con diseño exclusivo, animaciones avanzadas y optimizado para Google. Incluye branding completo."
      ],
      // Mensaje 5 - Servicios (más claro)
      [
        `También hacemos: publicidad en Google para que te encuentren, manejo de redes sociales, bots de WhatsApp automáticos y todo lo que necesites para digitalizar tu negocio. **Preparamos un Pack 360° exclusivo para odontólogos**: página web, dominio .com o .ar, Google Ads para aparecer primero, chatbot dental, recordatorios automáticos y más. Es una plataforma hecha a medida, cómoda, flexible y con acompañamiento personalizado para optimizar resultados (CRO). Convierte consultas en pacientes y mide cada peso invertido. Si preferís, también podemos hacerte una cotización gratuita y personalizada según lo que necesites.`,
        `Tenemos **un Pack 360° pensado para odontólogos** que incluye todo: página web, dominio .com o .com.ar, Google Ads para aparecer primero, chatbot dental, recordatorios automáticos y más. Es una plataforma hecha a medida, cómoda, flexible y con acompañamiento personalizado para que optimices cada peso invertido (CRO). Si preferís, también podemos hacerte una cotización gratuita y personalizada según lo que necesites.`,
        `Ofrecemos **un pack integral 360° para odontólogos**: web, dominio .com o .com.ar, Google Ads para aparecer primero, chatbot dental, recordatorios automáticos y mucho más. Todo hecho a medida, cómodo, flexible y con acompañamiento personalizado para mejorar tus resultados (CRO). Si tu clínica necesita algo diferente, te hacemos una cotización gratuita y a medida para digitalizar tu negocio.`,
        `Además ofrecemos: publicidad en Google para que te encuentren, manejo de redes sociales, bots de WhatsApp automáticos y todo lo que necesites para digitalizar tu negocio. **Nuestro Pack 360° para odontólogos** incluye web, dominio .com o .ar, Google Ads para aparecer primero, chatbot dental, recordatorios automáticos y más. Es una plataforma hecha a medida, cómoda, flexible y con acompañamiento personalizado (CRO). Si querés, te cotizamos gratis lo que necesites.`,
        `También brindamos: publicidad en Google para que te encuentren, manejo de redes sociales, bots de WhatsApp automáticos y todo lo que necesites para digitalizar tu negocio. **El Pack 360° para odontólogos** incluye web, dominio .com o .ar, Google Ads para aparecer primero, chatbot dental, recordatorios automáticos y más. Todo hecho a medida, cómodo, flexible y con acompañamiento personalizado (CRO). Si preferís, te hacemos una cotización gratuita y a medida.`,
        `Además trabajamos en: publicidad en Google para que te encuentren, manejo de redes sociales, bots de WhatsApp automáticos y todo lo que necesites para digitalizar tu negocio. **Nuestro Pack 360° exclusivo para odontólogos** incluye web, dominio .com o .ar, Google Ads para aparecer primero, chatbot dental, recordatorios automáticos y más. Es una plataforma hecha a medida, cómoda, flexible y con acompañamiento personalizado (CRO). Si querés, te cotizamos gratis lo que necesites.`,
        `También ofrecemos: publicidad en Google para que te encuentren, manejo de redes sociales, bots de WhatsApp automáticos y todo lo que necesites para digitalizar tu negocio. **El Pack 360° para odontólogos** incluye web, dominio .com o .ar, Google Ads para aparecer primero, chatbot dental, recordatorios automáticos y más. Todo hecho a medida, cómodo, flexible y con acompañamiento personalizado (CRO). Si preferís, te hacemos una cotización gratuita y a medida.`
      ],
      // Mensaje 6 - Servicios específicos (más humano)
      [
        "Te cuento que podemos hacer publicidad para que aparezcas en Google, manejo de redes sociales, bots de WhatsApp que te respondan todo automáticamente y la promo de 150.000 por un sitio web completo adaptado a tu marca con las últimas tecnologías. Si no tenés marca, te hacemos el branding también.",
        "Mirá, podemos hacer publicidad para que te encuentren en Google, manejo de redes sociales, bots de WhatsApp que contesten automáticamente y la promo de 150.000 por sitio web completo adaptado a tu marca con las últimas tecnologías. Si no tenés marca, te diseñamos todo.",
        "Te comento que hacemos publicidad para Google, manejo de redes sociales, bots de WhatsApp automáticos y la promo de 150.000 por sitio web completo adaptado a tu marca con las últimas tecnologías. Si no tenés marca, te hacemos el branding.",
        "Podemos hacer publicidad para que aparezcas en Google, manejo de redes sociales, bots de WhatsApp que contesten solos y la promo de 150.000 por sitio web completo adaptado a tu marca con las últimas tecnologías. Si no tenés marca, te diseñamos todo.",
        "Te cuento que hacemos publicidad para Google, manejo de redes sociales, bots de WhatsApp automáticos y la promo de 150.000 por sitio web completo adaptado a tu marca con las últimas tecnologías. Si no tenés marca, te hacemos el branding también.",
        "Mirá, podemos hacer publicidad para que te encuentren en Google, manejo de redes sociales, bots de WhatsApp que te respondan todo automáticamente y la promo de 150.000 por sitio web completo adaptado a tu marca con las últimas tecnologías. Si no tenés marca, te diseñamos todo.",
        "Te comento que hacemos publicidad para que aparezcas en Google, manejo de redes sociales, bots de WhatsApp automáticos y la promo de 150.000 por sitio web completo adaptado a tu marca con las últimas tecnologías. Si no tenés marca, te hacemos el branding.",
        "Podemos hacer publicidad para Google, manejo de redes sociales, bots de WhatsApp que contesten solos y la promo de 150.000 por sitio web completo adaptado a tu marca con las últimas tecnologías. Si no tenés marca, te diseñamos todo.",
        "Te cuento que hacemos publicidad para que te encuentren en Google, manejo de redes sociales, bots de WhatsApp que te respondan todo automáticamente y la promo de 150.000 por sitio web completo adaptado a tu marca con las últimas tecnologías. Si no tenés marca, te hacemos el branding también.",
        "Mirá, podemos hacer publicidad para que aparezcas en Google, manejo de redes sociales, bots de WhatsApp automáticos y la promo de 150.000 por sitio web completo adaptado a tu marca con las últimas tecnologías. Si no tenés marca, te diseñamos todo."
      ],
      // Mensaje 7 - CTA
      [
        "Visitá https://nextemarketing.com para ver ejemplos.",
        "Visitá https://nextemarketing.com para ver ejemplos.",
        "Visitá https://nextemarketing.com para ver ejemplos.",
        "Visitá https://nextemarketing.com para ver ejemplos.",
        "Visitá https://nextemarketing.com para ver ejemplos."
      ],

      // Mensaje 8 - Cierre
      [
        "Cualquier consulta, estoy disponible",
        "Cualquier pregunta, estoy disponible",
        "Cualquier duda, estoy disponible",
        "Cualquier consulta, estoy disponible",
        "Cualquier pregunta, estoy disponible"
      ]

    ];





    this.init();
  }

  /**
   * 📝 LOG CENTRALIZADO (Terminal + Dashboard)
   */
  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = level === 'info' ? 'ℹ️' : (level === 'warn' ? '⚠️' : '❌');

    // Log local
    console.log(`[${this.instanceId}] ${prefix} ${message}`);

    // Emitir al dashboard
    if (this.socket && this.socket.connected) {
      this.socket.emit('bot_log', {
        instanceId: this.instanceId,
        level,
        message,
        timestamp
      });
    }
  }

  /**
   * ⚙️ Obtener configuración desde el CRM
   */
  async fetchRemoteConfig() {
    try {
      this.log('Consultando configuración centralizada...');
      const res = await axios.get(`${this.backendUrl}/bot/config`);
      if (res.data.success && res.data.config) {
        this.config = { ...this.config, ...res.data.config };
        this.scheduler.updateConfig(this.config); // Actualizar scheduler
        this.log('Configuración remota aplicada correctamente.');

        // Aplicar a los servicios que la necesiten
        if (this.rateLimiter) {
          this.rateLimiter.maxDailyLeads = this.config.sequences?.maxMessagesPerDay || 200;
        }
      }
    } catch (e) {
      this.log(`No se pudo cargar configuración remota: ${e.message}`, 'warn');
    }
  }

  setupSocketHandlers() {
    this.socket.on('connect', () => {
      this.log('Conectado al servidor central (Socket.io)');
      this.socket.emit('identify', { type: 'bot', instanceId: this.instanceId });
    });

    this.socket.on('bot_config_updated', (newConfig) => {
      this.config = { ...this.config, ...newConfig };
      this.scheduler.updateConfig(this.config); // Actualizar scheduler real-time
      this.log('🔄 Configuración actualizada en tiempo real desde el CRM');
    });

    this.socket.on('bot_command', async (data) => {
      const { command, payload } = data;
      this.log(`📥 Comando recibido: ${command}`);

      if (command === 'start_bot') {
        if (this.isStarted) {
          this.log('⚠️ El bot ya está iniciado.', 'warn');
          return;
        }
        await this.initializeWhatsApp();
      } else if (command === 'stop_bot') {
        this.log('🛑 Deteniendo bot por comando remoto...', 'warn');
        process.exit(0);
      } else if (command === 'send_whatsapp_message') {
        await this.handleManualReply(payload);
      }
    });

    this.socket.on('templates_updated', (data) => {
      this.log(`🔄 Plantillas actualizadas desde el CRM: ${data.category}`);
      if (this.aiGenerator && this.aiGenerator.templateGenerator) {
        this.aiGenerator.templateGenerator.fetchTemplates();
      }
    });

    this.socket.on('disconnect', () => {
      this.log('🔌 Desconectado del servidor central', 'warn');
    });
  }

  async handleManualReply(payload) {
    const { phone, message } = payload;
    try {
      console.log(`📤 Enviando respuesta manual a ${phone}...`);
      const chat = await this.client.getChatById(phone.includes('@') ? phone : `${phone}@c.us`);
      await chat.sendMessage(message);
      console.log('✅ Mensaje enviado.');

      // Guardar en DB vía Backend (importante para historial)
      try {
        await axios.post(`${this.backendUrl}/messages`, {
          phone: phone.replace(/\D/g, ''),
          content: message,
          fromMe: true,
          timestamp: new Date(),
          instanceId: this.instanceId,
          type: 'text'
        });
      } catch (dbError) {
        console.error('⚠️ Error guardando mensaje manual en DB:', dbError.message);
      }

      // Notificar al dashboard (fallback por si socket del backend tarda)
      this.socket.emit('new_whatsapp_message', {
        instanceId: this.instanceId,
        from: 'me',
        to: phone,
        body: message,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('❌ Error enviando respuesta manual:', error.message);
    }
  }

  async init() {
    this.log(`Bot en espera de comando 'start_bot' desde el CRM...`);
    // Ya no llamamos a initializeWhatsApp aquí automáticamente
  }

  async initializeWhatsApp() {
    this.isStarted = true;
    console.log('🤖 Iniciando WhatsApp Bot...');

    // Crear cliente de WhatsApp
    console.log('📦 Configurando cliente WhatsApp...');

    const sessionsDir = path.join(__dirname, 'sessions');

    if (!fs.existsSync(sessionsDir)) {
      fs.mkdirSync(sessionsDir, { recursive: true });
      console.log(`📁 Carpeta de sesiones creada en ${sessionsDir}`);
    }

    // ✅ CONFIGURACIÓN PUPPETEER ESTABILIZADA
    // Se han eliminado flags experimentales que causaban crashes
    const stealthPuppeteerConfig = {
      headless: process.env.HEADLESS === 'true' ? "new" : false,
      executablePath: process.env.CHROME_PATH || undefined,
      bypassCSP: true, // 🛡️ FIX CRÍTICO: Evita "Execution context was destroyed"
      ignoreHTTPSErrors: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-gpu',
        '--disable-extensions'
      ],
      defaultViewport: null,
      timeout: 60000
    };

    // 🌐 SOPORTE PARA PROXY (Anti-Ban VPS)
    if (process.env.PROXY_SERVER) {
      stealthPuppeteerConfig.args.push(`--proxy-server=${process.env.PROXY_SERVER}`);
      console.log(`🛡️ Usando Proxy: ${process.env.PROXY_SERVER}`);
    }

    this.client = new Client({
      authStrategy: new LocalAuth({
        clientId: 'gmaps-leads-bot',
        dataPath: sessionsDir
      }),
      puppeteer: stealthPuppeteerConfig
    });
    console.log('✅ Cliente configurado con Stealth Mode.');

    // Eventos del cliente
    this.client.on('qr', (qr) => {
      console.log('📱 Escanea este código QR con WhatsApp:');
      qrcode.generate(qr, { small: true });

      // Enviar QR al servidor central (para VPS Dashboard)
      this.socket.emit('bot_qr', { instanceId: this.instanceId, qr });

      axios.post(`${this.backendUrl}/bot/qr`, {
        instanceId: this.instanceId,
        qr: qr
      }).catch(err => console.error('Error enviando QR al servidor:', err.message));
    });

    this.client.on('loading_screen', (percent, message) => {
      console.log(`⏳ Loading screen: ${percent}% - ${message}`);
    });

    this.client.on('state_changed', (state) => {
      console.log(`📶 Estado de WhatsApp: ${state}`);
    });

    this.client.on('ready', async () => {
      console.log('✅ WhatsApp Bot listo!');
      this.isReady = true;

      // 🔑 MULTI-BOT: Capturar número conectado
      try {
        const info = await this.client.info;
        this.connectedNumber = info.wid.user;
        console.log(`📱 Número conectado: +${this.connectedNumber} (Instancia: ${this.instanceId})`);
      } catch (e) {
        console.log(`⚠️ No se pudo obtener número conectado: ${e.message}`);
      }

      // 🛡️ VERIFICACIÓN DE IDENTIDAD
      const savedWidPath = path.join(__dirname, '.bot_identity');
      if (fs.existsSync(savedWidPath)) {
        const savedWid = fs.readFileSync(savedWidPath, 'utf8');
        if (savedWid !== this.connectedNumber) {
          console.warn('⚠️ ¡ALERTA DE SEGURIDAD! El número de esta instancia ha cambiado.');
          console.warn(`Anterior: ${savedWid} -> Actual: ${this.connectedNumber}`);
          // Aquí podrías cerrar sesión si quieres ser estricto
        }
      } else {
        fs.writeFileSync(savedWidPath, this.connectedNumber);
      }

      // Notificar al servidor real-time
      this.socket.emit('bot_ready', { instanceId: this.instanceId, wid: this.connectedNumber });

      // 🔄 Sincronizar mensajes perdidos mientras el bot estuvo apagado
      await this.syncOfflineMessages();

      // Inicializar servicios
      this.whatsappChecker = new WhatsAppChecker(this.client, this.messageSequences);

      // ✅ INICIALIZAR NUEVOS SERVICIOS
      console.log('🤖 Inicializando AI Text Generator... [MODO TEMPLATES FORZADO]');
      // this.aiGenerator = new AITextGenerator();

      // MOCK para desactivar IA y usar templates
      this.aiGenerator = {
        templateGenerator: new (require('./services/advancedTemplateGenerator'))(),
        generatePersonalizedSequence: async function (lead) {
          console.log('🤖 [MOCK] Generando secuencia con templates (IA Desactivada)...');
          return this.templateGenerator.generatePersonalizedSequence(lead);
        },
        generateBotSalesPitch: async () => null,
        detectAutoReply: async () => false,
        checkHealth: async () => true,
        initialize: async () => console.log('🤖 [MOCK] AI inicializado en modo offline')
      };

      console.log('⏱️ Inicializando Rate Limiter...');
      this.rateLimiter = new IntelligentRateLimiter();

      console.log('👤 Human Behavior Simulator: ACTIVO');
      console.log('📊 Response Analyzer: ACTIVO');
      console.log('🔒 Stealth Browser: ACTIVO');

      // Verificar API key de Gemini
      if (!process.env.GEMINI_API_KEY) {
        console.error('❌ GEMINI_API_KEY no configurada en .env');
        console.error('📝 Obtener en: https://makersuite.google.com/app/apikey');
        console.error('⚠️ Los mensajes usarán fallback hardcoded sin IA');
      } else {
        console.log('✅ Gemini API configurada correctamente');
      }

      // Mostrar información inicial de la cola
      await this.checkServices();

      console.log(`\n🚀 === BOT INICIADO CON SERVICIOS INTEGRADOS ===`);
      console.log(`📊 Verificando estado de la cola...`);
      console.log(`🤖 AI Text Generator: ${process.env.GEMINI_API_KEY ? 'ACTIVO' : 'FALLBACK'}`);

      const rateLimiterStats = await this.rateLimiter.getStats();
      console.log(`⏱️ Rate Limiter: ${rateLimiterStats.currentDayLimit} leads/día (Fase ${rateLimiterStats.scalingPhase})`);
      console.log(`📈 Progreso hoy: ${rateLimiterStats.leadsProcessed}/${rateLimiterStats.currentDayLimit} leads procesados`);
      console.log(`💬 Mensajes por lead: 4 (personalizados con IA)`);
      console.log(`🎯 Promos 2025: Web $20k | Medición $75k | CM $75k | Software custom`);
      console.log(`=====================================\n`);

      // ✅ KEEP-ALIVE: Evitar desconexión por inactividad
      // Enviar un ping (getBatteryStatus) cada 5 minutos para mantener sesión viva
      setInterval(async () => {
        if (this.isReady) {
          try {
            await this.client.getBatteryStatus();
            // console.log('💓 Keep-Alive ping enviado'); 
          } catch (e) {
            // Silencioso
          }
        }
      }, 5 * 60 * 1000);

      this.startLeadProcessing();
    });

    this.client.on('authenticated', () => {
      console.log('🔐 WhatsApp autenticado');
    });

    this.client.on('auth_failure', (msg) => {
      console.error('❌ Error de autenticación:', msg);
    });

    this.client.on('disconnected', async (reason) => {
      console.log('🔌 WhatsApp desconectado:', reason);
      this.isReady = false;

      // EVITAR CRASH EBUSY: No destruir cliente inmediatamente si es LOGOUT temporal
      if (reason === 'LOGOUT') {
        console.log('⚠️ Detectado LOGOUT - Intentando reconexión suave en 10s...');
        // No llamamos a client.destroy() ni destroy() aquí para evitar EBUSY
        /* 
        // Lógica de reconexión DESACTIVADA por solicitud del usuario para evitar loops infinitos y EBUSY
        setTimeout(() => {
          console.log('🔄 Reiniciando cliente...');
          this.client.initialize().catch(e => console.error('Error reiniciando:', e));
        }, 10000);
        */
        console.log('🛑 LOGOUT detectado. El bot se detendrá para evitar bloqueos. Reiniciar manualmente.');
      }
    });

    // Manejar mensajes entrantes
    this.client.on('message', async (message) => {
      // Notificar al dashboard en tiempo real
      this.socket.emit('new_whatsapp_message', {
        instanceId: this.instanceId,
        from: message.from,
        to: message.to,
        body: message.body,
        timestamp: message.timestamp * 1000
      });

      await this.handleIncomingMessage(message);
    });

    // Eventos de tracking de mensajes
    this.client.on('message_ack', async (message, ack) => {
      console.log(`📱 ACK recibido para mensaje: ${ack}`);
      // Aquí podrías actualizar el estado del mensaje en el JSON
      // ack: 1 = enviado, 2 = entregado, 3 = leído
    });

    this.client.on('message_create', async (message) => {
      // Solo notificar si es un mensaje enviado por MÍ (desde el bot o el celular)
      if (message.fromMe) {
        this.socket.emit('new_whatsapp_message', {
          instanceId: this.instanceId,
          from: 'me',
          to: message.to,
          body: message.body,
          timestamp: message.timestamp * 1000
        });
      }
    });

    // Iniciar realmente el cliente
    console.log('🏁 Fin de configuración de eventos. Llamando a initialize()...');
    try {
      await this.initialize();
    } catch (err) {
      console.error('❌ Error fatal en init():', err);
    }
  }

  /**
   * 🔄 Sincronizar mensajes recibidos mientras el bot estaba offline
   */
  async syncOfflineMessages() {
    console.log('🔄 Sincronizando mensajes recientes...');
    try {
      const chats = await this.client.getChats();
      let totalSynced = 0;

      // Solo revisar los 20 chats más recientes para no saturar
      const recentChats = chats.slice(0, 20);

      for (const chat of recentChats) {
        // Ignorar grupos si los hay
        if (chat.isGroup) continue;

        // Buscar mensajes de las últimas 24 horas
        const messages = await chat.fetchMessages({ limit: 10 });

        for (const msg of messages) {
          // Ignorar estados o mensajes de sistema si aplica
          if (msg.type === 'chat' || msg.type === 'image' || msg.type === 'video') {

            // Buscar si el lead existe en nuestra BD
            // (Si no existe, el backend de ingest lo manejará o ignorará)
            // Por ahora, intentamos guardar todo mensaje de chat 1-a-1

            try {
              // Convertir "me" o número a formato simple
              const phone = msg.fromMe ? msg.to.split('@')[0] : msg.from.split('@')[0];

              // Solo sincronizar si es un número válido (no system messages)
              if (!phone || phone.length < 5) continue;

              // Enviar al backend para guardar (el backend filtrará duplicados por whatsappMessageId)
              await axios.post(`${this.backendUrl}/messages`, {
                leadId: "000000000000000000000000", // ID dummy si no lo conocemos (el backend debería buscar por teléfono preferiblemente)
                leadName: chat.name || phone,
                phone: phone,
                messageNumber: 0, // No sabemos el orden exacto en la secuencia
                content: msg.body || `[Mensaje tipo: ${msg.type}]`,
                status: 'sent', // Asumimos sent para que aparezca
                sentAt: new Date(msg.timestamp * 1000),
                whatsappMessageId: msg.id._serialized,
                instanceId: this.instanceId,
                sentFromNumber: this.connectedNumber,
                metadata: {
                  synced: true,
                  fromMe: msg.fromMe
                }
              }).then(res => {
                if (res.data.success && !res.data.isDuplicate) totalSynced++;
              }).catch(e => { /* Silenciar errores de leads no encontrados */ });

            } catch (err) {
              // Ignorar errores individuales
            }
          }
        }
      }
      console.log(`✅ Sincronización completada. ${totalSynced} mensajes nuevos recuperados.`);
    } catch (error) {
      console.warn('⚠️ Error durante la sincronización:', error.message);
    }
  }

  /**
   * Verificar servicios antes de iniciar
   */
  async checkServices() {
    console.log('🩺 Verificando salud de servicios (Gemini API)...');
    try {
      const isHealthy = await this.aiGenerator.checkHealth();
      if (!isHealthy) {
        // Gemini no responde, pero tenemos plantillas inteligentes
        console.log('⚠️ Gemini API no disponible - usando plantillas inteligentes');
        console.log('🎯 SmartTemplateGenerator: ACTIVO (sin costos de API)');
        return true; // Continuar con plantillas
      }
      console.log('✅ Gemini API funcionando correctamente.');
      return true;
    } catch (error) {
      // No abortar - tenemos fallback de plantillas
      console.log('⚠️ Gemini API con errores: ' + error.message);
      console.log('🎯 Usando SmartTemplateGenerator como fallback (sin costos de API)');
      return true; // Continuar con plantillas
    }
  }

  /**
   * Iniciar el bot
   */
  async initialize() {
    console.log('🚀 Inicializando cliente WhatsApp...');
    try {
      await this.client.initialize();
      console.log('✅ initialize() resuelto');
    } catch (error) {
      console.error('❌ Error inicializando WhatsApp:', error);
    }
  }

  startLeadProcessing() {
    console.log(`⏰ Programando procesamiento de leads con intervalo aleatorio entre 60-120 segundos`);

    // Función para programar el siguiente procesamiento con intervalo aleatorio
    const scheduleNextProcessing = () => {
      if (!this.isProcessing) {
        this.processNextLead();
      }

      // 🎲 INTERVALO HUMANO REALISTA - Nunca predecible
      // Base: valor del .env (default 5 min = 300000ms)
      const baseInterval = this.interval;

      // Factor aleatorio gaussiano (la mayoría cerca de 1, algunos muy altos o bajos)
      const gaussianRandom = () => {
        let u = 0, v = 0;
        while (u === 0) u = Math.random();
        while (v === 0) v = Math.random();
        return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
      };

      // Aplicar variación gaussiana (0.5x a 2x del base, centrado en 1x)
      const gaussianFactor = Math.max(0.5, Math.min(2.0, 1 + (gaussianRandom() * 0.3)));

      // Micro-variación humana (-60 a +120 segundos, sesgado hacia más tiempo)
      const humanJitter = (Math.random() * 180000) - 60000; // -60s a +120s

      // Pausa ocasional larga (simula ir al baño, almorzar, etc)
      const longPauseChance = Math.random();
      const longPause = longPauseChance < 0.05 ? (Math.random() * 300000) + 180000 : 0; // 5% chance de pausa 3-8 min

      const finalInterval = Math.floor((baseInterval * gaussianFactor) + humanJitter + longPause);

      // Mínimo 2 minutos, máximo 15 minutos
      const clampedInterval = Math.max(120000, Math.min(900000, finalInterval));

      console.log(`⏰ Próximo procesamiento en ${(clampedInterval / 1000).toFixed(1)} segundos (humano aleatorio)`);

      this.processingTimer = setTimeout(scheduleNextProcessing, clampedInterval);
    };

    // Función para programar procesamiento inmediato (sin delay)
    const scheduleImmediateProcessing = () => {
      if (!this.isProcessing) {
        this.processNextLead();
      }
    };

    // Iniciar el primer procesamiento
    scheduleNextProcessing();

    // 🧹 Limpiar cache de WhatsApp cada 6 horas
    setInterval(() => {
      if (this.whatsappChecker) {
        this.whatsappChecker.cleanCache();
      }
    }, 6 * 60 * 60 * 1000); // 6 horas

    // 🔍 Revisar números fallidos cada 12 horas
    setInterval(async () => {
      if (this.whatsappChecker) {
        await this.whatsappChecker.reviewFailedNumbers();
      }
    }, 12 * 60 * 60 * 1000); // 12 horas

    // 📊 Mostrar estadísticas cada hora
    setInterval(() => {
      this.statsTracker.displayStats();
    }, 60 * 60 * 1000); // 1 hora

    // 🔄 Verificar sesiones completadas cada 60 segundos (PROTEGIDO)
    setInterval(async () => {
      try {
        if (this.whatsappChecker && !this.isProcessing && !this.isSendingMessages) {
          await this.checkCompletedSessions();
        } else {
          // console.log(`⏳ Saltando checkCompletedSessions...`); // Reducir ruido
        }
      } catch (error) {
        console.error('❌ Error en checkCompletedSessions interval:', error.message);
      }
    }, 60 * 1000);

    // 🏷️ Sincronizar Etiquetas cada 5 minutos
    setInterval(() => {
      this.syncTagsWithBackend();
    }, 5 * 60 * 1000);
  }

  // Función para loggear
  log(message, level = 'info', details = null, leadId = null) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);

    // Enviar log al backend
    axios.post(`${this.backendUrl}/logs`, {
      level,
      component: 'bot',
      message,
      details,
      leadId
    }).catch(err => console.error('Error enviando log:', err));
  }

  async processNextLead() {
    // 0. VERIFICAR SCHEDULER (Horarios y Pausas)
    const scheduleCheck = this.scheduler.shouldRun();
    if (!scheduleCheck.shouldRun) {
      console.log(`⏸️ Scheduler: Pausado (${scheduleCheck.reason}) - Saltando ciclo.`);
      return;
    }

    // Evitar procesamiento simultáneo
    if (this.isProcessing) {
      console.log('⏳ Ya hay un lead siendo procesado, saltando...');
      return;
    }

    if (!this.isReady) {
      this.log('⚠️ WhatsApp no está listo, saltando procesamiento', 'warn');
      return;
    }

    // ✅ VERIFICAR RATE LIMITING
    const canSend = await this.rateLimiter.canSendNow();
    if (!canSend.allowed) {
      console.log(`⏸️ Rate limit alcanzado: ${canSend.reason}`);
      console.log(`⏰ Próximo envío disponible: ${canSend.nextAvailable || 'pronto'}`);
      console.log(`📊 Stats hoy: ${canSend.todayStats?.leads || 0} leads, ${canSend.todayStats?.messages || 0} mensajes`);
      return;
    }

    this.isProcessing = true; // Marcar como procesando

    try {
      // Obtener siguiente lead del backend con LOCKING 🔒
      const response = await axios.get(`${this.backendUrl}/next`, {
        params: { instanceId: this.instanceId } // 🔑 Solicitar lead asignado a MÍ
      });

      if (response.data.success && response.data.lead) {
        const lead = response.data.lead;
        const queueInfo = response.data.queue || { pending: 0, total: 0 };

        // Detectar si el mismo lead se está procesando repetidamente
        if (this.lastProcessedLead && this.lastProcessedLead.phone === lead.phone) {
          this.consecutiveAttempts++;
          console.log(`⚠️ Lead ${lead.name} procesado ${this.consecutiveAttempts} veces consecutivas`);

          if (this.consecutiveAttempts >= 3) {
            console.log(`🚨 Lead ${lead.name} detectado como atascado - forzando paso al siguiente`);
            this.stuckLeads.set(lead.phone, Date.now());
            this.whatsappChecker.clearNumberFromCache(lead.phone);
            await this.updateLeadStatus(lead.id, 'contacted', lead.name);
            this.consecutiveAttempts = 0;
            this.lastProcessedLead = null;

            // Pasar inmediatamente al siguiente
            setTimeout(() => {
              if (!this.isProcessing) {
                this.processNextLead();
              }
            }, 15000);
            return;
          }
        } else {
          this.consecutiveAttempts = 0;
        }

        this.lastProcessedLead = lead;

        // Mostrar información detallada de la cola
        console.log(`\n📞 === PROCESANDO NUEVO LEAD ===`);
        console.log(`👤 Lead: ${lead.name}`);
        console.log(`📱 Teléfono: ${lead.phone}`);
        console.log(`🏢 Negocio: ${lead.businessName || 'N/A'}`);
        console.log(`📍 Ubicación: ${lead.location || 'N/A'}`);
        console.log(`🔍 Palabra clave: ${lead.keyword || 'N/A'}`);
        console.log(`📊 ESTADO DE LA COLA:`);
        console.log(`   • Pendientes: ${queueInfo.pending} leads`);
        console.log(`   • Total en sistema: ${queueInfo.total} leads`);
        console.log(`   • Progreso: ${queueInfo.total > 0 ? Math.round(((queueInfo.total - queueInfo.pending) / queueInfo.total) * 100) : 0}% completado`);
        console.log(`⏱️ Tiempo estimado restante: ${queueInfo.pending > 0 ? Math.round(queueInfo.pending * 2) : 0} minutos`);
        console.log(`=====================================\n`);

        // Trackear lead procesado
        this.statsTracker.trackLead(lead, 'processing', { queueInfo });

        // Enviar secuencia de mensajes
        const result = await this.sendMessageSequence(lead);

        // Liberar el flag después de completar
        this.isProcessing = false;

        // Si el lead no fue procesado exitosamente (WhatsApp inválido, no entregado, etc.), 
        // no aplicar delay y pasar inmediatamente al siguiente
        if (result && !result.success) {
          console.log(`⚡ Lead ${lead.name} no procesado exitosamente (${result.reason}) - pasando inmediatamente al siguiente`);

          // Si el número está atascado, limpiarlo del cache
          if (result.reason === 'already_contacted' || result.reason === 'existing_conversation') {
            console.log(`🧹 Limpiando número ${lead.phone} del cache por estar atascado`);
            this.whatsappChecker.clearNumberFromCache(lead.phone);
          }

          // Programar el siguiente procesamiento con un delay seguro "Cool-off"
          // (Aleatorio 10-15s para simular comportamiento humano ante error)
          const coolOffDelay = Math.floor(Math.random() * (15000 - 10000 + 1)) + 10000;
          console.log(`🧊 Aplicando Cool-off de ${(coolOffDelay / 1000).toFixed(1)}s antes del siguiente lead...`);

          setTimeout(() => {
            if (!this.isProcessing) {
              this.processNextLead();
            }
          }, coolOffDelay);
          return;
        }

      } else {
        this.isProcessing = false; // Liberar el flag
        // Solo loggear si no hay leads cada cierto tiempo para evitar spam
        const now = Date.now();
        if (!this.lastNoLeadsLog || now - this.lastNoLeadsLog > 60000) { // 1 minuto
          const queueInfo = response.data.queue || { pending: 0, total: 0 };
          console.log(`\n😴 === NO HAY LEADS DISPONIBLES ===`);
          console.log(`📊 Estado de la cola:`);
          console.log(`   • Pendientes: ${queueInfo.pending} leads`);
          console.log(`   • Total en sistema: ${queueInfo.total} leads`);
          console.log(`   • Progreso: ${queueInfo.total > 0 ? Math.round(((queueInfo.total - queueInfo.pending) / queueInfo.total) * 100) : 0}% completado`);
          console.log(`⏱️ Esperando nuevos leads...`);
          console.log(`=====================================\n`);
          this.lastNoLeadsLog = now;
        }
      }

    } catch (error) {
      this.isProcessing = false; // Liberar el flag en caso de error

      // Manejo específico para errores de conexión (Backend caído)
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || (error.response && error.response.status === 404)) {
        console.log(`\n⚠️ No se puede conectar al Backend (${this.backendUrl}).`);
        console.log(`   Probablemente el servidor de leads no esté corriendo.`);
        console.log(`⏳ Reintentando en 60 segundos...`);

        // Retry silencioso
        setTimeout(() => {
          if (!this.isProcessing) {
            this.processNextLead();
          }
        }, 60000);
        return;
      }

      console.error('❌ Error procesando lead:', error.message);
      // Reintentar en 60s tras error desconocido para no detener el bot
      setTimeout(() => {
        if (!this.isProcessing) {
          this.processNextLead();
        }
      }, 60000);
    }
  }

  // Función para obtener mensaje aleatorio de una secuencia
  getRandomMessage(messageIndex, businessName = '') {
    const variations = this.messageSequences[messageIndex];
    const randomIndex = Math.floor(Math.random() * variations.length);
    let message = variations[randomIndex];

    // Solo reemplazar {businessName} en el primer mensaje (índice 0)
    if (businessName && messageIndex === 0) {
      message = message.replace(/{businessName}/g, businessName);
    }

    return message;
  }

  // Función para obtener mensaje de servicios (cuando el usuario lo solicita)
  getServicesMessage() {
    const servicesMessages = [
      "¡Perfecto! Te cuento todos nuestros servicios:\n\n1️⃣ Landing Page \"Convierte-YA\" - Página enfocada 100% en la acción (WhatsApp, compra o turno). Carga en < 2s y trae copy testeado A/B.\n\n2️⃣ Google Ads + Tracking - Campañas lanzadas en 24h + dashboard con costo-por-lead en tiempo real.\n\n3️⃣ Sitio web completo – Promo $150.000 - Diseño a medida, dominio .com, hosting 1 año. Entrega en 48h con SEO básico y botón de WhatsApp.\n\n4️⃣ Bot de WhatsApp - Automatiza FAQs, agenda y califica leads aunque sea domingo 2 a.m.\n\n5️⃣ SEO Local / Google My Business - Aparecés primero en Maps. Optimizamos ficha, fotos, palabras clave y reseñas para más llamadas sin pagar anuncios.\n\n6️⃣ Publicidad en Redes Sociales (Meta / TikTok / LinkedIn) - Llegá a públicos fríos y calientes. Segmentamos intereses + remarketing, creatividades que detienen el scroll y dashboard con ROI transparente.\n\n7️⃣ AI-Copy & Creatives - IA entrena con tu tono, genera copys/reels/anuncios en minutos y los testea A/B automáticamente.\n\n8️⃣ AI Chatbot de Soporte 24/7 - Chatbot entrenado con tu web + FAQ: reduce carga humana y aumenta satisfacción. Hecho a medida para cada negocio con soporte todos los días.\n\n9️⃣ Social Media Growth - Calendario + diseños + copys que venden sin parecer spam. Incluye reels con IA.\n\n🔟 Branding Express - Logo, paleta, tipografía y mini-manual. Ideal si hoy tu marca es un \"collage\" de colores.\n\n1️⃣1️⃣ Embudo \"Siempre-Venta\" - Secuencias WhatsApp/email/SMS + retargeting para que quien visitó vuelva y compre. Todo medido en pesos generados.\n\n1️⃣2️⃣ Pack de Analítica & CRO - Heatmaps, grabaciones y tests iterativos para exprimir cada visita.\n\n1️⃣3️⃣ Meta Ads Re-marketing Avanzado - Campañas dinámicas que muestran exactamente lo que el usuario vio y no compró.\n\nTambién ofrecemos cotización personalizada 1-a-1 para acompañarte en todo el proceso digital (vamos a estar disponibles para cualquier duda, consulta, creación de todo lo necesario, correcciones, todo para que el negocio funcione).\n\nEstos son solo algunos de nuestros servicios. En nuestra web https://nextemarketing.com tenés todos los servicios disponibles y toda nuestra trayectoria con casos de éxito.\n\n¿Cuál te interesa más?"
    ];

    const randomIndex = Math.floor(Math.random() * servicesMessages.length);
    return servicesMessages[randomIndex];
  }

  // Función para obtener delay aleatorio más humano
  getRandomDelay() {
    // 70% de probabilidad: delay normal (15-25 segundos)
    // 20% de probabilidad: delay corto (8-15 segundos) 
    // 10% de probabilidad: delay largo (25-40 segundos)
    const random = Math.random();

    if (random < 0.7) {
      // Delay normal (15-25 segundos)
      return Math.floor(Math.random() * (25000 - 15000 + 1)) + 15000;
    } else if (random < 0.9) {
      // Delay corto (8-15 segundos)
      return Math.floor(Math.random() * (15000 - 8000 + 1)) + 8000;
    } else {
      // Delay largo (25-40 segundos)
      return Math.floor(Math.random() * (40000 - 25000 + 1)) + 25000;
    }
  }

  // Función para simular comportamiento humano (escribiendo...)
  async simulateTyping(chatId) {
    try {
      // Simular que está escribiendo
      await this.client.sendStateTyping(chatId);

      // Esperar un tiempo aleatorio como si estuviera escribiendo
      // 60% de probabilidad: escritura normal (2-4 segundos)
      // 30% de probabilidad: escritura rápida (1-2 segundos)
      // 10% de probabilidad: escritura lenta (4-6 segundos)
      const random = Math.random();
      let typingTime;

      if (random < 0.6) {
        // Escritura normal (2-4 segundos)
        typingTime = Math.floor(Math.random() * (4000 - 2000 + 1)) + 2000;
      } else if (random < 0.9) {
        // Escritura rápida (1-2 segundos)
        typingTime = Math.floor(Math.random() * (2000 - 1000 + 1)) + 1000;
      } else {
        // Escritura lenta (4-6 segundos)
        typingTime = Math.floor(Math.random() * (6000 - 4000 + 1)) + 4000;
      }

      await this.sleep(typingTime);

      // Detener el indicador de escritura
      await this.client.sendStateTyping(chatId, false);
    } catch (error) {
      // Si falla, continuar sin problemas
      console.log('⚠️ No se pudo simular escritura');
    }
  }

  // ✅ NUEVA VERSIÓN CON IA, QUICKVERIFY Y HUMAN BEHAVIOR
  async sendMessageSequence(lead) {
    console.log(`\n🔍 === INICIANDO SECUENCIA PARA: ${lead.name} ===`);
    try {
      // Verificar teléfono
      console.log(`   1️⃣ Verificando existencia de teléfono...`);
      if (!lead.phone) {
        this.log(`⚠️ Lead ${lead.name} no tiene teléfono`, 'warn', null, lead.id);
        await this.updateLeadStatus(lead.id, 'not_interested', lead.name);
        return { success: false, reason: 'no_phone' };
      }

      // Validar y formatear número
      console.log(`   2️⃣ Validando formato de número: ${lead.phone}...`);
      const phoneValidation = await this.validateAndFormatPhone(lead.phone);
      if (!phoneValidation.valid) {
        console.log(`      ❌ Número inválido.`);
        this.log(`⚠️ Número inválido: ${lead.phone}`, 'warn', null, lead.id);
        await this.updateLeadStatus(lead.id, 'not_interested', lead.name);
        return { success: false, reason: 'invalid_phone' };
      }

      const phoneNumber = phoneValidation.formatted;
      const whatsappFormat = phoneValidation.whatsappFormat;
      console.log(`      ✅ Formato válido: ${phoneNumber} (${whatsappFormat})`);

      // ✅ VERIFICACIÓN RÁPIDA CON quickVerify() (NO envía mensajes)
      console.log(`   3️⃣ Ejecutando QuickVerify en WhatsApp...`);
      const quickCheck = await this.whatsappChecker.quickVerify(whatsappFormat);
      console.log(`      ℹ️ Resultado QuickVerify:`, JSON.stringify(quickCheck));

      if (!quickCheck.valid) {
        console.log(`      ❌ Número NO registrado en WhatsApp.`);
        this.log(`❌ ${phoneNumber} NO tiene WhatsApp registrado`, 'warn', null, lead.id);
        this.statsTracker.trackLead(lead, 'invalid', { method: 'quick_verify' });
        await this.updateLeadStatus(lead.id, 'not_interested', lead.name);
        return { success: false, reason: 'no_whatsapp' };
      }

      if (quickCheck.hasConversation) {
        console.log(`      ⚠️ Conversación previa detectada. Saltando.`);
        this.log(`⚠️ Conversación previa detectada con ${phoneNumber}`, 'warn', null, lead.id);
        this.statsTracker.trackLead(lead, 'existing_conversation', { method: 'quick_verify' });
        await this.updateLeadStatus(lead.id, 'contacted', lead.name);
        return { success: false, reason: 'already_contacted' };
      }

      console.log(`      ✅ WhatsApp válido y sin conversación previa.`);

      // ✅ GENERAR 4 MENSAJES CON IA
      console.log(`   4️⃣ Solicitando mensajes a Gemini AI...`);
      const messages = await this.aiGenerator.generatePersonalizedSequence(lead);

      console.log(`      ✅ IA generó ${messages.length} mensajes.`);
      messages.forEach((m, i) => console.log(`         📝 Msg ${i + 1}: "${m.substring(0, 40)}..."`));

      // ✅ DOBLE CHECK DE SEGURIDAD CONTRA SERVIDOR (EVITAR DUPLICADOS)
      console.log(`   4.5️⃣ Ejecutando DOBLE-CHECK de seguridad contra BD...`);
      try {
        const safetyCheck = await axios.get(`${this.backendUrl}/lead/check-messages`, {
          params: { phone: lead.phone }
        });

        if (!safetyCheck.data.safeToSend) {
          console.log(`      ⛔ SEGURIDAD: Mensajes previos detectados en servidor. ABORTANDO.`);
          console.log(`      Razón: ${safetyCheck.data.reason}`);

          // Marcar como contactado para que no vuelva a salir
          await this.updateLeadStatus(lead.id, 'contacted', lead.name);

          return { success: false, reason: 'server_safety_check_failed' };
        }
        console.log(`      ✅ Seguridad OK: Lead limpio en base de datos.`);
      } catch (err) {
        console.log(`      ⚠️ Error en safety check (asumiendo seguro para no bloquear): ${err.message}`);
      }

      // ✅ ENVIAR SECUENCIA CON HUMAN BEHAVIOR
      console.log(`   5️⃣ Iniciando envío secuencial con simulación humana...`);
      for (let i = 0; i < messages.length; i++) {
        const message = messages[i];
        console.log(`      --- Procesando Mensaje ${i + 1}/${messages.length} ---`);

        // 0. VERIFICAR SI SE DEBE ABORTAR LA SECUENCIA (rechazo detectado)
        if (this.abortCurrentSequence) {
          console.log(`      ⛔ SECUENCIA ABORTADA - Rechazo detectado del lead`);
          this.abortCurrentSequence = false; // Reset flag
          break;
        }

        // 1. VALIDACIÓN DE MENSAJE VACÍO O INCORRECTO (CRÍTICO)
        if (!message || typeof message !== 'string' || message.trim().length === 0) {
          console.error(`      ❌ ERROR CRÍTICO: Intentando enviar mensaje vacío en índice ${i}. Saltando...`);
          continue; // Saltar este mensaje para evitar crash o detección de bot
        }

        // NO tomar breaks durante una secuencia activa
        // Los breaks solo se toman entre leads, no durante el procesamiento

        try {
          // Simular tiempo de lectura (solo del mensaje anterior si existe)
          if (i > 0) {
            const readingTime = this.behaviorSimulator.getReadingTime(messages[i - 1]);
            console.log(`      📖 Simulando lectura de respuesta previa (${(readingTime / 1000).toFixed(1)}s)...`);
            await this.sleep(readingTime);
          }

          // 4.1. Análisis de Auto-Respuesta (Nuevo Requerimiento)
          // Si es el primer mensaje y tiene respuesta inmediata, verificar si es bot
          let chatForCheck = null;
          try {
            chatForCheck = await this.client.getChatById(whatsappFormat);
          } catch (e) { }

          if (i === 0 && chatForCheck && (chatForCheck.unreadCount > 0 || chatForCheck.lastMessage)) {
            const lastMsg = chatForCheck.lastMessage;
            if (lastMsg && !lastMsg.fromMe) {
              console.log(`      🤖 Posible auto-respuesta detectada: "${lastMsg.body.substring(0, 50)}..."`);

              // Pedir a Gemini que analice si es bot y genere respuesta de venta
              try {
                const isAutoReply = await this.aiGenerator.detectAutoReply(lastMsg.body);
                if (isAutoReply) {
                  console.log(`      🎯 Auto-respuesta CONFIRMADA. Adaptando estrategia de venta...`);
                  // Generar mensaje específico vendiendo la mejora del bot
                  // Le pasamos el lead y el mensaje del bot
                  const botsalesMessage = await this.aiGenerator.generateBotSalesPitch(lead, lastMsg.body);
                  if (botsalesMessage) {
                    this.messageSequences[1] = botsalesMessage; // Reemplazar el segundo mensaje con el pitch
                    console.log(`      ✅ Mensaje 2 reemplazado con pitch de venta de bot.`);
                  }
                }
              } catch (err) {
                console.log(`      ⚠️ Error analizando auto-respuesta: ${err.message}`);
              }
            }
          }

          // Simular typing con velocidad realista
          const typingTime = this.behaviorSimulator.getTypingTime(message);
          console.log(`      ⌨️  Escribiendo... (duración calculada: ${(typingTime / 1000).toFixed(1)}s)`);

          // Mostrar indicador "escribiendo..." en WhatsApp
          try {
            // Intentar simular typing, pero si falla (ej: función no existe), continuar
            if (typeof this.client.sendStateTyping === 'function') {
              await this.client.sendStateTyping(whatsappFormat);
            } else {
              // Fallback para versiones nvas/viejas de wwebjs o usar getChatById
              const chat = await this.client.getChatById(whatsappFormat);
              await chat.sendStateTyping();
            }
            await this.sleep(typingTime);

            if (typeof this.client.sendStateTyping === 'function') {
              await this.client.sendStateTyping(whatsappFormat, false);
            } else {
              const chat = await this.client.getChatById(whatsappFormat);
              if (typeof chat.clearStateTyping === 'function') {
                await chat.clearStateTyping();
              }
            }
          } catch (typingError) {
            console.log(`      ⚠️ Simulando espera (typing error: ${typingError.message})`);
            // Capar el tiempo de espera si hay error para no parecer colgado
            const safeWait = Math.min(typingTime, 5000);
            await this.sleep(safeWait);
          }

          // Enviar mensaje usando el objeto chat directamente (más estable)
          // Enviar mensaje usando el objeto chat directamente (más estable)
          console.log(`      📤 Enviando a API de WhatsApp...`);
          // Asegurar que tenemos el chat (el 'chat' anterior estaba en otro scope)
          let sentMessage;
          try {
            // 🛡️ SAFETY CHECK: Verificar si el cliente sigue conectado
            if (!this.client || !this.client.info) {
              console.warn('⚠️ Cliente desconectado detectado antes de enviar. Abortando.');
              return;
            }

            const chatToSend = await this.client.getChatById(whatsappFormat);
            if (!chatToSend) throw new Error(`Chat object is null for ${whatsappFormat}`);

            sentMessage = await chatToSend.sendMessage(message);
          } catch (criticalError) {
            if (criticalError.message.includes('getChat') || criticalError.message.includes('Session Closed') || criticalError.message.includes('protocol')) {
              console.error(`🔥 ERROR CRÍTICO DE SESIÓN enviando mensaje: ${criticalError.message}. Deteniendo secuencia.`);
              return; // Salir de la función completamente para evitar crash
            }
            throw criticalError; // Re-lanzar para el catch externo si es otro error
          }

          // ⏱️ Auto-reply Timer: Registrar hora exacta de envío
          this.lastMessageTimestamps.set(whatsappFormat, Date.now());

          console.log(`      ✅ Mensaje ENVIADO (ID: ${sentMessage.id._serialized})`);

          // Guardar en BD con metadata de IA
          try {
            console.log(`      💾 Guardando en base de datos...`);
            await axios.post(`${this.backendUrl}/messages`, {
              leadId: lead.id,
              leadName: lead.name,
              phone: lead.phone,
              messageNumber: i + 1,
              content: message,
              type: 'oferta_servicio',
              status: 'sent',
              sentAt: new Date(),
              whatsappMessageId: sentMessage.id._serialized,
              // 🔑 MULTI-BOT: Tracking de qué número/instancia envió
              sentFromNumber: this.connectedNumber,
              instanceId: this.instanceId,
              metadata: {
                generatedByAI: true,
                model: 'gemini-1.5-flash',
                promoType: i === 2 ? 'promo_2025' : 'engagement',
                humanBehavior: {
                  typingTime: typingTime,
                  readingTime: i > 0 ? this.behaviorSimulator.getReadingTime(messages[i - 1]) : 0
                }
              }
            });
            console.log(`      ✅ Guardado OK.`);
          } catch (error) {
            console.error('      ⚠️ Error guardando mensaje en BD:', error.message);
          }

          // Delay entre mensajes con rate limiter
          if (i < messages.length - 1) {
            const delay = this.rateLimiter.getMessageDelay();
            console.log(`      ⏱️  Esperando delay humano: ${(delay / 1000).toFixed(1)}s ...`);
            await this.sleep(delay);
          }

        } catch (error) {
          console.error(`      ❌ Error fatal enviando mensaje ${i + 1}:`, error.stack || error);
          // Continuar con el siguiente mensaje si falla uno
          if (i < messages.length - 1) {
            console.log(`      ⏩ Intentando siguiente mensaje a pesar del error...`);
            continue;
          } else {
            console.log(`      ⛔ Abortando secuencia.`);
            break;
          }
        }
      }

      // ✅ REGISTRAR EN RATE LIMITER
      console.log(`   6️⃣ Finalizando y actualizando estadísticas...`);
      await this.rateLimiter.recordLead(lead.id, messages.length, true);
      this.statsTracker.trackLead(lead, 'contacted', { messagesSent: messages.length, method: 'ai_generated' });

      // Marcar como contactado
      await this.updateLeadStatus(lead.id, 'contacted', lead.name);
      console.log(`   ✅ SECUENCIA COMPLETADA EXITOSAMENTE para ${lead.name}`);

      // Mostrar stats del rate limiter
      const stats = await this.rateLimiter.getStats();
      const todayStats = stats?.today || { leads: 0, messages: 0 };
      console.log(`   📊 Progreso Diario: ${todayStats.leads} leads | ${todayStats.messages} mensajes`);

      return { success: true, messagesSent: messages.length };

    } catch (error) {
      this.log(`❌ Error en secuencia: ${error.message}`, 'error', null, lead.id);
      console.error(`   ❌ ERROR CRÍTICO EN SECUENCIA:`, error.stack || error);
      await this.updateLeadStatus(lead.id, 'contacted', lead.name); // Marcar contactado para no repetir infinitamente
      return { success: false, reason: 'error', error: error.message };
    }
  }

  /**
   * Enviar secuencia completa (mensajes 1-8)
   */
  async sendFullSequence(lead, whatsappFormat) {
    this.log(`📱 Enviando secuencia completa de ${this.messageSequences.length} mensajes a ${lead.name}`, 'info', null, lead.id);
    this.log(`🎲 Usando variaciones aleatorias para evitar spam`, 'info', null, lead.id);

    // Enviar secuencia de mensajes con variaciones
    for (let i = 0; i < this.messageSequences.length; i++) {
      const message = this.getRandomMessage(i, lead.name);

      try {
        const messageId = Date.now().toString() + '_' + i;

        // Guardar mensaje en base de datos
        const messageData = {
          leadId: lead.id,
          leadName: lead.name,
          phone: lead.phone,
          messageNumber: i + 1,
          content: message,
          variation: message,
          type: 'oferta_servicio',
          status: 'sent',
          sentAt: new Date(),
          delay: i > 0 ? this.getRandomDelay() : 0,
          typingTime: 2000,
          whatsappMessageId: messageId,
          botInstance: 'main',
          sessionId: this.client.info?.wid?.user || '',
          metadata: {
            messageIndex: i,
            totalMessages: this.messageSequences.length,
            whatsappVerified: true,
            envioAutomatico: true,
            scrapingData: {
              keyword: lead.keyword || '',
              location: lead.location || '',
              searchQuery: `${lead.keyword || ''} ${lead.location || ''}`.trim(),
              scrapedAt: lead.createdAt || new Date()
            }
          }
        };

        // Guardar en base de datos
        try {
          await axios.post(`${this.backendUrl}/messages`, messageData);
        } catch (error) {
          console.error('Error guardando mensaje en BD:', error.message);
        }

        // Simular que está escribiendo
        await this.simulateTyping(whatsappFormat);

        const sentMessage = await this.client.sendMessage(whatsappFormat, message);
        this.log(`✅ Mensaje ${i + 1} enviado a ${lead.name}`, 'success', null, lead.id);

        // Trackear mensaje enviado
        this.statsTracker.trackMessage(messageData);

        // Esperar delay aleatorio entre mensajes
        if (i < this.messageSequences.length - 1) {
          const randomDelay = this.getRandomDelay();
          this.log(`⏱️ Esperando ${randomDelay / 1000}s antes del siguiente mensaje...`, 'info', null, lead.id);
          await this.sleep(randomDelay);
        }

      } catch (error) {
        console.error(`❌ Error enviando mensaje ${i + 1} a ${lead.name}:`, error.message);
        break;
      }
    }

    // Marcar como contactado
    await this.updateLeadStatus(lead.id, 'contacted', lead.name);
    this.log(`✅ Secuencia completa finalizada para ${lead.name}`, 'success', null, lead.id);

    // Mostrar progreso de la cola
    try {
      const queueResponse = await axios.get(`${this.backendUrl}/next`);
      if (queueResponse.data.queue) {
        const queueInfo = queueResponse.data.queue;
        console.log(`\n📊 === PROGRESO DE LA COLA ===`);
        console.log(`✅ Lead completado: ${lead.name}`);
        console.log(`📈 Estado actual:`);
        console.log(`   • Pendientes: ${queueInfo.pending} leads`);
        console.log(`   • Total en sistema: ${queueInfo.total} leads`);
        console.log(`   • Progreso: ${queueInfo.total > 0 ? Math.round(((queueInfo.total - queueInfo.pending) / queueInfo.total) * 100) : 0}% completado`);
        console.log(`⏱️ Tiempo estimado restante: ${queueInfo.pending > 0 ? Math.round(queueInfo.pending * 2) : 0} minutos`);
        console.log(`=====================================\n`);
      }
    } catch (error) {
      // Silenciar errores de consulta de cola
    }
  }

  /**
   * Enviar secuencia restante (mensajes 3-8 después de verificación)
   */
  async sendRemainingSequence(lead, whatsappFormat, startIndex = 2) {
    // Evitar envío simultáneo de mensajes
    if (this.isSendingMessages) {
      this.log(`⚠️ Ya se están enviando mensajes a ${lead.name} - saltando`, 'warn', null, lead.id);
      return;
    }

    this.isSendingMessages = true; // Marcar como enviando

    try {
      this.log(`📱 Enviando secuencia restante (mensajes ${startIndex + 1}-${this.messageSequences.length}) a ${lead.name}`, 'info', null, lead.id);

      // Verificar mensajes ya enviados en el chat
      const sentMessages = await this.getSentMessagesFromChat(whatsappFormat);
      this.log(`🔍 Mensajes encontrados en chat: ${sentMessages.length}`, 'info', null, lead.id);

      // VERIFICACIÓN PREVIA: Revisar todos los mensajes que se van a enviar
      const messagesToSend = [];

      // IMPORTANTE: También verificar el mensaje 2 (índice 1) si startIndex es 2
      // porque puede haber sido enviado por WhatsAppChecker
      const checkStartIndex = startIndex === 2 ? 1 : startIndex;

      for (let i = checkStartIndex; i < this.messageSequences.length; i++) {
        // Verificar si este mensaje ya fue enviado
        if (await this.isMessageAlreadySent(i, sentMessages)) {
          this.log(`⏭️ Mensaje ${i + 1} (índice ${i}) ya fue enviado - saltando`, 'info', null, lead.id);
          continue;
        }

        // Solo agregar mensajes que están en el rango que queremos enviar (startIndex en adelante)
        if (i >= startIndex) {
          // Agregar a la lista de mensajes a enviar
          const message = this.getRandomMessage(i, lead.name);
          messagesToSend.push({
            index: i,
            message: message,
            messageNumber: i + 1
          });
        }
      }

      this.log(`📋 Mensajes a enviar: ${messagesToSend.length} de ${this.messageSequences.length - startIndex}`, 'info', null, lead.id);

      // 6. Verificar si quedan leads para aplicar "Cool-off" largo
      const pendingLeads = await this.rateLimiter.getPendingCount();
      if (pendingLeads > 0) {
        // Lógica anterior que usaba this.leads fallaba
      }
      // Si no hay mensajes para enviar, terminar
      if (messagesToSend.length === 0) {
        this.log(`✅ No hay mensajes nuevos para enviar a ${lead.name}`, 'info', null, lead.id);
        return;
      }

      // Enviar mensajes restantes de la secuencia
      for (let i = 0; i < messagesToSend.length; i++) {
        const { index, message, messageNumber } = messagesToSend[i];

        this.log(`📝 Enviando mensaje ${messageNumber} (índice ${index}): ${message.substring(0, 100)}...`, 'info', null, lead.id);

        // Verificar que el mensaje sea el correcto
        if (index === 2 && !message.includes('$150.000')) {
          this.log(`⚠️ ERROR: Mensaje 3 (índice 2) no contiene $150.000: ${message.substring(0, 50)}...`, 'error', null, lead.id);
        }
        if (index === 3 && !message.includes('$500.000')) {
          this.log(`⚠️ ERROR: Mensaje 4 (índice 3) no contiene $500.000: ${message.substring(0, 50)}...`, 'error', null, lead.id);
        }

        // AGREGAR DELAY INICIAL ANTES DEL PRIMER MENSAJE
        if (i === 0) {
          const initialDelay = this.getRandomDelay();
          this.log(`⏱️ Delay inicial de ${initialDelay / 1000}s antes del primer mensaje...`, 'info', null, lead.id);
          await this.sleep(initialDelay);
        }

        try {
          const messageId = Date.now().toString() + '_' + index;

          // Guardar mensaje en base de datos
          const messageData = {
            leadId: lead.id,
            leadName: lead.name,
            phone: lead.phone,
            messageNumber: messageNumber,
            content: message,
            variation: message,
            type: 'oferta_servicio',
            status: 'sent',
            sentAt: new Date(),
            delay: this.getRandomDelay(), // SIEMPRE agregar delay, incluso al primer mensaje
            typingTime: 2000,
            whatsappMessageId: messageId,
            botInstance: 'main',
            sessionId: this.client.info?.wid?.user || '',
            metadata: {
              messageIndex: index,
              totalMessages: this.messageSequences.length,
              whatsappVerified: true,
              envioAutomatico: true,
              verificationSession: true,
              scrapingData: {
                keyword: lead.keyword || '',
                location: lead.location || '',
                searchQuery: `${lead.keyword || ''} ${lead.location || ''}`.trim(),
                scrapedAt: lead.createdAt || new Date()
              }
            }
          };

          // Guardar en base de datos
          try {
            await axios.post(`${this.backendUrl}/messages`, messageData);
          } catch (error) {
            console.error('Error guardando mensaje en BD:', error.message);
          }

          // Simular que está escribiendo
          await this.simulateTyping(whatsappFormat);

          const sentMessage = await this.client.sendMessage(whatsappFormat, message);
          this.log(`✅ Mensaje ${messageNumber} enviado a ${lead.name}`, 'success', null, lead.id);

          // Esperar delay aleatorio entre mensajes (SIEMPRE, incluso después del primer mensaje)
          if (i < messagesToSend.length - 1) {
            const randomDelay = this.getRandomDelay();
            this.log(`⏱️ Esperando ${randomDelay / 1000}s antes del siguiente mensaje...`, 'info', null, lead.id);
            await this.sleep(randomDelay);
          }

        } catch (error) {
          console.error(`❌ Error enviando mensaje ${messageNumber} a ${lead.name}:`, error.message);
          break;
        }
      }

      // Marcar como contactado y que se enviaron mensajes 3-8
      await this.updateLeadStatus(lead.id, 'contacted', lead.name);

      // Marcar que se enviaron los mensajes 3-8 para evitar duplicados
      try {
        await axios.put(`${this.backendUrl}/lead/${lead.id}/status`, {
          messages3to8Sent: true
        });
      } catch (error) {
        console.error('Error marcando mensajes 3-8 como enviados:', error.message);
      }

      this.log(`✅ Secuencia restante finalizada para ${lead.name}`, 'success', null, lead.id);

      // Mostrar progreso de la cola
      try {
        const queueResponse = await axios.get(`${this.backendUrl}/next`);
        if (queueResponse.data.queue) {
          const queueInfo = queueResponse.data.queue;
          console.log(`\n📊 === PROGRESO DE LA COLA ===`);
          console.log(`✅ Lead completado: ${lead.name}`);
          console.log(`📈 Estado actual:`);
          console.log(`   • Pendientes: ${queueInfo.pending} leads`);
          console.log(`   • Total en sistema: ${queueInfo.total} leads`);
          console.log(`   • Progreso: ${queueInfo.total > 0 ? Math.round(((queueInfo.total - queueInfo.pending) / queueInfo.total) * 100) : 0}% completado`);
          console.log(`⏱️ Tiempo estimado restante: ${queueInfo.pending > 0 ? Math.round(queueInfo.pending * 2) : 0} minutos`);
          console.log(`=====================================\n`);
        }
      } catch (error) {
        // Silenciar errores de consulta de cola
      }

    } finally {
      this.isSendingMessages = false; // Liberar la bandera
    }
  }

  async handleIncomingMessage(message) {
    try {
      // 1. IGNORAR MENSAJES PROPIOS (CRÍTICO)
      if (message.fromMe) {
        return;
      }

      // 2. IGNORAR MENSAJES VACÍOS O DE SISTEMA (CRÍTICO)
      // Esto evita errores de IA con strings vacíos
      if (!message.body || message.body.trim() === '') {
        // console.log(`[${new Date().toISOString()}] ⚠️ Mensaje vacío ignorado de ${message.from}`); // Reducir ruido
        return;
      }

      // 3. IGNORAR GRUPOS
      if (message.from.endsWith('@g.us')) {
        // console.log(`[${new Date().toISOString()}] ⚠️ Mensaje de grupo ignorado: ${message.from}`);
        return;
      }

      const contactNumber = message.from;
      const messageBody = message.body;

      console.log(`📨 Mensaje recibido de ${contactNumber}: "${messageBody}"`);

      // ✅ ANALIZAR RESPUESTA CON IA
      const analysis = await this.responseAnalyzer.isRejection(messageBody);

      if (analysis.isRejection && analysis.shouldRespond) {
        console.log(`❌ Rechazo detectado de ${contactNumber} (${(analysis.confidence * 100).toFixed(0)}%)`);
        console.log(`📝 Razón: ${analysis.reason || 'Usuario no interesado'}`);

        // CRÍTICO: Abortar secuencia en curso si hay una activa
        this.abortCurrentSequence = true;

        // Generar disculpa profesional
        const apology = await this.responseAnalyzer.generateApology(contactNumber);

        // Enviar disculpa
        try {
          await this.client.sendMessage(contactNumber, apology);
          console.log(`✅ Disculpa enviada a ${contactNumber}`);

          // Marcar en BD como no interesado
          try {
            // Buscar lead por número y actualizar status
            await axios.put(`${this.backendUrl}/lead/by-phone/${encodeURIComponent(contactNumber)}`, {
              status: 'not_interested',
              rejectionReason: analysis.reason || 'Usuario rechazó oferta',
              rejectionConfidence: analysis.confidence
            });
          } catch (error) {
            console.error('Error actualizando lead status:', error.message);
          }

          return; // No procesar más este mensaje
        } catch (error) {
          console.error(`Error enviando disculpa:`, error.message);
        }
      }

      // Verificar si es interés alto/medio
      const interest = this.responseAnalyzer.isInterested(messageBody);
      if (interest.isInterested && interest.shouldNotify) {
        console.log(`🔥 LEAD INTERESADO (${interest.level}): ${contactNumber}`);
        console.log(`📝 Mensaje: "${messageBody}"`);

        // 🚨 NOTIFICAR AL USUARIO (aquí implementar notificación)
        // TODO: Enviar a tu WhatsApp personal, Slack, email, etc.
      }

      const phoneNumber = message.from; // Re-declare or use contactNumber consistently
      // console.log(`[${new Date().toISOString()}] 📨 Mensaje recibido de ${phoneNumber}: ${message.body}`); // This line is now redundant due to the new console.log above

      // 🎭 DEMO DENTAL - Verificar activación de demo
      if (this.checkDemoActivation(message)) {
        console.log(`[${new Date().toISOString()}] 🎭 Activando demo dental para ${phoneNumber}`);
        this.activateDemo(phoneNumber);

        // Enviar mensaje inicial de la demo
        const demoResponse = "🎭 **[DEMO ACTIVADA]**\n\n¡Hola! Soy el asistente virtual de Clínica Dental Recoleta 🦷\n\n¿Sos paciente ya de nuestra clínica o sos nuevo?\n\n💡 **Enviar \"Desactivar demo\" para desactivar**";

        try {
          await this.simulateTyping(phoneNumber);
          await this.client.sendMessage(phoneNumber, demoResponse);
          console.log(`[${new Date().toISOString()}] 🎭 Demo dental iniciado para ${phoneNumber}`);
        } catch (error) {
          console.error('❌ Error enviando mensaje inicial de demo:', error.message);
        }
        return;
      }

      // 🎭 DEMO DENTAL - Verificar si hay demo activa
      if (this.isDemoActivated(phoneNumber)) {
        console.log(`[${new Date().toISOString()}] 🎭 Procesando demo dental para ${phoneNumber}`);

        // Verificar si quiere desactivar la demo
        if (message.body.toLowerCase().includes('desactivar demo')) {
          this.deactivateDemo(phoneNumber);
          const deactivateResponse = "🎭 **Demo desactivada**\n\n¡Gracias por probar la demo! El sistema ha vuelto al funcionamiento normal.";
          try {
            await this.simulateTyping(phoneNumber);
            await this.client.sendMessage(phoneNumber, deactivateResponse);
            console.log(`[${new Date().toISOString()}] 🎭 Demo dental desactivada manualmente para ${phoneNumber}`);
          } catch (error) {
            console.error('❌ Error enviando mensaje de desactivación:', error.message);
          }
          return;
        }

        const demoResult = this.getDemoResponse(phoneNumber, message.body);
        if (demoResult && demoResult.response) {
          try {
            await this.simulateTyping(phoneNumber);
            await this.client.sendMessage(phoneNumber, demoResult.response);
            console.log(`[${new Date().toISOString()}] 🎭 Respuesta de demo enviada a ${phoneNumber}`);

            // Si la demo terminó, desactivar
            if (!demoResult.shouldContinue) {
              this.deactivateDemo(phoneNumber);
            }
          } catch (error) {
            console.error('❌ Error enviando respuesta de demo:', error.message);
          }
        }
        return; // No procesar como lead normal si está en demo
      }

      // 🔍 FLUJO NORMAL - Buscar lead asociado a este número
      const lead = await this.findLeadByPhone(phoneNumber);

      if (!lead) {
        console.log(`[${new Date().toISOString()}] ⚠️ No se encontró lead para ${phoneNumber} - IGNORANDO MENSAJE`);
        return; // No responder a números que no son leads
      }

      // Verificar que el lead esté en estado 'contacted' (ya le enviamos mensajes)
      if (lead.status !== 'contacted') {
        console.log(`[${new Date().toISOString()}] ⚠️ Lead ${lead.name} no está en estado 'contacted' - IGNORANDO MENSAJE`);
        return;
      }

      // 🎯 VERIFICAR SI ES RESPUESTA A SESIÓN DE VERIFICACIÓN
      const sessionConfirmation = this.whatsappChecker.confirmSession(phoneNumber);
      if (sessionConfirmation.success) {
        console.log(`[${new Date().toLocaleTimeString()}] ✅ Sesión de verificación confirmada para ${phoneNumber}`);
        return;
      }

      // 🔍 DEBUG: Loggear timestamp y mensaje
      console.log(`[${new Date().toLocaleTimeString()}] 📨 Mensaje de ${phoneNumber}: "${message.body.substring(0, 50)}..."`);

      // 🤖 DETECTAR AUTO-REPLY (Tiempo < 10s O Patrón de texto)
      const lastMsgTime = this.lastMessageTimestamps.get(phoneNumber);
      const timeDiff = lastMsgTime ? Date.now() - lastMsgTime : 999999;
      const isFastReply = timeDiff < 10000; // 10 segundos

      const autoReplyCheck = this.responseAnalyzer.isAutoResponse(message.body);

      // LOG DE DIAGNÓSTICO
      console.log(`   🔍 Auto-Reply Debug:
         - Último msg enviado: ${lastMsgTime ? new Date(lastMsgTime).toLocaleTimeString() : 'N/A'}
         - Tiempo transcurrido: ${(timeDiff / 1000).toFixed(1)}s (Umbral: 10s)
         - ¿Es veloz?: ${isFastReply ? 'SÍ' : 'NO'}
         - ¿Es patrón texto?: ${autoReplyCheck.isAutoResponse ? 'SÍ' : 'NO'} (${autoReplyCheck.reason || '-'})`);

      if (isFastReply || autoReplyCheck.isAutoResponse) {
        console.log(`[${new Date().toLocaleTimeString()}] 🤖 AUTO-RESPUESTA DETECTADA. Enviando pitch de bot...`);
        console.log(`   Razón: ${isFastReply ? `Respuesta rápida (${(timeDiff / 1000).toFixed(1)}s)` : 'Patrón de texto'}`);

        // Seleccionar mensaje de venta de bot de las plantillas avanzadas
        if (this.aiGenerator && this.aiGenerator.templateGenerator && this.aiGenerator.templateGenerator.respuestasBotAutomatico) {
          const botPitch = this.aiGenerator.templateGenerator.random(this.aiGenerator.templateGenerator.respuestasBotAutomatico);

          // Añadir delay humano antes de responder al bot
          await new Promise(resolve => setTimeout(resolve, 8000 + Math.random() * 5000));

          await this.client.sendMessage(message.from, botPitch);
          console.log(`📤 Enviado pitch de bot a ${phoneNumber}: "${botPitch}"`);
        }

        return; // Detener flujo para evitar loops
      }

      // 🛑 VERIFICAR SI ES RESPUESTA HUMANA DURANTE SECUENCIA
      const humanResponse = await this.whatsappChecker.handleUserResponse(phoneNumber, message, lead, phoneNumber);
      if (humanResponse && humanResponse.action === 'stop_sequence') {
        console.log(`🛑 Respuesta humana detectada - cortando secuencia automática para ${phoneNumber}`);

        // Trackear respuesta humana
        this.statsTracker.trackResponse(phoneNumber, 'human', message.body, humanResponse.responseTime);

        // Analizar la respuesta para determinar siguiente acción
        const response = this.analyzeResponse(message);
        if (response.type === 'interested' || response.type === 'services_request' ||
          response.type === 'not_interested' || response.type === 'neutral') {
          await this.sendAutoResponse(message, response);
        }

        return;
      }

      // Analizar respuesta del lead
      const response = this.analyzeResponse(message);

      // Actualizar lead con la respuesta
      await this.updateLeadResponse(lead.id, response, lead.name);

      // Enviar respuesta automática para diferentes tipos de respuestas
      if (response.type === 'interested' || response.type === 'services_request' ||
        response.type === 'not_interested' || response.type === 'neutral') {
        await this.sendAutoResponse(message, response);
      }

      // Notificar a Slack si está configurado
      if (this.slackWebhook) {
        await this.notifySlack(lead, response);
      }

    } catch (error) {
      console.error('❌ Error procesando mensaje entrante:', error.message);
    }
  }

  async findLeadByPhone(phoneNumber) {
    try {
      // 🛠️ FIX: Manejo de IDs de WhatsApp Business (@lid)
      if (phoneNumber.includes('@lid')) {
        console.log(`🔍 Detectado ID de WhatsApp Business (LID): ${phoneNumber}. Intentando resolver número real...`);
        try {
          const chat = await this.client.getChatById(phoneNumber);
          if (chat) {
            const contact = await chat.getContact();
            if (contact && contact.number) {
              console.log(`✅ LID resuelto a número: ${contact.number}`);
              phoneNumber = contact.number + '@c.us'; // Usar el número real estándar
            }
          }
        } catch (err) {
          console.warn(`⚠️ No se pudo resolver LID ${phoneNumber}:`, err.message);
          // Intentar continuar con el LID original por si acaso está guardado así (raro)
        }
      }

      // Limpiar número de teléfono (quitar @c.us y caracteres no numéricos)
      const cleanPhone = phoneNumber.replace('@c.us', '').replace(/\D/g, '');

      console.log(`🔍 Buscando lead para número: ${phoneNumber} (limpio: ${cleanPhone})`);

      // Buscar en el backend con diferentes formatos
      const searchQueries = [
        cleanPhone, // Número limpio
        cleanPhone.replace(/^549/, ''), // Sin prefijo 549
        cleanPhone.replace(/^54/, ''), // Sin prefijo 54
        phoneNumber.replace('@c.us', '') // Número original sin @c.us
      ];

      for (const query of searchQueries) {
        if (query.length < 8) continue; // Saltar números muy cortos

        // console.log(`🔍 Intentando búsqueda con: ${query}`);

        try {
          const response = await axios.get(`${this.backendUrl}/leads?search=${query}&limit=10`);

          if (response.data.success && response.data.leads.length > 0) {
            console.log(`✅ Lead encontrado: ${response.data.leads[0].name} (tel: ${response.data.leads[0].phone})`);
            return response.data.leads[0];
          }
        } catch (error) {
          // Silenciar errores de búsqueda repetitivos
          // console.log(`❌ Error en búsqueda con ${query}:`, error.message);
        }
      }

      console.log(`❌ No se encontró lead para ${phoneNumber}`);
      return null;

    } catch (error) {
      console.error('❌ Error buscando lead por teléfono:', error.message);
      return null;
    }
  }

  analyzeResponse(message) {
    const body = message.body.toLowerCase();

    // Palabras clave para diferentes tipos de respuestas
    const interestedKeywords = [
      'interesado', 'interesa', 'me interesa', 'cuéntame más', 'más información',
      'precio', 'costos', 'cuánto cuesta', 'presupuesto', 'cotización',
      'sí', 'si', 'ok', 'okay', 'perfecto', 'genial', 'excelente',
      'cuando', 'cuándo', 'dónde', 'donde', 'cómo', 'como',
      'contacto', 'llamar', 'llamada', 'reunión', 'cita'
    ];

    // Palabras clave para pedir servicios (con regex para variaciones)
    const servicesKeywords = [
      'servicios', 'servicio', 'qué hacen', 'que hacen', 'qué ofrecen', 'que ofrecen',
      'qué tienen', 'que tienen', 'qué más', 'que más', 'más servicios',
      'catálogo', 'catalogo', 'lista', 'todos los servicios', 'todos los servicios',
      'qué más hacen', 'que mas hacen', 'qué más ofrecen', 'que mas ofrecen',
      'cuáles son', 'cuales son', 'qué servicios', 'que servicios',
      'más info', 'mas info', 'más información', 'mas informacion',
      'detalles', 'más detalles', 'mas detalles', 'todo lo que hacen',
      'qué incluye', 'que incluye', 'qué incluyen', 'que incluyen',
      'pack', 'paquete', 'oferta', 'ofertas', 'promoción', 'promocion',
      'promociones', 'promociones', 'todo', 'completo', 'integral'
    ];

    const notInterestedKeywords = [
      'no', 'no me interesa', 'no estoy interesado', 'no gracias',
      'no quiero', 'no necesito', 'no estoy buscando',
      'no por ahora', 'más adelante', 'después', 'despues',
      'no tengo tiempo', 'no tengo presupuesto', 'no tengo dinero',
      'ya cuento', 'ya tengo', 'ya tengo proveedor', 'ya tengo alguien',
      'no por el momento', 'no por ahora', 'más tarde', 'mas tarde',
      'no estoy necesitando', 'no lo necesito', 'no lo requiero',
      'gracias por el momento', 'gracias pero no', 'gracias pero ya tengo',
      'no estoy en el mercado', 'no estoy buscando ahora',
      'no tengo interés', 'no me interesa por ahora',
      'ya tengo todo', 'ya tengo lo que necesito', 'ya estoy cubierto'
    ];

    const neutralKeywords = [
      'gracias', 'grasias', 'gracia', 'ok', 'okay', 'perfecto',
      'entendido', 'claro', 'vale', 'bueno', 'bien'
    ];

    // Verificar si pide servicios (prioridad alta)
    for (const keyword of servicesKeywords) {
      if (body.includes(keyword)) {
        return {
          type: 'services_request',
          confidence: 0.9,
          keywords: [keyword],
          message: body
        };
      }
    }

    // Verificar si contiene palabras clave de interés
    for (const keyword of interestedKeywords) {
      if (body.includes(keyword)) {
        return {
          type: 'interested',
          confidence: 0.8,
          keywords: [keyword],
          message: body
        };
      }
    }

    // Verificar si contiene palabras clave de no interés
    for (const keyword of notInterestedKeywords) {
      if (body.includes(keyword)) {
        return {
          type: 'not_interested',
          confidence: 0.8,
          keywords: [keyword],
          message: body
        };
      }
    }

    // Verificar si contiene palabras neutrales
    for (const keyword of neutralKeywords) {
      if (body.includes(keyword)) {
        return {
          type: 'neutral',
          confidence: 0.6,
          keywords: [keyword],
          message: body
        };
      }
    }

    // Si no coincide con ningún patrón, considerar como neutral
    return {
      type: 'neutral',
      confidence: 0.3,
      keywords: [],
      message: body
    };
  }

  // DEMO DENTAL - Sistema independiente
  isDemoActivated(phoneNumber) {
    return this.demoSessions.has(phoneNumber);
  }

  activateDemo(phoneNumber) {
    this.demoSessions.set(phoneNumber, {
      step: 0,
      data: {
        isPatient: null,
        specialty: null,
        contactSource: null,
        name: null,
        phone: null
      },
      startTime: Date.now()
    });
    console.log(`🎭 Demo dental activado para ${phoneNumber}`);
  }

  deactivateDemo(phoneNumber) {
    this.demoSessions.delete(phoneNumber);
    console.log(`🎭 Demo dental desactivado para ${phoneNumber}`);
  }

  getDemoResponse(phoneNumber, userMessage) {
    const session = this.demoSessions.get(phoneNumber);
    if (!session) return null;

    const message = userMessage.toLowerCase();
    let response = '';
    let shouldContinue = true;

    switch (session.step) {
      case 0: // Pregunta si es paciente
        if (message.includes('sí') || message.includes('si') || message.includes('paciente') || message.includes('cliente')) {
          session.data.isPatient = true;
          response = "¡Perfecto! ¿Para qué especialidad necesitás el turno?\n\n🦷 Ortodoncia\n🦷 Implantes\n🦷 Endodoncia\n🦷 Periodoncia\n🦷 Odontología general\n🦷 Blanqueamiento";
          session.step = 1;
        } else if (message.includes('no') || message.includes('nuevo')) {
          session.data.isPatient = false;
          response = "¡Bienvenido! ¿Para qué especialidad te gustaría consultar?\n\n🦷 Ortodoncia\n🦷 Implantes\n🦷 Endodoncia\n🦷 Periodoncia\n🦷 Odontología general\n🦷 Blanqueamiento";
          session.step = 1;
        } else {
          response = "No entendí bien. ¿Sos paciente ya de nuestra clínica o sos nuevo? Respondé con 'sí' o 'no' por favor.";
        }
        break;

      case 1: // Pregunta especialidad
        if (message.includes('ortodoncia') || message.includes('brackets') || message.includes('frenillos')) {
          session.data.specialty = 'ortodoncia';
          response = "Excelente elección. ¿A través de quién te contactaste con nosotros?\n\n📱 Instagram\n📱 Facebook\n📱 Google\n📱 Recomendación\n📱 Otro";
          session.step = 2;
        } else if (message.includes('implante') || message.includes('implantes')) {
          session.data.specialty = 'implantes';
          response = "Muy buena opción. ¿A través de quién te contactaste con nosotros?\n\n📱 Instagram\n📱 Facebook\n📱 Google\n📱 Recomendación\n📱 Otro";
          session.step = 2;
        } else if (message.includes('endodoncia') || message.includes('conducto')) {
          session.data.specialty = 'endodoncia';
          response = "Perfecto. ¿A través de quién te contactaste con nosotros?\n\n📱 Instagram\n📱 Facebook\n📱 Google\n📱 Recomendación\n📱 Otro";
          session.step = 2;
        } else if (message.includes('periodoncia') || message.includes('encía')) {
          session.data.specialty = 'periodoncia';
          response = "Muy bien. ¿A través de quién te contactaste con nosotros?\n\n📱 Instagram\n📱 Facebook\n📱 Google\n📱 Recomendación\n📱 Otro";
          session.step = 2;
        } else if (message.includes('general') || message.includes('limpieza') || message.includes('caries')) {
          session.data.specialty = 'general';
          response = "Excelente. ¿A través de quién te contactaste con nosotros?\n\n📱 Instagram\n📱 Facebook\n📱 Google\n📱 Recomendación\n📱 Otro";
          session.step = 2;
        } else if (message.includes('blanqueamiento') || message.includes('blanqueo')) {
          session.data.specialty = 'blanqueamiento';
          response = "Perfecto. ¿A través de quién te contactaste con nosotros?\n\n📱 Instagram\n📱 Facebook\n📱 Google\n📱 Recomendación\n📱 Otro";
          session.step = 2;
        } else {
          response = "No entendí la especialidad. Por favor elegí una:\n\n🦷 Ortodoncia\n🦷 Implantes\n🦷 Endodoncia\n🦷 Periodoncia\n🦷 Odontología general\n🦷 Blanqueamiento";
        }
        break;

      case 2: // Pregunta fuente de contacto
        if (message.includes('instagram') || message.includes('ig')) {
          session.data.contactSource = 'instagram';
          response = "¡Gracias! Ahora necesito algunos datos para agendar tu turno:\n\n¿Cuál es tu nombre completo?";
          session.step = 3;
        } else if (message.includes('facebook') || message.includes('fb')) {
          session.data.contactSource = 'facebook';
          response = "¡Gracias! Ahora necesito algunos datos para agendar tu turno:\n\n¿Cuál es tu nombre completo?";
          session.step = 3;
        } else if (message.includes('google') || message.includes('maps')) {
          session.data.contactSource = 'google';
          response = "¡Gracias! Ahora necesito algunos datos para agendar tu turno:\n\n¿Cuál es tu nombre completo?";
          session.step = 3;
        } else if (message.includes('recomendación') || message.includes('recomendacion') || message.includes('amigo')) {
          session.data.contactSource = 'recomendacion';
          response = "¡Gracias! Ahora necesito algunos datos para agendar tu turno:\n\n¿Cuál es tu nombre completo?";
          session.step = 3;
        } else {
          session.data.contactSource = 'otro';
          response = "¡Gracias! Ahora necesito algunos datos para agendar tu turno:\n\n¿Cuál es tu nombre completo?";
          session.step = 3;
        }
        break;

      case 3: // Pregunta nombre
        if (message.length > 2) {
          session.data.name = userMessage; // Guardar nombre original
          response = `¡Perfecto ${session.data.name}! ¿Cuál es tu número de teléfono para confirmar el turno?`;
          session.step = 4;
        } else {
          response = "Por favor, escribí tu nombre completo para poder agendar tu turno correctamente.";
        }
        break;

      case 4: // Pregunta teléfono
        if (message.includes('11') || message.includes('15') || message.length >= 8) {
          session.data.phone = userMessage;
          response = `¡Excelente ${session.data.name}! Te cuento nuestros horarios y precios:\n\n🕐 **Horarios de atención:**\nLunes a Viernes: 9:00 - 18:00\nSábados: 9:00 - 13:00\n\n💰 **Precios aproximados:**\n🦷 Ortodoncia: desde $150.000\n🦷 Implantes: desde $300.000\n🦷 Endodoncia: desde $80.000\n🦷 Periodoncia: desde $60.000\n🦷 Limpieza: $15.000\n🦷 Blanqueamiento: $25.000\n\n📍 **Ubicación:** Av. Santa Fe 1234, Recoleta\n\n¿Te gustaría agendar tu turno para esta semana?`;
          session.step = 5;
        } else {
          response = "Por favor, escribí tu número de teléfono completo para poder contactarte.";
        }
        break;

      case 5: // Confirmación final
        if (message.includes('sí') || message.includes('si') || message.includes('agendar') || message.includes('turno')) {
          response = `¡Perfecto ${session.data.name}! 🎉\n\nTu turno está confirmado para ${session.data.specialty}.\n\n📅 **Próximos turnos disponibles:**\nMartes 18/7: 10:00, 14:00, 16:00\nMiércoles 19/7: 9:00, 11:00, 15:00\nJueves 20/7: 10:00, 13:00, 17:00\n\n¿Cuál horario te queda mejor?`;
          session.step = 6;
        } else if (message.includes('no') || message.includes('después') || message.includes('despues')) {
          response = "No hay problema. Te guardamos la información y cuando quieras agendar nos escribís. ¡Gracias por tu interés! 😊";
          this.deactivateDemo(phoneNumber);
          shouldContinue = false;
        } else {
          response = "No entendí bien. ¿Te gustaría agendar tu turno para esta semana? Respondé con 'sí' o 'no' por favor.";
        }
        break;

      case 6: // Selección de horario
        if (message.includes('10') || message.includes('martes')) {
          response = `¡Excelente elección! Tu turno está confirmado para el **Martes 18/7 a las 10:00**.\n\n📋 **Recordá traer:**\n• DNI\n• Obra social (si tenés)\n• Estudios previos (si tenés)\n\n📍 **Dirección:** Av. Santa Fe 1234, Recoleta\n🚇 **Subte:** Línea D - Estación Callao\n\n¿Necesitás que te envíe la ubicación por Maps?`;
          this.deactivateDemo(phoneNumber);
          shouldContinue = false;
        } else if (message.includes('14') || message.includes('16')) {
          response = `¡Perfecto! Tu turno está confirmado para el **Martes 18/7 a las ${message.includes('14') ? '14:00' : '16:00'}**.\n\n📋 **Recordá traer:**\n• DNI\n• Obra social (si tenés)\n• Estudios previos (si tenés)\n\n📍 **Dirección:** Av. Santa Fe 1234, Recoleta\n🚇 **Subte:** Línea D - Estación Callao\n\n¿Necesitás que te envíe la ubicación por Maps?`;
          this.deactivateDemo(phoneNumber);
          shouldContinue = false;
        } else if (message.includes('9') || message.includes('11') || message.includes('15') || message.includes('miércoles') || message.includes('miercoles')) {
          response = `¡Genial! Tu turno está confirmado para el **Miércoles 19/7**.\n\n📋 **Recordá traer:**\n• DNI\n• Obra social (si tenés)\n• Estudios previos (si tenés)\n\n📍 **Dirección:** Av. Santa Fe 1234, Recoleta\n🚇 **Subte:** Línea D - Estación Callao\n\n¿Necesitás que te envíe la ubicación por Maps?`;
          this.deactivateDemo(phoneNumber);
          shouldContinue = false;
        } else if (message.includes('13') || message.includes('17') || message.includes('jueves')) {
          response = `¡Perfecto! Tu turno está confirmado para el **Jueves 20/7**.\n\n📋 **Recordá traer:**\n• DNI\n• Obra social (si tenés)\n• Estudios previos (si tenés)\n\n📍 **Dirección:** Av. Santa Fe 1234, Recoleta\n🚇 **Subte:** Línea D - Estación Callao\n\n¿Necesitás que te envíe la ubicación por Maps?`;
          this.deactivateDemo(phoneNumber);
          shouldContinue = false;
        } else {
          response = "Por favor elegí un horario disponible:\n\nMartes 18/7: 10:00, 14:00, 16:00\nMiércoles 19/7: 9:00, 11:00, 15:00\nJueves 20/7: 10:00, 13:00, 17:00";
        }
        break;

      default:
        response = "Gracias por tu interés. Para más información visitá nuestra web o escribinos nuevamente.";
        this.deactivateDemo(phoneNumber);
        shouldContinue = false;
    }

    return { response, shouldContinue };
  }

  checkDemoActivation(message) {
    const body = message.body.toLowerCase();
    const demoKeywords = [
      'dental recoleta demo',
      'demo dental',
      'recoleta demo',
      'demo recoleta',
      'dental demo',
      'demo odontologia',
      'odontologia demo'
    ];

    for (const keyword of demoKeywords) {
      if (body.includes(keyword)) {
        return true;
      }
    }
    return false;
  }

  async sendAutoResponse(message, response) {
    let autoResponse = '';

    switch (response.type) {
      case 'interested':
        autoResponse = '¡Excelente! 😊 Te envío más información por privado. ¿En qué horario prefieres que te contacte?';
        break;
      case 'services_request':
        // Obtener mensaje de servicios (índice 6 - último mensaje)
        const servicesMessage = this.getServicesMessage();
        autoResponse = servicesMessage;
        break;
      case 'not_interested':
        // Respuestas variadas para "no gracias"
        const notInterestedResponses = [
          'Gracias a usted por su respuesta 😊 ¡Que tenga un excelente día!',
          'Perfecto, gracias por su tiempo. ¡Que tenga un muy buen día! 😊',
          'Entiendo perfectamente. Gracias por su respuesta. ¡Que tenga un excelente día! 😊',
          'Gracias por su tiempo. ¡Que tenga un muy buen día! 😊',
          'Perfecto, gracias por su respuesta. ¡Que tenga un excelente día! 😊',
          'Gracias a usted por su tiempo. ¡Que tenga un muy buen día! 😊',
          'Entiendo, gracias por su respuesta. ¡Que tenga un excelente día! 😊',
          'Perfecto, gracias por su tiempo. ¡Que tenga un muy buen día! 😊'
        ];
        autoResponse = notInterestedResponses[Math.floor(Math.random() * notInterestedResponses.length)];
        break;
      case 'neutral':
        // Respuestas para mensajes neutrales como "gracias"
        const neutralResponses = [
          '¡De nada! 😊 ¡Que tenga un excelente día!',
          '¡Por nada! 😊 ¡Que tenga un muy buen día!',
          '¡Un placer! 😊 ¡Que tenga un excelente día!',
          '¡De nada! 😊 ¡Que tenga un muy buen día!',
          '¡Por nada! 😊 ¡Que tenga un excelente día!',
          '¡Un placer! 😊 ¡Que tenga un muy buen día!'
        ];
        autoResponse = neutralResponses[Math.floor(Math.random() * neutralResponses.length)];
        break;
      default:
        // No enviar respuesta automática para otros tipos
        return;
    }

    try {
      // Simular que está escribiendo
      await this.simulateTyping(message.from);

      // Enviar respuesta
      await this.client.sendMessage(message.from, autoResponse);
      console.log(`📤 Respuesta automática enviada a ${message.from}: ${autoResponse}`);

    } catch (error) {
      console.error('❌ Error enviando respuesta automática:', error.message);
    }
  }

  async updateLeadStatus(leadId, status, leadName = null) {
    try {
      // 🔑 MULTI-BOT: Incluir info de qué instancia/número contactó
      const updateData = { status };
      if (status === 'contacted' && this.connectedNumber) {
        updateData.contactedByNumber = this.connectedNumber;
        updateData.contactedByInstance = this.instanceId;
      }

      await axios.put(`${this.backendUrl}/lead/${leadId}/status`, updateData);
      const displayName = leadName || leadId;
      console.log(`✅ Estado actualizado para lead ${displayName}: ${status}`);
    } catch (error) {
      console.error('❌ Error actualizando estado del lead:', error.message);
    }
  }

  async updateLeadResponse(leadId, response, leadName = null) {
    try {
      await axios.put(`${this.backendUrl}/lead/${leadId}/status`, {
        whatsappResponse: response
      });
      const displayName = leadName || leadId;
      console.log(`✅ Respuesta actualizada para lead ${displayName}: ${response}`);
    } catch (error) {
      console.error('❌ Error actualizando respuesta del lead:', error.message);
    }
  }

  async notifySlack(lead, response) {
    if (!this.slackWebhook) {
      console.log('⚠️ Slack webhook no configurado');
      return;
    }

    try {
      const message = {
        text: '🎉 ¡Nuevo lead interesado!',
        attachments: [{
          color: 'good',
          fields: [
            {
              title: 'Nombre',
              value: lead.name,
              short: true
            },
            {
              title: 'Teléfono',
              value: lead.phone || 'No disponible',
              short: true
            },
            {
              title: 'Categoría',
              value: lead.category || 'No especificada',
              short: true
            },
            {
              title: 'Respuesta',
              value: response.type === 'interested' ? 'Positiva 😊' : 'Neutral',
              short: true
            }
          ],
          footer: 'GMaps Leads Bot',
          ts: Math.floor(Date.now() / 1000)
        }]
      };

      await axios.post(this.slackWebhook, message);
      console.log('✅ Notificación enviada a Slack');

    } catch (error) {
      console.error('❌ Error enviando notificación a Slack:', error.message);
    }
  }

  async validateAndFormatPhone(phone) {
    const validation = phoneValidator.cleanAndFormatArgentinianNumber(phone);
    if (!validation.valid) {
      console.log(`❌ Teléfono inválido: ${phone} - Motivo: ${validation.error}`);
      return { valid: false, formatted: null, whatsappFormat: null, error: validation.error };
    }

    // Crear formato para WhatsApp Web: [numero]@c.us
    const whatsappFormat = `${validation.formatted}@c.us`;

    console.log(`✅ Teléfono validado y formateado: ${validation.formatted}`);
    console.log(`📱 Formato WhatsApp: ${whatsappFormat}`);

    return {
      valid: true,
      formatted: validation.formatted,
      whatsappFormat: whatsappFormat
    };
  }

  /**
   * Verificar sesiones completadas y enviar mensajes 3-8
   */
  async checkCompletedSessions() {
    // Evitar envío simultáneo de mensajes
    if (this.isSendingMessages) {
      console.log(`⚠️ Ya se están enviando mensajes - saltando checkCompletedSessions`);
      return;
    }

    // Evitar ejecución si el bot está procesando leads
    if (this.isProcessing) {
      console.log(`⚠️ Bot está procesando leads - saltando checkCompletedSessions`);
      return;
    }

    try {
      // Obtener todas las sesiones activas del WhatsAppChecker
      const activeSessions = this.whatsappChecker.verificationSessions;

      for (const [sessionId, session] of activeSessions) {
        if (session.status === 'active' && session.bothMessagesDelivered && !session.messages3to8Sent) {
          console.log(`✅ Sesión completa detectada para ${session.phoneNumber} - verificando antes de enviar`);

          // Marcar que se van a enviar los mensajes 3-8 para evitar duplicados
          session.messages3to8Sent = true;

          // Buscar el lead correspondiente
          const response = await axios.get(`${this.backendUrl}/leads?search=${session.phoneNumber}&limit=1`);
          if (response.data.success && response.data.leads.length > 0) {
            const lead = response.data.leads[0];

            // Verificar que el lead no esté ya marcado como contacted y que no se hayan enviado mensajes 3-8
            if (lead.status !== 'contacted' || !lead.messages3to8Sent) {
              // Verificar mensajes ya enviados en el chat antes de enviar
              const sentMessages = await this.getSentMessagesFromChat(`${session.phoneNumber}@c.us`);
              console.log(`🔍 Verificando mensajes ya enviados para ${lead.name}: ${sentMessages.length} mensajes encontrados`);

              // Verificar si ya se enviaron mensajes 3-8 basándose en el contenido del chat
              let messagesAlreadySent = 0;
              let specificMessagesSent = {
                message3: false,
                message4: false,
                message5: false,
                message6: false,
                message7: false,
                message8: false
              };

              for (let i = 2; i < this.messageSequences.length; i++) {
                if (await this.isMessageAlreadySent(i, sentMessages)) {
                  messagesAlreadySent++;
                  specificMessagesSent[`message${i + 1}`] = true;
                }
              }

              console.log(`📊 Mensajes ya enviados: ${messagesAlreadySent}/6`, specificMessagesSent);

              if (messagesAlreadySent >= 3) { // Si ya se enviaron al menos 3 mensajes de la secuencia 3-8
                console.log(`⚠️ Ya se enviaron ${messagesAlreadySent} mensajes de la secuencia 3-8 para ${lead.name} - saltando`);
                // Marcar como enviados en la base de datos
                try {
                  await axios.put(`${this.backendUrl}/lead/${lead.id}/status`, {
                    messages3to8Sent: true
                  });
                } catch (error) {
                  console.error('Error marcando mensajes 3-8 como enviados:', error.message);
                }
              } else {
                console.log(`📤 Enviando ${6 - messagesAlreadySent} mensajes restantes para ${lead.name}`);
                // Enviar mensajes 3-8 - verificará automáticamente cuáles ya fueron enviados
                await this.sendRemainingSequence(lead, `${session.phoneNumber}@c.us`, 2);
                this.statsTracker.trackLead(lead, 'valid', { method: 'verification_session', messagesSent: 8 });
                await this.updateLeadStatus(lead.id, 'contacted', lead.name);

                console.log(`✅ Mensajes 3-8 enviados para ${lead.name}`);
              }
            } else {
              console.log(`⚠️ Lead ${lead.name} ya está marcado como contacted y mensajes 3-8 enviados - saltando`);
            }
          } else {
            console.log(`⚠️ No se encontró lead para ${session.phoneNumber}`);
          }

          // Eliminar sesión después de enviar mensajes
          this.whatsappChecker.verificationSessions.delete(sessionId);
        }
      }
    } catch (error) {
      console.error('❌ Error verificando sesiones completadas:', error.message);
    }
  }

  // Función para verificar si ya existe conversación en WhatsApp
  async checkWhatsAppConversation(phoneNumber) {
    try {
      // Verificar si el número está registrado en WhatsApp
      const isRegistered = await this.client.isRegisteredUser(phoneNumber);
      if (!isRegistered) {
        console.log(`❌ Número ${phoneNumber} no está registrado en WhatsApp`);
        return { hasConversation: false, reason: 'not_registered' };
      }

      // Buscar chat existente
      const chat = await this.client.getChatById(phoneNumber);
      if (!chat) {
        console.log(`✅ No hay conversación previa con ${phoneNumber}`);
        return { hasConversation: false, reason: 'no_conversation' };
      }

      // Verificar si hay mensajes en el chat
      const messages = await chat.fetchMessages({ limit: 1 });
      if (messages.length === 0) {
        console.log(`✅ Chat vacío con ${phoneNumber}`);
        return { hasConversation: false, reason: 'empty_chat' };
      }

      console.log(`⚠️ Ya existe conversación con ${phoneNumber} (${messages.length} mensajes)`);
      return { hasConversation: true, reason: 'existing_conversation', messageCount: messages.length };

    } catch (error) {
      console.log(`❌ Error verificando conversación con ${phoneNumber}: ${error.message}`);
      // En caso de error, asumir que no hay conversación para ser seguro
      return { hasConversation: false, reason: 'error_checking', error: error.message };
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Método para detener el bot
  async stop() {
    console.log('🛑 Deteniendo WhatsApp Bot...');
    if (this.client) {
      try {
        await this.client.destroy();
      } catch (error) {
        console.error('⚠️ Error al cerrar el cliente de WhatsApp:', error.message);
      }
    }
    process.exit(0);
  }

  /**
   * Obtener mensajes ya enviados desde el chat de WhatsApp
   */
  async getSentMessagesFromChat(whatsappFormat) {
    try {
      const chat = await this.client.getChatById(whatsappFormat);
      if (!chat) {
        console.log(`❌ No se pudo obtener chat para ${whatsappFormat}`);
        return [];
      }

      // Obtener los últimos 20 mensajes del chat
      const messages = await chat.fetchMessages({ limit: 20 });

      // Filtrar solo mensajes enviados por nosotros
      const sentMessages = messages.filter(msg => msg.fromMe);

      console.log(`📱 Encontrados ${sentMessages.length} mensajes enviados en el chat`);
      return sentMessages;

    } catch (error) {
      console.error(`❌ Error obteniendo mensajes del chat: ${error.message}`);
      return [];
    }
  }

  /**
   * Verificar si un mensaje específico ya fue enviado comparando con las variaciones
   */
  async isMessageAlreadySent(messageIndex, sentMessages) {
    if (!sentMessages || sentMessages.length === 0) {
      return false;
    }

    // Obtener todas las variaciones del mensaje
    const messageVariations = this.messageSequences[messageIndex];
    if (!messageVariations) {
      return false;
    }

    // Comparar cada mensaje enviado con las variaciones
    for (const sentMessage of sentMessages) {
      const sentContent = sentMessage.body.toLowerCase().trim();

      // DETECCIÓN ESPECÍFICA POR TIPO DE MENSAJE

      // Mensaje 1 (Saludo) - Detectar por palabras clave
      if (messageIndex === 0) {
        if (sentContent.includes('hola') && sentContent.includes('juan cruz') && sentContent.includes('nexte')) {
          console.log(`✅ Mensaje 1 ya enviado (detectado por saludo con Juan Cruz)`);
          return true;
        }
        if (sentContent.includes('buen día') && sentContent.includes('juan cruz') && sentContent.includes('nexte')) {
          console.log(`✅ Mensaje 1 ya enviado (detectado por saludo con Juan Cruz)`);
          return true;
        }
      }

      // Mensaje 2 (Presentación) - Detectar por palabras clave específicas
      if (messageIndex === 1) {
        // Detectar cualquier mensaje que contenga las palabras clave de presentación
        const presentationKeywords = [
          'nexte marketing',
          'llevamos 10 años',
          'tenemos 10 años',
          '2015-2025',
          'potenciando marcas',
          'empresas en 5 países',
          'estudio freelance',
          'boutique de growth',
          'especialistas multidisciplinarios'
        ];

        let keywordMatches = 0;
        for (const keyword of presentationKeywords) {
          if (sentContent.includes(keyword)) {
            keywordMatches++;
          }
        }

        // Si tiene al menos 4 palabras clave de presentación, es el mensaje 2
        if (keywordMatches >= 4) {
          console.log(`✅ Mensaje 2 ya enviado (detectado por ${keywordMatches} palabras clave de presentación)`);
          return true;
        }

        // DETECCIÓN ADICIONAL: Verificar si contiene la estructura típica del mensaje 2
        const hasNexteMarketing = sentContent.includes('nexte marketing');
        const hasYears = sentContent.includes('10 años') || sentContent.includes('2015-2025');
        const hasGrowth = sentContent.includes('growth') || sentContent.includes('especialistas');

        if (hasNexteMarketing && hasYears && hasGrowth) {
          console.log(`✅ Mensaje 2 ya enviado (detectado por estructura típica)`);
          return true;
        }

        // DETECCIÓN POR LONGITUD Y CONTENIDO ESPECÍFICO
        if (sentContent.length > 100 && sentContent.includes('nexte marketing') && sentContent.includes('años')) {
          console.log(`✅ Mensaje 2 ya enviado (detectado por longitud y contenido)`);
          return true;
        }
      }

      // Mensaje 3 (Sitio web $150.000) - Detectar por precio
      if (messageIndex === 2) {
        if (sentContent.includes('$150.000') || sentContent.includes('150.000')) {
          console.log(`✅ Mensaje 3 ya enviado (detectado por precio $150.000)`);
          return true;
        }
        if (sentContent.includes('sitio web completo') && sentContent.includes('diseño personalizado')) {
          console.log(`✅ Mensaje 3 ya enviado (detectado por descripción de sitio web)`);
          return true;
        }
      }

      // Mensaje 4 (Sitio web $500.000) - Detectar por precio
      if (messageIndex === 3) {
        if (sentContent.includes('$500.000') || sentContent.includes('500.000')) {
          console.log(`✅ Mensaje 4 ya enviado (detectado por precio $500.000)`);
          return true;
        }
        if (sentContent.includes('sitio web premium') && sentContent.includes('diseño exclusivo')) {
          console.log(`✅ Mensaje 4 ya enviado (detectado por descripción de sitio premium)`);
          return true;
        }
      }

      // Mensaje 5 (Pack 360°) - Detectar por Pack 360°
      if (messageIndex === 4) {
        if (sentContent.includes('pack 360°') || sentContent.includes('pack 360')) {
          console.log(`✅ Mensaje 5 ya enviado (detectado por Pack 360°)`);
          return true;
        }
        if (sentContent.includes('odontólogos') && sentContent.includes('chatbot dental')) {
          console.log(`✅ Mensaje 5 ya enviado (detectado por servicios odontológicos)`);
          return true;
        }
      }

      // Mensaje 6 (Servicios específicos) - Detectar por servicios
      if (messageIndex === 5) {
        if (sentContent.includes('publicidad para google') || sentContent.includes('manejo de redes sociales')) {
          console.log(`✅ Mensaje 6 ya enviado (detectado por servicios específicos)`);
          return true;
        }
      }

      // Mensaje 7 (Website) - Detectar por URL
      if (messageIndex === 6) {
        if (sentContent.includes('nextemarketing.com') || sentContent.includes('visitá')) {
          console.log(`✅ Mensaje 7 ya enviado (detectado por URL del website)`);
          return true;
        }
      }

      // Mensaje 8 (Cierre) - Detectar por cierre
      if (messageIndex === 7) {
        if (sentContent.includes('cualquier consulta') || sentContent.includes('estoy disponible')) {
          console.log(`✅ Mensaje 8 ya enviado (detectado por mensaje de cierre)`);
          return true;
        }
      }

      // COMPARACIÓN POR SIMILITUD CON VARIACIONES (más estricta)
      for (const variation of messageVariations) {
        const variationContent = variation.toLowerCase().trim();

        // Comparación exacta
        if (sentContent === variationContent) {
          console.log(`✅ Mensaje ${messageIndex + 1} ya enviado (variación exacta encontrada)`);
          return true;
        }

        // Comparación por similitud (más estricta - 85%)
        const similarity = this.calculateSimilarity(sentContent, variationContent);
        if (similarity > 0.85) {
          console.log(`✅ Mensaje ${messageIndex + 1} ya enviado (similitud alta: ${similarity.toFixed(2)})`);
          return true;
        }

        // Comparación por longitud y palabras clave
        const sentWords = sentContent.split(' ').filter(word => word.length > 3);
        const variationWords = variationContent.split(' ').filter(word => word.length > 3);

        let commonWords = 0;
        for (const sentWord of sentWords) {
          if (variationWords.includes(sentWord)) {
            commonWords++;
          }
        }

        const wordSimilarity = commonWords / Math.max(sentWords.length, variationWords.length);
        if (wordSimilarity > 0.7 && sentWords.length > 5) {
          console.log(`✅ Mensaje ${messageIndex + 1} ya enviado (similitud de palabras: ${wordSimilarity.toFixed(2)})`);
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Calcular similitud entre dos strings
   */
  calculateSimilarity(str1, str2) {
    if (str1 === str2) return 1.0;

    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    // Calcular distancia de Levenshtein
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  /**
   * Calcular distancia de Levenshtein
   */
  levenshteinDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * 🏷️ Sincronizar etiquetas de WhatsApp con el CRM
   */
  async syncTagsWithBackend() {
    if (!this.client || !this.isReady) return;

    try {
      this.log('↻ Sincronizando etiquetas de WhatsApp...');
      const chats = await this.client.getChats();

      let syncCount = 0;
      for (const chat of chats) {
        if (chat.labels && chat.labels.length > 0) {
          const labels = await this.client.getLabels();
          const chatLabels = chat.labels.map(lId => {
            const found = labels.find(l => l.id === lId);
            return found ? found.name : lId;
          });

          let newStatus = null;
          if (chatLabels.some(l => l.toLowerCase().includes('interesad'))) newStatus = 'interested';
          else if (chatLabels.some(l => l.toLowerCase().includes('no interesa'))) newStatus = 'not_interested';
          else if (chatLabels.some(l => l.toLowerCase().includes('vendido') || l.toLowerCase().includes('cliente'))) newStatus = 'completed';

          if (newStatus) {
            axios.post(`${this.backendUrl}/webhooks/whatsapp-status`, {
              phone: chat.id.user,
              status: newStatus,
              tags: chatLabels
            }).catch(() => { });
            syncCount++;
          }
        }
      }
      if (syncCount > 0) this.log(`✅ Sincronizados ${syncCount} leads desde etiquetas WA`);

    } catch (e) {
      this.log(`⚠️ Error sincronizando etiquetas: ${e.message}`, 'warn');
    }
  }
}

// Manejo de señales para cierre graceful
process.on('SIGTERM', () => {
  console.log('🛑 Recibida señal SIGTERM');
  bot?.stop();
});

process.on('SIGINT', () => {
  console.log('🛑 Recibida señal SIGINT');
  bot?.stop();
});

// Iniciar bot
const bot = new WhatsAppBot(); 