const axios = require('axios');
const AIHelper = require('./aiHelper');

/**
 * Response Analyzer
 * Analiza respuestas de clientes para detectar rechazo y responder apropiadamente
 */
class ResponseAnalyzer {
    constructor() {
        if (!process.env.OPENAI_API_KEY && !process.env.GEMINI_API_KEY) {
            try {
                const path = require('path');
                require('dotenv').config({ path: path.join(__dirname, '../../../.env') });
                require('dotenv').config({ path: path.join(__dirname, '../../server/.env') });
                require('dotenv').config({ path: path.join(__dirname, '../.env') });
            } catch (e) {}
        }
        this.apiKey = process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY;
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
     * Analizar respuesta de forma consolidada e inteligente:
     * 1) Separa respuestas automáticas de WhatsApp Business y respuestas de OTROS BOTS / Asistentes Virtuales
     * 2) Estudia con ChatGPT los mensajes reales de "No Interesados" (los que responde una persona real DESPUÉS, no instantáneamente)
     */
    async analyzeIncomingMessage(message, leadName, leadCategory, context = {}) {
        const responseDelaySeconds = typeof context.responseDelaySeconds === 'number' ? context.responseDelaySeconds : null;
        const messagesSentCount = typeof context.messagesSentCount === 'number' ? context.messagesSentCount : null;
        console.log(`🔍 Iniciando análisis consolidado de respuesta de "${leadName}" con ChatGPT (delay=${responseDelaySeconds !== null ? responseDelaySeconds + 's' : 'N/A'}, msgsEnviados=${messagesSentCount || 'N/A'})...`);
        const simpleCheck = this.simpleRejectionCheck(message);
        
        // 1. Filtrar si es una autorespuesta de WhatsApp Business o respuesta de OTRO BOT
        const autoCheck = this.isAutoResponse(message, responseDelaySeconds);
        if (autoCheck.isAutoResponse) {
            console.log(`🤖 [FILTRO AUTO-REPLY / OTRO BOT] Ignorando mensaje no humano de "${leadName}": ${autoCheck.reason}`);
            return {
                intent: autoCheck.isOtherBot ? 'other_bot' : 'auto_reply',
                isHumanReply: false,
                isAutomatedOrOtherBot: true,
                confidence: 1.0,
                angerScore: 0,
                interestScore: 0,
                reason: autoCheck.reason,
                rejectionCategory: null,
                rejectionStudy: null,
                reply: null,
                shouldRespond: false
            };
        }

        const delayContextStr = responseDelaySeconds !== null
            ? `Tiempo transcurrido desde nuestro último mensaje saliente hasta esta respuesta: ${responseDelaySeconds} segundos (${(responseDelaySeconds / 60).toFixed(1)} minutos).`
            : 'Tiempo transcurrido: respuesta recibida posteriormente tras la secuencia.';

        const systemPrompt = `Sos el Analista Senior de Inteligencia Comercial B2B de *NatoH Systems*.
El prospecto "${leadName}" (Rubro: "${leadCategory}") respondió a nuestra secuencia de prospección por WhatsApp con este mensaje:
"${message}"

DATOS DE TIMING Y CONTEXTO:
- ${delayContextStr}
- Cantidad de mensajes de nuestra secuencia enviados antes de esta respuesta: ${messagesSentCount || 4} de 4.

TU MISIÓN CRÍTICA TIENE 2 PARTES:

PARTE 1 — DISTINGUIR HUMANO REAL (QUE RESPONDE DESPUÉS) vs. AUTO-RESPUESTA DE WHATSAPP / OTRO BOT:
- Muchos negocios tienen respuestas automáticas de WhatsApp Business (saludos instantáneos, horarios, menús, vCards) o tienen OTRO BOT / Asistente Virtual configurado para atender a sus propios pacientes/clientes (ej: "Hola! Soy Flor de LaserLook, por este canal solo damos turnos", "Te comunicaste con Consultorio X", "¿Necesitás agendar un turno?", "¡Hola! Contamos con varios servicios de masajes...").
- Si el mensaje es una respuesta automática de WhatsApp o es el bot/asistente virtual del negocio tratándonos como si fuéramos un paciente o cliente de su local, clasificá "intent": "other_bot" o "auto_reply" y "isHumanReply": false. ¡NUNCA clasifiques a otro bot como "interest" ni como "rejection"!

PARTE 2 — ESTUDIAR A FONDO LOS MENSAJES REALES DE "NO INTERESADOS" (CUANDO RESPONDE UNA PERSONA REAL DESPUÉS):
- Si es una respuesta escrita por una persona real que leyó nuestros mensajes después y dice que NO está interesada ("No gracias", "Por ahora te agradezco", "Ya tenemos sistema", "Tenemos recepcionista que se encarga de eso", "Recién para el año que viene"):
  1. Clasificá "intent": "rejection" (o "anger" si está molesto/agresivo) y "isHumanReply": true.
  2. Clasificá "rejectionCategory" en UNA de estas 6 categorías exactas:
     - "ya_tiene_sistema_o_web": Dice que ya tiene sistema, software, turnero, agencia o web.
     - "tiene_recepcionista_o_equipo": Dice que ya tiene secretaria/recepcionista/personal que contesta a mano.
     - "postergado_timing_o_presupuesto": Dice "por ahora no", "más adelante", "para el año que viene" o tema de costos.
     - "rechazo_corto_sin_motivo": Dice "No gracias", "No estoy interesado/a", "Te agradezco pero no" sin detallar por qué.
     - "no_es_decisor": Quien atiende el WhatsApp es un empleado/recepción que filtra y no pasa al dueño.
     - "molesto_o_spam": Pide que borren su número o se muestra molesto por el contacto.
  3. Completá "rejectionStudy" (1 a 2 oraciones profundas): estudiá qué revela exactamente esa respuesta humana (qué palabra usó, por qué la propuesta no lo enganchó en ese punto, si sintió que el sistema reemplazaba a su recepcionista, si fue un freno por el precio del Mensaje 3, o si dejó una puerta abierta para el futuro).
  4. Completá "improvementTip" (1 oración accionable): qué deberíamos ajustar o testear en nuestros mensajes para ese rubro para convertir ese "No" en curiosidad (ej: aclarar que el Agente IA ayuda a la recepcionista con los audios y señas fuera de hora sin reemplazarla).

MÉTRICAS ADICIONALES:
- "angerScore": 0 a 10.
- "interestScore": 0 a 10.
- "reply": Respuesta sugerida corta en español argentino (aunque el bot esté en modo solo envío, queda guardada para el CRM).

Respondé ESTRICTAMENTE en JSON válido con esta estructura:
{
  "intent": "rejection" | "anger" | "interest" | "question" | "neutral" | "auto_reply" | "other_bot",
  "isHumanReply": true | false,
  "confidence": 0.0-1.0,
  "angerScore": 0-10,
  "interestScore": 0-10,
  "rejectionCategory": "ya_tiene_sistema_o_web" | "tiene_recepcionista_o_equipo" | "postergado_timing_o_presupuesto" | "rechazo_corto_sin_motivo" | "no_es_decisor" | "molesto_o_spam" | null,
  "reason": "Resumen claro de la intención detectada",
  "rejectionStudy": "Estudio detallado de ChatGPT sobre por qué este humano rechazó o postergó la propuesta (o null si no es rechazo)",
  "improvementTip": "Aprendizaje comercial para mejorar el mensaje en este rubro (o null si no es rechazo)",
  "reply": "Texto de respuesta sugerida",
  "shouldRespond": false
}`;

        try {
            const resText = await AIHelper.generate("Analizá la respuesta entrante distinguiendo humanos reales vs bots/autorespuestas y estudiando a fondo si es un No Interesado.", systemPrompt, true);
            const jsonMatch = resText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const analysis = JSON.parse(jsonMatch[0]);
                const rawIntent = analysis.intent || 'neutral';
                const isBotOrAuto = rawIntent === 'auto_reply' || rawIntent === 'other_bot' || analysis.isHumanReply === false;
                return {
                    intent: rawIntent,
                    isHumanReply: !isBotOrAuto,
                    isAutomatedOrOtherBot: isBotOrAuto,
                    confidence: analysis.confidence || 0.9,
                    angerScore: typeof analysis.angerScore === 'number' ? analysis.angerScore : (rawIntent === 'anger' ? 8 : 0),
                    interestScore: typeof analysis.interestScore === 'number' ? analysis.interestScore : (rawIntent === 'interest' ? 9 : 0),
                    rejectionCategory: analysis.rejectionCategory || (rawIntent === 'rejection' ? 'rechazo_corto_sin_motivo' : null),
                    reason: analysis.reason || '',
                    rejectionStudy: analysis.rejectionStudy || analysis.reason || null,
                    improvementTip: analysis.improvementTip || null,
                    reply: analysis.reply || null,
                    shouldRespond: !isBotOrAuto && rawIntent !== 'neutral' ? true : false
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
        let rejectionCategory = null;

        if (simpleCheck.isRejection) {
            intent = 'rejection';
            angerScore = simpleCheck.reason.includes('explícito') ? 8 : 2;
            rejectionCategory = this.classifyRejectionCategoryHeuristic(message);
            reply = await this.generateApology(leadName);
            shouldRespond = true;
        } else if (isInterest) {
            intent = 'interest';
            interestScore = 8;
            reply = "¡Buenísimo! Ya le avisé a un asesor especializado de NatoH Systems para que se comunique con vos a la brevedad y te pase la demo personalizada.";
            shouldRespond = true;
        }

        return {
            intent,
            isHumanReply: true,
            isAutomatedOrOtherBot: false,
            confidence: simpleCheck.confidence,
            angerScore,
            interestScore,
            rejectionCategory,
            reason: simpleCheck.reason,
            rejectionStudy: simpleCheck.isRejection ? `Rechazo humano detectado (${rejectionCategory}): "${message.slice(0, 100)}"` : null,
            improvementTip: null,
            reply,
            shouldRespond
        };
    }

    classifyRejectionCategoryHeuristic(message = '') {
        const msg = String(message || '').toLowerCase();
        if (/recepcionista|secretaria|emplead|encarga de eso|chica que atiende/.test(msg)) return 'tiene_recepcionista_o_equipo';
        if (/ya tenemos|ya tengo|tenemos sistema|tenemos web|tengo diseñador|otro proveedor/.test(msg)) return 'ya_tiene_sistema_o_web';
        if (/por ahora|mas adelante|más adelante|año que viene|mes que viene|otro momento|no estamos buscando/.test(msg)) return 'postergado_timing_o_presupuesto';
        if (/borra|spam|molest|sacame|eliminame|deja de/.test(msg)) return 'molesto_o_spam';
        return 'rechazo_corto_sin_motivo';
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
     * Verificar si es una respuesta automática de WhatsApp Business o de OTRO BOT / Asistente Virtual
     */
    isAutoResponse(message, responseDelaySeconds = null) {
        if (!message || typeof message !== 'string') {
            return { isAutoResponse: true, isOtherBot: false, reason: 'Empty message' };
        }
        const msg = message.trim();
        const lower = msg.toLowerCase();

        // 0. Mensajes de sistema / archivos adjuntos automáticos / vCards
        if (/^\[archivo:|begin:vcard|e2e_notification|notification_template/i.test(msg)) {
            return {
                isAutoResponse: true,
                isOtherBot: false,
                reason: 'Archivo automático de sistema o vCard de WhatsApp Business'
            };
        }

        // 1. Patrones de OTROS BOTS / Asistentes Virtuales que nos tratan como paciente/cliente de su negocio
        const otherBotPatterns = [
            /soy [a-záéíóú]+ de .*por este canal solo/i,
            /este canal es exclusivo para consultas y turnos/i,
            /en este chat solo ayudamos con info sobre/i,
            /¿?necesit[áa]s agendar un turno\??/i,
            /te comunicaste con /i,
            /voy a acompañarte durante la atenci[óo]n/i,
            /los turnos se reservan solo con seña previa/i,
            /actualmente estoy trabajando [úu]nicamente con servicios/i,
            /contamos con varios servicios de /i,
            /¿?turno est[ée]tica o turno m[ée]dico\??/i
        ];

        if (otherBotPatterns.some(pattern => pattern.test(msg))) {
            return {
                isAutoResponse: true,
                isOtherBot: true,
                reason: 'Respuesta de otro Bot / Asistente Virtual de turnos del comercio'
            };
        }

        // 2. Patrones clásicos de auto-respuesta de WhatsApp Business
        const autoPatterns = [
            /gracias por comunicarte/i,
            /gracias por contactarnos/i,
            /gracias por contactar a/i,
            /gracias por escribirnos/i,
            /te responderemos a la brevedad/i,
            /en breve responder[ée] tu mensaje/i,
            /a la brevedad ser[áa] respondido/i,
            /nuestro horario de atenci[óo]n/i,
            /nuestro horario es de/i,
            /en este momento no podemos responderte/i,
            /en este momento no podemos/i,
            /dejanos tu consulta/i,
            /d[ée]janos tu mensaje/i,
            /bienvenido a/i,
            /este es un mensaje autom[áa]tico/i,
            /men[úu] principal/i,
            /marqu?e [0-9] para/i,
            /nos encontramos en/i,
            /apenas podamos vamos a responder/i
        ];

        if (autoPatterns.some(pattern => pattern.test(msg))) {
            return {
                isAutoResponse: true,
                isOtherBot: false,
                reason: 'Auto-respuesta de bienvenida/ausencia de WhatsApp Business'
            };
        }

        // 3. Si llegó en menos de 18 segundos desde nuestro primer mensaje y tiene más de 80 caracteres (imposible tipeo humano)
        // EXCEPCIÓN: Si expresa explícitamente un rechazo u objeción humana ("tenemos recepcionista que se encarga", "ya tenemos sistema", etc.)
        const hasExplicitHumanRejection = /tenemos recepcionista|se encarga de todo eso|mi jefa|ya tenemos (un )?sistema|no gracias|no estoy interesad|por ahora te agradezco/i.test(msg);
        if (typeof responseDelaySeconds === 'number' && responseDelaySeconds >= 0 && responseDelaySeconds < 18 && msg.length > 80 && !hasExplicitHumanRejection) {
            return {
                isAutoResponse: true,
                isOtherBot: false,
                reason: `Respuesta instantánea (<18s, ${msg.length} chars) — Auto-respuesta de WhatsApp Business`
            };
        }

        return { isAutoResponse: false, isOtherBot: false };
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
