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
     * Generar secuencia de ENGANCHE (4 mensajes)
     */
    async generatePersonalizedSequence(lead) {
        console.log(`🤖 [GENERADOR] Generando 4 mensajes para ${lead.name}`);

        try {
            // 1. PRIMERO: Generar con plantillas avanzadas (SIEMPRE FUNCIONA)
            const templateMessages = this.templateGenerator.generatePersonalizedSequence(lead);

            if (!templateMessages || templateMessages.length !== 4) {
                throw new Error('AdvancedTemplateGenerator falló');
            }

            console.log(`✅ [TEMPLATE] 4 mensajes generados con plantillas avanzadas`);
            console.log(`🎯 Categoría detectada: ${this.templateGenerator.detectCategory(lead)}`);

            // 2. OPCIONAL: Intentar mejorar con OpenAI (si está disponible)
            if (this.stats.errors < 3 && this.apiKey) {
                try {
                    const template = this.getTemplateForBusiness(lead.category);
                    const enhancedMsg1 = await this.generateMessage1(lead, template);

                    if (enhancedMsg1 && enhancedMsg1.length > 50) {
                        templateMessages[0] = enhancedMsg1;
                        console.log(`✨ Mensaje 1 mejorado con OpenAI`);
                        this.stats.messagesGenerated += 1;
                    }
                } catch (openAiError) {
                    console.log(`⚠️ OpenAI no disponible, usando plantilla original: ${openAiError.message}`);
                    this.stats.errors++;
                }
            } else {
                console.log(`⏸️ OpenAI pausado o no configurado, usando solo plantillas`);
            }

            this.stats.messagesGenerated += templateMessages.length;
            console.log(`✅ [GENERADOR] Secuencia de 4 mensajes lista`);

            return templateMessages;

        } catch (error) {
            console.error(`❌ Error crítico en generación:`, error.message);
            this.stats.errors++;

            // FALLBACK FINAL: Mensajes de emergencia (4 mensajes)
            console.log(`🚨 Usando mensajes de emergencia`);
            const fallbackMsgs = [
                `¡Hola! Vi ${lead.name} en Google Maps. ¿Tienen página web? Hoy es fundamental para captar clientes.`,
                `Desde 2015 en Nexte Marketing ayudamos a negocios a tener presencia digital profesional.`,
                `🚀 Ofrecemos un sitio web completo por $250.000 (en 2 pagos), personalizado y adaptado a tu marca. Listo en 2 días!`,
                `💬 Escribime si te interesa ver ejemplos de webs reales que ya diseñamos!`
            ];
            fallbackMsgs.templateVariantUsed = 0; // Por defecto primer variante
            return fallbackMsgs;
        }
    }

    /**
     * Mensaje 1: Saludo ULTRA personalizado con insights
     */
    async generateMessage1(lead, template) {
        const cacheKey = `msg1_${lead.id}`;
        if (this.messageCache.has(cacheKey)) {
            this.stats.cacheHits++;
            return this.messageCache.get(cacheKey);
        }

        const insights = this.analyzeLeadInsights(lead);

        const prompt = `
Contexto:
Eres Juan Cruz, fundador de Nexte Marketing (más de 10 años ayudando negocios a crecer digitalmente).
Contactas a ${lead.name} por WhatsApp.

Datos del negocio:
- Nombre: ${lead.name}
- Categoría: ${lead.category || 'negocio'}
- Rating: ${lead.rating || 'sin datos'}⭐ (${insights.ratingLabel})
- Reviews: ${lead.reviewCount || 0} reseñas
- Ubicación: ${lead.location || 'CABA'}${insights.isPremiumLocation ? ' (zona premium)' : ''}
- Tiene web: ${lead.website ? 'SÍ' : 'NO'}

Tarea:
Escribe mensaje de 25-35 palabras que:
1. Mencione UN insight específico (rating, reviews, ubicación o sin web)
2. Demuestre investigación real (NO spam)
3. Cree "gap" (lo que tiene vs podría tener)
4. Use lenguaje argentino conversacional
5. NO uses clichés ("me gustaría", "quisiera ofrecerte")

Escribe SOLO el mensaje:
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

            if (insights.hasHighRating && insights.hasLowVisibility) {
                return `${lead.rating}⭐ excelente pero solo ${lead.reviewCount} reviews = Google no te muestra. Perdes clientes.`;
            }
            if (!lead.website) {
                return `Vi ${lead.name} en Maps. Sin web = 100% dependiente de Google. Te muestro cómo cambiarlo.`;
            }
            return `Juan Cruz, Nexte. Vi ${lead.name} en ${lead.location} y detecté algo que te cuesta clientes.`;
        }
    }

    /**
     * Mensaje 2: Presentación
     */
    async generateMessage2(lead, template) {
        const cacheKey = `msg2_${lead.id}`;
        if (this.messageCache.has(cacheKey)) {
            this.stats.cacheHits++;
            return this.messageCache.get(cacheKey);
        }

        const prompt = `
Escribe una presentación breve de Nexte Marketing (30-45 palabras) ÚNICA.

Información:
- más de 10 años de experiencia (2015-2026)
- Trabajo en 5 países
- Especialización en ${template.focus}

Requisitos:
- Tono: ${template.tone}
- NO copies formatos estándar
- Cambia completamente la estructura
- Conciso pero impactante
- Sin emojis

Escribe SOLO el mensaje.
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
            return "Desde 2015 ayudamos a negocios en 5 países a digitalizar sus operaciones con estrategia y tecnología.";
        }
    }

    /**
     * Mensaje 3: Promo específica (Variante A)
     */
    async generateMessage3(lead, template) {
        const insights = this.analyzeLeadInsights(lead);

        let selectedPromo = 'web';

        if (lead.website || insights.hasHighVisibility) {
            selectedPromo = 'auditoria';
        } else if (['salón', 'salon', 'gym', 'gimnasio', 'belleza', 'fitness', 'spa', 'estética', 'estetica'].some(kw =>
            lead.category?.toLowerCase().includes(kw))) {
            selectedPromo = 'ads_cm';
        } else if (['empresa', 'corporativo', 'industrial', 'fábrica', 'fabrica', 'mayorista', 'distribuidor'].some(kw =>
            lead.category?.toLowerCase().includes(kw)) || (lead.reviewCount && lead.reviewCount > 100)) {
            selectedPromo = 'software';
        }

        const promos = {
            web: {
                pitch: "Diseño Web Profesional + SEO Técnico básico. Incluye dominio y hosting.",
                benefit: "Hoy, si no estás en Google con una web rápida y optimizada, perdes el 80% de los clientes."
            },
            auditoria: {
                pitch: "Auditoría SEO Técnica + Configuración Google Analytics 4.",
                benefit: "¿Sabés realmente quién entra a tu web y por qué no compran? Sin Analytics y SEO técnico, estás volando a ciegas."
            },
            ads_cm: {
                pitch: "Estrategia de Google Ads y Meta Ads para captar clientes reales.",
                benefit: "Dejá de gastar en 'Me Gusta' y empezá a invertir en mensajes de gente que quiere comprar YA."
            },
            software: {
                pitch: "Software a medida y automatización de procesos.",
                benefit: "Eliminá tareas repetitivas y errores humanos. Un sistema a medida ahorra tiempo y dinero desde el día 1."
            }
        };

        const promo = promos[selectedPromo];

        const prompt = `
Mensaje 3 de enganche para ${lead.name}.

Propuesta principal:
${promo.pitch}

Beneficio clave:
${promo.benefit}

Contexto:
- Categoría: ${lead.category || 'negocio'}
- Web: ${lead.website ? 'SÍ' : 'NO'}

Tarea:
Escribe mensaje de 35-50 palabras que:
1. SI TIENE WEB: Pregunte si tiene configurado Google Analytics 4 o si hizo alguna revisión de SEO Técnico.
2. SI NO TIENE WEB: Pregunte cómo captan clientes online hoy.
3. Mencione que hacemos PUBLICIDAD en Google Ads y Meta Ads.
4. Tono directo y profesional ("Juan Cruz de Nexte").

Escribe SOLO el mensaje:
`;

        try {
            const message = await this.generateViaOpenAI(prompt);
            return message.replace(/^["']|["']$/g, '');
        } catch (error) {
            console.error('Error OpenAI mensaje 3:', error.message);
            return promo.pitch + ' ' + promo.benefit;
        }
    }

    /**
     * Mensaje 4: Soft CTA
     */
    async generateMessage4(lead, template) {
        const prompt = `
Mensaje 4 (FINAL) de enganche para ${lead.name}.

Objetivo: Cerrar interés mencionando servicios CLAVE.

Servicios a mencionar OBLIGATORIAMENTE:
- Google Analytics / Auditoría Web
- SEO Técnico
- Publicidad en Google Ads y Meta Ads
- Software a medida

Tarea:
Escribe mensaje de 25-40 palabras que:
1. Pregunte si puede enviarte una propuesta o charlar 5 min.
2. Mencione que cubren todo el espectro digital (Ads, SEO, Analytics).
3. Tono casual y facilitador.

Escribe SOLO el mensaje:
`;

        try {
            const message = await this.generateViaOpenAI(prompt);
            return message.replace(/^["']|["']$/g, '');
        } catch (error) {
            console.error('Error OpenAI mensaje 4:', error.message);
            return "Cubrimos todo: SEO Técnico, Analytics, y Google/Meta Ads. ¿Charlamos 5 min para ver qué necesita tu negocio hoy?";
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
