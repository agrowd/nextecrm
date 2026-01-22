const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
require('dotenv').config();

class WhatsAppFlowTester {
  constructor() {
    this.client = null;
    this.isReady = false;
  }

  async init() {
    console.log('🧪 Iniciando tester de flujo de WhatsApp...');
    
    this.client = new Client({
      authStrategy: new LocalAuth({
        clientId: 'whatsapp-flow-tester'
      }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu'
        ]
      }
    });

    this.client.on('qr', (qr) => {
      console.log('📱 Escanea este código QR con WhatsApp:');
      qrcode.generate(qr, { small: true });
    });

    this.client.on('ready', () => {
      console.log('✅ WhatsApp Flow Tester listo!');
      this.isReady = true;
    });

    this.client.on('auth_failure', (msg) => {
      console.error('❌ Error de autenticación:', msg);
    });

    try {
      await this.client.initialize();
    } catch (error) {
      console.error('❌ Error inicializando WhatsApp:', error);
    }
  }

  /**
   * Simular el nuevo flujo optimizado
   */
  async testOptimizedFlow(phoneNumber, businessName = 'Test Business') {
    console.log(`\n🧪 Probando flujo optimizado para: ${phoneNumber}`);
    console.log('=' .repeat(60));

    try {
      // 1. Verificar registro básico
      console.log('1️⃣ Verificando registro básico...');
      const isRegistered = await this.client.isRegisteredUser(phoneNumber);
      if (!isRegistered) {
        console.log('❌ Número no registrado en WhatsApp');
        return { success: false, step: 'registration_check' };
      }
      console.log('✅ Número registrado en WhatsApp');

      // 2. Verificar chat existente
      console.log('2️⃣ Verificando chat existente...');
      const chat = await this.client.getChatById(phoneNumber);
      const hasConversation = chat ? (await chat.fetchMessages({ limit: 1 })).length > 0 : false;
      if (hasConversation) {
        console.log('⚠️ Chat existente detectado');
        return { success: false, step: 'existing_chat' };
      }
      console.log('✅ No hay conversación previa');

      // 3. Enviar mensajes 1-2 como verificación
      console.log('3️⃣ Enviando mensajes 1-2 como verificación...');
      const message1 = "Hola, soy Juan Cruz de Nexte Marketing. Estuve viendo su negocio Test Business y me pareció muy interesante";
      const message2 = "En Nexte Marketing llevamos 10 años (2015-2025) potenciando marcas: hemos trabajado con empresas en 5 países, evolucionando de un estudio freelance a una boutique de growth con especialistas multidisciplinarios y casos de éxito comprobados.";

      try {
        const sentMessage1 = await this.client.sendMessage(phoneNumber, message1);
        console.log('✅ Mensaje 1 enviado');
        await this.sleep(3000);
        
        const sentMessage2 = await this.client.sendMessage(phoneNumber, message2);
        console.log('✅ Mensaje 2 enviado');
        
        // 4. Verificar entrega de mensajes
        console.log('4️⃣ Verificando entrega de mensajes...');
        await this.sleep(5000);
        
        const chatAfter = await this.client.getChatById(phoneNumber);
        const messages = await chatAfter.fetchMessages({ limit: 10 });
        const ourMessages = messages.filter(msg => msg.fromMe);
        
        if (ourMessages.length >= 2) {
          console.log('✅ Mensajes entregados correctamente');
          
          // 5. Simular envío de mensajes 3-8
          console.log('5️⃣ Simulando envío de mensajes 3-8...');
          const remainingMessages = [
            "🚀 Te ofrecemos un sitio web completo por $150.000: incluye diseño personalizado, dominio .com, hosting por 1 año y adaptado a tu marca. Si no tenés marca, te la diseñamos. Todo en 2 días!",
            "💎 Para negocios que quieren destacar: sitio web premium por $500.000 con diseño exclusivo, animaciones avanzadas y optimizado para Google. Incluye branding completo.",
            "También hacemos: publicidad en Google para que te encuentren, manejo de redes sociales, bots de WhatsApp automáticos y todo lo que necesites para digitalizar tu negocio.",
            "Visitá https://nextemarketing.com para ver ejemplos.",
            "Cualquier consulta, estoy disponible"
          ];

          for (let i = 0; i < remainingMessages.length; i++) {
            await this.sleep(2000);
            await this.client.sendMessage(phoneNumber, remainingMessages[i]);
            console.log(`✅ Mensaje ${i + 3} enviado`);
          }
          
          console.log('✅ Secuencia completa enviada');
          return { success: true, step: 'sequence_completed' };
          
        } else {
          console.log('❌ Mensajes no entregados');
          return { success: false, step: 'message_delivery' };
        }
        
      } catch (error) {
        console.log(`❌ Error enviando mensajes: ${error.message}`);
        return { success: false, step: 'message_sending', error: error.message };
      }

    } catch (error) {
      console.error(`❌ Error en flujo: ${error.message}`);
      return { success: false, step: 'general_error', error: error.message };
    }
  }

  /**
   * Simular detección de respuesta humana
   */
  async testHumanResponseDetection() {
    console.log('\n👤 Probando detección de respuestas humanas...');
    
    const testCases = [
      {
        message: "Hola, me interesa el servicio",
        expected: 'human',
        description: 'Respuesta humana con interés'
      },
      {
        message: "Thanks for your message. We'll get back to you soon.",
        expected: 'auto',
        description: 'Respuesta automática de WhatsApp Business'
      },
      {
        message: "¿Cuánto cuesta?",
        expected: 'human',
        description: 'Respuesta humana preguntando precio'
      },
      {
        message: "Ok",
        expected: 'human',
        description: 'Respuesta humana corta'
      },
      {
        message: "We'll respond as soon as possible",
        expected: 'auto',
        description: 'Respuesta automática genérica'
      }
    ];

    for (const testCase of testCases) {
      const isHuman = this.isHumanResponse({ body: testCase.message });
      const result = isHuman === (testCase.expected === 'human') ? '✅' : '❌';
      console.log(`${result} ${testCase.description}: "${testCase.message}" -> ${isHuman ? 'Humano' : 'Automático'}`);
    }
  }

  /**
   * Detectar respuesta humana (copiado del servicio)
   */
  isHumanResponse(message) {
    const autoResponses = [
      'thanks for your message',
      'thanks for contacting',
      'we\'ll get back to you',
      'we\'ll respond as soon as possible',
      'thanks for reaching out',
      'we\'ll reply shortly',
      'thanks for your inquiry',
      'we\'ll get back to you soon',
      'thanks for your interest',
      'we\'ll respond shortly'
    ];

    const messageBody = message.body.toLowerCase();
    
    // Si coincide con respuestas automáticas, no es humano
    for (const autoResponse of autoResponses) {
      if (messageBody.includes(autoResponse)) {
        return false;
      }
    }

    // Verificar si el mensaje es muy corto o genérico
    if (messageBody.length < 3) {
      return false;
    }

    // Verificar si contiene palabras clave de respuesta humana
    const humanKeywords = [
      'hola', 'hello', 'hi', 'buenas', 'buen día', 'buenas tardes',
      'gracias', 'thanks', 'ok', 'okay', 'perfecto', 'genial',
      'interesado', 'interesa', 'me interesa', 'cuéntame', 'más info',
      'precio', 'costos', 'cuánto', 'presupuesto', 'cotización',
      'sí', 'si', 'no', 'cuando', 'dónde', 'cómo', 'como',
      'contacto', 'llamar', 'reunión', 'cita', 'turno'
    ];

    for (const keyword of humanKeywords) {
      if (messageBody.includes(keyword)) {
        return true;
      }
    }

    // Si no coincide con patrones automáticos, considerar humano
    return true;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async stop() {
    if (this.client) {
      await this.client.destroy();
    }
    process.exit(0);
  }
}

// Función principal
async function main() {
  const tester = new WhatsAppFlowTester();
  await tester.init();

  // Esperar a que esté listo
  while (!tester.isReady) {
    await tester.sleep(1000);
  }

  console.log('\n🧪 TESTER DE FLUJO OPTIMIZADO');
  console.log('=' .repeat(50));

  // Probar detección de respuestas humanas
  await tester.testHumanResponseDetection();

  // Probar flujo con número de ejemplo (reemplazar con número real)
  const testNumber = '5491112345678@c.us'; // Reemplazar con número real
  console.log(`\n🧪 Probando flujo con número: ${testNumber}`);
  
  const result = await tester.testOptimizedFlow(testNumber, 'Test Business');
  
  console.log('\n📊 RESULTADO DEL TEST:');
  console.log(`   Éxito: ${result.success ? '✅' : '❌'}`);
  console.log(`   Paso: ${result.step}`);
  if (result.error) {
    console.log(`   Error: ${result.error}`);
  }

  await tester.stop();
}

// Manejo de señales
process.on('SIGINT', () => {
  console.log('\n🛑 Test interrumpido por el usuario');
  process.exit(0);
});

// Ejecutar si se llama directamente
if (require.main === module) {
  main();
}

module.exports = WhatsAppFlowTester; 