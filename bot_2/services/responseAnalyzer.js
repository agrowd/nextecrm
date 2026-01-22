const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Response Analyzer
 * Analiza respuestas de clientes para detectar rechazo y responder apropiadamente
 * 
 * Objetivo: Si cliente dice "NO" después de mensajes 1-2, disculparse y retirarse
 */
class ResponseAnalyzer {
    constructor() {
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        this.model = this.genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            generationConfig: {
                temperature: 0.6,
                topP: 0.9,
                maxOutputTokens: 200
            }
        });

        // Patrones de respuestas automáticas (ignorar)
        this.autoResponsePatterns = [
            /gracias por.*mensaje/i,
            /thanks for.*message/i,
            /actualmente.*no.*disponible/i,
            /currently.*unavailable/i,
            /responderemos.*pronto/i,
            /get back to you/i,
            /fuera de.*oficina/i,
            /out of.*office/i
        ];
    }

    /**
     * Analizar si la respuesta es un rechazo
     */
    async isRejection(message) {
        console.log(`🔍 Analizando respuesta del cliente...`);

        // 1. Verificar si es respuesta automática
        for (const pattern of this.autoResponsePatterns) {
            if (pattern.test(message)) {
                console.log('⚙️ Respuesta automática - Ignorar');
                return { isRejection: false, isAutoResponse: true, shouldRespond: false };
            }
        }

        // 2. Detección simple primero
        const simpleCheck = this.simpleRejectionCheck(message);
        if (simpleCheck.confidence > 0.8) {
            return simpleCheck;
        }

        // 3. Análisis con IA para casos ambiguos
        const prompt = `
Analiza esta respuesta de un cliente potencial:

Mensaje: "${message}"

¿Es un RECHAZO claro? (quiere que dejes de escribirle)

Ejemplos de RECHAZO:
- "No me interesa"
- "Borrá mi número"
- "No molestes"
- "Dejá de escribirme"
- "No necesito"
- "Ya tengo"
- "No gracias"

Ejemplos de NO RECHAZO (interés o neutro):
- "Interesante"
- "Contame más"
- "¿Cuánto sale?"
- "Después te aviso"
- "Lo voy a pensar"
- "Ok" (neutro, no es rechazo activo)

Responde JSON:
{
  "isRejection": true/false,
  "confidence": 0.0-1.0,
  "reason": "breve explicación"
}
`;

        try {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text().trim();

            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const analysis = JSON.parse(jsonMatch[0]);

                console.log(`${analysis.isRejection ? '❌' : '✅'} Rechazo: ${analysis.isRejection} (${(analysis.confidence * 100).toFixed(0)}%)`);
                console.log(`📝 ${analysis.reason}`);

                return {
                    isRejection: analysis.isRejection,
                    confidence: analysis.confidence,
                    shouldRespond: analysis.isRejection, // Solo responder si es rechazo
                    reason: analysis.reason
                };
            }
        } catch (error) {
            console.error('Error analizando respuesta:', error.message);
        }

        // Fallback a detección simple
        return simpleCheck;
    }

    /**
     * Detección simple de rechazo por keywords
     */
    simpleRejectionCheck(message) {
        const msg = message.toLowerCase();

        // PRIMERO: Detectar INTERÉS (tiene prioridad sobre rechazo)
        // Si alguien dice "no tranki si me interesa" es INTERÉS, no rechazo
        if (msg.match(/me interesa|interesado|quiero|manda|pasame|info|cuanto|precio|charlemos|hablemos|contame|llamame|escribime/)) {
            console.log(`✅ INTERÉS detectado en: "${msg.substring(0, 50)}..."`);
            return {
                isRejection: false,
                isInterest: true,
                confidence: 0.9,
                shouldRespond: false,
                reason: 'Interés detectado'
            };
        }

        // Rechazo CLARO (solo si NO hay interés)
        if (msg.match(/no.*interesa|borra.*número|no me escribas|deja.*escribir|spam|molest|sacame|eliminame|bloqueado/)) {
            return {
                isRejection: true,
                confidence: 0.95,
                shouldRespond: true,
                reason: 'Rechazo explícito detectado'
            };
        }

        // "No gracias" o variantes (sin interés)
        if (msg.match(/no gracias|no.*necesito|ya tengo web|no me sirve|tengo diseñador/)) {
            return {
                isRejection: true,
                confidence: 0.85,
                shouldRespond: true,
                reason: 'Rechazo educado'
            };
        }

        // NO es rechazo
        return {
            isRejection: false,
            confidence: 0.7,
            shouldRespond: false,
            reason: 'No se detectó rechazo claro'
        };
    }

    /**
     * Generar respuesta de disculpa profesional
     */
    async generateApology(leadName) {
        const apologies = [
            `Entendido, disculpá la molestia ${leadName}. Te saco de la lista. Éxitos!`,
            `Ok, sin problema. Perdón por la interrupción. Te deseo lo mejor!`,
            `Perfecto, entiendo. Disculpas por el contacto. Que te vaya muy bien!`,
            `Dale, sin drama. Borro el número y no molesto más. Suerte con todo!`,
            `Listo, te saco. Perdón si no era el momento. Éxitos con el consultorio!`
        ];

        // Seleccionar aleatoriamente
        return apologies[Math.floor(Math.random() * apologies.length)];
    }

    /**
     * Verificar si es una respuesta automática del negocio
     */
    isAutoResponse(message) {
        const msg = message.toLowerCase();

        // Patrones típicos de mensajes automáticos de WhatsApp Business
        const autoPatterns = [
            /gracias por comunicarte/i,
            /te responderemos a la brevedad/i,
            /nuestro horario de atenci[óo]n/i,
            /en este momento no podemos/i,
            /dejanos tu consulta/i,
            /bienvenido a/i,
            /este es un mensaje autom[áa]tico/i,
            /men[úu] principal/i,
            /marqu?e [0-9] para/i,
            /horarios?:/i,
            /nos encontramos en/i
        ];

        const isAuto = autoPatterns.some(pattern => msg.match(pattern));

        // 🚨 CASO ESPECIAL: "Hola" a secas (Respuesta automática muy corta)
        // El usuario reportó que su auto-reply solo dice "Hola"
        if (!isAuto && msg.length < 10 && msg.match(/^(hola|buen d[ií]a)/)) {
            return {
                isAutoResponse: true,
                reason: 'Short greeting considered auto-reply'
            };
        }

        if (isAuto) {
            return {
                isAutoResponse: true,
                reason: 'Auto-reply pattern matched'
            };
        }

        return { isAutoResponse: false };
    }

    /**
     * Verificar si es respuesta positiva/interesada
     */
    isInterested(message) {
        const msg = message.toLowerCase();

        // Señales de interés alto
        if (msg.match(/sí|si(?!\w)|dale|interesa|cuanto|cuesta|precio|info|contame|más detalles|cómo funciona/)) {
            return {
                isInterested: true,
                level: 'HIGH',
                shouldNotify: true // Notificar al usuario para que cierre manualmente
            };
        }

        // Interés medio
        if (msg.match(/interesante|puede ser|veo|después|tal vez|quizás/)) {
            return {
                isInterested: true,
                level: 'MEDIUM',
                shouldNotify: true
            };
        }

        return {
            isInterested: false,
            level: 'LOW',
            shouldNotify: false
        };
    }
}

module.exports = ResponseAnalyzer;
