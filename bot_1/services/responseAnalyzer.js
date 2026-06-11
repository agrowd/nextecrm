const axios = require('axios');
const AIHelper = require('./aiHelper');

/**
 * Response Analyzer
 * Analiza respuestas de clientes para detectar rechazo y responder apropiadamente
 */
class ResponseAnalyzer {
    constructor() {
        this.apiKey = process.env.OPENAI_API_KEY;
        this.model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

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
        console.log(`🔍 Analizando rechazo con IA...`);

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
            const text = await AIHelper.generate(prompt, 'Eres un analizador de sentimientos en español. Responde estrictamente en formato JSON.', true);
            if (text) {
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
            }
        } catch (error) {
            console.log('⚠️ Análisis IA no disponible, usando detección por palabras clave. Detalle: ' + error.message);
        }

        // Fallback a detección simple
        return simpleCheck;
    }

    /**
     * Analizar respuesta de forma consolidada e inteligente (Paso 1, 2, 3 de intención + generación de respuesta)
     */
    async analyzeIncomingMessage(message, leadName, leadCategory) {
        console.log(`🔍 Iniciando análisis consolidado de respuesta de "${leadName}" con IA...`);
        const simpleCheck = this.simpleRejectionCheck(message);
        
        // 1. Filtrar si es una autorespuesta conocida
        const autoCheck = this.isAutoResponse(message);
        if (autoCheck.isAutoResponse) {
            return {
                intent: 'auto_reply',
                confidence: 1.0,
                reason: autoCheck.reason,
                reply: null,
                shouldRespond: false
            };
        }

        const systemPrompt = `Eres Juan Cruz, un agente de ventas y marketing de Nexte Marketing (más de 10 años de trayectoria, operando en Argentina y 4 países más).
Tu objetivo es vender servicios digitales (diseño web profesional por $150.000, publicidad en Google/Meta Ads, bots de WhatsApp con IA, software a medida).
El cliente potencial (${leadName}), del rubro "${leadCategory}", respondió a nuestro mensaje de prospección en frío con este mensaje:
"${message}"

Analiza el mensaje y determina la intención y el sentimiento:
- "rejection": No le interesa de forma neutra o educada ("No, gracias", "No me interesa", "Ya tengo web").
- "anger": Está enojado, acusa de spam o pregunta hostilmente cómo obtuvimos su número ("Cómo conseguiste mi número?", "No molestes", "Denunciado").
- "interest": Muestra interés directo o quiere saber más ("Me interesa", "Contame más", "Contame de qué se trata").
- "question": Tiene preguntas específicas sobre precios, servicios o pide una llamada ("Cuánto sale?", "¿Qué incluye?", "Llamame").
- "neutral": Mensaje ambiguo, saludo corto o no clasificado ("Ok", "Hola").

Genera una respuesta en español rioplatense (cercano, amigable y muy profesional, usando "vos" y "che" con sutileza y de forma natural, sin sonar exagerado).
Reglas de la respuesta:
1. Si es "rejection" o "anger": Pide disculpas cordialmente por la molestia, confirma que lo removerás de la lista y desea éxitos. Corto (max 20 palabras).
2. Si es "interest" o "question": Responde de forma clara y concisa a su duda o consulta. Ofrece una breve llamada de 5 minutos o proponer coordinar por WhatsApp para ver ejemplos de nuestro portfolio de webs reales. Sé servicial y empático. Max 45 palabras.
3. Si es "neutral": Pregunta amablemente si le gustaría ver nuestro portfolio de páginas web de ejemplo para su rubro.

Responde estrictamente en formato JSON con la siguiente estructura de ejemplo:
{
  "intent": "rejection" | "anger" | "interest" | "question" | "neutral",
  "confidence": 0.0-1.0,
  "reason": "Explicación del análisis",
  "reply": "Respuesta generada para enviar al cliente",
  "shouldRespond": true
}
`;

        try {
            const resText = await AIHelper.generate("Analiza la respuesta del cliente.", systemPrompt, true);
            const jsonMatch = resText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const analysis = JSON.parse(jsonMatch[0]);
                return {
                    intent: analysis.intent,
                    confidence: analysis.confidence || 0.9,
                    reason: analysis.reason || '',
                    reply: analysis.reply || null,
                    shouldRespond: analysis.intent !== 'neutral' ? true : (analysis.shouldRespond !== false)
                };
            }
        } catch (err) {
            console.error('[AI-ANALYSIS] Error en análisis IA de entrada, usando parser por reglas:', err.message);
        }

        // Fallback a parser de reglas si la IA falla
        const isInterest = simpleCheck.isInterest;
        let intent = 'neutral';
        let reply = null;
        let shouldRespond = false;

        if (simpleCheck.isRejection) {
            intent = 'rejection';
            reply = await this.generateApology(leadName);
            shouldRespond = true;
        } else if (isInterest) {
            intent = 'interest';
            reply = "¡Buenísimo! ¿Te gustaría que te pase algunos ejemplos de páginas web de tu rubro que ya diseñamos?";
            shouldRespond = true;
        }

        return {
            intent,
            confidence: simpleCheck.confidence,
            reason: simpleCheck.reason,
            reply,
            shouldRespond
        };
    }

    /**
     * Detección simple de rechazo por keywords
     */
    simpleRejectionCheck(message) {
        const msg = message.toLowerCase();

        // ─── PASO 0: Detectar NEGACIÓN + palabras positivas ───
        const negationPatterns = /\bno\b.*\b(interesa|interesado|interesados|quiero|queremos|necesito|necesitamos)\b/;
        if (msg.match(negationPatterns)) {
            console.log(`❌ RECHAZO con negación detectado en: "${msg.substring(0, 60)}..."`);
            return {
                isRejection: true,
                confidence: 0.95,
                shouldRespond: true,
                reason: 'Rechazo con negación explícita (no + palabra positiva)'
            };
        }

        // ─── PASO 1: Rechazo CLARO ───
        if (msg.match(/borra.*n[úu]mero|no me escribas|deja.*escribir|spam|molest|sacame|eliminame|bloqueado|borranos|no molesten/)) {
            return {
                isRejection: true,
                confidence: 0.95,
                shouldRespond: true,
                reason: 'Rechazo explícito detectado'
            };
        }

        // ─── PASO 2: "No gracias" o variantes ───
        if (msg.match(/no gracias|no.*necesito|ya tengo web|no me sirve|tengo diseñador|no estamos buscando|no por ahora/)) {
            return {
                isRejection: true,
                confidence: 0.85,
                shouldRespond: true,
                reason: 'Rechazo educado'
            };
        }

        // ─── PASO 3: Detectar INTERÉS genuino ───
        if (msg.match(/\bme interesa\b|\bsí.*interesa|\bsi.*interesa|quiero.*info|manda|pasame|charlemos|hablemos|contame|llamame|escribime/)) {
            console.log(`✅ INTERÉS detectado en: "${msg.substring(0, 50)}..."`);
            return {
                isRejection: false,
                isInterest: true,
                confidence: 0.9,
                shouldRespond: false,
                reason: 'Interés genuino detectado'
            };
        }

        // ─── PASO 4: Palabras sueltas de interés ───
        if (msg.match(/\bcuanto\b|\bprecio\b|\binfo\b|\bcotización\b|\bpresupuesto\b/)) {
            return {
                isRejection: false,
                isInterest: true,
                confidence: 0.8,
                shouldRespond: false,
                reason: 'Consulta de precio/info detectada'
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

        return apologies[Math.floor(Math.random() * apologies.length)];
    }

    /**
     * Verificar si es una respuesta automática del negocio
     */
    isAutoResponse(message) {
        const msg = message.toLowerCase();

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

        if (msg.match(/sí|si(?!\w)|dale|interesa|cuanto|cuesta|precio|info|contame|más detalles|cómo funciona/)) {
            return {
                isInterested: true,
                level: 'HIGH',
                shouldNotify: true
            };
        }

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
