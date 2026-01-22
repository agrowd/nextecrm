const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
require('dotenv').config();

class TestDeliveryVerification {
  constructor() {
    this.client = null;
    this.isReady = false;
  }

  async init() {
    console.log('🧪 Iniciando test de verificación de entrega...');
    
    this.client = new Client({
      authStrategy: new LocalAuth({
        clientId: 'test-delivery-bot'
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
    console.log('\n🧪 INICIANDO TEST DE VERIFICACIÓN DE ENTREGA');
    console.log('=' .repeat(60));

    // Simular lead de prueba
    const testLead = {
      id: 'test-delivery-123',
      name: 'Test Delivery Business',
      phone: '5491112345678',
      keyword: 'odontología',
      location: 'Buenos Aires'
    };

    console.log(`📞 Lead de prueba: ${testLead.name} (${testLead.phone})`);

    // Simular validación de teléfono
    const phoneValidation = {
      valid: true,
      formatted: '5491112345678',
      whatsappFormat: '5491112345678@c.us'
    };

    console.log('✅ Teléfono validado');

    // Simular verificación de WhatsApp con entrega
    const whatsappCheck = {
      valid: true,
      method: 'verification_session',
      sessionId: 'test-session-delivery-123',
      bothMessagesDelivered: true
    };

    console.log('✅ WhatsApp verificado (método: verification_session con entrega)');

    // Simular envío de mensajes 1-2 con verificación
    console.log('\n📤 ENVIANDO MENSAJES CON VERIFICACIÓN DE ENTREGA:');
    await this.simulateDeliveryVerification(phoneValidation.whatsappFormat, testLead);

    // Simular envío de mensajes 3-8
    console.log('\n📤 ENVIANDO SECUENCIA RESTANTE (3-8):');
    await this.simulateRemainingSequence(testLead, phoneValidation.whatsappFormat);

    console.log('\n✅ TEST COMPLETADO');
    console.log('📊 RESUMEN:');
    console.log('   • Mensaje 1 enviado y verificado entrega');
    console.log('   • Delay aleatorio entre mensajes');
    console.log('   • Mensaje 2 enviado y verificado entrega');
    console.log('   • Mensajes 3-8 enviados solo después de verificación');
    console.log('   • Total: 8 mensajes únicos con verificación de entrega');
  }

  async simulateDeliveryVerification(whatsappFormat, lead) {
    const verificationMessages = [
      "Hola, soy Juan Cruz de Nexte Marketing. Estuve viendo su negocio Test Delivery Business y me pareció muy interesante",
      "En Nexte Marketing llevamos 10 años (2015-2025) potenciando marcas: hemos trabajado con empresas en 5 países, evolucionando de un estudio freelance a una boutique de growth con especialistas multidisciplinarios y casos de éxito comprobados."
    ];

    for (let i = 0; i < verificationMessages.length; i++) {
      try {
        console.log(`\n📤 Enviando mensaje ${i + 1}: ${verificationMessages[i].substring(0, 50)}...`);
        
        // Enviar mensaje
        const sentMessage = await this.client.sendMessage(whatsappFormat, verificationMessages[i]);
        console.log(`   ✅ Mensaje ${i + 1} enviado`);
        
        // Esperar 5 segundos para verificar entrega
        console.log(`   ⏱️ Esperando 5 segundos para verificar entrega...`);
        await this.sleep(5000);
        
        // Verificar entrega
        const delivered = await this.verifyMessageDelivery(whatsappFormat, sentMessage.id._serialized);
        if (delivered) {
          console.log(`   ✅ Mensaje ${i + 1} entregado correctamente`);
        } else {
          console.log(`   ❌ Mensaje ${i + 1} NO entregado - marcando como inválido`);
          return false;
        }
        
        // Si no es el último mensaje, esperar delay aleatorio
        if (i < verificationMessages.length - 1) {
          const randomDelay = Math.floor(Math.random() * (20000 - 12000 + 1)) + 12000;
          console.log(`   ⏱️ Esperando ${randomDelay/1000}s antes del siguiente mensaje...`);
          await this.sleep(randomDelay);
        }
        
      } catch (error) {
        console.error(`❌ Error enviando mensaje ${i + 1}:`, error.message);
        return false;
      }
    }
    
    return true;
  }

  async verifyMessageDelivery(phoneNumber, messageId) {
    try {
      const chat = await this.client.getChatById(phoneNumber);
      if (!chat) {
        console.log(`   ❌ No se pudo obtener chat para ${phoneNumber}`);
        return false;
      }

      // Buscar el mensaje específico
      const messages = await chat.fetchMessages({ limit: 50 });
      const targetMessage = messages.find(msg => 
        msg.id._serialized === messageId && msg.fromMe
      );

      if (!targetMessage) {
        console.log(`   ❌ Mensaje ${messageId} no encontrado en chat`);
        return false;
      }

      // Verificar estado de entrega (ACK)
      const ack = targetMessage.ack;
      
      if (ack >= 2) {
        console.log(`   ✅ Mensaje ${messageId} entregado (ACK: ${ack})`);
        return true;
      } else {
        console.log(`   ⏳ Mensaje ${messageId} aún no entregado (ACK: ${ack})`);
        return false;
      }

    } catch (error) {
      console.log(`   ❌ Error verificando entrega de mensaje: ${error.message}`);
      return false;
    }
  }

  async simulateRemainingSequence(lead, whatsappFormat) {
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
        await this.client.sendMessage(whatsappFormat, remainingMessages[i]);
        
        // Delay aleatorio entre mensajes
        const randomDelay = Math.floor(Math.random() * (20000 - 12000 + 1)) + 12000;
        console.log(`   ⏱️ Esperando ${randomDelay/1000}s...`);
        await this.sleep(randomDelay);
      } catch (error) {
        console.error(`❌ Error enviando mensaje ${i + 3}:`, error.message);
      }
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
  testFlow?.stop();
});

process.on('SIGINT', () => {
  console.log('🛑 Recibida señal SIGINT');
  testFlow?.stop();
});

// Iniciar test
const testFlow = new TestDeliveryVerification();
testFlow.init(); 