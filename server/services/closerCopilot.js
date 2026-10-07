/**
 * 🤝 AGENTE 5: COPILOTO DE CIERRE & ASISTENTE EN VIVO (CLOSER COPILOT)
 * 
 * Analiza en tiempo real las respuestas de los prospectos en el chat de WhatsApp,
 * clasifica su intención de compra y genera una respuesta sugerida ultra-personalizada
 * lista para enviar con 1 clic por el operador humano.
 */

async function postJson(url, data, headers, timeoutMs = 8000) {
    if (typeof fetch === 'function') {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...headers },
                body: JSON.stringify(data),
                signal: controller.signal
            });
            clearTimeout(timer);
            return await res.json();
        } catch (e) {
            clearTimeout(timer);
            throw e;
        }
    }
    const axios = require('axios');
    const res = await axios.post(url, data, { headers, timeout: timeoutMs });
    return res.data;
}

class CloserCopilot {
    constructor() {
        this.apiKey = process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY || '';
        this.model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    }

    /**
     * Analiza el historial de chat y genera la recomendación para el operador
     * @param {Object} lead - Datos del lead y su dossier
     * @param {Array} messages - Historial de mensajes de la conversación
     * @returns {Promise<Object>} Sugerencia estructurada
     */
    async generateSuggestion(lead, messages = []) {
        const cleanName = (lead?.name || '').split('|')[0].trim() || 'cliente';
        const dossier = lead?.dossier || {};
        const incomingMessages = messages.filter(m => !m.fromMe && m.content && m.content.trim());

        if (incomingMessages.length === 0) {
            return {
                hasIncoming: false,
                intent: 'sin_respuesta',
                intentLabel: 'Sin respuesta del cliente',
                confidence: 1.0,
                suggestedReply: '',
                rationale: 'El cliente aún no ha respondido a la prospección.'
            };
        }

        const lastMessage = incomingMessages[incomingMessages.length - 1].content.trim();
        const lastMessageLower = lastMessage.toLowerCase();

        // 1. Intentar análisis con LLM si hay API Key disponible
        if (this.apiKey) {
            try {
                const aiResult = await this.analyzeWithLLM(lead, cleanName, dossier, messages, lastMessage);
                if (aiResult && aiResult.suggestedReply) {
                    return {
                        hasIncoming: true,
                        lastCustomerMessage: lastMessage,
                        ...aiResult
                    };
                }
            } catch (err) {
                console.warn(`⚠️ [CloserCopilot] Falló inferencia IA para ${cleanName}: ${err.message}. Usando motor heurístico.`);
            }
        }

        // 2. Motor Heurístico de Alta Precisión (Fallback Instantáneo)
        return this.analyzeWithHeuristics(lead, cleanName, dossier, lastMessageLower, lastMessage);
    }

    /**
     * Inferencia rápida con LLM (gpt-4o-mini)
     */
    async analyzeWithLLM(lead, cleanName, dossier, messages, lastMessage) {
        const historyText = messages.slice(-6).map(m => {
            const sender = m.fromMe ? 'Juan Cruz (Nexte)' : cleanName;
            return `${sender}: "${m.content}"`;
        }).join('\n');

        const prompt = `
Eres Juan Cruz, asesor comercial senior en Nexte (software, sistemas a medida y páginas web en Argentina).
Un cliente acaba de responder a tu secuencia de prospección en WhatsApp.
Tu misión es clasificar su intención y redactar la respuesta perfecta para continuar la conversación y avanzar hacia una demo o llamada de cierre.

DATOS DEL CLIENTE:
- Nombre: ${cleanName}
- Rubro: ${lead.category || 'Comercio/Servicios'}
- Dolor auditado: ${dossier.primaryPain || 'Gestión y captación digital'}
- Servicio recomendado: ${dossier.targetServiceLabel || 'Software a medida / Web'}
- Propuesta económica de referencia: ${dossier.suggestedOffer || 'Promo especial en cuotas'}

HISTORIAL RECIENTE DEL CHAT:
${historyText}

ÚLTIMO MENSAJE DEL CLIENTE:
"${lastMessage}"

CLASIFICACIONES POSIBLES:
- "interes_alto": Quiere saber más, le interesó la propuesta o pide detalles.
- "pregunta_precio": Pregunta costos, formas de pago o promociones.
- "pide_portfolio": Pide ver ejemplos, sitios web hechos o referencias.
- "duda_tecnica": Pregunta sobre cómo se instala, compatibilidad o cómo funciona.
- "agendar_llamada": Propone hablar por teléfono, llamada o pasar a coordinar día/hora.
- "objecion": Plantea que es caro, que no tiene tiempo o que ya tiene programador.
- "rechazo": Dice "no gracias", "no me interesa", pide no recibir más mensajes.

REGLAS DE RESPUESTA:
1. Tono argentino fluido, profesional, cálido y conciso ("vos", "te comento", "un abrazo").
2. No seas insistente si rechaza. Si tiene interés, ofrece enviar ejemplos o coordinar una breve llamada de 5 minutos.
3. Máximo 45 palabras.

Devuelve ÚNICAMENTE un JSON válido con esta estructura:
{
  "intent": "interes_alto | pregunta_precio | pide_portfolio | duda_tecnica | agendar_llamada | objecion | rechazo",
  "intentLabel": "Etiqueta visual corta en español",
  "confidence": 0.95,
  "suggestedReply": "Texto exacto de la respuesta para el cliente",
  "rationale": "Por qué se sugiere esta respuesta (1 renglón para el operador)"
}
`;

        const response = await postJson('https://api.openai.com/v1/chat/completions', {
            model: this.model,
            messages: [
                { role: 'system', content: 'Eres un copiloto comercial B2B experto en WhatsApp ventas en Argentina. Devuelves exclusivamente JSON puro.' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.3,
            max_tokens: 400
        }, {
            'Authorization': `Bearer ${this.apiKey}`
        }, 6000);

        const raw = response?.choices?.[0]?.message?.content || '';
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) {
            return JSON.parse(match[0]);
        }
        throw new Error('Respuesta inválida de IA');
    }

    /**
     * Motor Heurístico Determinístico
     */
    analyzeWithHeuristics(lead, cleanName, dossier, lastLower, originalMessage) {
        let intent = 'interes_alto';
        let intentLabel = 'Interés en la Propuesta';
        let suggestedReply = `¡Hola! Me alegro que te interese. Justamente para ${cleanName} podemos armar algo súper enfocado a su escala. ¿Te parece si te comparto un par de ejemplos de cómo lo implementamos o preferís que coordinemos una breve charla de 5 minutos?`;
        let rationale = 'El cliente muestra apertura o responde positivamente; se ofrece mostrar trabajos o llamada corta.';

        // 1. Rechazo explícito
        if (/no\s*(gracias|me interesa|quiero|mande|moleste)|deja|basta|spam|borrame|sacame/i.test(lastLower)) {
            intent = 'rechazo';
            intentLabel = 'Rechazo / No Interesado';
            suggestedReply = 'Entendido, disculpá la molestia. Te dejo un saludo cordial y que tengas un excelente día.';
            rationale = 'El cliente no desea continuar; respuesta cortés de cierre sin insistencia.';
        }
        // 2. Pregunta de Precios / Costos
        else if (/cuanto\s*(sale|cuesta)|precio|costo|presupuesto|valor|cuotas|promo/i.test(lastLower)) {
            intent = 'pregunta_precio';
            intentLabel = 'Consulta de Precios & Financiación';
            const offerText = dossier.suggestedOffer || 'Tenemos promociones con facilidades en 2 pagos según los módulos que necesiten';
            suggestedReply = `Te comento: para ${cleanName}, ${offerText}. Además nos adaptamos según lo que requieras ahora. ¿Querés que te pase el detalle de los módulos o prefieren ver una demo en vivo primero?`;
            rationale = 'El cliente consulta valores; se transparenta la propuesta y se ofrece demo.';
        }
        // 3. Pide Portfolio / Trabajos Realizados
        else if (/portfolio|ejemplo|ejemplos|mostrame|ver\s*(algo|trabajo|paginas|webs)|referencia/i.test(lastLower)) {
            intent = 'pide_portfolio';
            intentLabel = 'Pide Portfolio / Casos de Éxito';
            suggestedReply = `¡Claro que sí! Con gusto te paso algunos casos reales de plataformas y sistemas que desarrollamos para otros negocios de tu rubro. ¿Preferís que te envíe los links directos por acá o te muestro un video breve de 1 minuto?`;
            rationale = 'El cliente pide referencias; respuesta rápida con apertura para enviar links.';
        }
        // 4. Coordinar Llamada / Contacto Directo
        else if (/llamame|llamar|hablemos|telefono|reunion|zoom|mañana|horario|cuando\s*podemos/i.test(lastLower)) {
            intent = 'agendar_llamada';
            intentLabel = 'Coordinar Llamada / Demo';
            suggestedReply = `¡Excelente! ¿Qué día y horario te queda más cómodo para una breve llamada de 5 a 10 minutos? Así te muestro en vivo cómo quedaría funcionando para ${cleanName}.`;
            rationale = 'El cliente propone llamada; facilitamos agenda inmediata.';
        }
        // 5. Saludo simple
        else if (/^(hola|buenas|buen dia|buenas tardes|que tal|como andas)[\s\.,!]*$/i.test(lastLower)) {
            intent = 'saludo';
            intentLabel = 'Saludo / Apertura';
            suggestedReply = `¡Hola! ¿Cómo estás? Te escribía por lo que te comenté sobre ${dossier.primaryPain || 'la digitalización y software para tu negocio'}. ¿Pudiste ver la propuesta que te compartí más arriba?`;
            rationale = 'El cliente saludó; retomamos la conversación amablemente.';
        }

        return {
            hasIncoming: true,
            lastCustomerMessage: originalMessage,
            intent,
            intentLabel,
            confidence: 0.85,
            suggestedReply,
            rationale
        };
    }
}

const defaultCopilot = new CloserCopilot();

module.exports = {
    CloserCopilot,
    closerCopilot: defaultCopilot
};
