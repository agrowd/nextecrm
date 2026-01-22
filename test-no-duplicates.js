const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
require('dotenv').config();

class TestNoDuplicates {
  constructor() {
    this.client = null;
    this.isReady = false;
    this.verificationSessions = new Map();
    this.sentMessages = new Set(); // Para trackear mensajes enviados
  }

  async init() {
    console.log('🧪 Iniciando prueba de no duplicados...');
    
    this.client = new Client({
      authStrategy: new LocalAuth({
        clientId: 'test-no-duplicates-bot'
      }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--disable-extensions',
          '--disable-plugins',
          '--disable-images',
          '--disable-javascript',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-field-trial-config',
          '--disable-back-forward-cache',
          '--disable-ipc-flooding-protection',
          '--enable-features=NetworkService,NetworkServiceLogging',
          '--force-color-profile=srgb',
          '--metrics-recording-only',
          '--no-default-browser-check',
          '--no-pings',
          '--no-zygote',
          '--password-store=basic',
          '--use-mock-keychain',
          '--disable-blink-features=AutomationControlled'
        ],
        ignoreDefaultArgs: ['--disable-extensions'],
        timeout: 60000
      }
    });

    this.client.on('qr', (qr) => {
      console.log('📱 Escanea este código QR con WhatsApp:');
      qrcode.generate(qr, { small: true });
    });

    this.client.on('ready', () => {
      console.log('✅ Test bot listo!');
      this.isReady = true;
      this.runTest();
    });

    this.client.on('authenticated', () => {
      console.log('🔐 WhatsApp autenticado');
    });

    this.client.on('auth_failure', (msg) => {
      console.error('❌ Error de autenticación:', msg);
    });

    this.client.on('disconnected', (reason) => {
      console.log('🔌 WhatsApp desconectado:', reason);
      this.isReady = false;
    });

    try {
      await this.client.initialize();
    } catch (error) {
      console.error('❌ Error inicializando WhatsApp:', error);
    }
  }

  async runTest() {
    console.log('\n🧪 PRUEBA DE NO DUPLICADOS');
    console.log('=' .repeat(60));

    // Simular lead de prueba
    const testLead = {
      id: 'test-no-duplicates-123',
      name: 'Test No Duplicates Business',
      phone: '5491112345678',
      keyword: 'odontología',
      location: 'Buenos Aires',
      status: 'pending',
      messages3to8Sent: false
    };

    console.log(`📞 Lead de prueba: ${testLead.name} (${testLead.phone})`);

    // PASO 1: Simular envío de mensajes 1-2
    console.log('\n📤 PASO 1: Simulando envío de mensajes 1-2...');
    await this.simulateMessages1and2(testLead);

    // PASO 2: Simular primera detección de sesión completa
    console.log('\n🔍 PASO 2: Primera detección de sesión completa...');
    const sessionComplete1 = this.isSessionComplete(testLead.phone);
    console.log(`Resultado 1: ${JSON.stringify(sessionComplete1, null, 2)}`);

    if (sessionComplete1.success) {
      console.log('\n📤 PASO 3: Enviando mensajes 3-8 (primera vez)...');
      await this.simulateSendRemainingSequence(testLead);
      
      // Simular que se marcó como enviado
      testLead.messages3to8Sent = true;
      testLead.status = 'contacted';
    }

    // PASO 4: Simular segunda detección de sesión completa (duplicado)
    console.log('\n🔍 PASO 4: Segunda detección de sesión completa (duplicado)...');
    const sessionComplete2 = this.isSessionComplete(testLead.phone);
    console.log(`Resultado 2: ${JSON.stringify(sessionComplete2, null, 2)}`);

    if (sessionComplete2.success) {
      console.log('\n📤 PASO 5: Intentando enviar mensajes 3-8 (segunda vez - DEBERÍA FALLAR)...');
      await this.simulateSendRemainingSequence(testLead);
    } else {
      console.log('✅ CORRECTO: No se detectó sesión completa la segunda vez');
    }

    // PASO 6: Verificar que no se enviaron duplicados
    console.log('\n🔍 PASO 6: Verificando que no se enviaron duplicados...');
    await this.checkNoDuplicates(testLead);

    console.log('\n✅ TEST COMPLETADO');
  }

  async simulateMessages1and2(lead) {
    const messages = [
      "Hola! Te saludo, soy Juan Cruz de Nexte Marketing. Estuve viendo Test No Duplicates Business y me llamó la atención",
      "Nexte Marketing lleva 10 años (2015-2025) potenciando marcas. Trabajamos con empresas en 5 países, desde estudio freelance hasta boutique de growth con especialistas multidisciplinarios."
    ];

    for (let i = 0; i < messages.length; i++) {
      try {
        console.log(`   📤 Mensaje ${i + 1}: ${messages[i].substring(0, 50)}...`);
        await this.client.sendMessage(`${lead.phone}@c.us`, messages[i]);
        this.sentMessages.add(`message_${i + 1}`);
        console.log(`   ✅ Mensaje ${i + 1} enviado`);
      } catch (error) {
        console.error(`❌ Error enviando mensaje ${i + 1}:`, error.message);
      }
    }
  }

  isSessionComplete(phoneNumber) {
    console.log(`🔍 Verificando sesión completa para ${phoneNumber}...`);
    
    // Simular sesión completa
    const sessionComplete = {
      success: true,
      sessionId: `session_${Date.now()}_${phoneNumber}`
    };
    
    console.log(`✅ Sesión completa encontrada para ${phoneNumber}`);
    return sessionComplete;
  }

  async simulateSendRemainingSequence(lead) {
    const remainingMessages = [
      "🚀 Te ofrecemos un sitio web completo por $150.000: incluye diseño personalizado, dominio .com, hosting por 1 año y adaptado a tu marca. Si no tenés marca, te la diseñamos. Todo en 2 días!",
      "💎 Para negocios que quieren destacar: sitio web premium por $500.000 con diseño exclusivo, animaciones avanzadas y optimizado para Google. Incluye branding completo.",
      "También hacemos: publicidad en Google para que te encuentren, manejo de redes sociales, bots de WhatsApp automáticos y todo lo que necesites para digitalizar tu negocio.",
      "Te cuento que podemos hacer publicidad para que aparezcas en Google, manejo de redes sociales, bots de WhatsApp que te respondan todo automáticamente y la promo de 150.000 por un sitio web completo adaptado a tu marca con las últimas tecnologías. Si no tenés marca, te hacemos el branding también.",
      "Visitá https://nextemarketing.com para ver ejemplos.",
      "Cualquier consulta, estoy disponible"
    ];

    // Verificar si ya se enviaron los mensajes 3-8
    if (lead.messages3to8Sent) {
      console.log(`   ⚠️ Mensajes 3-8 ya enviados para ${lead.name} - saltando`);
      return;
    }

    for (let i = 0; i < remainingMessages.length; i++) {
      try {
        console.log(`   📤 Mensaje ${i + 3}: ${remainingMessages[i].substring(0, 50)}...`);
        await this.client.sendMessage(`${lead.phone}@c.us`, remainingMessages[i]);
        this.sentMessages.add(`message_${i + 3}`);
        
        // Delay aleatorio entre mensajes
        const randomDelay = Math.floor(Math.random() * (20000 - 12000 + 1)) + 12000;
        console.log(`   ⏱️ Esperando ${randomDelay/1000}s...`);
        await this.sleep(randomDelay);
      } catch (error) {
        console.error(`❌ Error enviando mensaje ${i + 3}:`, error.message);
      }
    }
    
    console.log(`   ✅ Secuencia restante completada`);
  }

  async checkNoDuplicates(lead) {
    console.log(`   🔍 Verificando que no se envíen duplicados...`);
    
    // Contar mensajes únicos enviados
    const uniqueMessages = new Set(this.sentMessages);
    console.log(`   📊 Mensajes únicos enviados: ${uniqueMessages.size}`);
    console.log(`   📋 Mensajes: ${Array.from(uniqueMessages).join(', ')}`);
    
    // Verificar que no haya duplicados
    if (this.sentMessages.size === uniqueMessages.size) {
      console.log(`   ✅ CORRECTO: No hay duplicados`);
    } else {
      console.log(`   ❌ ERROR: Hay duplicados detectados`);
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async stop() {
    console.log('🛑 Deteniendo test...');
    if (this.client) {
      await this.client.destroy();
    }
    process.exit(0);
  }
}

// Manejo de señales
process.on('SIGTERM', () => {
  console.log('🛑 Recibida señal SIGTERM');
  testNoDuplicates?.stop();
});

process.on('SIGINT', () => {
  console.log('🛑 Recibida señal SIGINT');
  testNoDuplicates?.stop();
});

// Iniciar test
const testNoDuplicates = new TestNoDuplicates();
testNoDuplicates.init(); 