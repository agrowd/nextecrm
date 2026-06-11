const axios = require('axios');

/**
 * Conversation Manager
 * Maneja conversaciones automáticas para evitar que bajen el número y cerrar ventas
 */
class ConversationManager {
    constructor() {
        this.apiKey = process.env.OPENAI_API_KEY;
        this.model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

        // Niveles de interés detectados
        this.interestLevels = {
            VERY_HIGH: 'very_high',
            HIGH: 'high',
            MEDIUM: 'medium',
            LOW: 'low',
            NEGATIVE: 'negative',
            OBJECTION: 'objection'
        };

        // Patrones de respuestas automáticas (para ignorar)
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

        // Estadísticas
        this.stats = {
            responsesAnalyzed: 0,
            interestDetected: {},
            conversionsAttempted: 0,
            closedDeals: 0
        };
    }

    /**
     * Helper para llamar a OpenAI (Completions)
     */
    async generateViaOpenAI(prompt, systemPrompt = '') {
        const apiKey = this.apiKey || process.env.OPENAI_API_KEY;
        if (!apiKey) {
            throw new Error('OPENAI_API_KEY no configurada');
        }

        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: this.model,
            messages: [
                { role: 'system', content: systemPrompt || 'Eres un asistente experto en cierre de ventas y marketing digital en español.' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 300
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });

        const content = response.data?.choices?.[0]?.message?.content;
        if (!content) {
            throw new Error('Invalid response from OpenAI API');
        }
        return content.trim();
    }

    /**
     * Helper para llamar a OpenAI esperando respuesta JSON estructurada
     */
    async generateViaOpenAIJson(prompt, systemPrompt = '') {
        const apiKey = this.apiKey || process.env.OPENAI_API_KEY;
        if (!apiKey) {
            throw new Error('OPENAI_API_KEY no configurada');
        }

        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: this.model,
            messages: [
                { role: 'system', content: systemPrompt || 'Eres un clasificador experto en leads. Responde estrictamente en formato JSON.' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.3,
            max_tokens: 300,
            response_format: { type: "json_object" }
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });

        const content = response.data?.choices?.[0]?.message?.content;
        if (!content) {
            throw new Error('Invalid JSON response from OpenAI API');
        }
        return content.trim();
    }

    /**
     * Detectar nivel de interés en respuesta del cliente
     */
    async detectInterestLevel(message, leadName) {
        console.log(`🔍 Analizando respuesta de ${leadName} con OpenAI...`);

        // 1. Verificar si es respuesta automática
        for (const pattern of this.autoResponsePatterns) {
            if (pattern.test(message)) {
                console.log('⚙️ Respuesta automática detectada - Ignorar');
                return { level: 'AUTO_RESPONSE', confidence: 1.0, shouldRespond: false };
            }
        }

        // 2. Análisis con IA
        const prompt = `
Analiza esta respuesta de un cliente potencial y clasifica su nivel de interés:

Mensaje del cliente: "${message}"

Clasifica en una de estas categorías:

VERY_HIGH: Cliente muy interesado, listo para comprar
- Ejemplos: "Sí, me interesa", "¿Cuánto cuesta?", "¿Cuándo empezamos?", "Pasame tu número"

HIGH: Cliente interesado, necesita más info
- Ejemplos: "Contame más", "¿Qué incluye?", "Mandame info", "¿Cómo funciona?"

MEDIUM: Cliente tibio, considerando
- Ejemplos: "Interesante", "Lo voy a pensar", "Puede ser", "Después te aviso"

OBJECTION: Cliente con objeción específica
- Ejemplos: "Es caro", "No tengo tiempo", "Ya tengo web", "No tengo presupuesto"

LOW: Respuesta vaga o educada pero sin interés
- Ejemplos: "Ok", "Dale", "Gracias", respuestas de 1 palabra

NEGATIVE: Cliente claramente no interesado
- Ejemplos: "No me interesa", "Borrá mi número", "No molestes", "Spam"

Responde en formato JSON:
{
  "level": "NIVEL_DETECTADO",
  "confidence": 0.0-1.0,
  "reason": "breve explicación",
  "keyPhrases": ["frases clave detectadas"],
  "shouldRespond": true/false
}
`;

        try {
            const responseText = await this.generateViaOpenAIJson(prompt, 'Eres un clasificador de interés de leads para CRM. Responde estrictamente en formato JSON.');
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const analysis = JSON.parse(jsonMatch[0]);

                this.stats.responsesAnalyzed++;
                this.stats.interestDetected[analysis.level] =
                    (this.stats.interestDetected[analysis.level] || 0) + 1;

                console.log(`✅ Interés detectado: ${analysis.level} (${(analysis.confidence * 100).toFixed(0)}%)`);
                console.log(`📝 Razón: ${analysis.reason}`);

                return analysis;
            }
        } catch (error) {
            console.error('Error detectando interés con OpenAI:', error.message);
        }

        // Fallback a detección simple por palabras clave
        return this.simpleInterestDetection(message);
    }

    /**
     * Detección simple por keywords (fallback)
     */
    simpleInterestDetection(message) {
        const msg = message.toLowerCase();

        // VERY_HIGH
        if (msg.match(/sí|si|dale|interesa|cuanto|cuesta|precio|empezamos|cuando|contratamos/)) {
            return { level: this.interestLevels.VERY_HIGH, confidence: 0.8, shouldRespond: true };
        }

        // HIGH
        if (msg.match(/contame|info|información|detalles|incluye|funciona|como|más/)) {
            return { level: this.interestLevels.HIGH, confidence: 0.7, shouldRespond: true };
        }

        // OBJECTION
        if (msg.match(/caro|presupuesto|tiempo|ya tengo|no puedo|no necesito/)) {
            return { level: this.interestLevels.OBJECTION, confidence: 0.85, shouldRespond: true };
        }

        // NEGATIVE
        if (msg.match(/no.*interesa|borra|spam|molest|deja|pará|para/)) {
            return { level: this.interestLevels.NEGATIVE, confidence: 0.9, shouldRespond: false };
        }

        // MEDIUM
        if (msg.match(/interesante|puede ser|veo|después|más tarde|pienso/)) {
            return { level: this.interestLevels.MEDIUM, confidence: 0.6, shouldRespond: true };
        }

        // LOW (default)
        return { level: this.interestLevels.LOW, confidence: 0.5, shouldRespond: false };
    }

    /**
     * Generar respuesta contextual según nivel de interés
     */
    async generateContextualResponse(interestAnalysis, leadName, leadData) {
        const { level } = interestAnalysis;

        console.log(`💬 Generando respuesta para nivel: ${level}`);

        let prompt = '';

        switch (level) {
            case this.interestLevels.VERY_HIGH:
                prompt = `
Cliente (${leadName}) está MUY interesado. Responde para CERRAR la venta:

Estrategia:
1. Confirmar interés
2. Ofrecer paso siguiente concreto (reunión, video call, enviar propuesta)
3. Crear sentido de urgencia SIN sonar desesperado
4. Hacer fácil decir "sí"

Escribe respuesta de 25-40 palabras. Tono: profesional pero entusiasta.
`;
                break;

            case this.interestLevels.HIGH:
                prompt = `
Cliente interesado pero necesita más info. Responde con:

Estrategia:
1. Dar info específica solicitada
2. Usar prueba social (caso de éxito similar)
3. Hacer pregunta para seguir conversación

Escribe respuesta de 30-50 palabras. Tono: informativo y consultivo.
`;
                break;

            case this.interestLevels.MEDIUM:
                prompt = `
Cliente tibio. Responde para mantener conversación viva SIN presionar:

Estrategia:
1. Validar su consideración
2. Ofrecer algo de valor GRATIS (audit, consejo)
3. Dejar puerta abierta

Escribe respuesta de 25-35 palabras. Tono: relajado, generoso.
`;
                break;

            case this.interestLevels.OBJECTION:
                prompt = `
Cliente tiene objeción. Manéjala:

Posibles objeciones:
- PRECIO: "Entiendo. $150k dividido en 12 meses = $12.5k/mes. Si conseguís 1 cliente extra/mes, se paga solo. ¿Cuánto vale un cliente nuevo para vos?"
- TIEMPO: "Justamente por eso existe el sistema: automatiza captación. Vos seguís trabajando, el sistema trae leads. 15 min de setup inicial."
- YA TENGO: "Genial que tengas. ¿Te trae 5-10 clientes/mes mínimo? Si no, algo se puede mejorar. Te muestro gratis qué."

Escribe respuesta que maneje la objeción sin ser agresivo. 30-45 palabras.
`;
                break;

            case this.interestLevels.LOW:
                return null;

            case this.interestLevels.NEGATIVE:
                return {
                    message: "Entendido, disculpá la molestia. Te saco de la lista. Éxitos!",
                    shouldUnsubscribe: true
                };

            default:
                return null;
        }

        try {
            const result = await this.generateViaOpenAI(prompt);
            const message = result.replace(/^["']|["']$/g, '');

            return {
                message,
                shouldUnsubscribe: false,
                followUpIn: this.getFollowUpDelay(level)
            };
        } catch (error) {
            console.error('Error generando respuesta con OpenAI:', error.message);
            return null;
        }
    }

    /**
     * Obtener delay para próximo seguimiento según nivel de interés
     */
    getFollowUpDelay(level) {
        switch (level) {
            case this.interestLevels.VERY_HIGH:
                return 4 * 3600 * 1000; // 4 horas
            case this.interestLevels.HIGH:
                return 24 * 3600 * 1000; // 1 día
            case this.interestLevels.MEDIUM:
                return 3 * 24 * 3600 * 1000; // 3 días
            case this.interestLevels.OBJECTION:
                return 2 * 24 * 3600 * 1000; // 2 días
            default:
                return 7 * 24 * 3600 * 1000; // 1 semana
        }
    }

    /**
     * Secuencia de seguimiento automático (si no responden)
     */
    getFollowUpSequence(daysWithoutResponse) {
        const sequences = [
            {
                day: 2,
                message: "Hola de nuevo! No sé si viste mi mensaje anterior sobre la web. Te resumo: $250k todo incluido (en 2 pagos), listo en 48hs. ¿Te sirve?"
            },
            {
                day: 4,
                message: "Te hice un análisis rápido: tu competencia directa en Google está captando ~30 clientes/mes que podrían ser tuyos. Te muestro cómo revertirlo?"
            },
            {
                day: 7,
                message: "Última oportunidad: tengo 1 cupo libre esta semana. Después cierro incorporaciones hasta el mes que viene. ¿Lo tomás?"
            },
            {
                day: 14,
                message: "Ok, última: Web $250k + REGALO Google Ads $50k (mes gratis). Solo si confirmás HOY. ¿Dale?"
            }
        ];

        return sequences.find(s => s.day === daysWithoutResponse);
    }

    /**
     * Técnicas de cierre automático
     */
    getClosingTechniques() {
        return {
            assumed: "Perfecto! Arranco mañana con el diseño. ¿Qué 3 servicios principales querés destacar en el inicio?",
            alternative: "Dale! ¿Arrancamos con Web Express ($250k) o preferís el Premium ($500k) con todo?",
            urgency: "Tengo 1 cupo esta semana. Si confirmás en las próximas 2hs, entrás. Después el mes que viene. ¿Dale?",
            investment: "Son $250k UNA VEZ. Si conseguís 2 clientes/mes (conservador), en 6 meses recuperaste la inversión. ¿Arrancamos?",
            guarantee: "Web $250k con garantía: si en 90 días no conseguiste ni 1 cliente, te devuelvo TODO. Riesgo cero. ¿Confirmamos?",
            bonus: "Ok: Web $250k + REGALO estrategia de Google Ads ($80k valor). Solo HOY. ¿Confirmo?"
        };
    }

    /**
     * Determinar mejor técnica de cierre según contexto
     */
    getBestClosingTechnique(leadData, conversationHistory) {
        const techniques = this.getClosingTechniques();

        if (conversationHistory.some(msg => msg.includes('caro') || msg.includes('precio'))) {
            return techniques.investment;
        }

        if (leadData.isPremiumLocation) {
            return techniques.urgency;
        }

        if (conversationHistory.some(msg => msg.includes('no sé') || msg.includes('duda'))) {
            return techniques.guarantee;
        }

        return techniques.alternative;
    }

    getStats() {
        return {
            ...this.stats,
            conversionRate: this.stats.conversionsAttempted > 0 ?
                ((this.stats.closedDeals / this.stats.conversionsAttempted) * 100).toFixed(1) + '%' :
                '0%'
        };
    }
}

module.exports = ConversationManager;
