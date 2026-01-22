const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
require('dotenv').config();

class TestCompleteFlow {
  constructor() {
    this.client = null;
    this.isReady = false;
  }

  async init() {
    console.log('🧪 Iniciando test del flujo completo...');
    
    this.client = new Client({
      authStrategy: new LocalAuth({
        clientId: 'test-complete-flow-bot'
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
    console.log('\n🧪 TEST DEL FLUJO COMPLETO');
    console.log('=' .repeat(60));

    // Simular lead de prueba
    const testLead = {
      id: 'test-complete-flow-123',
      name: 'Test Complete Flow Business',
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

    // PASO 1: Enviar mensaje 1
    console.log('\n📤 PASO 1: Enviando mensaje 1...');
    await this.sendMessage1(phoneValidation.whatsappFormat, testLead);

    // PASO 2: Verificar entrega del mensaje 1
    console.log('\n⏱️ PASO 2: Verificando entrega del mensaje 1...');
    const message1Delivered = await this.verifyMessageDelivery(phoneValidation.whatsappFormat);
    if (!message1Delivered) {
      console.log('❌ Mensaje 1 NO entregado - terminando test');
      return;
    }
    console.log('✅ Mensaje 1 entregado correctamente');

    // PASO 3: Delay aleatorio
    const randomDelay = Math.floor(Math.random() * (20000 - 12000 + 1)) + 12000;
    console.log(`\n⏱️ PASO 3: Esperando ${randomDelay/1000}s antes del mensaje 2...`);
    await this.sleep(randomDelay);

    // PASO 4: Enviar mensaje 2
    console.log('\n📤 PASO 4: Enviando mensaje 2...');
    await this.sendMessage2(phoneValidation.whatsappFormat, testLead);

    // PASO 5: Verificar entrega del mensaje 2
    console.log('\n⏱️ PASO 5: Verificando entrega del mensaje 2...');
    const message2Delivered = await this.verifyMessageDelivery(phoneValidation.whatsappFormat);
    if (!message2Delivered) {
      console.log('❌ Mensaje 2 NO entregado - terminando test');
      return;
    }
    console.log('✅ Mensaje 2 entregado correctamente');

    // PASO 6: Enviar mensajes 3-8
    console.log('\n📤 PASO 6: Enviando mensajes 3-8...');
    await this.sendRemainingSequence(testLead, phoneValidation.whatsappFormat);

    console.log('\n✅ TEST COMPLETADO EXITOSAMENTE');
    console.log('📊 RESUMEN:');
    console.log('   • Mensaje 1 enviado y verificado');
    console.log('   • Delay aleatorio aplicado');
    console.log('   • Mensaje 2 enviado y verificado');
    console.log('   • Mensajes 3-8 enviados');
    console.log('   • Total: 8 mensajes únicos con flujo completo');
  }

  async sendMessage1(whatsappFormat, lead) {
    const message1 = "Hola, soy Juan Cruz de Nexte Marketing. Estuve viendo su negocio Test Complete Flow Business y me pareció muy interesante";
    
    try {
      console.log(`   📤 Enviando mensaje 1: ${message1.substring(0, 50)}...`);
      await this.client.sendMessage(whatsappFormat, message1);
      console.log(`   ✅ Mensaje 1 enviado`);
    } catch (error) {
      console.error(`❌ Error enviando mensaje 1:`, error.message);
    }
  }

  async sendMessage2(whatsappFormat, lead) {
    const message2 = "En Nexte Marketing llevamos 10 años (2015-2025) potenciando marcas: hemos trabajado con empresas en 5 países, evolucionando de un estudio freelance a una boutique de growth con especialistas multidisciplinarios y casos de éxito comprobados.";
    
    try {
      console.log(`   📤 Enviando mensaje 2: ${message2.substring(0, 50)}...`);
      await this.client.sendMessage(whatsappFormat, message2);
      console.log(`   ✅ Mensaje 2 enviado`);
    } catch (error) {
      console.error(`❌ Error enviando mensaje 2:`, error.message);
    }
  }

  async verifyMessageDelivery(phoneNumber) {
    try {
      console.log(`   ⏱️ Esperando 5 segundos para verificar entrega...`);
      await this.sleep(5000);
      
      const chat = await this.client.getChatById(phoneNumber);
      if (!chat) {
        console.log(`   ❌ No se pudo obtener chat para ${phoneNumber}`);
        return false;
      }

      // Buscar el último mensaje enviado por nosotros
      const messages = await chat.fetchMessages({ limit: 10 });
      const lastMessage = messages.find(msg => msg.fromMe);
      
      if (!lastMessage) {
        console.log(`   ❌ No se encontró mensaje enviado`);
        return false;
      }

      // Verificar estado de entrega (ACK)
      const ack = lastMessage.ack;
      
      if (ack >= 2) {
        console.log(`   ✅ Mensaje entregado (ACK: ${ack})`);
        return true;
      } else {
        console.log(`   ⏳ Mensaje aún no entregado (ACK: ${ack})`);
        return false;
      }

    } catch (error) {
      console.log(`   ❌ Error verificando entrega: ${error.message}`);
      return false;
    }
  }

  async sendRemainingSequence(lead, whatsappFormat) {
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
    
    console.log(`   ✅ Secuencia restante completada`);
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
const testFlow = new TestCompleteFlow();
testFlow.init(); 