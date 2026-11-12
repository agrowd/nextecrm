/**
 * 🎯 AGENTE 3: ANALIZADOR DE DOLORES, SCORING B2B & GENERADOR DE DOSSIER (NatoH Systems)
 * 
 * Toma la ficha de Google Maps (categoría, rating, reseñas de clientes) y los datos
 * de la auditoría web (Agente 2) para diagnosticar el cuello de botella real del negocio,
 * calcular su Lead Score B2B (0-100) y recomendar el servicio ideal de NatoH Systems
 * (natohsystems.com / nextemarketing.com).
 */

const axios = require('axios');

const PAIN_KEYWORDS_DICTIONARY = [
    { regex: /no atienden|nunca atienden|imposible comunicarse|no contestan|tardan en responder|whatsapp/i, label: 'Demora o falta de respuesta en atención por WhatsApp/teléfono', boost: 15 },
    { regex: /turno|sobreturno|espera|demora|impuntual|agenda/i, label: 'Cuello de botella en gestión de turnos y tiempos de espera', boost: 15 },
    { regex: /pedido|envio|entrega|tardo|frio|equivocaron/i, label: 'Fricción operativa en toma de pedidos y coordinación de entregas', boost: 12 },
    { regex: /stock|no tenian|faltante|precio|presupuesto|cotizacion/i, label: 'Demora en cotizaciones, lista de precios o control de stock', boost: 15 },
    { regex: /sistema|caido|cobro|factura|administracion/i, label: 'Fallas en sistema administrativo, facturación o gestión interna', boost: 15 }
];

function extractReviewPainSignals(reviews = []) {
    if (!Array.isArray(reviews) || reviews.length === 0) return { signals: [], totalBoost: 0 };
    const found = new Set();
    let totalBoost = 0;

    for (const r of reviews) {
        const text = typeof r === 'string' ? r : (r?.text || '');
        if (!text) continue;
        for (const item of PAIN_KEYWORDS_DICTIONARY) {
            if (item.regex.test(text) && !found.has(item.label)) {
                found.add(item.label);
                totalBoost = Math.min(20, totalBoost + item.boost);
            }
        }
    }
    return { signals: Array.from(found), totalBoost };
}

/**
 * Calcula el Score B2B NatoH Systems (0 a 100) y el Priority Tier ('hot' | 'warm' | 'cold')
 */
function calculateLeadScore(lead, dossier = null) {
    let score = 20; // Base comercial
    const breakdown = [];

    // 1. Teléfono móvil validado para WhatsApp (+25)
    if (lead.phoneValidated || (lead.phone && String(lead.phone).startsWith('549'))) {
        score += 25;
        breakdown.push('📱 WhatsApp móvil verificado (+25)');
    }

    // 2. Rubro de Alto Ticket para NatoH Systems (+20)
    const cat = `${lead.category || ''} ${lead.keyword || ''}`.toLowerCase();
    const targetSvc = dossier?.targetService || lead.dossier?.targetService || '';
    if (
        targetSvc === 'software_custom_erp' ||
        targetSvc === 'software_turnero' ||
        targetSvc === 'ia_natoh' ||
        /distribuidor|mayorista|logistica|transporte|corralon|ferreteria|fabrica|metalurgic|clinica|policonsultorio|odontolog|estetica|inmobiliaria|concesionaria|hotel|instituto|restaurante/.test(cat)
    ) {
        score += 20;
        breakdown.push('🎯 Rubro B2B / PyME Objetivo NatoH (+20)');
    } else {
        score += 10;
        breakdown.push('🏢 Comercio PyME activo (+10)');
    }

    // 3. Brecha Digital / Oportunidad de Sistema o Web (+25 máx)
    const hasRealWeb = Boolean(lead.hasWebsite && lead.website && !lead.webAudit?.isSocialOnly);
    const extPlat = lead.externalPlatform || lead.webAudit?.externalPlatform || '';

    if (!hasRealWeb) {
        score += 22;
        if (extPlat === 'instagram' || extPlat === 'facebook') {
            breakdown.push('📸 Sin web propia: solo usa Instagram/Facebook (+22)');
        } else if (extPlat === 'linktree') {
            breakdown.push('🌳 Usa Linktree en vez de sistema/web propia (+22)');
        } else if (extPlat === 'pedidosya') {
            breakdown.push('🛵 Paga comisiones en app de delivery sin Carta QR propia (+22)');
        } else {
            breakdown.push('🌐 Sin sitio web ni sistema digital en Google Maps (+22)');
        }
    } else if (lead.webAudit) {
        let gapPts = 0;
        if (!lead.webAudit.hasWhatsAppWidget && !lead.webAudit.hasChatWidget) {
            gapPts += 10;
            breakdown.push('💬 Web sin automatización ni botón WhatsApp (+10)');
        }
        if (!lead.webAudit.hasBookingSystem) {
            gapPts += 6;
            breakdown.push('📅 Web sin sistema de turnos/autogestión (+6)');
        }
        if (!lead.webAudit.hasGA4 && !lead.webAudit.hasMetaPixel) {
            gapPts += 6;
            breakdown.push('📉 Web sin píxeles de medición publicitaria (+6)');
        }
        score += Math.min(20, gapPts || 8);
    }

    // 4. Tracción Comercial y Flujo de Caja (Reseñas y Rating en Google Maps) (+18 máx)
    const revCount = Number(lead.reviewCount) || 0;
    const rating = Number(lead.rating) || 0;
    if (revCount >= 30) {
        score += 13;
        breakdown.push(`📈 Alta tracción comercial: ${revCount} reseñas (+13)`);
    } else if (revCount >= 8) {
        score += 8;
        breakdown.push(`📊 Negocio validado: ${revCount} reseñas (+8)`);
    }
    if (rating >= 4.0) {
        score += 5;
        breakdown.push(`⭐ Buena reputación (${rating}★) (+5)`);
    }

    // 5. Dolores operativos detectados en reseñas reales (+15 máx)
    const reviewSignals = extractReviewPainSignals(lead.reviews);
    if (reviewSignals.totalBoost > 0) {
        score += Math.min(15, reviewSignals.totalBoost);
        breakdown.push(`🔍 Dolor operativo detectado en reseñas (+${Math.min(15, reviewSignals.totalBoost)})`);
    }

    const finalScore = Math.max(10, Math.min(100, Math.round(score)));
    const priorityTier = finalScore >= 75 ? 'hot' : (finalScore >= 50 ? 'warm' : 'cold');

    return {
        leadScore: finalScore,
        priorityTier,
        scoreBreakdown: breakdown
    };
}

function buildHeuristicDossier(lead) {
    const cat = `${lead.category || ''} ${lead.keyword || ''} ${lead.name || ''}`.toLowerCase();
    const extPlat = lead.externalPlatform || lead.webAudit?.externalPlatform || '';
    const isSocialOnly = Boolean(lead.webAudit?.isSocialOnly || ['instagram', 'facebook', 'linktree', 'whatsapp_link', 'pedidosya'].includes(extPlat));
    const hasWeb = Boolean((lead.hasWebsite || (lead.website && lead.website.trim() !== '')) && !isSocialOnly);
    const audit = lead.webAudit || {};
    const name = lead.name || 'su negocio';
    const reviewMining = extractReviewPainSignals(lead.reviews);

    let targetService = 'web_express';
    let targetServiceLabel = 'Sitio Web Corporativo + Automatización IA (NatoH Systems)';
    let primaryPain = 'Falta de vidriera digital propia y automatización de consultas en WhatsApp';
    const painPoints = [...reviewMining.signals];
    let consultativeHook = '';
    let suggestedPitch = '';
    let suggestedOffer = 'Web Corporativa Express $250.000 o Sistema / Agente IA desde $180.000 (2 pagos)';

    // 1. Rubros B2B / PyMEs Operativas (Distribuidoras, Mayoristas, Logística, Corralones, Fábricas, Repuestos)
    if (/distribuidor|mayorista|logistica|transporte|flete|corralon|ferreteria|fabrica|metalurgic|industria|repuesto|mayor|importador|papelera|quimica|frigorifico|maderera/.test(cat)) {
        targetService = 'software_custom_erp';
        targetServiceLabel = 'Sistema de Gestión ERP/CRM, Stock y Cotizador IA (NatoH Systems)';
        primaryPain = 'Gestión manual de pedidos, listas de precios, stock y cotizaciones por WhatsApp que frena la escala comercial';
        painPoints.push('Tiempo operativo perdido cotizando manualmente o buscando stock en planillas Excel');
        painPoints.push('Falta de portal B2B de pedidos o sistema centralizado a medida');
        if (!hasWeb) painPoints.push('Ausencia de catálogo web corporativo propio en Google Maps');

        consultativeHook = `Hola, ¿cómo estás? Te escribo porque vimos a ${name} en Google Maps y notamos la excelente trayectoria que tienen en el rubro. En NatoH Systems (natohsystems.com) desarrollamos sistemas de gestión a medida, control de stock/pedidos y agentes de IA en WhatsApp que cotizan en segundos para distribuidoras y empresas.`;
        suggestedPitch = `Implementar un Sistema de Gestión / Catálogo de Pedidos a medida en la nube junto con un Agente IA 24/7 en WhatsApp que responda disponibilidad, tome pedidos y centralice clientes.`;
        suggestedOffer = `Sistema de Gestión / Pedidos a Medida $350.000 (antes $600.000) + Agente IA WhatsApp $180.000 en 2 pagos (50% al iniciar y 50% contra entrega).`;
    }
    // 2. Rubros de Salud, Turnos y Servicios con Agenda (Clínicas, Odontología, Estética, Veterinaria, Talleres, Hoteles, Gimnasios)
    else if (/odont|dent|clinic|medic|salud|kinesi|psicol|veterin|peluquer|barber|estetic|spa|depil|gimnasio|crossfit|pilates|taller|lubricentro|cancha|futbol|padel|hotel|cabañ|alojamiento/.test(cat)) {
        targetService = 'software_turnero';
        targetServiceLabel = 'Sistema de Gestión de Turnos/Reservas + Agente IA WhatsApp (NatoH Systems)';
        primaryPain = !hasWeb
            ? (extPlat === 'instagram'
                ? 'Centralizan turnos por Instagram/WhatsApp manual sin un sistema propio que agende 24/7 y envíe recordatorios'
                : 'No cuentan con web ni turnero online en Google Maps; toda la coordinación de turnos recae en responder mensajes a mano')
            : 'Tienen presencia web pero carecen de un sistema automatizado de turnos y asistente IA que confirme asistencias por WhatsApp';

        painPoints.push('Horas de recepción invertidas en coordinar y reprogramar horarios manualmente');
        painPoints.push('Ausentismo de clientes/pacientes por falta de recordatorios automáticos por WhatsApp');
        if (!hasWeb) painPoints.push(extPlat ? `En Google Maps redirigen a ${extPlat} sin dominio web propio` : 'Sin sitio web propio en su ficha de Google Maps');

        consultativeHook = !hasWeb
            ? `Hola, ¿cómo estás? Vi a ${name} en Google Maps${lead.rating ? ` (¡felicitaciones por las ${lead.rating}⭐!)` : ''} y noté que hoy gestionan las consultas de forma manual sin un sistema de turnos web propio. ¿Les pasa que pierden mucho tiempo coordinando horarios por WhatsApp?`
            : `Hola, ¿cómo estás? Estuve visitando la web de ${name} desde Google Maps y vi que tienen muy buena reputación, pero noté que aún no tienen integrado un turnero automático con recordatorios por WhatsApp.`;

        suggestedPitch = `En NatoH Systems desarrollamos un Sistema de Turnos y Gestión de Clientes a medida + Agente IA 24/7 en WhatsApp que agenda solo, envía recordatorios automáticos y reduce un 40% las inasistencias.`;
        suggestedOffer = `Sistema de Turnos & Gestión $350.000 (antes $600.000) o Agente IA WhatsApp 24/7 $180.000, abonando 50% al iniciar y 50% al entregar.`;
    }
    // 3. Rubros Gastronómicos (Restaurantes, Bares, Cafeterías, Heladerías, Panaderías)
    else if (/restauran|bar|cervecer|cafe|helader|pizz|hamburgues|sushi|gastronom|parrill|pasteleria|panaderia|rotiseria|comida/.test(cat)) {
        targetService = 'gastronomia_pedidos';
        targetServiceLabel = 'Carta Digital QR + Sistema de Pedidos y Reservas (0% Comisión)';
        primaryPain = extPlat === 'pedidosya'
            ? 'Derivan sus clientes de Google Maps a apps de delivery pagando hasta 30% de comisión por pedido'
            : (!hasWeb
                ? 'Sin Carta QR interactiva ni sistema de pedidos directos en su ficha de Google Maps'
                : 'Falta de sistema de pedidos propios por WhatsApp y reservas automatizadas sin comisiones');

        painPoints.push('Pérdida de margen por comisiones de plataformas externas o demora tomando pedidos por chat');
        painPoints.push('Oportunidad de recibir el pedido ya armado y calculado directo en el WhatsApp del local');

        consultativeHook = `Hola, ¿cómo estás? Vi a ${name} en Google Maps${lead.reviewCount ? ` con más de ${lead.reviewCount} reseñas` : ''} y noté que ${extPlat === 'pedidosya' ? 'hoy el enlace lleva a una app con comisión' : 'no tienen cargada una Carta Digital interactiva propia para pedidos directos'}.`;
        suggestedPitch = `Implementar su propio Sistema de Pedidos con Carta QR y Reservas de NatoH Systems: el cliente elige del menú, calcula el envío y el pedido entra listo al WhatsApp del local con 0% de comisión.`;
        suggestedOffer = `Sistema Gastronómico QR + Pedidos Directos $350.000 (pago único en 2 cuotas, sin comisiones mensuales).`;
    }
    // 4. Inmobiliarias, Concesionarias, Institutos, Estudios Profesionales (Agentes IA + CRM + Web)
    else if (/inmobiliar|propiedad|concesionari|automotor|autos|instituto|academia|colegio|capacitacion|abogad|juridic|contabl|contador|arquitect|constructora|seguros|consultor/.test(cat)) {
        targetService = hasWeb ? 'ia_natoh' : 'web_express';
        targetServiceLabel = hasWeb
            ? 'Agente de IA Conversacional 24/7 + CRM de Seguimiento (NatoH Systems)'
            : 'Portal Web Corporativo + Agente IA Calificador en WhatsApp';
        primaryPain = hasWeb
            ? 'Tráfico en Google Maps y web sin un Agente IA que filtre consultas, responda al instante 24/7 y agende entrevistas'
            : 'En un rubro de alta confianza y ticket alto, no contar con un portal web corporativo propio en Google Maps resta autoridad frente a competidores';

        painPoints.push('Consultas fuera de horario comercial que se enfrían antes de recibir respuesta');
        painPoints.push('Falta de pre-calificación automática de prospectos en WhatsApp');

        consultativeHook = hasWeb
            ? `Hola, ¿cómo estás? Estuve viendo la presencia de ${name} en Google Maps y su sitio web. Noté que aún no tienen un Agente con Inteligencia Artificial en WhatsApp que pre-califique consultas y agende reuniones 24/7.`
            : `Hola, ¿cómo estás? Vi el perfil de ${name} en Google Maps y noté que, pese a las buenas referencias, hoy no cuentan con un portal web corporativo propio vinculado a la ficha.`;
        suggestedPitch = `Desarrollar con NatoH Systems (natohsystems.com) su portal corporativo de alta conversión y/o un Agente IA entrenado con la información de su empresa para atender y filtrar clientes 24/7 en WhatsApp.`;
        suggestedOffer = `Portal Web Corporativo $250.000 o Agente IA WhatsApp 24/7 $180.000 (en 2 pagos sin interés).`;
    }
    // 5. Comercio Minorista / E-Commerce (Indumentaria, Mueblerías, Deco, Electrónica)
    else if (/ropa|indumentaria|calzado|zapateria|muebler|colchon|decoracion| Bazar|electronica|computacion|jugueteria|joyeria|optica|regaleria|vivero|vinoteca/.test(cat)) {
        targetService = 'ecommerce';
        targetServiceLabel = 'Catálogo E-Commerce + Asistente de Ventas IA en WhatsApp';
        primaryPain = !hasWeb
            ? (extPlat === 'instagram'
                ? 'Venden por Instagram pero carecen de una Tienda/Catálogo Web propio en Google Maps con carrito directo a WhatsApp'
                : 'Sin catálogo online en Google Maps para que los clientes vean productos y compren desde el celular')
            : 'Tienen tienda/web pero les falta automatizar las consultas de precios y stock por WhatsApp con IA';

        painPoints.push('Consultas repetitivas por talles, modelos y precios en WhatsApp e Instagram');
        painPoints.push('Falta de catálogo autogestionable conectado al WhatsApp de ventas');

        consultativeHook = `Hola, ¿cómo estás? Vi el local de ${name} en Google Maps${extPlat === 'instagram' ? ' y su perfil de Instagram' : ''}, y noté que hoy no tienen un catálogo web propio donde el cliente pueda armar su pedido y enviarlo listo a su WhatsApp.`;
        suggestedPitch = `Crear una Tienda / Catálogo Online autogestionable junto con nuestro Agente IA NatoH que responde precios y stock las 24 hs.`;
        suggestedOffer = `Catálogo Web / E-Commerce $250.000 o Asistente IA WhatsApp $180.000 (50% al iniciar y 50% al entregar).`;
    }
    // 6. Caso General (Con o Sin Web)
    else if (!hasWeb) {
        targetService = 'web_express';
        targetServiceLabel = 'Sitio Web Profesional + Embudo WhatsApp (NatoH Systems)';
        primaryPain = isSocialOnly
            ? `En Google Maps redirigen a ${extPlat || 'redes sociales'} en vez de contar con un sitio web corporativo propio`
            : 'Negocio activo en Google Maps pero sin sitio web propio (pierde clientes que buscan validar sus servicios)';
        painPoints.push('Clientes que buscan en Google Maps no encuentran una web oficial donde ver servicios y contactar rápido');
        painPoints.push('Dependencia de atención manual sin filtro automático en WhatsApp');

        consultativeHook = `Hola, ¿cómo estás? Te contacto porque encontramos a ${name} en Google Maps${lead.rating ? ` con ${lead.rating}⭐ de calificación` : ''}, pero vimos que figura sin sitio web oficial propio. Hoy muchos clientes miran la web antes de escribir.`;
        suggestedPitch = `En NatoH Systems & Nexte diseñamos sitios web profesionales rápidos, adaptados a celulares y con embudo directo a WhatsApp o sistema a medida, listos en 7 días.`;
        suggestedOffer = `Sitio Web Profesional $250.000 (antes $500.000) o Combo Web + Asistente IA 24/7, en 2 pagos.`;
    } else {
        targetService = 'rediseño_web';
        targetServiceLabel = 'Optimización Web + Agente IA WhatsApp 24/7 (NatoH Systems)';
        const missingItems = [];
        if (!audit.hasWhatsAppWidget) missingItems.push('botón interactivo de WhatsApp');
        if (!audit.hasGA4 && !audit.hasMetaPixel) missingItems.push('píxeles de seguimiento (Meta/Google)');
        if (!audit.ssl) missingItems.push('certificado de seguridad SSL');

        primaryPain = missingItems.length > 0
            ? `Tienen web (${audit.cms || 'activa'}), pero detectamos que carece de ${missingItems.join(' y ')}`
            : `Tienen web activa, con oportunidad de sumar un Agente IA 24/7 o Sistema de Gestión NatoH para automatizar atención`;

        if (Array.isArray(audit.insights) && audit.insights.length > 0) {
            painPoints.push(...audit.insights.slice(0, 3));
        }

        consultativeHook = missingItems.length > 0
            ? `Hola, ¿cómo estás? Estuve visitando el sitio web de ${name} desde Google Maps y noté un detalle técnico importante: hoy la página no tiene ${missingItems[0]}, lo que suele hacer que muchas visitas se vayan sin escribirles.`
            : `Hola, ¿cómo estás? Vi el perfil y la web de ${name} en Google Maps. Te escribo de NatoH Systems porque estamos implementando Agentes de IA en WhatsApp y sistemas a medida para empresas de ${lead.location || 'la zona'} que quieren automatizar su atención 24/7.`;

        suggestedPitch = `Optimizar su captación digital e integrar un Agente IA en WhatsApp o sistema a medida que atienda consultas las 24 hs y derive solo clientes listos para comprar.`;
        suggestedOffer = `Asistente IA WhatsApp 24/7 $180.000 o Renovación Web / Sistema desde $250.000 en 2 pagos.`;
    }

    const dossier = {
        analyzedAt: new Date(),
        primaryPain,
        painPoints: Array.from(new Set(painPoints)).slice(0, 4),
        targetService,
        targetServiceLabel,
        consultativeHook,
        suggestedPitch,
        suggestedOffer,
        confidence: 0.88
    };

    return dossier;
}

async function analyzeLeadPains(lead) {
    const baseDossier = buildHeuristicDossier(lead);
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey || apiKey === 'your-api-key' || apiKey.trim() === '') {
        return baseDossier;
    }

    try {
        const reviewsText = Array.isArray(lead.reviews) && lead.reviews.length > 0
            ? lead.reviews.slice(0, 6).map(r => typeof r === 'string' ? r : (r.text || '')).filter(Boolean).join(' | ')
            : 'Sin texto de reseñas disponible';

        const webInfo = lead.hasWebsite && !lead.webAudit?.isSocialOnly
            ? `Tiene Web (${lead.website}). CMS: ${lead.webAudit?.cms || 'N/A'}. WhatsApp Widget: ${lead.webAudit?.hasWhatsAppWidget ? 'Sí' : 'No'}. Turnero: ${lead.webAudit?.hasBookingSystem ? 'Sí' : 'No'}. GA4: ${lead.webAudit?.hasGA4 ? 'Sí' : 'No'}. Meta Pixel: ${lead.webAudit?.hasMetaPixel ? 'Sí' : 'No'}. Hallazgos: ${(lead.webAudit?.insights || []).join('; ')}`
            : (lead.webAudit?.isSocialOnly || lead.externalPlatform
                ? `NO tiene sitio web propio (en Google Maps puso un link a: ${lead.externalPlatform || lead.website}).`
                : 'NO tiene sitio web registrado en Google Maps.');

        const prompt = `Sos el Director de Consultoría B2B de "NatoH Systems" (https://natohsystems.com) y "Nexte Marketing" (https://nextemarketing.com) en Argentina.
Analizá este negocio extraído de Google Maps y devolvé un diagnóstico comercial hiper-preciso en JSON para venderle la solución exacta que necesita.

DATOS DEL NEGOCIO:
- Nombre: ${lead.name}
- Rubro / Categoría: ${lead.category || lead.keyword || 'Comercio / PyME'}
- Zona: ${lead.location || lead.address || 'Argentina'}
- Calificación Maps: ${lead.rating || 'N/A'} ⭐ (${lead.reviewCount || 0} reseñas)
- Estado Digital / Web: ${webInfo}
- Reseñas reales de clientes: ${reviewsText}

CATÁLOGO DE SOLUCIONES NATOH SYSTEMS (Elegí la que genere mayor ROI para este negocio):
1. "software_custom_erp": Sistema de Gestión a Medida (ERP, Stock, Pedidos Mayoristas, Cotizador, Logística, CRM) — Promo $350.000 (ideal distribuidoras, corralones, fábricas, logística, mayoristas, empresas con operación compleja).
2. "software_turnero": Sistema de Turnos Online, Agenda Profesional y Recordatorios por WhatsApp — Promo $350.000 (ideal clínicas, odontólogos, estética, veterinarias, talleres, gimnasios, hoteles).
3. "gastronomia_pedidos": Carta Digital QR + Sistema de Pedidos Directos por WhatsApp con 0% comisión — Promo $350.000 (ideal restaurantes, bares, cafeterías, heladerías).
4. "ia_natoh": Agente de IA Conversacional 24/7 en WhatsApp (responde dudas, cotiza, califica leads y agenda reuniones) — Promo $180.000 (ideal inmobiliarias, concesionarias, institutos o negocios que ya tienen buena web pero tardan en contestar).
5. "ecommerce": Tienda Online / Catálogo E-Commerce con carrito a WhatsApp — Promo $250.000 (ideal indumentaria, mueblerías, deco, comercios de productos).
6. "web_express": Sitio Web Corporativo de Alta Conversión (cuando NO tienen web o solo tienen Instagram/Linktree) — Promo $250.000.
7. "rediseño_web": Modernización Web + Botón WhatsApp + Píxeles de Conversión — Promo $250.000.

Devolvé ÚNICAMENTE un JSON válido con esta estructura exacta:
{
  "primaryPain": "Descripción concreta de 1 oración sobre su cuello de botella comercial u operativo real",
  "painPoints": ["Dolor específico 1", "Dolor específico 2", "Oportunidad detectada 3"],
  "targetService": "software_custom_erp | software_turnero | gastronomia_pedidos | ia_natoh | ecommerce | web_express | rediseño_web",
  "targetServiceLabel": "Nombre comercial atractivo de la solución NatoH Systems",
  "consultativeHook": "Mensaje rompehielo de WhatsApp (máx 40 palabras, español argentino natural con voseo respetuoso, mencionando un dato real de su ficha de Maps, reseñas o web y terminando en una pregunta abierta sin parecer robot)",
  "suggestedPitch": "Explicación de 1 párrafo corto de cómo el sistema de NatoH Systems (natohsystems.com) le resuelve ese problema",
  "suggestedOffer": "Oferta puntual con el precio promo correspondiente y pago 50% al iniciar / 50% contra entrega"
}`;

        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }],
                response_format: { type: 'json_object' },
                temperature: 0.5,
                max_tokens: 550
            },
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 12000
            }
        );

        const parsed = JSON.parse(response.data.choices[0].message.content);
        return {
            analyzedAt: new Date(),
            primaryPain: parsed.primaryPain || baseDossier.primaryPain,
            painPoints: Array.isArray(parsed.painPoints) && parsed.painPoints.length > 0 ? parsed.painPoints : baseDossier.painPoints,
            targetService: parsed.targetService || baseDossier.targetService,
            targetServiceLabel: parsed.targetServiceLabel || baseDossier.targetServiceLabel,
            consultativeHook: parsed.consultativeHook || baseDossier.consultativeHook,
            suggestedPitch: parsed.suggestedPitch || baseDossier.suggestedPitch,
            suggestedOffer: parsed.suggestedOffer || baseDossier.suggestedOffer,
            confidence: 0.95
        };
    } catch (error) {
        console.warn('⚠️ [Agente 3] Fallback heurístico activado:', error.message);
        return baseDossier;
    }
}

module.exports = {
    analyzeLeadPains,
    buildHeuristicDossier,
    calculateLeadScore,
    extractReviewPainSignals
};
