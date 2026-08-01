const axios = require('axios');
const AdvancedTemplateGenerator = require('./advancedTemplateGenerator');

/**
 * AI Text Generator con OpenAI ChatGPT (gpt-4o-mini)
 * 100% compatible y optimizado para velocidad y costo.
 */
class AITextGenerator {
    constructor() {
        this.apiKey = process.env.OPENAI_API_KEY;
        this.model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

        // Cache de mensajes generados
        this.messageCache = new Map();

        // Advanced Template Generator como fuente principal (30+ variantes)
        this.templateGenerator = new AdvancedTemplateGenerator();

        // Plantillas por tipo de negocio
        this.templates = {
            odontologia: {
                context: "Eres Juan Cruz de Nexte Marketing contactando clínicas dentales en Argentina",
                tone: "profesional pero cercano",
                focus: "modernización digital, pack dental 360°, captación de pacientes online, sistema de turnos a medida",
                keywords: ["consultorio", "pacientes", "turnos", "odontología"],
                softwareNeed: "high"
            },
            belleza: {
                context: "Eres Juan Cruz de Nexte Marketing contactando salones de belleza y estética",
                tone: "creativo y moderno",
                focus: "presencia online, redes sociales, marketing de belleza, sistema de reservas",
                keywords: ["salón", "clientes", "estética", "belleza"],
                softwareNeed: "medium"
            },
            salud: {
                context: "Eres Juan Cruz de Nexte Marketing contactando centros de salud",
                tone: "profesional y confiable",
                focus: "presencia digital médica, captación de pacientes, CRM médico, análisis de datos",
                keywords: ["centro médico", "pacientes", "consultas", "salud"],
                softwareNeed: "high"
            },
            restaurante: {
                context: "Eres Juan Cruz de Nexte Marketing contactando restaurantes",
                tone: "cálido y profesional",
                focus: "delivery online, presencia en redes, reservas digitales, sistema de pedidos",
                keywords: ["restaurante", "clientes", "reservas", "menú"],
                softwareNeed: "medium"
            },
            empresa: {
                context: "Eres Juan Cruz de Nexte Marketing contactando empresas y negocios B2B",
                tone: "ejecutivo y estratégico",
                focus: "software a medida, CRM, sistemas de gestión, análisis de datos, automatización",
                keywords: ["empresa", "negocio", "gestión", "empresa"],
                softwareNeed: "very_high"
            },
            default: {
                context: "Eres Juan Cruz de Nexte Marketing",
                tone: "profesional y amigable",
                focus: "servicios de marketing digital, presencia online, desarrollo de software",
                keywords: ["negocio", "clientes", "ventas", "marketing"],
                softwareNeed: "low"
            }
        };

        // Estadísticas
        this.stats = {
            messagesGenerated: 0,
            cacheHits: 0,
            apiCalls: 0,
            errors: 0,
            tokensUsed: 0
        };
    }

    async checkHealth() {
        try {
            if (!this.apiKey) return false;
            const res = await this.generateViaOpenAI('Ping');
            return !!res;
        } catch (e) {
            console.error('❌ OpenAI Health Check Failed:', e.message);
            return false;
        }
    }

    /**
     * Helper para llamar a la API de OpenAI mediante HTTP directo con Axios
     */
    async generateViaOpenAI(prompt, systemPrompt = '') {
        const apiKey = this.apiKey || process.env.OPENAI_API_KEY;
        if (!apiKey) {
            throw new Error('OPENAI_API_KEY no configurada en .env');
        }

        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: this.model || 'gpt-4o-mini',
            messages: [
                { role: 'system', content: systemPrompt || 'Eres Juan Cruz de Nexte Marketing. Ayudas a automatizar y hacer crecer negocios digitalmente.' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.9,
            max_tokens: 400
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: 12000 // 12 segundos timeout
        });

        const content = response.data?.choices?.[0]?.message?.content;
        if (!content) {
            throw new Error('Respuesta inválida desde la API de OpenAI');
        }
        return content.trim();
    }

    /**
     * Analizar datos del lead para personalización
     */
    analyzeLeadInsights(lead) {
        const insights = {
            hasHighRating: (lead.rating || 0) >= 4.5,
            hasLowRating: (lead.rating || 0) < 3.5,
            ratingLabel: (lead.rating || 0) >= 4.5 ? 'excelente' :
                (lead.rating || 0) >= 4.0 ? 'muy buena' :
                    (lead.rating || 0) >= 3.5 ? 'buena' : 'mejorable',

            hasLowVisibility: (lead.reviewCount || 0) < 20,
            hasMediumVisibility: (lead.reviewCount || 0) >= 20 && (lead.reviewCount || 0) < 100,
            hasHighVisibility: (lead.reviewCount || 0) >= 100,

            isPremiumLocation: lead.location && ['palermo', 'recoleta', 'belgrano', 'puerto madero', 'caballito']
                .some(zone => lead.location.toLowerCase().includes(zone)),

            opportunities: []
        };

        if (insights.hasHighRating && insights.hasLowVisibility) {
            insights.opportunities.push('rating_alto_visibilidad_baja');
        }
        if (insights.hasLowRating) {
            insights.opportunities.push('reputacion_mejorable');
        }
        if (insights.isPremiumLocation && insights.hasLowVisibility) {
            insights.opportunities.push('ubicacion_premium_sin_explotar');
        }
        if (!lead.website || lead.website === '') {
            insights.opportunities.push('sin_web');
        }

        return insights;
    }

    /**
     * Generar secuencia de ENGANCHE (4 mensajes 100% personalizados con ChatGPT)
     */
    async generatePersonalizedSequence(lead) {
        console.log(`🤖 [GENERADOR] Generando secuencia de 4 mensajes 100% IA para ${lead.name}`);

        try {
            // 1. Obtener plantilla base y contexto del rubro
            const template = this.getTemplateForBusiness(lead.category);
            const messages = [null, null, null, null];

            // 2. Si OpenAI está activo y saludable, generar los 4 mensajes con ChatGPT
            if (this.stats.errors < 3 && this.apiKey) {
                try {
                    console.log(`✨ Generando Mensaje 1 (Análisis real del negocio) con ChatGPT...`);
                    messages[0] = await this.generateMessage1(lead, template);

                    console.log(`✨ Generando Mensaje 2 (Presentación adaptada al rubro) con ChatGPT...`);
                    messages[1] = await this.generateMessage2(lead, template);

                    console.log(`✨ Generando Mensaje 3 (Propuesta comercial a medida sin Ads) con ChatGPT...`);
                    messages[2] = await this.generateMessage3(lead, template);

                    console.log(`✨ Generando Mensaje 4 (Cierre natural con oferta de portafolio) con ChatGPT...`);
                    messages[3] = await this.generateMessage4(lead, template);

                    // Verificar que los 4 mensajes sean válidos y no vacíos
                    if (messages.every(m => m && typeof m === 'string' && m.trim().length > 20)) {
                        console.log(`✅ [CHATGPT] Secuencia completa de 4 mensajes generada exitosamente con IA`);
                        this.stats.messagesGenerated += 4;
                        return messages;
                    }
                } catch (openAiError) {
                    console.log(`⚠️ Falló generación completa con OpenAI: ${openAiError.message}. Usando sistema de plantillas...`);
                    this.stats.errors++;
                }
            }

            // 3. FALLBACK: Usar plantillas avanzadas si OpenAI falla o no está configurado
            console.log(`📋 Usando plantillas avanzadas como fallback...`);
            const templateMessages = this.templateGenerator.generatePersonalizedSequence(lead);
            this.stats.messagesGenerated += templateMessages.length;
            return templateMessages;

        } catch (error) {
            console.error(`❌ Error crítico en generación:`, error.message);
            this.stats.errors++;

            // FALLBACK FINAL DE EMERGENCIA (4 mensajes)
            const fallbackMsgs = [
                `¡Hola! Soy Juan Cruz de Nexte Marketing. Estuve revisando el perfil de ${lead.name} en Google Maps y me llamó la atención su potencial en la zona.`,
                `En Nexte llevamos más de 10 años (2015-2026) desarrollando software a medida, asistentes virtuales con IA y soluciones digitales para hacer crecer negocios.`,
                `🏢 *SOLUCIONES DIGITALES NEXTE 2026*\n\n⚙️ *SISTEMAS & SOFTWARE A MEDIDA:* $650.000 → Promo $350.000 en 2 pagos\n🤖 *ASISTENTE VIRTUAL IA NATOH (WHATSAPP 24/7):* $350.000 → Promo $180.000\n🌐 *PÁGINA WEB PROFESIONAL:* $500.000 → Promo $250.000\n📍 *SEO GOOGLE MAPS:* $300.000 → Promo $150.000\n\n🎁 *COMBO INTEGRAL:* $1.800.000 → 🔥 *$690.000* (Ahorro de $1.110.000).`,
                `Si querés te puedo enviar algunos ejemplos de sistemas y sitios web reales que ya diseñamos para otros negocios. ¿Charlamos 5 min?`
            ];
            return fallbackMsgs;
        }
    }

    /**
     * Mensaje 1: Saludo + Enganche ultra personalizado con datos reales de Google Maps
     */
    async generateMessage1(lead, template) {
        const cacheKey = `msg1_${lead.id}`;
        if (this.messageCache.has(cacheKey)) {
            this.stats.cacheHits++;
            return this.messageCache.get(cacheKey);
        }

        const insights = this.analyzeLeadInsights(lead);

        const webAuditInfo = (lead.webAudit && lead.webAudit.insights && lead.webAudit.insights.length > 0)
            ? `- AUDITORÍA DE CÓDIGO WEB REAL (${lead.website}): ${lead.webAudit.insights.join(', ')} (Tecnología: ${lead.webAudit.cms})`
            : '';

        const prompt = `
Contexto: Eres Juan Cruz de Nexte Marketing contactando al dueño o encargado de un negocio por WhatsApp.
Misión: Escribir un primer mensaje extremadamente natural, humano y personalizado basándote en la información REAL extraída de Google Maps y la auditoría de su web.

Datos REALES del negocio:
- Nombre: ${lead.name}
- Categoría/Rubro: ${lead.category || 'negocio'}
- Rating/Estrellas: ${lead.rating ? lead.rating + '⭐' : 'sin datos de rating'} (${insights.ratingLabel})
- Opiniones/Reseñas: ${lead.reviewCount ? lead.reviewCount + ' opiniones en Google' : 'pocas opiniones'}
- Ubicación: ${lead.location || 'la zona'}
- Sitio web actual: ${lead.website ? 'Tiene sitio web (' + lead.website + ')' : 'NO tiene sitio web'}
${webAuditInfo}

Requisitos del mensaje:
1. Saluda cordialmente (Ej: "¡Hola! Soy Juan Cruz de Nexte Marketing...").
2. Menciona datos específicos y reales de su negocio (su nombre real "${lead.name}", su ubicación "${lead.location || 'tu zona'}", su rating, o si revisaste su código web).
3. Si hay datos de AUDITORÍA DE CÓDIGO WEB (ej: sin Google Analytics 4, sin Píxel de Meta, o sin botón de WhatsApp flotante en su web), mencionalo de forma súper natural como alguien técnico que revisó su sitio antes de escribirle.
4. NO uses placeholders como {nombre} o [rubro]. Todo debe estar redactado en texto final pulido.
5. Usa un tono argentino conversacional, profesional y directo ("vos", "te comento", etc.).
6. Extensión: entre 35 y 60 palabras.

Escribe ÚNICAMENTE el texto final del mensaje 1:
`;

        try {
            const message = await this.generateViaOpenAI(prompt, template.context);
            const cleanMessage = message.replace(/^["']|["']$/g, '');

            this.stats.apiCalls++;
            this.stats.tokensUsed += this.estimateTokens(prompt + cleanMessage);
            this.messageCache.set(cacheKey, cleanMessage);

            return cleanMessage;
        } catch (error) {
            console.error('Error OpenAI mensaje 1:', error.message);
            if (!lead.website) {
                return `¡Hola! Soy Juan Cruz de Nexte Marketing. Estuve revisando el perfil de ${lead.name} en Google Maps y noté que no cuentan con un sitio web oficial. Hoy en día en ${lead.location || 'tu zona'}, muchos clientes buscan primero en Google antes de contactar y terminan yéndose a otros negocios.`;
            }
            return `¡Hola! Soy Juan Cruz de Nexte Marketing. Vi el perfil de ${lead.name} en Google Maps con ${lead.rating || 'excelente'} rating en ${lead.location || 'tu zona'} y me llamó la atención su potencial para captar aún más clientes directos.`;
        }
    }

    /**
     * Mensaje 2: Presentación de trayectoria adaptada al rubro específico
     */
    async generateMessage2(lead, template) {
        const cacheKey = `msg2_${lead.id}`;
        if (this.messageCache.has(cacheKey)) {
            this.stats.cacheHits++;
            return this.messageCache.get(cacheKey);
        }

        const prompt = `
Contexto: Eres Juan Cruz de Nexte Marketing enviando el segundo mensaje a ${lead.name} (Rubro: ${lead.category || 'comercial'}).

Misión: Escribir una breve presentación de Nexte adaptada al sector de ${lead.category || 'su negocio'}.

Datos institucionales de Nexte:
- Más de 10 años de trayectoria (2015-2026).
- Especialización en desarrollo de software a medida, sistemas de gestión/turnos, asistentes virtuales con IA (IA NatoH) y posicionamiento digital.
- Enfoque directo en resultados medibles y ahorro de horas de atención.

Requisitos del mensaje:
1. Explica brevemente quiénes son en Nexte resaltando los más de 10 años de trayectoria (2015-2026).
2. Enfoca la experiencia mencionando cómo ayudan a empresas o consultorios del rubro (${lead.category || 'tu sector'}) a implementar sistemas de gestión, asistentes de WhatsApp con IA y desarrollo de software a medida.
3. Tono conversacional, serio y profesional. Sin exageraciones ni emojis en exceso.
4. NO pongas títulos ni variables.
5. Extensión: entre 40 y 60 palabras.

Escribe ÚNICAMENTE el texto final del mensaje 2:
`;

        try {
            const message = await this.generateViaOpenAI(prompt, template.context);
            const cleanMessage = message.replace(/^["']|["']$/g, '');

            this.stats.apiCalls++;
            this.stats.tokensUsed += this.estimateTokens(prompt + cleanMessage);
            this.messageCache.set(cacheKey, cleanMessage);

            return cleanMessage;
        } catch (error) {
            console.error('Error OpenAI mensaje 2:', error.message);
            return `En Nexte llevamos más de 10 años (2015-2026) desarrollando tecnología y sistemas para negocios y empresas. Nos especializamos en crear portales web profesionales, sistemas de gestión/turnos a medida y asistentes inteligentes por WhatsApp que responden consultas y agendan solos 24/7.`;
        }
    }

    /**
     * Mensaje 3: Propuesta Comercial a medida (Enfoque Software, IA NatoH, Web, SEO - SIN ADS)
     */
    async generateMessage3(lead, template) {
        const cacheKey = `msg3_${lead.id}`;
        if (this.messageCache.has(cacheKey)) {
            this.stats.cacheHits++;
            return this.messageCache.get(cacheKey);
        }

        const isEcommerceCandidate = ['tienda', 'indumentaria', 'ropa', 'distribuidora', 'mayorista', 'calzado', 'local', 'comercio'].some(kw =>
            (lead.category || '').toLowerCase().includes(kw));

        const prompt = `
Contexto: Eres Juan Cruz de Nexte Marketing enviando la propuesta comercial detallada (Mensaje 3) a ${lead.name} (${lead.category || 'negocio'}).

Misión: Escribir una propuesta comercial atractiva, clara y adaptada a su rubro con formato WhatsApp enriquecido (*negritas*, emojis limpios, separadores).

Reglas y Oferta a Incluir:
1. ⚙️ **SISTEMA DE GESTIÓN & SOFTWARE A MEDIDA**: Elevar el protagonismo y valor. Mostrar Precio regular: $650.000 → Promo: $350.000 en 2 pagos. Describir cómo ayuda a su rubro (gestión de turnos, agendas, fichas de clientes/pacientes, control de stock o procesos).
2. 🤖 **ASISTENTE VIRTUAL CON IA NATOH (WHATSAPP 24/7)**: Precio regular: $350.000 → Promo: $180.000. Empleado virtual entrenado con sus datos que atiende 24/7, agenda turnos y valida comprobantes de pago.
3. 🌐 **PÁGINA WEB PROFESIONAL** o **TIENDA ONLINE (E-COMMERCE)**: Si aplica e-commerce (venta de productos), ofrecer E-Commerce por $500.000 (regular $800.000). Si no, ofrecer Sitio Web Profesional por $250.000 (regular $500.000) con dominio, hosting y SSL.
4. 📸 **GENERACIÓN DE CONTENIDO EDITORIAL & MULTIMEDIA**: Precio regular: $250.000/mes → Promo: $140.000/mes. (Piezas gráficas y contenido institucional, NO manejo genérico básico de redes).
5. 📍 **OPTIMIZACIÓN DE GOOGLE MAPS & SEO LOCAL**: Precio regular: $300.000 → Promo: $150.000 para liderar las búsquedas locales.
6. 🚫 **PROHIBIDO INCLUIR PUBLICIDAD/ADS**: NO menciones Google Ads ni Meta Ads. Está 100% excluido.
7. 🎁 **COMBO INTEGRAL CON DESCUENTO**: Crear un paquete con sus servicios clave (ej. Sistema + IA NatoH + Web + SEO Maps) por un precio final de $690.000 (Regular $1.800.000) destacando un ahorro gigante de $1.110.000.

Escribe ÚNICAMENTE el texto de la propuesta comercial final con formato WhatsApp:
`;

        try {
            const message = await this.generateViaOpenAI(prompt, template.context);
            const cleanMessage = message.replace(/^["']|["']$/g, '');

            this.stats.apiCalls++;
            this.stats.tokensUsed += this.estimateTokens(prompt + cleanMessage);
            this.messageCache.set(cacheKey, cleanMessage);

            return cleanMessage;
        } catch (error) {
            console.error('Error OpenAI mensaje 3:', error.message);
            return `🏢 *SOLUCIONES DIGITALES NEXTE 2026*\n\n⚙️ *SISTEMA DE GESTIÓN & SOFTWARE A MEDIDA*\nPrecio regular: *$650.000* → 🔥 *$350.000 en 2 pagos*\nSoftware a medida para tu negocio: gestión de turnos, agendas médicas o comerciales y control de procesos.\n\n🤖 *ASISTENTE VIRTUAL CON IA NATOH (WHATSAPP 24/7)*\nPrecio regular: *$350.000* → 🔥 *$180.000*\nEmpleado virtual entrenado con tus datos que atiende consultas 24/7, agendando solo y validando pagos.\n\n🌐 *PÁGINA WEB PROFESIONAL & INSTITUCIONAL*\nPrecio regular: *$500.000* → 🔥 *$250.000*\nSitio web profesional hecho a medida con dominio (.com / .ar), hosting por 1 año y SSL.\n\n📸 *GENERACIÓN DE CONTENIDO EDITORIAL*\nPrecio regular: *$250.000/mes* → 🔥 *$140.000/mes*\nDiseño multimedia e identidad visual profesional.\n\n📍 *SEO GOOGLE MAPS & POSICIONAMIENTO*\nPrecio regular: *$300.000* → 🔥 *$150.000*\nOptimización local para liderar las búsquedas de tu zona.\n\n🎁 *COMBO SOLUCIÓN INTEGRAL (Sistema + IA NatoH + Web + SEO)*\nPrecio regular: *$1.800.000* → 🔥 *$690.000* *(Ahorro de $1.110.000)*.`;
        }
    }

    /**
     * Mensaje 4: Cierre natural expresando adaptación 100% al negocio, ejemplos y agendamiento
     */
    async generateMessage4(lead, template) {
        const cacheKey = `msg4_${lead.id}`;
        if (this.messageCache.has(cacheKey)) {
            this.stats.cacheHits++;
            return this.messageCache.get(cacheKey);
        }

        const prompt = `
Contexto: Eres Juan Cruz de Nexte Marketing cerrando la secuencia (Mensaje 4) para ${lead.name} (${lead.category || 'negocio'}).

Misión: Escribir un cierre sumamente natural, directo y servicial por WhatsApp que exprese claramente que nos adaptamos 100% a la realidad de su negocio.

Requisitos del mensaje:
1. Mencioná explícitamente que en Nexte **nos adaptamos 100% a la realidad, escala y necesidades de su negocio (${lead.name})**, armando propuestas y módulos a medida según lo que requiera.
2. Ofrece de manera proactiva enviar **ejemplos reales de trabajos realizados, sistemas y sitios web** desarrollados por Nexte para otros negocios.
3. Invita de forma relajada y sin presión a agendar una breve conversación o responder cualquier duda si le interesa saber algo más.
4. Tono conversacional argentino, amable y accesible ("nos adaptamos a lo que necesites", "si te parece", "quedo a disposición").
5. Extensión: entre 30 y 50 palabras.

Escribe ÚNICAMENTE el texto final del mensaje 4:
`;

        try {
            const message = await this.generateViaOpenAI(prompt, template.context);
            const cleanMessage = message.replace(/^["']|["']$/g, '');

            this.stats.apiCalls++;
            this.stats.tokensUsed += this.estimateTokens(prompt + cleanMessage);
            this.messageCache.set(cacheKey, cleanMessage);

            return cleanMessage;
        } catch (error) {
            console.error('Error OpenAI mensaje 4:', error.message);
            return `Nos adaptamos 100% a la realidad y necesidades de tu negocio, armando propuestas a medida según lo que requieras. Si querés te puedo enviar algunos ejemplos de trabajos realizados y sistemas reales, y si te interesa agendar o saber algo más quedo a tu entera disposición. 😊`;
        }
    }

    /**
     * Detectar si un mensaje es auto-respuesta de bot
     */
    async detectAutoReply(messageText) {
        if (!messageText) return false;

        const botKeywords = ['menú', 'opción', 'marcar', 'bienvenido', 'horario', 'automático', 'autorespuesta', 'asistente virtual'];
        if (botKeywords.some(kw => messageText.toLowerCase().includes(kw))) return true;

        try {
            const responseText = await this.generateViaOpenAI(`
                Analiza si el siguiente mensaje es una respuesta automática de un bot de WhatsApp.
                Responde SOLO "SI" o "NO".
                
                Mensaje: "${messageText}"
            `);
            return responseText.toUpperCase().includes('SI');
        } catch (e) {
            console.error('Error OpenAI detectAutoReply:', e.message);
            return false;
        }
    }

    /**
     * Generar pitch de venta específico para dueños con bots malos
     */
    async generateBotSalesPitch(lead, botMessage) {
        const prompt = `
            Contexto: El negocio "${lead.name}" tiene un bot de autorespuesta que dice: "${botMessage.substring(0, 50)}...".
            
            Tu objetivo: Venderle una MEJORA de su bot.
            
            Escribe un mensaje corto (max 30 palabras) que diga:
            1. Que notaste su respuesta automática.
            2. Que podemos hacer que su bot responda preguntas reales y venda solo (usando IA), no solo saludar.
            3. Pregunta si le interesa ver una demo.
            
            Tono: Constructivo, "te ayudo a vender más".
        `;

        try {
            return await this.generateViaOpenAI(prompt);
        } catch (e) {
            console.error('Error OpenAI generateBotSalesPitch:', e.message);
            return "Vi que tenés respuesta automática. Nosotros implementamos bots con IA que responden dudas reales y cierran ventas, no solo saludan. ¿Te muestro la diferencia?";
        }
    }

    getTemplateForBusiness(category) {
        if (!category) return this.templates.default;

        const cat = category.toLowerCase();

        if (cat.includes('dent') || cat.includes('odont')) return this.templates.odontologia;
        if (cat.includes('bell') || cat.includes('estet') || cat.includes('salon')) return this.templates.belleza;
        if (cat.includes('salud') || cat.includes('medic') || cat.includes('clinic')) return this.templates.salud;
        if (cat.includes('restaurant') || cat.includes('comida')) return this.templates.restaurante;

        return this.templates.default;
    }

    estimateTokens(text) {
        return Math.ceil(text.length / 4);
    }

    clearCache() {
        this.messageCache.clear();
        console.log('🧹 Cache de mensajes limpiado');
    }

    getStats() {
        return {
            ...this.stats,
            cacheSize: this.messageCache.size,
            cacheHitRate: this.stats.apiCalls > 0 ?
                ((this.stats.cacheHits / (this.stats.apiCalls + this.stats.cacheHits)) * 100).toFixed(1) + '%' :
                '0%',
            estimatedDailyCost: 'Acorde a tu cuota OpenAI',
            tokensPerDay: this.stats.tokensUsed
        };
    }
}

module.exports = AITextGenerator;
