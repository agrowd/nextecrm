// ✅ NUEVA VERSIÓN DE sendMessageSequence() CON IA Y HUMAN BEHAVIOR
// Reemplazar la función existente en bot/index.js (línea 579-712 aprox.)

async sendMessageSequence(lead) {
    try {
        // Verificar teléfono
        if (!lead.phone) {
            this.log(`⚠️ Lead ${lead.name} no tiene teléfono`, 'warn', null, lead.id);
            await this.updateLeadStatus(lead.id, 'not_interested', lead.name);
            return { success: false, reason: 'no_phone' };
        }

        // Validar y formatear número
        const phoneValidation = await this.validateAndFormatPhone(lead.phone);
        if (!phoneValidation.valid) {
            this.log(`⚠️ Número inválido: ${lead.phone}`, 'warn', null, lead.id);
            await this.updateLeadStatus(lead.id, 'not_interested', lead.name);
            return { success: false, reason: 'invalid_phone' };
        }

        const phoneNumber = phoneValidation.formatted;
        const whatsappFormat = phoneValidation.whatsappFormat;

        // ✅ VERIFICACIÓN RÁPIDA CON quickVerify() (NO envía mensajes)
        console.log(`🔍 Verificando WhatsApp para ${phoneNumber}...`);
        const quickCheck = await this.whatsappChecker.quickVerify(whatsappFormat);

        if (!quickCheck.valid) {
            this.log(`❌ ${phoneNumber} NO tiene WhatsApp registrado`, 'warn', null, lead.id);
            this.statsTracker.trackLead(lead, 'invalid', { method: 'quick_verify' });
            await this.updateLeadStatus(lead.id, 'not_interested', lead.name);
            return { success: false, reason: 'no_whatsapp' };
        }

        if (quickCheck.hasConversation) {
            this.log(`⚠️ Conversación previa detectada con ${phoneNumber}`, 'warn', null, lead.id);
            this.statsTracker.trackLead(lead, 'existing_conversation', { method: 'quick_verify' });
            await this.updateLeadStatus(lead.id, 'contacted', lead.name);
            return { success: false, reason: 'already_contacted' };
        }

        console.log(`✅ WhatsApp válido para ${phoneNumber}`);

        // ✅ GENERAR 4 MENSAJES CON IA
        console.log(`🤖 Generando secuencia personalizada con IA para ${lead.name}...`);
        const messages = await this.aiGenerator.generatePersonalizedSequence(lead);

        console.log(`✅ ${messages.length} mensajes generados con IA`);
        console.log(`📝 Preview Msg 1: ${messages[0]substring(0, 50)}...`);

    // ✅ ENVIAR SECUENCIA CON HUMAN BEHAVIOR
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      
      // Verificar si el simulador sugiere un break
      const breakInfo = this.behaviorSimulator.shouldTakeBreak();
      if (breakInfo) {
        console.log(`🛑 ${ breakInfo.type }: ${ breakInfo.reason } (${ breakInfo.duration / 1000 / 60 }min)`);
        await this.sleep(breakInfo.duration);
      }

      try {
        // Simular tiempo de lectura (solo del mensaje anterior si existe)
        if (i > 0) {
          const readingTime = this.behaviorSimulator.getReadingTime(messages[i-1]);
          console.log(`📖 Leyendo mensaje anterior(${(readingTime / 1000).toFixed(1)}s)...`);
          await this.sleep(readingTime);
        }

        // Simular typing con velocidad realista
        const typingTime = this.behaviorSimulator.getTypingTime(message);
        console.log(`⌨️ Escribiendo mensaje ${ i + 1 } (${ (typingTime / 1000).toFixed(1) }s)...`);
        
        // Mostrar indicador "escribiendo..." en WhatsApp
        await this.client.sendStateTyping(whatsappFormat);
        await this.sleep(typingTime);
        await this.client.sendStateTyping(whatsappFormat, false);

        // Enviar mensaje
        const sentMessage = await this.client.sendMessage(whatsappFormat, message);
        console.log(`✅ Mensaje ${ i + 1 }/4 enviado a ${lead.name}`);

// Guardar en BD con metadata de IA
try {
    await axios.post(`${this.backendUrl}/messages`, {
        leadId: lead.id,
        leadName: lead.name,
        phone: lead.phone,
        messageNumber: i + 1,
        content: message,
        type: 'ai_generated',
        status: 'sent',
        sentAt: new Date(),
        whatsappMessageId: sentMessage.id._serialized,
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
} catch (error) {
    console.error('Error guardando mensaje en BD:', error.message);
}

// Delay entre mensajes con rate limiter
if (i < messages.length - 1) {
    const delay = this.rateLimiter.getMessageDelay();
    console.log(`⏱️ Pausa humana: ${(delay / 1000).toFixed(1)}s para próximo mensaje...`);
    await this.sleep(delay);
}

      } catch (error) {
    console.error(`❌ Error enviando mensaje ${i + 1}:`, error.message);
    // Continuar con el siguiente mensaje si falla uno
    if (i < messages.length - 1) {
        console.log(`⏩ Intentando siguiente mensaje...`);
        continue;
    } else {
        break;
    }
}
    }

// ✅ REGISTRAR EN RATE LIMITER
await this.rateLimiter.recordLead(lead.id, messages.length, true);
this.statsTracker.trackLead(lead, 'contacted', { messagesSent: messages.length, method: 'ai_generated' });

// Marcar como contactado
await this.updateLeadStatus(lead.id, 'contacted', lead.name);
console.log(`✅ Secuencia completa para ${lead.name} (${messages.length} mensajes)`);

// Mostrar stats del rate limiter
const stats = await this.rateLimiter.getStats();
console.log(`📊 Hoy: ${stats.today.leads} leads, ${stats.today.messages} mensajes | Límite: ${stats.currentLimit} leads/día`);

return { success: true, messagesSent: messages.length };

  } catch (error) {
    this.log(`❌ Error en secuencia: ${error.message}`, 'error', null, lead.id);
    await this.updateLeadStatus(lead.id, 'contacted', lead.name);
    return { success: false, reason: 'error', error: error.message };
}
}
