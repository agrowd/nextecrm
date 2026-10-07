/**
 * Helper HTTP seguro (usa native fetch en Node 18+ con fallback)
 */
async function postJson(url, data, headers, timeoutMs = 12000) {
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

/**
 * 🧠 AGENTE 2 & 3: ANALIZADOR DE DOLORES Y ESTRATEGA DE OFERTA
 * 
 * Analiza reseñas públicas de Google Maps, datos de auditoría técnica web y rubro comercial
 * para descubrir cuellos de botella reales y formular un Dossier de Venta hiper-personalizado.
 */

class PainAnalyzer {
    constructor() {
        this.apiKey = process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY || '';
        this.model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    }

    /**
     * Analiza un lead y genera su Dossier Estratégico
     * @param {Object} lead - Datos completos del lead
     * @returns {Promise<Object>} Dossier estructurado
     */
    async analyzeLead(lead) {
        if (!lead || !lead.name) {
            throw new Error('Lead inválido para análisis de dolores');
        }

        const cleanName = (lead.name || '').split('|')[0].replace(/[^\w\s\u00C0-\u017F]/gi, ' ').trim();
        const category = (lead.category || '').toLowerCase();
        const reviews = Array.isArray(lead.reviews) ? lead.reviews : [];
        const webAudit = lead.webAudit || {};
        const hasWeb = !!(lead.website && lead.website.trim().length > 0);

        // 1. Intentar análisis profundo con LLM si hay API Key disponible
        if (this.apiKey) {
            try {
                const aiDossier = await this.analyzeWithLLM(lead, cleanName, category, reviews, webAudit, hasWeb);
                if (aiDossier && aiDossier.primaryPain) {
                    return {
                        analyzedAt: new Date(),
                        ...aiDossier,
                        confidence: aiDossier.confidence || 0.85
                    };
                }
            } catch (err) {
                console.warn(`⚠️ [PainAnalyzer] Falló análisis con IA para ${cleanName}: ${err.message}. Aplicando heurística.`);
            }
        }

        // 2. Fallback Heurístico Inteligente (Determinístico de Alta Precisión)
        return this.analyzeWithHeuristics(lead, cleanName, category, reviews, webAudit, hasWeb);
    }

    /**
     * Inferencia profunda con OpenAI (gpt-4o-mini)
     */
    async analyzeWithLLM(lead, cleanName, category, reviews, webAudit, hasWeb) {
        // Extraer textos de reseñas relevantes (hasta 8 reseñas)
        const reviewsSummary = reviews.slice(0, 8).map((r, i) => {
            const stars = r.rating ? `${r.rating}★` : '';
            return `[${i + 1}] (${stars}) ${r.text || ''}`;
        }).filter(t => t.length > 10).join('\n');

        const webDetails = hasWeb
            ? `URL: ${lead.website} | CMS: ${webAudit.cms || 'Desconocido'} | SSL: ${webAudit.ssl ? 'Sí' : 'No'} | Widget WhatsApp: ${webAudit.hasWhatsAppWidget ? 'Sí' : 'No'} | GA4: ${webAudit.hasGA4 ? 'Sí' : 'No'} | Meta Pixel: ${webAudit.hasMetaPixel ? 'Sí' : 'No'}`
            : 'NO TIENE SITIO WEB';

        const prompt = `
Eres un Director Comercial y Arquitecto de Software en Nexte (agencia B2B de software, páginas web y automatización con IA en Argentina).
Tu objetivo es analizar un negocio captado de Google Maps, detectar sus dolores o cuellos de botella operativos reales y definir la estrategia comercial exacta para contactarlos por WhatsApp.

DATOS DEL NEGOCIO:
- Nombre: ${cleanName}
- Rubro/Categoría: ${lead.category || 'Comercio/Servicios'}
- Ubicación: ${lead.location || 'Argentina'}
- Calificación: ${lead.rating || 'N/A'}⭐ (${lead.reviewCount || 0} opiniones)
- Presencia Web: ${webDetails}
- Reseñas de Clientes en Google Maps:
${reviewsSummary || 'Sin reseñas textuales disponibles.'}

SERVICIOS DE NEXTE DISPONIBLES:
1. "software_turnero": Sistema de turnos online, gestión de agendas y pacientes/clientes, recordatorios automáticos.
2. "ia_natoh": Asistente virtual en WhatsApp 24/7 entrenado a medida que responde consultas y agenda citas.
3. "web_express": Sitio web profesional e institucional + optimización de Google Maps SEO ($250k promo).
4. "rediseño_web": Rediseño web moderno, optimizado para celulares con botón flotante directo de WhatsApp ($250k-$350k).
5. "ecommerce": Tienda online con pasarela de pagos (Mercado Pago), catálogo y checkout sin intermediarios ($500k).

REGLAS DE DECISIÓN:
- Si el negocio NO tiene web y tiene buenas calificaciones: recomendar "web_express".
- Si es consultorio, clínica, estética, odontología, veterinaria, taller mecánico, o hay quejas de turnos o demoras en atención: recomendar "software_turnero" o "ia_natoh".
- Si venden ropa, repuestos, calzado, comida o productos y atienden manualmente por chat: recomendar "ecommerce".
- Si tienen web pero carece de WhatsApp widget o parece desactualizada: recomendar "rediseño_web".

INSTRUCCIÓN: Devuelve ÚNICAMENTE un objeto JSON válido con la siguiente estructura (sin markdown, sin bloques de código adicionales):
{
  "primaryPain": "Descripción breve y concisa del cuello de botella principal (máx 15 palabras)",
  "painPoints": ["Punto de fricción 1", "Punto de fricción 2", "Punto de fricción 3"],
  "targetService": "software_turnero | ia_natoh | web_express | rediseño_web | ecommerce",
  "targetServiceLabel": "Nombre amigable del servicio",
  "consultativeHook": "Frase de observación sutil y amable para el primer mensaje de WhatsApp en tono argentino profesional (máx 35 palabras, que no suene a vendedor invasivo sino a consultor experto)",
  "suggestedPitch": "Ángulo de propuesta de valor a destacar en el segundo y tercer mensaje",
  "suggestedOffer": "Precio sugerido y facilidades de pago",
  "confidence": 0.90
}
`;

        const response = await postJson('https://api.openai.com/v1/chat/completions', {
            model: this.model,
            messages: [
                { role: 'system', content: 'Eres un analista de negocios B2B experto en tecnología y ventas consultivas. Devuelves exclusivamente JSON puro.' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.3,
            max_tokens: 800
        }, {
            'Authorization': `Bearer ${this.apiKey}`
        }, 12000);

        const rawContent = response?.choices?.[0]?.message?.content || '';
        const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        throw new Error('Respuesta de OpenAI no contenía JSON válido');
    }

    /**
     * Motor de reglas heurísticas (cuando no hay API key o hay timeout)
     */
    analyzeWithHeuristics(lead, cleanName, category, reviews, webAudit, hasWeb) {
        const isHealthOrBeauty = ['odontol', 'dental', 'clinic', 'medic', 'salud', 'estet', 'peluquer', 'belleza', 'spa', 'veterin', 'psicol', 'kinesio', 'consultorio'].some(k => category.includes(k));
        const isEcommerceCandidate = ['tienda', 'ropa', 'indumentaria', 'calzado', 'mayorista', 'distribuidor', 'repuesto', 'bazar', 'joyer', 'muebl'].some(k => category.includes(k));
        const isGastronomy = ['restauran', 'bar', 'cafe', 'pizz', 'hamburgues', 'cervecer', 'helader', 'gastronom'].some(k => category.includes(k));

        let targetService = 'software_turnero';
        let targetServiceLabel = 'Sistema de Turnos & Gestión a Medida';
        let primaryPain = 'Gestión manual de reservas y atención telefónica saturada';
        let painPoints = ['Coordinación manual de horarios por chat', 'Tiempo perdido en confirmaciones', 'Falta de recordatorios automáticos'];
        let consultativeHook = `Noté que tienen excelente reputación en Google pero hoy en día muchos lugares de su rubro pierden horas coordinando citas a mano por WhatsApp.`;
        let suggestedPitch = 'Automatización integral de agendas con recordatorios automáticos y asistente virtual 24/7.';
        let suggestedOffer = 'Software a medida: Promo $350.000 en 2 pagos (regular $650.000).';

        if (!hasWeb) {
            targetService = 'web_express';
            targetServiceLabel = 'Sitio Web Profesional & SEO Google Maps';
            primaryPain = 'Sin presencia web oficial para captar clientes en búsquedas directas de Google';
            painPoints = ['Dependencia exclusiva de la ficha de Maps o redes', 'Falta de catálogo/servicios centralizado', 'Fuga de clientes hacia competidores con web'];
            consultativeHook = `Estuve viendo su excelente ficha en Google Maps (${lead.rating ? lead.rating + '⭐' : 'muy buenas opiniones'}), pero noté que aún no cuentan con un sitio web oficial donde mostrar todos sus servicios.`;
            suggestedPitch = 'Sitio web profesional rápido con dominio propio, hosting y botón directo de WhatsApp para convertir visitas.';
            suggestedOffer = 'Sitio Web Profesional: Promo $250.000 (regular $500.000) con dominio, hosting y SSL incluido.';
        } else if (webAudit.hasWhatsAppWidget === false) {
            targetService = 'rediseño_web';
            targetServiceLabel = 'Rediseño Web & Widget de Conversión';
            primaryPain = 'Sitio web sin canal directo e interactivo de conversión a WhatsApp';
            painPoints = ['Visitantes que navegan la web pero no inician conversación', 'Falta de llamadas a la acción directas en celulares', 'Sitio no optimizado para captación rápida'];
            consultativeHook = `Estuve revisando su sitio web (${lead.website}) y vi que no tienen un botón flotante directo de WhatsApp integrado para que los visitantes les escriban con un solo clic.`;
            suggestedPitch = 'Optimización web de alta conversión con integración directa de WhatsApp y medición de visitas.';
            suggestedOffer = 'Rediseño y Optimización Web: $250.000 en 2 cuotas.';
        } else if (isEcommerceCandidate) {
            targetService = 'ecommerce';
            targetServiceLabel = 'Tienda Online E-Commerce con Mercado Pago';
            primaryPain = 'Envío manual de precios, fotos y stock por mensaje en lugar de compras directas';
            painPoints = ['Atención manual repetitiva pasando catálogos', 'Cobros lentos por transferencia sin automatización', 'Pérdida de ventas fuera del horario comercial'];
            consultativeHook = `Vemos que muchos comercios de su rubro dedican horas pasando fotos y precios por chat, cuando podrían automatizar pedidos y cobros directos las 24 hs.`;
            suggestedPitch = 'Tienda online completa con catálogo, carrito y pagos integrados con Mercado Pago.';
            suggestedOffer = 'Tienda Online E-Commerce: Promo $500.000 (regular $800.000).';
        } else if (isHealthOrBeauty) {
            targetService = 'software_turnero';
            targetServiceLabel = 'Sistema de Turnos & Asistente IA NatoH';
            primaryPain = 'Cuello de botella en la asignación manual de turnos y reprogramaciones';
            painPoints = ['Mensajes acumulados fuera de horario', 'Pacientes que no asisten por falta de recordatorio', 'Sobrecarga de la recepción o secretaria'];
            consultativeHook = `Muchos centros y consultorios nos comentan lo desgastante que es coordinar turnos a mano por chat; ayudamos a automatizar la agenda con confirmación automática.`;
            suggestedPitch = 'Sistema de turnos interactivo con recordatorios por WhatsApp y asistente IA 24/7.';
            suggestedOffer = 'Combo Sistema de Turnos + Asistente IA: Promo $490.000 (regular $1.000.000).';
        } else if (isGastronomy) {
            targetService = 'ia_natoh';
            targetServiceLabel = 'Asistente Virtual IA NatoH 24/7 (Reservas y Menú)';
            primaryPain = 'Consultas constantes de carta, horarios y reservas saturando WhatsApp en horas pico';
            painPoints = ['Demoras en responder pedidos o reservas', 'Mensajes sin responder en horas pico de servicio', 'Menú desactualizado en PDF'];
            consultativeHook = `En horarios pico suele colapsar el WhatsApp con consultas de reservas y menú; desarrollamos asistentes virtuales que atienden y toman reservas automáticamente 24/7.`;
            suggestedPitch = 'Empleado virtual en WhatsApp entrenado con su carta, precios y protocolo de reservas.';
            suggestedOffer = 'Asistente IA NatoH: Promo $180.000 (regular $350.000).';
        }

        return {
            analyzedAt: new Date(),
            primaryPain,
            painPoints,
            targetService,
            targetServiceLabel,
            consultativeHook,
            suggestedPitch,
            suggestedOffer,
            confidence: 0.75
        };
    }
}

const defaultAnalyzer = new PainAnalyzer();

module.exports = {
    PainAnalyzer,
    analyzeLeadPains: (lead) => defaultAnalyzer.analyzeLead(lead)
};
