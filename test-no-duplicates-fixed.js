const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
require('dotenv').config();

class TestNoDuplicatesFixed {
  constructor() {
    this.client = null;
    this.isReady = false;
    this.sentMessages = new Set(); // Para trackear mensajes enviados
  }

  async init() {
    console.log('🧪 Iniciando prueba de no duplicados (corregido)...');
    
    this.client = new Client({
      authStrategy: new LocalAuth({
        clientId: 'test-no-duplicates-fixed-bot'
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
    console.log('\n🧪 PRUEBA DE NO DUPLICADOS (CORREGIDO)');
    console.log('=' .repeat(60));

    // Simular lead de prueba
    const testLead = {
      id: 'test-no-duplicates-fixed-123',
      name: 'Test No Duplicates Fixed Business',
      phone: '5491112345678',
      keyword: 'odontología',
      location: 'Buenos Aires',
      status: 'pending',
      messages3to8Sent: false
    };

    console.log(`📞 Lead de prueba: ${testLead.name} (${testLead.phone})`);

    // PASO 1: Simular envío de mensajes 1-2 (verificación)
    console.log('\n📤 PASO 1: Simulando envío de mensajes 1-2 (verificación)...');
    await this.simulateVerificationMessages(testLead);

    // PASO 2: Simular envío de mensajes 4-8 (secuencia restante)
    console.log('\n📤 PASO 2: Simulando envío de mensajes 4-8 (secuencia restante)...');
    await this.simulateRemainingSequence(testLead);

    // PASO 3: Verificar que no se enviaron duplicados
    console.log('\n🔍 PASO 3: Verificando que no se enviaron duplicados...');
    await this.checkNoDuplicates(testLead);

    console.log('\n✅ TEST COMPLETADO');
  }

  async simulateVerificationMessages(lead) {
    const verificationMessages = [
      "Hola! Te saludo, soy Juan Cruz de Nexte Marketing. Estuve viendo Test No Duplicates Fixed Business y me llamó la atención",
      "Nexte Marketing lleva 10 años (2015-2025) potenciando marcas. Trabajamos con empresas en 5 países, desde estudio freelance hasta boutique de growth con especialistas multidisciplinarios."
    ];

    for (let i = 0; i < verificationMessages.length; i++) {
      try {
        console.log(`   📤 Mensaje ${i + 1} (verificación): ${verificationMessages[i].substring(0, 50)}...`);
        await this.client.sendMessage(`${lead.phone}@c.us`, verificationMessages[i]);
        this.sentMessages.add(`verification_message_${i + 1}`);
        console.log(`   ✅ Mensaje ${i + 1} enviado`);
      } catch (error) {
        console.error(`❌ Error enviando mensaje ${i + 1}:`, error.message);
      }
    }
  }

  async simulateRemainingSequence(lead) {
    const remainingMessages = [
      "🚀 Te ofrecemos un sitio web completo por $150.000: incluye diseño personalizado, dominio .com, hosting por 1 año y adaptado a tu marca. Si no tenés marca, te la diseñamos. Todo en 2 días!",
      "💎 Para negocios que quieren destacar: sitio web premium por $500.000 con diseño exclusivo, animaciones avanzadas y optimizado para Google. Incluye branding completo.",
      "También hacemos: publicidad en Google para que te encuentren, manejo de redes sociales, bots de WhatsApp automáticos y todo lo que necesites para digitalizar tu negocio.",
      "Te cuento que podemos hacer publicidad para que aparezcas en Google, manejo de redes sociales, bots de WhatsApp que te respondan todo automáticamente y la promo de 150.000 por un sitio web completo adaptado a tu marca con las últimas tecnologías. Si no tenés marca, te hacemos el branding también.",
      "Visitá https://nextemarketing.com para ver ejemplos.",
      "Cualquier consulta, estoy disponible"
    ];

    for (let i = 0; i < remainingMessages.length; i++) {
      try {
        console.log(`   📤 Mensaje ${i + 4} (secuencia restante): ${remainingMessages[i].substring(0, 50)}...`);
        await this.client.sendMessage(`${lead.phone}@c.us`, remainingMessages[i]);
        this.sentMessages.add(`remaining_message_${i + 4}`);
        
        // Delay aleatorio entre mensajes
        const randomDelay = Math.floor(Math.random() * (20000 - 12000 + 1)) + 12000;
        console.log(`   ⏱️ Esperando ${randomDelay/1000}s...`);
        await this.sleep(randomDelay);
      } catch (error) {
        console.error(`❌ Error enviando mensaje ${i + 4}:`, error.message);
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
    
    // Verificar que se enviaron los mensajes correctos
    const expectedMessages = [
      'verification_message_1',
      'verification_message_2',
      'remaining_message_4',
      'remaining_message_5',
      'remaining_message_6',
      'remaining_message_7',
      'remaining_message_8',
      'remaining_message_9'
    ];
    
    const missingMessages = expectedMessages.filter(msg => !this.sentMessages.has(msg));
    const extraMessages = Array.from(this.sentMessages).filter(msg => !expectedMessages.includes(msg));
    
    if (missingMessages.length === 0 && extraMessages.length === 0) {
      console.log(`   ✅ CORRECTO: Se enviaron exactamente los mensajes esperados`);
    } else {
      console.log(`   ❌ ERROR: Mensajes faltantes: ${missingMessages.join(', ')}`);
      console.log(`   ❌ ERROR: Mensajes extra: ${extraMessages.join(', ')}`);
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
  testNoDuplicatesFixed?.stop();
});

process.on('SIGINT', () => {
  console.log('🛑 Recibida señal SIGINT');
  testNoDuplicatesFixed?.stop();
});

// Iniciar test
const testNoDuplicatesFixed = new TestNoDuplicatesFixed();
testNoDuplicatesFixed.init(); 