const { Client } = require('whatsapp-web.js');
const axios = require('axios'); // Added axios for backend communication

class WhatsAppChecker {
  constructor(client, messageSequences = null) {
    this.client = client;
    this.verifiedNumbers = new Map(); // Cache de números verificados
    this.failedNumbers = new Map(); // Cache de números que fallaron
    this.verificationSessions = new Map(); // Sesiones de verificación activas

    // Usar los messageSequences del bot principal si se proporcionan, sino usar los locales
    this.messageSequences = messageSequences || [
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
        "En Nexte Marketing llevamos 10 años (2015-2025) potenciando marcas: hemos trabajado con empresas en 5 países, evolucionando de un estudio freelance a una boutique de growth con especialistas multidisciplinarios y casos de éxito comprobados.",
        "Llevamos 10 años en Nexte Marketing (2015-2025) potenciando marcas. Trabajamos con empresas en 5 países, desde estudio freelance hasta boutique de growth con especialistas multidisciplinarios.",
        "En Nexte Marketing tenemos 10 años (2015-2025) potenciando marcas. Hemos trabajado con empresas en 5 países, evolucionando de estudio freelance a boutique de growth con especialistas multidisciplinarios.",
        "Nexte Marketing lleva 10 años (2015-2025) potenciando marcas. Trabajamos con empresas en 5 países, desde estudio freelance hasta boutique de growth con especialistas multidisciplinarios.",
        "En Nexte Marketing tenemos 10 años (2015-2025) potenciando marcas: hemos trabajado con empresas en 5 países, evolucionando de un estudio freelance a una boutique de growth con especialistas multidisciplinarios."
      ]
    ];
    this.backendUrl = process.env.BACKEND_URL || 'http://localhost:3000'; // Default backend URL
  }

  /**
   * Verificación directa enviando mensajes reales (sin verificación previa)
   */
  async verifyWithRealMessages(phoneNumber, businessName = '') {
    try {
      console.log(`🔍 Verificando WhatsApp enviando mensajes reales a: ${phoneNumber}`);

      // 1. Verificar cache y detectar números atascados
      if (this.verifiedNumbers.has(phoneNumber)) {
        console.log(`✅ Número ${phoneNumber} verificado previamente`);
        // Verificar si hay una sesión activa para este número
        const activeSession = this.findSessionByPhone(phoneNumber);
        if (!activeSession) {
          // Verificar si el número está atascado (múltiples intentos)
          if (this.isNumberStuck(phoneNumber)) {
            console.log(`🚨 Número ${phoneNumber} detectado como atascado - limpiando cache`);
            this.clearNumberFromCache(phoneNumber);
            // Continuar con verificación normal
          } else {
            console.log(`⚠️ Número ${phoneNumber} ya procesado anteriormente - marcando como ya contactado`);
            return { valid: true, method: 'cached', alreadyContacted: true };
          }
        } else {
          return { valid: true, method: 'cached' };
        }
      }

      if (this.failedNumbers.has(phoneNumber)) {
        console.log(`❌ Número ${phoneNumber} falló previamente`);
        return { valid: false, method: 'cached_failed' };
      }

      // 2. Verificar chat existente (para evitar duplicados)
      const chatExists = await this.checkChatExists(phoneNumber);
      if (chatExists) {
        console.log(`⚠️ Chat existente con ${phoneNumber} - posible conversación previa`);
        this.verifiedNumbers.set(phoneNumber, Date.now());
        return { valid: true, method: 'existing_chat', hasConversation: true };
      }

      // 3. INICIAR sesión de verificación (solo mensaje 1)
      const sessionResult = await this.startVerificationSession(phoneNumber, businessName);

      if (sessionResult.success) {
        console.log(`✅ Sesión de verificación iniciada para ${phoneNumber} - esperando completar`);
        return {
          valid: true,
          method: 'verification_session',
          sessionId: sessionResult.sessionId,
          messagesSent: 1,
          waitingForCompletion: true
        };
      } else {
        console.log(`❌ Falló inicio de verificación a ${phoneNumber}: ${sessionResult.error}`);
        this.failedNumbers.set(phoneNumber, Date.now());
        return { valid: false, method: 'session_failed', error: sessionResult.error };
      }

    } catch (error) {
      console.error(`❌ Error verificando WhatsApp para ${phoneNumber}:`, error.message);
      return { valid: false, method: 'error', error: error.message };
    }
  }

  /**
   * Iniciar sesión de verificación enviando SOLO el mensaje 1
   */
  async startVerificationSession(phoneNumber, businessName = '') {
    try {
      const sessionId = `session_${Date.now()}_${phoneNumber}`;

      // Crear sesión de verificación
      this.verificationSessions.set(sessionId, {
        phoneNumber,
        businessName,
        startTime: Date.now(),
        messagesSent: 0,
        status: 'active',
        timeout: 5 * 60 * 1000, // 5 minutos
        messageIds: [], // IDs de los mensajes enviados
        responseReceived: false,
        message1Delivered: false,
        message2Delivered: false,
        waitingForMessage2: true, // Esperar para enviar mensaje 2
        messages3to8Sent: false // Flag para evitar duplicados
      });

      // ENVIAR SOLO EL MENSAJE 1
      const message1 = this.getRandomMessage(0, businessName);
      try {
        const sentMessage1 = await this.client.sendMessage(phoneNumber, message1);
        this.verificationSessions.get(sessionId).messageIds.push(sentMessage1.id._serialized);
        console.log(`📤 Mensaje 1 enviado a ${phoneNumber} - esperando completar verificación`);
      } catch (error) {
        console.log(`❌ Error enviando mensaje 1 a ${phoneNumber}:`, error.message);
        this.verificationSessions.delete(sessionId);
        return { success: false, error: error.message };
      }

      // Programar timeout de la sesión
      setTimeout(() => {
        this.handleSessionTimeout(sessionId);
      }, 5 * 60 * 1000); // 5 minutos

      // Programar continuación automática con mensaje 2 después de 10 segundos
      setTimeout(async () => {
        console.log(`⏰ Continuando automáticamente con mensaje 2 para ${phoneNumber}...`);
        const continueResult = await this.continueWithMessage2(phoneNumber);
        if (continueResult.success && continueResult.bothMessagesDelivered) {
          console.log(`✅ Verificación completada automáticamente para ${phoneNumber} - lista para mensajes 3-8`);
        } else {
          console.log(`❌ Error en continuación automática para ${phoneNumber}: ${continueResult.error}`);
        }
      }, 10000); // 10 segundos

      return { success: true, sessionId, waitingForMessage2: true };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Manejar timeout de sesión de verificación
   */
  handleSessionTimeout(sessionId) {
    const session = this.verificationSessions.get(sessionId);
    if (!session) return;

    console.log(`⏰ Timeout de sesión para ${session.phoneNumber} - marcando como inválido`);

    // Marcar número como inválido
    this.failedNumbers.set(session.phoneNumber, Date.now());

    // Eliminar sesión
    this.verificationSessions.delete(sessionId);

    // Aquí podrías notificar al backend para marcar el lead como inválido
    this.notifyBackendOfInvalidNumber(session.phoneNumber, session.businessName);
  }

  /**
   * Confirmar sesión exitosa (cuando el usuario responde)
   */
  confirmSession(phoneNumber) {
    // Buscar sesión activa para este número
    for (const [sessionId, session] of this.verificationSessions) {
      if (session.phoneNumber === phoneNumber && session.status === 'active') {
        console.log(`✅ Sesión confirmada para ${phoneNumber} - WhatsApp válido`);

        // Marcar como verificado
        this.verifiedNumbers.set(phoneNumber, Date.now());

        // Eliminar sesión
        this.verificationSessions.delete(sessionId);

        return { success: true, sessionId };
      }
    }

    return { success: false, error: 'No se encontró sesión activa' };
  }

  /**
   * Verificar si una sesión está completa y lista para mensajes 3-8
   */
  isSessionComplete(phoneNumber) {
    console.log(`🔍 Verificando sesión completa para ${phoneNumber}...`);
    console.log(`🔍 Sesiones activas: ${this.verificationSessions.size}`);

    // Buscar sesión activa para este número
    for (const [sessionId, session] of this.verificationSessions) {
      console.log(`🔍 Revisando sesión ${sessionId}:`, {
        phoneNumber: session.phoneNumber,
        status: session.status,
        bothMessagesDelivered: session.bothMessagesDelivered,
        messagesSent: session.messagesSent
      });

      if (session.phoneNumber === phoneNumber && session.status === 'active' && session.bothMessagesDelivered) {
        console.log(`✅ Sesión completa encontrada para ${phoneNumber} - lista para mensajes 3-8`);

        // Eliminar sesión después de confirmar que está completa
        this.verificationSessions.delete(sessionId);

        return { success: true, sessionId };
      }
    }

    console.log(`❌ No se encontró sesión completa para ${phoneNumber}`);
    return { success: false, error: 'No se encontró sesión completa' };
  }

  /**
   * Continuar con mensaje 2 después de verificar entrega del mensaje 1
   */
  async continueWithMessage2(phoneNumber) {
    // Buscar sesión activa para este número
    for (const [sessionId, session] of this.verificationSessions) {
      if (session.phoneNumber === phoneNumber && session.status === 'active' && session.waitingForMessage2) {
        console.log(`📤 Continuando con mensaje 2 para ${phoneNumber}`);

        // Verificar entrega del mensaje 1
        const message1Id = session.messageIds[0];
        if (!message1Id) {
          console.log(`❌ No se encontró ID del mensaje 1 para ${phoneNumber}`);
          return { success: false, error: 'No se encontró mensaje 1' };
        }

        // ESPERAR DELAY ALEATORIO PARA VERIFICAR ENTREGA DEL MENSAJE 1 (3-8 segundos)
        const verificationDelay1 = Math.floor(Math.random() * (8000 - 3000 + 1)) + 3000;
        console.log(`⏱️ Esperando ${verificationDelay1 / 1000}s para verificar entrega del mensaje 1...`);
        await this.sleep(verificationDelay1);

        const message1Delivered = await this.verifyMessageDelivery(phoneNumber, message1Id);
        if (!message1Delivered) {
          console.log(`❌ Mensaje 1 NO entregado a ${phoneNumber} - esperando más tiempo...`);
          // Esperar delay aleatorio adicional antes de fallar (8-15 segundos)
          const retryDelay = Math.floor(Math.random() * (15000 - 8000 + 1)) + 8000;
          await this.sleep(retryDelay);
          const message1DeliveredRetry = await this.verifyMessageDelivery(phoneNumber, message1Id);
          if (!message1DeliveredRetry) {
            console.log(`❌ Mensaje 1 NO entregado después de retry a ${phoneNumber} - marcando como inválido`);
            this.failedNumbers.set(phoneNumber, Date.now());
            this.verificationSessions.delete(sessionId);
            return { success: false, error: 'Mensaje 1 no entregado después de retry' };
          }
        }

        console.log(`✅ Mensaje 1 entregado a ${phoneNumber}`);
        session.message1Delivered = true;

        // ESPERAR DELAY ALEATORIO ENTRE MENSAJES (15-30 segundos)
        const randomDelay = Math.floor(Math.random() * (30000 - 15000 + 1)) + 15000;
        console.log(`⏱️ Esperando ${randomDelay / 1000}s antes del mensaje 2...`);
        await this.sleep(randomDelay);

        // ENVIAR MENSAJE 2
        const message2 = this.getRandomMessage(1, session.businessName);
        let sentMessage2;
        try {
          sentMessage2 = await this.client.sendMessage(phoneNumber, message2);
          session.messageIds.push(sentMessage2.id._serialized);
          console.log(`📤 Mensaje 2 enviado a ${phoneNumber}`);
        } catch (error) {
          console.log(`❌ Error enviando mensaje 2 a ${phoneNumber}:`, error.message);
          this.verificationSessions.delete(sessionId);
          return { success: false, error: error.message };
        }

        // ESPERAR DELAY ALEATORIO PARA VERIFICAR ENTREGA DEL MENSAJE 2 (3-8 segundos)
        const verificationDelay2 = Math.floor(Math.random() * (8000 - 3000 + 1)) + 3000;
        console.log(`⏱️ Esperando ${verificationDelay2 / 1000}s para verificar entrega del mensaje 2...`);
        await this.sleep(verificationDelay2);

        const message2Delivered = await this.verifyMessageDelivery(phoneNumber, sentMessage2.id._serialized);
        if (message2Delivered) {
          console.log(`✅ Mensaje 2 entregado a ${phoneNumber}`);
          session.message2Delivered = true;
          session.messagesSent = 2;
          session.waitingForMessage2 = false;
          session.bothMessagesDelivered = true; // Marcar que ambos mensajes fueron entregados

          // Marcar como verificado
          this.verifiedNumbers.set(phoneNumber, Date.now());

          // NO eliminar sesión aquí - mantenerla para que el bot principal pueda detectar que está completa
          console.log(`✅ Sesión de verificación completada para ${phoneNumber} - lista para mensajes 3-8`);
          console.log(`🔍 Estado de la sesión después de completar:`, {
            sessionId: sessionId,
            phoneNumber: session.phoneNumber,
            status: session.status,
            bothMessagesDelivered: session.bothMessagesDelivered,
            messagesSent: session.messagesSent,
            totalSessions: this.verificationSessions.size
          });

          return { success: true, sessionId, bothMessagesDelivered: true };
        } else {
          console.log(`❌ Mensaje 2 NO entregado a ${phoneNumber} - marcando como inválido`);
          this.failedNumbers.set(phoneNumber, Date.now());
          this.verificationSessions.delete(sessionId);
          return { success: false, error: 'Mensaje 2 no entregado' };
        }
      }
    }

    return { success: false, error: 'No se encontró sesión activa esperando mensaje 2' };
  }



  /**
   * Verificación rápida sin envío de mensajes
   */
  async quickVerify(phoneNumber) {
    try {
      // Intentar verificación con manejo robusto de errores
      const isRegistered = await this.client.isRegisteredUser(phoneNumber);

      if (!isRegistered) {
        return { valid: false, method: 'quick_not_registered' };
      }

      const chatExists = await this.checkChatExists(phoneNumber);

      return {
        valid: true,
        method: 'quick_verified',
        hasConversation: chatExists
      };

    } catch (error) {
      // 🛡️ MANEJO ESPECÍFICO DE ERROR: [comms] sendIq called before startComms
      // Este error indica desconexión transitoria de wwebjs/puppeteer
      if (error.message.includes('sendIq called before startComms')) {
        console.log(`⚠️ Error de conexión en quickVerify (${phoneNumber}) - Asumiendo desconexión temporal`);
        // Opcional: Podríamos retornar { valid: false, reason: 'retry_later' }
        // Pero para no bloquear, si falla la verificación, asumimos que NO es válido por seguridad
        return { valid: false, method: 'quick_error_retry', error: 'connection_error' };
      }

      return { valid: false, method: 'quick_error', error: error.message };
    }
  }

  /**
   * Revisar números marcados como inválidos (ejecutar periódicamente)
   */
  async reviewFailedNumbers() {
    console.log('🔍 Revisando números marcados como inválidos...');

    const now = Date.now();
    const reviewThreshold = 24 * 60 * 60 * 1000; // 24 horas

    for (const [phoneNumber, timestamp] of this.failedNumbers) {
      // Solo revisar números que fallaron hace más de 24 horas
      if (now - timestamp > reviewThreshold) {
        console.log(`🔄 Revisando número: ${phoneNumber}`);

        const reviewResult = await this.quickVerify(phoneNumber);
        if (reviewResult.valid) {
          console.log(`✅ Número ${phoneNumber} ahora es válido - removiendo de lista de fallidos`);
          this.failedNumbers.delete(phoneNumber);

          // Notificar al backend que el número es válido nuevamente
          this.notifyBackendOfValidNumber(phoneNumber);
        }

        // Delay entre verificaciones
        await this.sleep(2000);
      }
    }
  }

  /**
   * Obtener mensaje aleatorio de la secuencia
   */
  getRandomMessage(messageIndex, businessName = '') {
    const variations = this.messageSequences[messageIndex];
    const randomIndex = Math.floor(Math.random() * variations.length);
    let message = variations[randomIndex];

    if (businessName && messageIndex === 0) {
      message = message.replace(/{businessName}/g, businessName);
    }

    return message;
  }

  /**
   * Verificar si existe chat con el número
   */
  async checkChatExists(phoneNumber) {
    try {
      const chat = await this.client.getChatById(phoneNumber);
      if (chat) {
        // Traer más mensajes para asegurar que no sea solo uno de sistema
        const messages = await chat.fetchMessages({ limit: 10 });

        // Filtrar mensajes de sistema, llamadas, notificaciones E2E, etc.
        const realMessages = messages.filter(msg =>
          msg.type === 'chat' ||
          msg.type === 'image' ||
          msg.type === 'video' ||
          msg.type === 'audio' ||
          msg.type === 'ptt' ||
          msg.type === 'document'
        );

        if (realMessages.length > 0) {
          console.log(`⚠️ Chat real detectado con ${phoneNumber} (Tipos: ${realMessages.map(m => m.type).join(', ')})`);
          return true;
        }
      }
      return false;
    } catch (error) {
      // Si falla obtener el chat, asumimos que no existe para no bloquear
      return false;
    }
  }

  /**
   * Verificar entrega de un mensaje específico
   */
  async verifyMessageDelivery(phoneNumber, messageId) {
    try {
      const chat = await this.client.getChatById(phoneNumber);
      if (!chat) {
        console.log(`❌ No se pudo obtener chat para ${phoneNumber}`);
        return false;
      }

      // Buscar el mensaje específico
      const messages = await chat.fetchMessages({ limit: 50 });
      const targetMessage = messages.find(msg =>
        msg.id._serialized === messageId && msg.fromMe
      );

      if (!targetMessage) {
        console.log(`❌ Mensaje ${messageId} no encontrado en chat`);
        return false;
      }

      // Verificar estado de entrega (ACK)
      // ACK: 0 = enviado, 1 = entregado al servidor, 2 = entregado al cliente, 3 = leído
      const ack = targetMessage.ack;

      if (ack >= 2) {
        console.log(`✅ Mensaje ${messageId} entregado (ACK: ${ack})`);
        return true;
      } else {
        console.log(`⏳ Mensaje ${messageId} aún no entregado (ACK: ${ack})`);
        return false;
      }

    } catch (error) {
      console.log(`❌ Error verificando entrega de mensaje: ${error.message}`);
      return false;
    }
  }

  /**
   * Notificar al backend sobre número inválido
   */
  async notifyBackendOfInvalidNumber(phoneNumber, businessName) {
    // Aquí implementarías la lógica para notificar al backend
    console.log(`📤 Notificando al backend: ${phoneNumber} es inválido`);
    try {
      await axios.post(`${this.backendUrl}/leads/invalid`, { phoneNumber, businessName });
    } catch (error) {
      console.error('Error notificando al backend de número inválido:', error.message);
    }
  }

  /**
   * Notificar al backend sobre número válido
   */
  async notifyBackendOfValidNumber(phoneNumber) {
    // Aquí implementarías la lógica para notificar al backend
    console.log(`📤 Notificando al backend: ${phoneNumber} es válido nuevamente`);
    try {
      await axios.post(`${this.backendUrl}/leads/valid`, { phoneNumber });
    } catch (error) {
      console.error('Error notificando al backend de número válido:', error.message);
    }
  }

  /**
   * Limpiar cache periódicamente
   */
  cleanCache() {
    const now = Date.now();
    const cacheTimeout = 24 * 60 * 60 * 1000; // 24 horas

    // Limpiar números verificados que no tienen sesiones activas
    for (const [phoneNumber, timestamp] of this.verifiedNumbers) {
      const activeSession = this.findSessionByPhone(phoneNumber);
      if (!activeSession) {
        // Si no hay sesión activa, el número ya fue procesado completamente
        this.verifiedNumbers.delete(phoneNumber);
        console.log(`🧹 Limpiando número ${phoneNumber} del cache - ya procesado completamente`);
      }
    }

    // Limpiar números verificados antiguos
    for (const [number, timestamp] of this.verifiedNumbers) {
      if (now - timestamp > cacheTimeout) {
        this.verifiedNumbers.delete(number);
      }
    }

    // Limpiar números fallidos antiguos
    for (const [number, timestamp] of this.failedNumbers) {
      if (now - timestamp > cacheTimeout) {
        this.failedNumbers.delete(number);
      }
    }

    // Limpiar sesiones expiradas
    for (const [sessionId, session] of this.verificationSessions) {
      if (now - session.startTime > session.timeout) {
        this.verificationSessions.delete(sessionId);
      }
    }

    console.log(`🧹 Cache limpiado: ${this.verifiedNumbers.size} verificados, ${this.failedNumbers.size} fallidos, ${this.verificationSessions.size} sesiones activas`);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Verificar si los mensajes llegaron y enviar el resto de la secuencia
   */
  async checkMessageDeliveryAndContinue(phoneNumber, lead, whatsappFormat) {
    const session = this.findSessionByPhone(phoneNumber);
    if (!session) return false;

    try {
      // Verificar si los mensajes llegaron (ACK = 2 significa entregado)
      const chat = await this.client.getChatById(phoneNumber);
      if (chat) {
        const messages = await chat.fetchMessages({ limit: 10 });

        // Buscar nuestros mensajes en el chat
        const ourMessages = messages.filter(msg =>
          msg.fromMe && session.messageIds.includes(msg.id._serialized)
        );

        if (ourMessages.length >= 2) {
          console.log(`✅ Mensajes 1-2 entregados a ${phoneNumber} - marcando como válido`);

          // Marcar como verificado
          this.verifiedNumbers.set(phoneNumber, Date.now());

          // Eliminar sesión
          this.verificationSessions.delete(session.sessionId);

          // NO enviar secuencia aquí, se enviará desde el bot principal
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error(`❌ Error verificando entrega de mensajes:`, error.message);
      return false;
    }
  }

  /**
   * Detectar respuesta humana (no automática de WhatsApp Business)
   */
  isHumanResponse(message, session = null) {
    const messageBody = message.body.toLowerCase();
    const now = Date.now();

    // 1. DETECCIÓN POR TIEMPO (más confiable)
    if (session && session.startTime) {
      const responseTime = now - session.startTime;

      // Si responde en menos de 3 segundos, probablemente es automático
      if (responseTime < 3000) {
        console.log(`⏱️ Respuesta muy rápida (${responseTime}ms) - probablemente automática`);
        return false;
      }

      // Si responde entre 3-10 segundos, verificar contenido
      if (responseTime < 10000) {
        console.log(`⏱️ Respuesta rápida (${responseTime}ms) - verificando contenido`);
      } else {
        console.log(`⏱️ Respuesta tardía (${responseTime}ms) - probablemente humana`);
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
        console.log(`🤖 Respuesta automática detectada: "${messageBody}"`);
        return false;
      }
    }

    // 3. DETECCIÓN POR PATRONES DE MENSAJE
    // Mensajes muy cortos o genéricos
    if (messageBody.length < 3) {
      console.log(`📝 Mensaje muy corto (${messageBody.length} chars) - probablemente automático`);
      return false;
    }

    // Mensajes que solo contienen emojis o símbolos
    const emojiOnly = /^[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]+$/u;
    if (emojiOnly.test(messageBody)) {
      console.log(`😊 Solo emojis detectados - probablemente automático`);
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
        console.log(`👤 Palabra clave humana detectada: "${keyword}"`);
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
        console.log(`🤖 Patrón automático detectado: "${messageBody}"`);
        return false;
      }
    }

    // 6. DETECCIÓN POR LONGITUD Y COMPLEJIDAD
    // Mensajes muy largos o complejos suelen ser humanos
    if (messageBody.length > 50) {
      console.log(`📝 Mensaje largo (${messageBody.length} chars) - probablemente humano`);
      return true;
    }

    // Mensajes con preguntas específicas
    if (messageBody.includes('?') || messageBody.includes('¿')) {
      console.log(`❓ Mensaje con pregunta detectado - probablemente humano`);
      return true;
    }

    // 7. DETECCIÓN POR IDIOMA MIXTO
    // Si mezcla español e inglés, probablemente es humano
    const hasSpanish = /[áéíóúñü]/i.test(messageBody);
    const hasEnglish = /[a-z]/i.test(messageBody);
    if (hasSpanish && hasEnglish) {
      console.log(`🌍 Mezcla de idiomas detectada - probablemente humano`);
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
        console.log(`🎯 Contexto específico detectado: "${keyword}" - probablemente humano`);
        return true;
      }
    }

    // Si no coincide con patrones automáticos, considerar humano
    console.log(`🤔 Mensaje ambiguo: "${messageBody}" - considerando humano por defecto`);
    return true;
  }

  /**
   * Manejar respuesta del usuario con detección mejorada
   */
  async handleUserResponse(phoneNumber, message, lead, whatsappFormat) {
    const session = this.findSessionByPhone(phoneNumber);
    if (!session) return false;

    // Verificar si es respuesta humana con detección mejorada
    const isHuman = this.isHumanResponse(message, session);

    if (isHuman) {
      console.log(`👤 Respuesta humana detectada de ${phoneNumber}`);

      // Marcar sesión como respondida
      session.responseReceived = true;

      // Marcar como verificado
      this.verifiedNumbers.set(phoneNumber, Date.now());

      // Eliminar sesión
      this.verificationSessions.delete(session.sessionId);

      // NO enviar más mensajes automáticos - cortar la cadena
      console.log(`🛑 Cadena de mensajes cortada para ${phoneNumber} - usuario respondió`);

      return {
        success: true,
        action: 'stop_sequence',
        reason: 'human_response',
        responseTime: session.startTime ? Date.now() - session.startTime : null
      };
    } else {
      console.log(`🤖 Respuesta automática detectada de ${phoneNumber} - continuando secuencia`);
      return {
        success: false,
        action: 'continue_sequence',
        reason: 'auto_response',
        responseTime: session.startTime ? Date.now() - session.startTime : null
      };
    }
  }

  /**
   * Enviar secuencia restante (mensajes 3-8)
   */
  // MÉTODO COMENTADO PARA EVITAR DUPLICACIÓN - EL BOT PRINCIPAL MANEJA ESTO
  /*
  async sendRemainingSequence(lead, whatsappFormat, startIndex = 2) {
    console.log(`📱 Enviando secuencia restante (mensajes ${startIndex + 1}-${this.messageSequences.length}) a ${lead.name}`);

    // Enviar mensajes restantes de la secuencia
    for (let i = startIndex; i < this.messageSequences.length; i++) {
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
          delay: i > startIndex ? this.getRandomDelay() : 0,
          typingTime: 2000,
          whatsappMessageId: messageId,
          botInstance: 'main',
          sessionId: this.client.info?.wid?.user || '',
          metadata: {
            messageIndex: i,
            totalMessages: this.messageSequences.length,
            whatsappVerified: true,
            envioAutomatico: true,
            verificationSession: true,
            automaticSequence: true,
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
        console.log(`✅ Mensaje ${i + 1} enviado a ${lead.name}`);
        
        // Esperar delay aleatorio entre mensajes
        if (i < this.messageSequences.length - 1) {
          const randomDelay = this.getRandomDelay();
          console.log(`⏱️ Esperando ${randomDelay/1000}s antes del siguiente mensaje...`);
          await this.sleep(randomDelay);
        }
        
      } catch (error) {
        console.error(`❌ Error enviando mensaje ${i + 1} a ${lead.name}:`, error.message);
        break;
      }
    }

    console.log(`✅ Secuencia restante finalizada para ${lead.name}`);
  }
  */

  /**
   * Buscar sesión por número de teléfono
   */
  findSessionByPhone(phoneNumber) {
    for (const [sessionId, session] of this.verificationSessions) {
      if (session.phoneNumber === phoneNumber && session.status === 'active') {
        return session;
      }
    }
    return null;
  }

  /**
   * Forzar limpieza de un número específico del cache
   */
  forceCleanNumber(phoneNumber) {
    this.verifiedNumbers.delete(phoneNumber);
    this.failedNumbers.delete(phoneNumber);

    // Eliminar sesiones relacionadas con este número
    for (const [sessionId, session] of this.verificationSessions) {
      if (session.phoneNumber === phoneNumber) {
        this.verificationSessions.delete(sessionId);
      }
    }

    console.log(`🧹 Forzando limpieza del número ${phoneNumber} del cache`);
  }

  /**
   * Limpiar número específico del cache (para casos de números atascados)
   */
  clearNumberFromCache(phoneNumber) {
    if (this.verifiedNumbers.has(phoneNumber)) {
      this.verifiedNumbers.delete(phoneNumber);
      console.log(`🧹 Número ${phoneNumber} removido del cache por estar atascado`);
    }
    if (this.failedNumbers.has(phoneNumber)) {
      this.failedNumbers.delete(phoneNumber);
      console.log(`🧹 Número ${phoneNumber} removido del cache de fallidos`);
    }

    // También limpiar sesiones relacionadas
    for (const [sessionId, session] of this.verificationSessions) {
      if (session.phoneNumber === phoneNumber) {
        this.verificationSessions.delete(sessionId);
        console.log(`🧹 Sesión ${sessionId} removida para ${phoneNumber}`);
      }
    }
  }

  /**
   * Verificar si un número está atascado (múltiples intentos sin éxito)
   */
  isNumberStuck(phoneNumber) {
    // Si el número está en cache pero no tiene sesión activa, está atascado
    if (this.verifiedNumbers.has(phoneNumber)) {
      const activeSession = this.findSessionByPhone(phoneNumber);
      if (!activeSession) {
        return true;
      }
    }
    return false;
  }

  /**
   * Obtener delay aleatorio más humano
   */
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

  /**
   * Simular escritura
   */
  async simulateTyping(chatId) {
    try {
      await this.client.sendStateTyping(chatId);

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
      await this.client.sendStateTyping(chatId, false);
    } catch (error) {
      console.log('⚠️ No se pudo simular escritura');
    }
  }
}

module.exports = WhatsAppChecker; 