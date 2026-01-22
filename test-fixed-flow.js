const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
require('dotenv').config();

class TestFixedFlow {
  constructor() {
    this.client = null;
    this.isReady = false;
    this.verificationSessions = new Map();
  }

  async init() {
    console.log('🧪 Iniciando prueba de flujo corregido...');
    
    this.client = new Client({
      authStrategy: new LocalAuth({
        clientId: 'test-fixed-flow-bot'
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
    console.log('\n🧪 PRUEBA DE FLUJO CORREGIDO');
    console.log('=' .repeat(60));

    // Simular lead de prueba
    const testLead = {
      id: 'test-fixed-flow-123',
      name: 'Test Fixed Flow Business',
      phone: '5491112345678',
      keyword: 'odontología',
      location: 'Buenos Aires'
    };

    console.log(`📞 Lead de prueba: ${testLead.name} (${testLead.phone})`);

    // PASO 1: Simular inicio de sesión
    console.log('\n📤 PASO 1: Iniciando sesión de verificación...');
    const sessionId = await this.simulateStartSession(testLead);

    // PASO 2: Simular envío de mensaje 1
    console.log('\n📤 PASO 2: Enviando mensaje 1...');
    await this.simulateSendMessage1(testLead);

    // PASO 3: Simular verificación de mensaje 1 (con retry)
    console.log('\n⏱️ PASO 3: Verificando entrega del mensaje 1 (con retry)...');
    const message1Delivered = await this.simulateVerifyMessage1WithRetry(testLead);
    if (!message1Delivered) {
      console.log('❌ Mensaje 1 NO entregado después de retry - terminando test');
      return;
    }

    // PASO 4: Simular envío de mensaje 2
    console.log('\n📤 PASO 4: Enviando mensaje 2...');
    await this.simulateSendMessage2(testLead);

    // PASO 5: Simular verificación de mensaje 2
    console.log('\n⏱️ PASO 5: Verificando entrega del mensaje 2...');
    const message2Delivered = await this.simulateVerifyMessage2(testLead);
    if (!message2Delivered) {
      console.log('❌ Mensaje 2 NO entregado - terminando test');
      return;
    }

    // PASO 6: Verificar estado de sesión
    console.log('\n🔍 PASO 6: Verificando estado de sesión...');
    await this.checkSessionStatus(testLead);

    // PASO 7: Simular detección de sesión completa
    console.log('\n🔍 PASO 7: Detectando sesión completa...');
    const sessionComplete = this.isSessionComplete(testLead.phone);
    console.log(`Resultado: ${JSON.stringify(sessionComplete, null, 2)}`);

    // PASO 8: Simular envío de mensajes 3-8 (sin duplicados)
    if (sessionComplete.success) {
      console.log('\n📤 PASO 8: Enviando mensajes 3-8 (sin duplicados)...');
      await this.simulateSendRemainingSequence(testLead);
      
      // PASO 9: Verificar que no se envíen duplicados
      console.log('\n🔍 PASO 9: Verificando que no se envíen duplicados...');
      await this.checkNoDuplicates(testLead);
    } else {
      console.log('❌ No se detectó sesión completa - no enviando mensajes 3-8');
    }

    console.log('\n✅ TEST COMPLETADO');
  }

  async simulateStartSession(lead) {
    const sessionId = `session_${Date.now()}_${lead.phone}`;
    
    this.verificationSessions.set(sessionId, {
      phoneNumber: lead.phone,
      businessName: lead.name,
      startTime: Date.now(),
      messagesSent: 0,
      status: 'active',
      messageIds: [],
      message1Delivered: false,
      message2Delivered: false,
      waitingForMessage2: true,
      messages3to8Sent: false
    });

    console.log(`   ✅ Sesión iniciada: ${sessionId}`);
    console.log(`   📊 Sesiones activas: ${this.verificationSessions.size}`);
    return sessionId;
  }

  async simulateSendMessage1(lead) {
    const message1 = "Hola! Te saludo, soy Juan Cruz de Nexte Marketing. Estuve viendo Test Fixed Flow Business y me llamó la atención";
    
    try {
      console.log(`   📤 Enviando mensaje 1: ${message1.substring(0, 50)}...`);
      await this.client.sendMessage(`${lead.phone}@c.us`, message1);
      console.log(`   ✅ Mensaje 1 enviado`);
    } catch (error) {
      console.error(`❌ Error enviando mensaje 1:`, error.message);
    }
  }

  async simulateSendMessage2(lead) {
    const message2 = "Nexte Marketing lleva 10 años (2015-2025) potenciando marcas. Trabajamos con empresas en 5 países, desde estudio freelance hasta boutique de growth con especialistas multidisciplinarios.";
    
    try {
      console.log(`   📤 Enviando mensaje 2: ${message2.substring(0, 50)}...`);
      await this.client.sendMessage(`${lead.phone}@c.us`, message2);
      console.log(`   ✅ Mensaje 2 enviado`);
    } catch (error) {
      console.error(`❌ Error enviando mensaje 2:`, error.message);
    }
  }

  async simulateVerifyMessage1WithRetry(lead) {
    console.log(`   ⏱️ Esperando 5 segundos...`);
    await this.sleep(5000);
    console.log(`   ❌ Mensaje 1 NO entregado - simulando retry...`);
    
    console.log(`   ⏱️ Esperando 10 segundos más...`);
    await this.sleep(10000);
    console.log(`   ✅ Mensaje 1 verificado como entregado después de retry`);
    return true;
  }

  async simulateVerifyMessage2(lead) {
    console.log(`   ⏱️ Esperando 5 segundos...`);
    await this.sleep(5000);
    console.log(`   ✅ Mensaje 2 verificado como entregado`);
    return true;
  }

  async checkSessionStatus(lead) {
    console.log(`   🔍 Revisando sesiones activas...`);
    console.log(`   📊 Total de sesiones: ${this.verificationSessions.size}`);
    
    for (const [sessionId, session] of this.verificationSessions) {
      console.log(`   📋 Sesión ${sessionId}:`, {
        phoneNumber: session.phoneNumber,
        status: session.status,
        messagesSent: session.messagesSent,
        message1Delivered: session.message1Delivered,
        message2Delivered: session.message2Delivered,
        waitingForMessage2: session.waitingForMessage2,
        bothMessagesDelivered: session.bothMessagesDelivered,
        messages3to8Sent: session.messages3to8Sent
      });
    }
  }

  isSessionComplete(phoneNumber) {
    console.log(`🔍 Verificando sesión completa para ${phoneNumber}...`);
    console.log(`🔍 Sesiones activas: ${this.verificationSessions.size}`);
    
    // Buscar sesión activa para este número
    for (const [sessionId, session] of this.verificationSessions) {
      console.log(`🔍 Revisando sesión ${sessionId}:`, {
        phoneNumber: session.phoneNumber,
        status: session.status,
        bothMessagesDelivered: session.bothMessagesDelivered,
        messagesSent: session.messagesSent,
        messages3to8Sent: session.messages3to8Sent
      });
      
      if (session.phoneNumber === phoneNumber && session.status === 'active' && session.bothMessagesDelivered && !session.messages3to8Sent) {
        console.log(`✅ Sesión completa encontrada para ${phoneNumber} - lista para mensajes 3-8`);
        
        // Marcar que se van a enviar los mensajes 3-8
        session.messages3to8Sent = true;
        
        return { success: true, sessionId };
      }
    }
    
    console.log(`❌ No se encontró sesión completa para ${phoneNumber}`);
    return { success: false, error: 'No se encontró sesión completa' };
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

    for (let i = 0; i < remainingMessages.length; i++) {
      try {
        console.log(`   📤 Mensaje ${i + 3}: ${remainingMessages[i].substring(0, 50)}...`);
        await this.client.sendMessage(`${lead.phone}@c.us`, remainingMessages[i]);
        
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
    
    // Simular intento de envío duplicado
    const sessionComplete = this.isSessionComplete(lead.phone);
    if (sessionComplete.success) {
      console.log(`   ❌ ERROR: Se detectó sesión completa nuevamente - duplicado!`);
    } else {
      console.log(`   ✅ OK: No se detectó sesión completa - sin duplicados`);
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
  testFixedFlow?.stop();
});

process.on('SIGINT', () => {
  console.log('🛑 Recibida señal SIGINT');
  testFixedFlow?.stop();
});

// Iniciar test
const testFixedFlow = new TestFixedFlow();
testFixedFlow.init(); 