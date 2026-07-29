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
     * Analizar respuesta de forma consolidada e inteligente (Paso 1, 2, 3 de intención + medición de enojo/interés)
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
                angerScore: 0,
                interestScore: 0,
                reason: autoCheck.reason,
                reply: null,
                shouldRespond: false
            };
        }

        const systemPrompt = `Eres Juan Cruz, director de Nexte Marketing (más de 10 años de trayectoria ayudando a negocios con software a medida, IA NatoH, sitios web y SEO local).
El cliente potencial (${leadName}), del rubro "${leadCategory}", respondió a nuestro mensaje de prospección en frío con este texto:
"${message}"

Analiza el mensaje detenidamente y calcula las siguientes métricas:
1. "intent": 
   - "rejection": No le interesa de forma educada ("No gracias", "Ya tenemos web", "Por ahora no").
   - "anger": Está enojado, molesto, o pregunta agresivamente cómo conseguimos su número ("Borrá mi número", "Dejá de joder", "Quién te dio mi número?", "Spam").
   - "interest": Muestra interés directo en conocer más, contratar o ver ejemplos ("Me interesa", "Pasame info", "De qué se trata?", "Mandame ejemplos").
   - "question": Pregunta por costos, reuniones, o detalles específicos ("Cuánto sale?", "Tienen turno?", "Hacen x servicio?").
   - "neutral": Respuesta ambigua o corta ("Ok", "Hola", "Buenas").

2. "angerScore": Puntuación del 0 al 10 sobre qué tan enojado o molesto está el lead (0 = nada enojado, 10 = furioso/amenaza con denunciar).
3. "interestScore": Puntuación del 0 al 10 sobre qué tanto le gustó la propuesta o qué tan interesado está (0 = nada interesado, 10 = listo para comprar/agendar).

4. "reply": Genera la respuesta adecuada en español argentino profesional:
   - SI ESTÁ ENOJADO O RECHAZA ("anger" / "rejection" o angerScore >= 4): Genera una disculpa educada y servicial según su nivel de enojo. Si el enojo es alto (angerScore >= 7), di algo como: "Disculpá la molestia. Te pido mil disculpas por la interrupción. Ya agendamos tu número para no volver a enviarte ninguna información. ¡Saludos y éxitos!". Si el rechazo es bajo: "Entendido, disculpá la molestia. Ya registramos tu número para no escribirte más. ¡Que tengas un excelente día!".
   - SI MUESTRA INTERÉS O PREGUNTA ("interest" / "question" o interestScore >= 5): Di que un asesor especializado se comunicará con él a la brevedad para asesorarlo personalmente y mostrarle los trabajos realizados. Ej: "¡Buenísimo! Ya le pasé tu contacto a un asesor especializado de Nexte para que se comunique con vos a la brevedad y te envíe todos los ejemplos y detalles. ¡Muchas gracias!".
   - SI ES NEUTRAL: Ofrece amablemente enviarle ejemplos de nuestro portafolio de clientes de su rubro.

Responde estrictamente en formato JSON válido con la siguiente estructura:
{
  "intent": "rejection" | "anger" | "interest" | "question" | "neutral",
  "confidence": 0.0-1.0,
  "angerScore": 0-10,
  "interestScore": 0-10,
  "reason": "Explicación del análisis",
  "reply": "Texto de la respuesta final a enviar por WhatsApp",
  "shouldRespond": true
}
`;

        try {
            const resText = await AIHelper.generate("Analiza la respuesta del cliente.", systemPrompt, true);
            const jsonMatch = resText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const analysis = JSON.parse(jsonMatch[0]);
                return {
                    intent: analysis.intent || 'neutral',
                    confidence: analysis.confidence || 0.9,
                    angerScore: typeof analysis.angerScore === 'number' ? analysis.angerScore : (analysis.intent === 'anger' ? 8 : 0),
                    interestScore: typeof analysis.interestScore === 'number' ? analysis.interestScore : (analysis.intent === 'interest' ? 9 : 0),
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
        let angerScore = 0;
        let interestScore = 0;
        let reply = null;
        let shouldRespond = false;

        if (simpleCheck.isRejection) {
            intent = 'rejection';
            angerScore = simpleCheck.reason.includes('explícito') ? 8 : 4;
            reply = await this.generateApology(leadName);
            shouldRespond = true;
        } else if (isInterest) {
            intent = 'interest';
            interestScore = 8;
            reply = "¡Buenísimo! Ya le avisé a un asesor especializado de Nexte para que se comunique con vos a la brevedad y te pase los ejemplos. ¡Muchas gracias!";
            shouldRespond = true;
        }

        return {
            intent,
            confidence: simpleCheck.confidence,
            angerScore,
            interestScore,
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
