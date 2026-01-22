const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
require('dotenv').config();

class DebugVerificationFlow {
  constructor() {
    this.client = null;
    this.isReady = false;
  }

  async init() {
    console.log('🐛 Iniciando debug del flujo de verificación...');
    
    this.client = new Client({
      authStrategy: new LocalAuth({
        clientId: 'debug-verification-bot'
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
      console.log('✅ Debug bot listo!');
      this.isReady = true;
      this.runDebug();
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

  async runDebug() {
    console.log('\n🐛 DEBUG DEL FLUJO DE VERIFICACIÓN');
    console.log('=' .repeat(60));

    // Simular lead de prueba
    const testLead = {
      id: 'debug-verification-123',
      name: 'Debug Verification Business',
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

    // PASO 1: Verificar WhatsApp
    console.log('\n🔍 PASO 1: Verificando WhatsApp...');
    const whatsappCheck = await this.simulateWhatsAppCheck(phoneValidation.whatsappFormat, testLead);
    console.log(`Resultado: ${JSON.stringify(whatsappCheck, null, 2)}`);

    // PASO 2: Procesar resultado
    console.log('\n🔍 PASO 2: Procesando resultado...');
    await this.processWhatsAppResult(whatsappCheck, testLead, phoneValidation.whatsappFormat);

    console.log('\n✅ DEBUG COMPLETADO');
  }

  async simulateWhatsAppCheck(whatsappFormat, lead) {
    // Simular verificación de WhatsApp
    console.log(`   🔍 Verificando ${whatsappFormat}...`);
    
    // Simular que es un número nuevo (sin cache)
    console.log(`   ✅ Número no está en cache`);
    
    // Simular que no hay chat existente
    console.log(`   ✅ No hay chat existente`);
    
    // Simular verificación exitosa
    return {
      valid: true,
      method: 'verification_session',
      sessionId: 'debug-session-123',
      messagesSent: 2,
      bothMessagesDelivered: true
    };
  }

  async processWhatsAppResult(whatsappCheck, lead, whatsappFormat) {
    console.log(`   📊 Procesando resultado: ${whatsappCheck.method}`);
    
    if (whatsappCheck.method === 'verification_session' && whatsappCheck.bothMessagesDelivered) {
      console.log(`   ✅ Sesión completada - enviando mensajes 3-8`);
      await this.simulateRemainingSequence(lead, whatsappFormat);
    } else if (whatsappCheck.method === 'verification_session') {
      console.log(`   ⏳ Sesión en progreso - esperando completar`);
    } else {
      console.log(`   🔄 Iniciando verificación`);
      await this.simulateVerificationSession(whatsappFormat, lead);
    }
  }

  async simulateVerificationSession(whatsappFormat, lead) {
    console.log(`   📤 Simulando sesión de verificación...`);
    
    // Simular envío de mensaje 1
    console.log(`   📤 Enviando mensaje 1...`);
    const message1 = "Hola, soy Juan Cruz de Nexte Marketing. Estuve viendo su negocio Debug Verification Business y me pareció muy interesante";
    await this.client.sendMessage(whatsappFormat, message1);
    console.log(`   ✅ Mensaje 1 enviado`);
    
    // Simular espera y verificación
    console.log(`   ⏱️ Esperando 5 segundos...`);
    await this.sleep(5000);
    console.log(`   ✅ Mensaje 1 verificado como entregado`);
    
    // Simular delay aleatorio
    const randomDelay = Math.floor(Math.random() * (20000 - 12000 + 1)) + 12000;
    console.log(`   ⏱️ Esperando ${randomDelay/1000}s antes del mensaje 2...`);
    await this.sleep(randomDelay);
    
    // Simular envío de mensaje 2
    console.log(`   📤 Enviando mensaje 2...`);
    const message2 = "En Nexte Marketing llevamos 10 años (2015-2025) potenciando marcas: hemos trabajado con empresas en 5 países, evolucionando de un estudio freelance a una boutique de growth con especialistas multidisciplinarios y casos de éxito comprobados.";
    await this.client.sendMessage(whatsappFormat, message2);
    console.log(`   ✅ Mensaje 2 enviado`);
    
    // Simular espera y verificación
    console.log(`   ⏱️ Esperando 5 segundos...`);
    await this.sleep(5000);
    console.log(`   ✅ Mensaje 2 verificado como entregado`);
    
    console.log(`   ✅ Sesión de verificación completada`);
  }

  async simulateRemainingSequence(lead, whatsappFormat) {
    console.log(`   📤 Simulando envío de mensajes 3-8...`);
    
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
    console.log('🛑 Deteniendo debug...');
    if (this.client) {
      await this.client.destroy();
    }
    process.exit(0);
  }
}

// Manejo de señales
process.on('SIGTERM', () => {
  console.log('🛑 Recibida señal SIGTERM');
  debugFlow?.stop();
});

process.on('SIGINT', () => {
  console.log('🛑 Recibida señal SIGINT');
  debugFlow?.stop();
});

// Iniciar debug
const debugFlow = new DebugVerificationFlow();
debugFlow.init(); 