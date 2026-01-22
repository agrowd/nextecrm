const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');
const AdvancedTemplateGenerator = require('./advancedTemplateGenerator');

/**
 * AI Text Generator con Google Gemini
 * 100% GRATUITO - Usa Gemini 1.5 Flash/Pro
 * 
 * Límites gratuitos Gemini:
 * - Gemini 1.5 Flash: 15 RPM, 1M tokens/min (RECOMENDADO)
 * - Gemini 1.5 Pro: 2 RPM, 32K tokens/min
 * - Gemini 2.0 Flash: 10 RPM, 4M tokens/min
 * 
 * Para 200 mensajes/día necesitamos ~320K tokens/día = 100% cubierto
 */
class AITextGenerator {
    constructor() {
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

        // Usar Gemini 2.5 Flash (Modelo Confirmado Funcional)
        this.model = this.genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            generationConfig: {
                temperature: 0.9,
                topP: 0.95,
                topK: 40,
                maxOutputTokens: 400,
            }
        });

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
                softwareNeed: "high" // Alta probabilidad de necesitar software de gestión
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
            const model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            const result = await model.generateContent("Ping");
            const response = await result.response;
            return response.text().length > 0;
        } catch (e) {
            console.error('❌ SDK Health Check Failed, trying HTTP...', e.message);
            // Intento HTTP directo
            try {
                const res = await this.generateViaHttp('gemini-2.5-flash', 'Ping');
                if (res) {
                    console.log('✅ HTTP Fallback Health Check: OK');
                    return true;
                }
            } catch (e2) { }

            return false;
        }
    }

    /**
     * Analizar datos del lead para personalización
     */
    analyzeLeadInsights(lead) {
        const insights = {
            // Rating analysis
            hasHighRating: (lead.rating || 0) >= 4.5,
            hasLowRating: (lead.rating || 0) < 3.5,
            ratingLabel: (lead.rating || 0) >= 4.5 ? 'excelente' :
                (lead.rating || 0) >= 4.0 ? 'muy buena' :
                    (lead.rating || 0) >= 3.5 ? 'buena' : 'mejorable',

            // Visibilidad (reviews)
            hasLowVisibility: (lead.reviewCount || 0) < 20,
            hasMediumVisibility: (lead.reviewCount || 0) >= 20 && (lead.reviewCount || 0) < 100,
            hasHighVisibility: (lead.reviewCount || 0) >= 100,

            // Ubicación premium
            isPremiumLocation: lead.location && ['palermo', 'recoleta', 'belgrano', 'puerto madero', 'caballito']
                .some(zone => lead.location.toLowerCase().includes(zone)),

            // Identificar oportunidades
            opportunities: []
        };

        // Detectar oportunidades específicas
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
     * Objetivo: Calentar lead para que Usuario cierre manualmente después
     */
    async generatePersonalizedSequence(lead) {
        console.log(`🤖 [GENERADOR] Generando 5 mensajes para ${lead.name}`);

        // ESTRATEGIA: Usar AdvancedTemplateGenerator como fuente PRINCIPAL
        // Gemini es opcional para "mejorar" mensajes, pero no es crítico

        try {
            // 1. PRIMERO: Generar con plantillas avanzadas (SIEMPRE FUNCIONA)
            const templateMessages = this.templateGenerator.generatePersonalizedSequence(lead);

            if (!templateMessages || templateMessages.length !== 5) {
                throw new Error('AdvancedTemplateGenerator falló');
            }

            console.log(`✅ [TEMPLATE] 5 mensajes generados con plantillas avanzadas`);
            console.log(`🎯 Categoría detectada: ${this.templateGenerator.detectCategory(lead)}`);

            // 2. OPCIONAL: Intentar mejorar con Gemini (si está disponible)
            if (this.stats.errors < 3) {
                try {
                    const template = this.getTemplateForBusiness(lead.category);
                    const enhancedMsg1 = await this.generateMessage1(lead, template);

                    if (enhancedMsg1 && enhancedMsg1.length > 50) {
                        templateMessages[0] = enhancedMsg1;
                        console.log(`✨ Mensaje 1 mejorado con Gemini`);
                        this.stats.messagesGenerated += 1;
                    }
                } catch (geminiError) {
                    console.log(`⚠️ Gemini no disponible, usando plantilla original`);
                    this.stats.errors++;
                }
            } else {
                console.log(`⏸️ Gemini pausado por errores previos, usando solo plantillas`);
            }

            this.stats.messagesGenerated += 5;
            console.log(`✅ [GENERADOR] Secuencia de 5 mensajes lista`);

            return templateMessages;

        } catch (error) {
            console.error(`❌ Error crítico en generación:`, error.message);
            this.stats.errors++;

            // FALLBACK FINAL: Mensajes hardcodeados de emergencia (5 mensajes)
            console.log(`🚨 Usando mensajes de emergencia`);
            return [
                `¡Hola! Vi ${lead.name} en Google Maps. ¿Tienen página web? Hoy es fundamental para captar clientes.`,
                `Desde 2015 en Nexte Marketing ayudamos a negocios a tener presencia digital profesional.`,
                `🎉 PROMO 2025: Web profesional + dominio + hosting por $150.000. Todo adaptado a celular.`,
                `📋 Hacemos: Webs, SEO, Google Ads, Meta Ads, Community Manager, Software a medida.`,
                `📞 ¿Querés que te llame ahora o agendamos una reunión?`
            ];
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

        // Analizar datos del lead
        const insights = this.analyzeLeadInsights(lead);

        const prompt = `
Contexto:
Eres Juan Cruz, fundador de Nexte Marketing (10 años ayudando negocios a crecer digitalmente).
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
5. NO uses clichés ("me gust aria", "quisiera ofrecerte")

Estructuras (varía):
A) "[Dato específico] pero [oportunidad perdida]"
B) "[Dato]. ¿[Pregunta sobre consecuencia]?"
C) "[Observación] = [consecuencia]. Te muestro cómo mejorarlo"

Ejemplos BUENOS (adapta con datos reales):
${insights.hasHighRating && insights.hasLowVisibility ? `✅ "${lead.rating}⭐ con ${lead.reviewCount} reviews es bueno, pero Google no te muestra primero en '${lead.category || 'tu servicio'} ${lead.location}'. Perdes clientes ahí."` : ''}
${!lead.website ? `✅ "Excelente reputación en Maps pero sin web = dependes 100% de Google. ¿Qué pasa si cambian el algoritmo?"` : ''}
${insights.isPremiumLocation ? `✅ "${lead.location} = público con poder adquisitivo. ¿Por qué no tener presencia digital acorde?"` : ''}

CRÍTICO: USA datos reales (${lead.rating}⭐, ${lead.reviewCount} reviews, ${lead.location})

Escribe SOLO el mensaje:
`;

        try {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const message = response.text().trim().replace(/^["']|["']$/g, '');

            this.stats.apiCalls++;
            this.stats.tokensUsed += this.estimateTokens(prompt + message);
            this.messageCache.set(cacheKey, message);

            return message;
        } catch (error) {
            console.error('Error SDK Gemini mensaje 1:', error.message);
            console.log('🔄 Intentando fallback HTTP...');

            try {
                const httpMsg = await this.generateViaHttp(this.model.model, prompt);
                if (httpMsg) return httpMsg;
            } catch (httpErr) {
                console.error('Error HTTP Fallback:', httpErr.message);
            }

            // Fallback hardcoded final
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
     * Fallback HTTP directo a la API REST de Google
     */
    async generateViaHttp(modelName, text) {
        const apiKey = process.env.GEMINI_API_KEY;
        const versions = ['v1beta', 'v1'];
        // Normalizar nombre de modelo si viene del objeto model
        const name = typeof modelName === 'string' ? modelName : 'gemini-2.5-flash';

        for (const version of versions) {
            try {
                const url = `https://generativelanguage.googleapis.com/${version}/models/${name}:generateContent?key=${apiKey}`;

                const response = await axios.post(url, {
                    contents: [{ parts: [{ text: text }] }],
                    generationConfig: {
                        temperature: 0.9,
                        maxOutputTokens: 400
                    }
                }, {
                    headers: { 'Content-Type': 'application/json' },
                    validateStatus: status => status < 500 // Resolver promesas incluso con 4xx para leer el error
                });

                if (response.status !== 200) {
                    // Loguear error pero continuar
                    // console.warn(`⚠️ HTTP ${version} error: ${response.status}`);
                    continue;
                }

                const candidate = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (candidate) return candidate.trim();

            } catch (e) {
                console.warn(`⚠️ Error conexión HTTP ${version}: ${e.message}`);
            }
        }
        return null;
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
- 10 años de experiencia (2015-2025)
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
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const message = response.text().trim().replace(/^["']|["']$/g, '');

            this.stats.apiCalls++;
            this.stats.tokensUsed += this.estimateTokens(prompt + message);
            this.messageCache.set(cacheKey, message);

            return message;
        } catch (error) {
            console.error('Error Gemini mensaje 2:', error.message);

            // Intentar fallback
            try {
                const httpMsg = await this.generateViaHttp(this.model.model, prompt);
                if (httpMsg) return httpMsg;
            } catch (httpErr) { }

            return "Desde 2015 ayudamos a negocios en 5 países a digitalizar sus operaciones con estrategia y tecnología.";
        }
    }

    /**
     * Mensaje 3: Promo específica año nuevo (Variante A - RECOMENDADA)
     */
    async generateMessage3(lead, template) {
        const insights = this.analyzeLeadInsights(lead);

        // Seleccionar mejor promo según perfil del lead
        let selectedPromo = 'web'; // Default para negocios sin web

        if (lead.website || insights.hasHighVisibility) {
            // Ya tiene web → ofrecer auditoría y medición (SEO/Analytics)
            selectedPromo = 'auditoria';
        } else if (['salón', 'salon', 'gym', 'gimnasio', 'belleza', 'fitness', 'spa', 'estética', 'estetica'].some(kw =>
            lead.category?.toLowerCase().includes(kw))) {
            // Negocios visuales → community manager + ads
            selectedPromo = 'ads_cm';
        } else if (['empresa', 'corporativo', 'industrial', 'fábrica', 'fabrica', 'mayorista', 'distribuidor'].some(kw =>
            lead.category?.toLowerCase().includes(kw)) || (lead.reviewCount && lead.reviewCount > 100)) {
            // Empresas grandes o con muchas reviews → software a medida
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

Ejemplos:
✅ "Juan, vi tu web. ¿Tenes bien configurado Google Analytics 4 y SEO Técnico? Es clave para no tirar plata en anuncios. Hacemos Google/Meta Ads también."
✅ "¿Hicieron alguna revisión de sitio web o SEO recientemente? Sin eso, Google Ads y Meta Ads (que también manejamos) rinden la mitad."
✅ "Para ${lead.category}: ¿Están haciendo Google Ads o Meta Ads? Si no tenés web o SEO técnico, es difícil competir hoy. ¿Te interesa una auditoría?"

Escribe SOLO el mensaje:
`;

        try {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const message = response.text().trim().replace(/^["']|["']$/g, '');

            this.stats.apiCalls++;
            this.stats.tokensUsed += this.estimateTokens(prompt + message);

            return message;
        } catch (error) {
            // Intentar fallback
            try {
                const httpMsg = await this.generateViaHttp(this.model.model, prompt);
                if (httpMsg) return httpMsg;
            } catch (httpErr) { }

            // Fallback con promo seleccionada
            return promo.pitch + ' ' + promo.benefit;
        }
    }

    /**
     * Mensaje 4: Soft CTA + mención de servicios completos
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

Ejemplos:
✅ "Cubrimos todo: desde SEO Técnico y Analytics hasta campañas en Google/Meta Ads. ¿Charlamos 5 min y te cuento qué te sirve más?"
✅ "Si necesitas revisar tu web, configurar Analytics o arrancar con Ads, avísame. ¿Te paso info de cómo trabajamos?"
✅ "Hacemos todo el circuito: revisión web, SEO y publicidad paga (Ads). ¿Agendamos una llamada breve para ver tu caso?"

Escribe SOLO el mensaje:
`;

        try {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const message = response.text().trim().replace(/^["']|["']$/g, '');

            this.stats.apiCalls++;
            this.stats.tokensUsed += this.estimateTokens(prompt + message);

            return message;
        } catch (error) {
            // Intentar fallback
            try {
                const httpMsg = await this.generateViaHttp(this.model.model, prompt);
                if (httpMsg) return httpMsg;
            } catch (httpErr) { }

            return "Cubrimos todo: SEO Técnico, Analytics, y Google/Meta Ads. ¿Charlamos 5 min para ver qué necesita tu negocio hoy?";
        }
    }



    /**
     * Detectar si un mensaje es auto-respuesta de bot
     */
    async detectAutoReply(messageText) {
        if (!messageText) return false;

        // Detección rápida por palabras clave
        const botKeywords = ['menú', 'opción', 'marcar', 'bienvenido', 'horario', 'automático', 'autorespuesta', 'asistente virtual'];
        if (botKeywords.some(kw => messageText.toLowerCase().includes(kw))) return true;

        // Detección por IA (más precisa)
        try {
            // Intentar SDK primero
            const result = await this.model.generateContent(`
                Analiza si el siguiente mensaje es una respuesta automática de un bot de WhatsApp.
                Responde SOLO "SI" o "NO".
                
                Mensaje: "${messageText}"
            `);
            const response = await result.response;
            return response.text().trim().toUpperCase().includes('SI');
        } catch (e) {
            // Intentar fallback HTTP
            try {
                const httpMsg = await this.generateViaHttp(this.model.model, `
                Analiza si el siguiente mensaje es una respuesta automática de un bot de WhatsApp.
                Responde SOLO "SI" o "NO".
                
                Mensaje: "${messageText}"
            `);
                if (httpMsg) return httpMsg.trim().toUpperCase().includes('SI');
            } catch (httpErr) { }

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
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            return response.text().trim();
        } catch (e) {
            // Intentar fallback HTTP
            try {
                const httpMsg = await this.generateViaHttp(this.model.model, prompt);
                if (httpMsg) return httpMsg;
            } catch (httpErr) { }

            return "Vi que tenés respuesta automática. Nosotros implementamos bots con IA que responden dudas reales y cierran ventas, no solo saludan. ¿Te muestro la diferencia?";
        }
    }

    /**
     * Obtener plantilla según categoría
     */
    getTemplateForBusiness(category) {
        if (!category) return this.templates.default;

        const cat = category.toLowerCase();

        if (cat.includes('dent') || cat.includes('odont')) return this.templates.odontologia;
        if (cat.includes('bell') || cat.includes('estet') || cat.includes('salon')) return this.templates.belleza;
        if (cat.includes('salud') || cat.includes('medic') || cat.includes('clinic')) return this.templates.salud;
        if (cat.includes('restaurant') || cat.includes('comida')) return this.templates.restaurante;

        return this.templates.default;
    }

    /**
     * Estimar tokens (aproximado)
     */
    estimateTokens(text) {
        return Math.ceil(text.length / 4);
    }

    /**
     * Limpiar cache
     */
    clearCache() {
        this.messageCache.clear();
        console.log('🧹 Cache de mensajes limpiado');
    }

    /**
     * Estadísticas
     */
    getStats() {
        return {
            ...this.stats,
            cacheSize: this.messageCache.size,
            cacheHitRate: this.stats.apiCalls > 0 ?
                ((this.stats.cacheHits / (this.stats.apiCalls + this.stats.cacheHits)) * 100).toFixed(1) + '%' :
                '0%',
            estimatedDailyCost: '$0.00 (FREE)', // Gemini es gratis
            tokensPerDay: this.stats.tokensUsed
        };
    }
}

module.exports = AITextGenerator;
