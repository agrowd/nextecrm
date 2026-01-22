const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
require('dotenv').config();

class ResponseDetectionTester {
  constructor() {
    this.client = null;
    this.isReady = false;
  }

  async init() {
    console.log('🧪 Iniciando tester de detección de respuestas...');
    
    this.client = new Client({
      authStrategy: new LocalAuth({
        clientId: 'response-detection-tester'
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
      console.log('✅ Response Detection Tester listo!');
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
   * Probar detección de respuestas con diferentes escenarios
   */
  async testResponseDetection() {
    console.log('\n🧪 PROBANDO DETECCIÓN DE RESPUESTAS');
    console.log('=' .repeat(60));

    const testCases = [
      // Respuestas automáticas de WhatsApp Business
      {
        message: "Thanks for your message. We'll get back to you soon.",
        responseTime: 1500,
        expected: 'auto',
        description: 'Respuesta automática típica de WhatsApp Business'
      },
      {
        message: "We'll respond as soon as possible",
        responseTime: 800,
        expected: 'auto',
        description: 'Respuesta automática rápida'
      },
      {
        message: "Thanks for contacting us",
        responseTime: 2000,
        expected: 'auto',
        description: 'Respuesta automática de agradecimiento'
      },
      {
        message: "We'll reply shortly",
        responseTime: 1200,
        expected: 'auto',
        description: 'Respuesta automática corta'
      },

      // Respuestas humanas rápidas
      {
        message: "Hola, me interesa el servicio",
        responseTime: 2500,
        expected: 'human',
        description: 'Respuesta humana rápida con interés'
      },
      {
        message: "¿Cuánto cuesta?",
        responseTime: 3000,
        expected: 'human',
        description: 'Respuesta humana preguntando precio'
      },
      {
        message: "Ok, perfecto",
        responseTime: 4000,
        expected: 'human',
        description: 'Respuesta humana de confirmación'
      },

      // Respuestas humanas tardías
      {
        message: "Hola! Me interesa mucho el servicio de sitio web. ¿Podrías contarme más detalles sobre el precio y qué incluye exactamente?",
        responseTime: 15000,
        expected: 'human',
        description: 'Respuesta humana tardía y detallada'
      },
      {
        message: "Gracias por contactarme. Me interesa el servicio de marketing digital. ¿Tienen experiencia con mi tipo de negocio?",
        responseTime: 25000,
        expected: 'human',
        description: 'Respuesta humana muy tardía con preguntas específicas'
      },

      // Casos ambiguos
      {
        message: "👍",
        responseTime: 5000,
        expected: 'auto',
        description: 'Solo emoji - probablemente automático'
      },
      {
        message: "Thanks",
        responseTime: 3000,
        expected: 'human',
        description: 'Respuesta corta pero humana'
      },
      {
        message: "We'll get back to you",
        responseTime: 8000,
        expected: 'auto',
        description: 'Respuesta automática pero tardía'
      },

      // Casos específicos de contexto
      {
        message: "Me interesa el sitio web de $150.000",
        responseTime: 12000,
        expected: 'human',
        description: 'Menciona precio específico - humano'
      },
      {
        message: "¿Qué incluye el diseño personalizado?",
        responseTime: 18000,
        expected: 'human',
        description: 'Pregunta específica sobre servicios - humano'
      },
      {
        message: "Gracias por la información de Nexte Marketing",
        responseTime: 22000,
        expected: 'human',
        description: 'Menciona nombre de la empresa - humano'
      }
    ];

    console.log('\n📊 RESULTADOS DE DETECCIÓN:');
    console.log('=' .repeat(60));

    let correctDetections = 0;
    let totalTests = testCases.length;

    for (const testCase of testCases) {
      // Simular sesión con tiempo de respuesta
      const session = {
        startTime: Date.now() - testCase.responseTime
      };

      const isHuman = this.isHumanResponse({ body: testCase.message }, session);
      const expectedHuman = testCase.expected === 'human';
      const isCorrect = isHuman === expectedHuman;
      
      if (isCorrect) correctDetections++;

      const result = isCorrect ? '✅' : '❌';
      const detected = isHuman ? 'Humano' : 'Automático';
      const expected = expectedHuman ? 'Humano' : 'Automático';
      
      console.log(`${result} ${testCase.description}`);
      console.log(`   Mensaje: "${testCase.message}"`);
      console.log(`   Tiempo: ${testCase.responseTime}ms`);
      console.log(`   Esperado: ${expected} | Detectado: ${detected}`);
      console.log('');
    }

    const accuracy = Math.round((correctDetections / totalTests) * 100);
    console.log(`📈 PRECISIÓN: ${correctDetections}/${totalTests} (${accuracy}%)`);

    if (accuracy >= 90) {
      console.log('🎉 Excelente precisión en la detección!');
    } else if (accuracy >= 80) {
      console.log('👍 Buena precisión en la detección');
    } else {
      console.log('⚠️ Precisión mejorable - considerar ajustes');
    }
  }

  /**
   * Detectar respuesta humana (copiado del servicio mejorado)
   */
  isHumanResponse(message, session = null) {
    const messageBody = message.body.toLowerCase();
    const now = Date.now();
    
    // 1. DETECCIÓN POR TIEMPO (más confiable)
    if (session && session.startTime) {
      const responseTime = now - session.startTime;
      
      // Si responde en menos de 3 segundos, probablemente es automático
      if (responseTime < 3000) {
        return false;
      }
      
      // Si responde entre 3-10 segundos, verificar contenido
      if (responseTime < 10000) {
        // Continuar con verificación de contenido
      } else {
        return true;
      }
    }

    // 2. DETECCIÓN POR CONTENIDO AUTOMÁTICO
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
      'we\'ll respond shortly',
      'we\'ll get back to you as soon as possible',
      'thanks for your message, we\'ll respond shortly',
      'we\'ll reply as soon as possible',
      'thanks for reaching out, we\'ll get back to you',
      'we\'ll respond to your message shortly'
    ];

    // Si coincide con respuestas automáticas, no es humano
    for (const autoResponse of autoResponses) {
      if (messageBody.includes(autoResponse)) {
        return false;
      }
    }

    // 3. DETECCIÓN POR PATRONES DE MENSAJE
    // Mensajes muy cortos o genéricos
    if (messageBody.length < 3) {
      return false;
    }

    // Mensajes que solo contienen emojis o símbolos
    const emojiOnly = /^[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]+$/u;
    if (emojiOnly.test(messageBody)) {
      return false;
    }

    // 4. DETECCIÓN POR PALABRAS CLAVE HUMANAS
    const humanKeywords = [
      'hola', 'hello', 'hi', 'buenas', 'buen día', 'buenas tardes', 'buenas noches',
      'gracias', 'thanks', 'ok', 'okay', 'perfecto', 'genial', 'excelente',
      'interesado', 'interesa', 'me interesa', 'cuéntame', 'más info', 'más información',
      'precio', 'costos', 'cuánto', 'presupuesto', 'cotización', 'tarifa',
      'sí', 'si', 'no', 'cuando', 'dónde', 'donde', 'cómo', 'como',
      'contacto', 'llamar', 'reunión', 'cita', 'turno', 'agendar',
      'disponible', 'horarios', 'ubicación', 'dirección', 'zona',
      'servicios', 'servicio', 'qué hacen', 'que hacen', 'qué ofrecen',
      'detalles', 'más detalles', 'información', 'informacion',
      'consulta', 'pregunta', 'duda', 'ayuda'
    ];

    for (const keyword of humanKeywords) {
      if (messageBody.includes(keyword)) {
        return true;
      }
    }

    // 5. DETECCIÓN POR ESTRUCTURA DEL MENSAJE
    // Mensajes que parecen respuestas automáticas de WhatsApp Business
    const autoPatterns = [
      /^thanks?\s+for\s+your\s+message/i,
      /^we\s+will\s+get\s+back\s+to\s+you/i,
      /^we\s+will\s+respond\s+as\s+soon\s+as\s+possible/i,
      /^thanks?\s+for\s+contacting/i,
      /^we\s+will\s+reply\s+shortly/i,
      /^thanks?\s+for\s+reaching\s+out/i,
      /^we\s+will\s+get\s+back\s+to\s+you\s+soon/i
    ];

    for (const pattern of autoPatterns) {
      if (pattern.test(messageBody)) {
        return false;
      }
    }

    // 6. DETECCIÓN POR LONGITUD Y COMPLEJIDAD
    // Mensajes muy largos o complejos suelen ser humanos
    if (messageBody.length > 50) {
      return true;
    }

    // Mensajes con preguntas específicas
    if (messageBody.includes('?') || messageBody.includes('¿')) {
      return true;
    }

    // 7. DETECCIÓN POR IDIOMA MIXTO
    // Si mezcla español e inglés, probablemente es humano
    const hasSpanish = /[áéíóúñü]/i.test(messageBody);
    const hasEnglish = /[a-z]/i.test(messageBody);
    if (hasSpanish && hasEnglish) {
      return true;
    }

    // 8. DETECCIÓN POR CONTEXTO ESPECÍFICO
    // Si menciona algo específico de nuestro mensaje, es humano
    const contextKeywords = [
      'nexte', 'marketing', 'sitio web', 'sitio', 'web', 'dominio', 'hosting',
      'diseño', 'diseño personalizado', '150.000', '500.000', 'precio',
      'google', 'publicidad', 'redes sociales', 'bot', 'whatsapp'
    ];

    for (const keyword of contextKeywords) {
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
  const tester = new ResponseDetectionTester();
  await tester.init();

  // Esperar a que esté listo
  while (!tester.isReady) {
    await tester.sleep(1000);
  }

  // Probar detección de respuestas
  await tester.testResponseDetection();

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

module.exports = ResponseDetectionTester; 