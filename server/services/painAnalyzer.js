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
        /distribuidor|mayorista|logistica|transporte|corralon|ferreteria|fabrica|metalurgic|clinica|policonsultorio|odontolog|estetica|depil|psicol|construc|arquitect|cancha|futbol|padel|predio|asociacion|fundacion|club|mutual|inmobiliaria|concesionaria|hotel|instituto|restaurante/.test(cat)
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

    // 1. Rubros B2B / PyMEs Operativas, Construcción y Asociaciones Civiles (Distribuidoras, Mayoristas, Constructoras, Asociaciones Civiles, Clubes, Fábricas)
    if (/distribuidor|mayorista|logistica|transporte|flete|corralon|ferreteria|fabrica|metalurgic|industria|repuesto|mayor|importador|papelera|quimica|frigorifico|maderera|construc|obra|desarrollador|asociacion|fundacion|mutual|cooperativa|sindicato|camara|federacion/.test(cat)) {
        targetService = 'software_custom_erp';
        targetServiceLabel = 'Doble Agente IA (Atención 24/7 + Gestor) + Sistema CRM y Gestión de Ingresos Incluido';
        primaryPain = 'Cotizaciones, toma de pedidos, padrón/clientes y gestión de ingresos llevados a mano por WhatsApp y planillas';
        painPoints.push('Tiempo perdido respondiendo consultas o audios y validando comprobantes de pago a mano');
        painPoints.push('Presupuestos o cobros enviados por WhatsApp que quedan sin seguimiento a las 24 hs ni control de ingresos en un CRM');
        if (!hasWeb) painPoints.push('Sin página web propia posicionada con SEO en Google Maps');

        consultativeHook = `Hola! ¿Cómo estás? Vimos a ${name} en Google Maps y el movimiento que manejan. Te hago una consulta cortita: ¿hoy los presupuestos, pedidos y la gestión de ingresos los siguen llevando a mano por WhatsApp y planillas?`;
        suggestedPitch = `En NatoH Systems ya desarrollamos sistemas así para empresas de construcción, distribuidoras, asociaciones civiles y complejos: el Agente IA #1 responde WhatsApp (texto, audios y comprobantes de pago) 24/7, y el Agente IA #2 carga cada pedido o presupuesto, hace seguimiento a las 24 hs y actualiza la Gestión de Ingresos en vivo.`;
        suggestedOffer = `Plan Doble Agente IA + CRM, Gestión de Ingresos y Web SEO incluidos $175.000/mes (o Agente IA Respondedor 24/7 $115.000/mes, o Sistema a Medida pago único $350.000 en 2 pagos).`;
    }
    // 2. Rubros de Salud, Bienestar, Psicología, Depilación, Predios de Fútbol y Servicios con Turnos (Odontología, Estética, Psicólogos, Depilación, Predios de Fútbol, Talleres)
    else if (/odont|dent|clinic|medic|salud|kinesi|psicol|terap|salud mental|veterin|peluquer|barber|estetic|spa|depil|cosmetolog|gimnasio|crossfit|pilates|taller|lubricentro|cancha|futbol|padel|predio|complejo deportivo|hotel|cabañ|alojamiento/.test(cat)) {
        targetService = 'software_turnero';
        targetServiceLabel = 'Doble Agente IA (Atención 24/7 + Gestor de Agenda y Señas) + Turnero, CRM y Gestión de Ingresos Incluido';
        primaryPain = !hasWeb
            ? (extPlat === 'instagram'
                ? 'Coordinan turnos y señas por Instagram/WhatsApp a mano sin un Agente IA que escuche audios, valide comprobantes y bloquee la agenda solo'
                : 'No cuentan con web SEO ni turnero automático en Google Maps; pierden horas respondiendo disponibilidad, cobrando señas y anotando turnos a mano')
            : 'Tienen web pero les falta el Doble Agente IA que atienda WhatsApp (texto/audios), valide señas por transferencia, bloquee el turno en la agenda y registre la Gestión de Ingresos';

        painPoints.push('Horas invertidas en escuchar audios, pasar precios, validar comprobantes de seña y coordinar horarios a mano');
        painPoints.push('Turnos o canchas vacías por cancelaciones sin seña validada ni recordatorio automático');
        if (!hasWeb) painPoints.push(extPlat ? `En Google Maps redirigen a ${extPlat} sin página web propia posicionada en Google` : 'Sin página web propia con SEO en su ficha de Google Maps');

        consultativeHook = !hasWeb
            ? `Hola! ¿Cómo estás? Vi a ${name} en Google Maps y te quería hacer una consulta cortita: ¿hoy la agenda de turnos, las señas y las consultas de precios por WhatsApp las siguen respondiendo y anotando a mano?`
            : `Hola! ¿Cómo estás? Estuve visitando la página de ${name} desde Google Maps y noté que aún no tienen un asistente que responda WhatsApp 24/7 (incluso audios), valide señas y agende los turnos solo. ¿Cómo manejan hoy la agenda y los cobros?`;

        suggestedPitch = `En NatoH Systems ya implementamos este sistema en consultorios odontológicos, centros de estética y depilación, psicólogos y predios de fútbol: el Agente IA #1 responde WhatsApp (texto, audios y comprobantes de seña) en 10 segundos 24/7, y el Agente IA #2 bloquea el turno en la agenda sin sobreturnos y registra cada pago en tu Gestión de Ingresos.`;
        suggestedOffer = `Plan Doble Agente IA + Turnero, Gestión de Ingresos, CRM y Web SEO incluidos $175.000/mes (o solo Agente IA Respondedor 24/7 $115.000/mes, o Turnero pago único $350.000 en 2 pagos).`;
    }
    // 3. Rubros Gastronómicos (Restaurantes, Bares, Cafeterías, Heladerías, Panaderías)
    else if (/restauran|bar|cervecer|cafe|helader|pizz|hamburgues|sushi|gastronom|parrill|pasteleria|panaderia|rotiseria|comida/.test(cat)) {
        targetService = 'gastronomia_pedidos';
        targetServiceLabel = 'Carta Digital QR + Agentes de IA Tomadores de Pedidos y Reservas (0% Comisión)';
        primaryPain = extPlat === 'pedidosya'
            ? 'Derivan sus clientes de Google Maps a apps de delivery pagando hasta 30% de comisión por pedido'
            : (!hasWeb
                ? 'Sin Carta QR interactiva ni Agente IA que tome pedidos y reservas directos en WhatsApp'
                : 'Falta de sistema de pedidos propios con Agente IA en WhatsApp sin comisiones');

        painPoints.push('Pérdida de ganancia en comisiones de apps o demora respondiendo el WhatsApp en hora pico');
        painPoints.push('Oportunidad de que un Agente IA tome el pedido o reserva y lo cargue directo en el sistema');

        consultativeHook = `Hola! ¿Cómo estás? Vi a ${name} en Google Maps y noté que ${extPlat === 'pedidosya' ? 'hoy el enlace lleva a una app que cobra comisión' : 'no tienen cargada una Carta Digital propia con recepción automática de pedidos en WhatsApp'}.`;
        suggestedPitch = `Armamos tu propia Carta Digital QR + Agentes de IA en WhatsApp: un Agente responde dudas y toma el pedido 24/7, y el segundo lo carga directo en tu pantalla de comandas y clientes con 0% de comisión.`;
        suggestedOffer = `Sistema de Pedidos QR pago único $350.000 (en 2 pagos) o Plan Mensual con Agentes de IA 24/7 desde $115.000/mes.`;
    }
    // 4. Inmobiliarias, Concesionarias, Institutos, Estudios Profesionales, Constructoras (Agentes IA + CRM + Gestión de Ingresos + Web SEO)
    else if (/inmobiliar|propiedad|concesionari|automotor|autos|instituto|academia|colegio|capacitacion|abogad|juridic|contabl|contador|arquitect|constructora|seguros|consultor/.test(cat)) {
        targetService = 'ia_natoh';
        targetServiceLabel = 'Doble Agente de IA (Respondedor 24/7 + Gestor de CRM e Ingresos) + CRM y Web SEO Incluidos';
        primaryPain = hasWeb
            ? 'Entran consultas y audios por WhatsApp y la web sin un Agente IA que responda en 10 segundos 24/7 ni un segundo Agente IA que cargue presupuestos, registre ingresos y haga seguimiento a las 24 hs en el CRM'
            : 'Sin página web propia posicionada en Google ni Agentes de IA que respondan consultas/audios 24/7 y ordenen el seguimiento de presupuestos e ingresos en un CRM';

        painPoints.push('Consultas o audios fuera de horario que se van con la competencia por no recibir respuesta en el acto');
        painPoints.push('Presupuestos y cobros que quedan sueltos en WhatsApp sin seguimiento automático a las 24 hs ni Gestión de Ingresos en un CRM');

        consultativeHook = `Hola! ¿Cómo estás? Vi a ${name} en Google Maps y te hago una consulta rápida: ¿les pasa que entran consultas o audios por WhatsApp fuera de horario y después quedan presupuestos abiertos sin seguimiento?`;
        suggestedPitch = `En NatoH Systems ya implementamos esta tecnología en empresas de construcción, consultorios, estética, predios deportivos y asociaciones civiles: el Agente IA #1 responde texto y audios en 10 segundos 24/7, y el Agente IA #2 carga cada interesado en tu CRM con Gestión de Ingresos y hace seguimiento automático a las 24 hs.`;
        suggestedOffer = `Agente IA Respondedor 24/7 por $115.000/mes, o Doble Agente IA + CRM, Gestión de Ingresos y Web SEO incluidos por $175.000/mes.`;
    }
    // 5. Comercio Minorista / E-Commerce (Indumentaria, Mueblerías, Deco, Electrónica)
    else if (/ropa|indumentaria|calzado|zapateria|muebler|colchon|decoracion| Bazar|electronica|computacion|jugueteria|joyeria|optica|regaleria|vivero|vinoteca/.test(cat)) {
        targetService = 'ecommerce';
        targetServiceLabel = 'Catálogo Web SEO + Doble Agente IA (Vendedor 24/7 + Gestor de CRM, Stock e Ingresos)';
        primaryPain = !hasWeb
            ? (extPlat === 'instagram'
                ? 'Venden por Instagram pero carecen de Catálogo Web SEO propio y de Agentes IA que respondan precios/audios 24/7, validen pagos y carguen pedidos en un CRM con Gestión de Ingresos'
                : 'Sin catálogo online posicionado en Google ni Agente IA que responda consultas de precios y anote pedidos e ingresos 24/7')
            : 'Tienen web pero les falta el Agente IA que responda precios/audios y valide comprobantes en WhatsApp 24/7 y el Agente que descuente stock y registre la Gestión de Ingresos en el CRM';

        painPoints.push('Horas contestando las mismas preguntas y audios de precios, talles, modelos y stock por WhatsApp');
        painPoints.push('Clientes que preguntan precio y quedan sin seguimiento a las 24 hs por no tener un Agente IA con CRM y Gestión de Ingresos');

        consultativeHook = `Hola! ¿Cómo estás? Estuve viendo a ${name} en Google Maps y te quería consultar: ¿hoy cuando les escriben o mandan audios por WhatsApp preguntando precios o stock llegan a contestar en el acto o se enfrían ventas?`;
        suggestedPitch = `En NatoH Systems te armamos tu Catálogo Web SEO + 2 Agentes de IA: el primero contesta precios, escucha audios y valida comprobantes en WhatsApp 24/7, y el segundo descuenta stock, registra la venta en Gestión de Ingresos y hace seguimiento a las 24 hs en tu CRM.`;
        suggestedOffer = `Catálogo Web SEO pago único $250.000 (en 2 pagos), Agente IA Respondedor $115.000/mes o Doble Agente IA + CRM y Gestión de Ingresos incluido $175.000/mes.`;
    }
    // 6. Caso General (Con o Sin Web)
    else if (!hasWeb) {
        targetService = 'web_express';
        targetServiceLabel = 'Página Web Profesional SEO + Doble Agente IA con CRM, Turnero y Gestión de Ingresos Incluido';
        primaryPain = isSocialOnly
            ? `En Google Maps solo tienen ${extPlat || 'redes sociales'} sin Página Web propia posicionada en Google ni Agente IA que atienda textos/audios y ordene ventas e ingresos en WhatsApp`
            : 'Negocio activo en Google Maps pero sin Página Web propia posicionada en Google ni sistema que atienda WhatsApp 24/7 y registre turnos, ventas y Gestión de Ingresos';
        painPoints.push('Clientes que buscan en Google y Google Maps no encuentran una Página Web profesional donde ver sus servicios');
        painPoints.push('Consultas, audios y comprobantes de WhatsApp atendidos 100% a mano sin Agente IA ni CRM con Gestión de Ingresos');

        consultativeHook = `Hola! ¿Cómo estás? Te escribo porque vimos a ${name} en Google Maps y notamos que aún figuran sin Página Web propia posicionada en Google. ¿Las consultas, presupuestos o turnos de WhatsApp los están manejando todos a mano?`;
        suggestedPitch = `En NatoH Systems —donde ya desarrollamos sistemas para odontólogos, centros de estética y depilación, psicólogos, constructoras, predios de fútbol y asociaciones civiles— te armamos tu Página Web Profesional SEO en 7 días, y podemos sumarte nuestros 2 Agentes de IA en WhatsApp (uno que responde textos/audios y valida señas 24/7, y otro que anota todo en un CRM o Turnero con Gestión de Ingresos).`;
        suggestedOffer = `Página Web Profesional SEO $250.000 pago único (50% y 50%), o Plan Mensual de Web + Doble Agente IA + CRM/Turnero y Gestión de Ingresos incluido desde $115.000 a $175.000/mes.`;
    } else {
        targetService = 'rediseño_web';
        targetServiceLabel = 'Doble Agente IA (Atención 24/7 + Gestor de CRM, Turnos e Ingresos) + Renovación Web SEO';
        const missingItems = [];
        if (!audit.hasWhatsAppWidget) missingItems.push('conexión directa a WhatsApp');
        if (!audit.hasBookingSystem) missingItems.push('asistente automático de atención y turnos');

        primaryPain = `Tienen página web activa, pero hoy no cuenta con un Agente de IA que atienda textos/audios y valide señas en segundos 24/7 ni un sistema CRM/Turnero con Gestión de Ingresos que siga a cada cliente automáticamente`;

        if (Array.isArray(audit.insights) && audit.insights.length > 0) {
            painPoints.push(...audit.insights.slice(0, 3));
        }

        consultativeHook = `Hola! ¿Cómo estás? Entré a la página web de ${name} desde Google Maps y vi que hoy quien los busca en Google no tiene un asistente que le responda en el acto ni conecte con una agenda o seguimiento automático en WhatsApp. ¿Cómo manejan hoy las consultas que entran?`;

        suggestedPitch = `En NatoH Systems —con experiencia real en odontología, estética y depilación, psicología, construcción, predios de fútbol y asociaciones civiles— sumamos 2 Agentes de IA en tu WhatsApp y Web: el primero responde texto y audios y valida señas en 10 segundos 24/7, y el segundo carga turnos, presupuestos y Gestión de Ingresos en tu propio CRM.`;
        suggestedOffer = `Agente IA Respondedor 24/7 $115.000/mes, Doble Agente IA + CRM/Turnero, Gestión de Ingresos y Web SEO incluidos $175.000/mes, o Renovación Web SEO pago único $250.000.`;
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

        const prompt = `Sos el Director de Consultoría B2B de "NatoH Systems" en Argentina.
Analizá este negocio extraído de Google Maps y devolvé un diagnóstico comercial hiper-preciso en JSON para venderle la solución exacta que necesita.

DATOS DEL NEGOCIO:
- Nombre: ${lead.name}
- Rubro / Categoría: ${lead.category || lead.keyword || 'Comercio / PyME'}
- Zona: ${lead.location || lead.address || 'Argentina'}
- Estado Digital / Web: ${webInfo}
- Contexto de dolores operativos: ${reviewsText}

REGLA CRÍTICA OBLIGATORIA:
- PROHIBIDO mencionar estrellas (⭐), calificaciones numéricas (ej. "5 ⭐", "3.8 ⭐") o cantidad de reseñas (ej. "sin reseñas", "pocas reseñas") en "primaryPain", "painPoints" o "consultativeHook".
- PROHIBIDO incluir URLs o dominios (.com, https://) en "consultativeHook" o "suggestedPitch".
- PROHIBIDO nombrar marcas o nombres propios de clientes anteriores: respaldá la autoridad mencionando de forma anónima nuestros desarrollos reales en **consultorios odontológicos, centros de estética y depilación, psicólogos, empresas de construcción, predios de fútbol, asociaciones civiles y sistemas de gestión de ingresos**.

CATÁLOGO DE SOLUCIONES NATOH SYSTEMS (Elegí la que genere mayor resultado para el dueño del negocio, usando lenguaje claro de dueño, SEO comercial y destacando las nuevas funciones de las demos en vivo: escucha de audios de WhatsApp, lectura de comprobantes de seña/pago, bloqueo de agenda sin sobreturnos, seguimiento a las 24 hs y Gestión de Ingresos):
1. "software_custom_erp": 2 Agentes de IA (uno que responde texto/audios y valida comprobantes 24/7 + otro que carga pedidos, sigue presupuestos a las 24 hs y registra cobros) + Sistema CRM, Stock y Gestión de Ingresos incluido — Plan mensual $175.000/mes o Sistema a medida pago único $350.000 (ideal empresas de construcción, distribuidoras, mayoristas, asociaciones civiles, corralones, fábricas).
2. "software_turnero": 2 Agentes de IA (uno que atiende dudas y audios y valida comprobantes de seña 24/7 + otro que bloquea el turno en la agenda sin sobreturnos, envía recordatorios y actualiza la Gestión de Ingresos) + Agenda de Turnos y CRM incluido — Plan mensual $175.000/mes o Turnero pago único $350.000 (ideal odontólogos, centros de estética, depilación definitiva, psicólogos, predios de fútbol y complejos deportivos, clínicas, veterinarias, talleres).
3. "gastronomia_pedidos": Carta Digital QR + 2 Agentes de IA en WhatsApp que escuchan audios, validan transferencias y cargan pedidos/reservas y Gestión de Ingresos con 0% comisión — Pago único $350.000 o Plan mensual con IA desde $115.000/mes.
4. "ia_natoh": 2 Agentes de IA en WhatsApp y Web (el Agente Respondedor 24/7 que atiende texto/audios y comprobantes en <15s + el Agente Gestor que carga y reactiva presupuestos a las 24 hs en el CRM con Gestión de Ingresos incluido) — $115.000/mes (Solo Respondedor) o $175.000/mes (Doble Agente + CRM/Turnero, Gestión de Ingresos y Web SEO incluidos).
5. "ecommerce": Catálogo / Tienda Online SEO + 2 Agentes de IA en WhatsApp que responden precios/audios 24/7, validan comprobantes, descuentan stock y anotan pedidos en el CRM con Gestión de Ingresos — Web SEO pago único $250.000 o Plan mensual con Agentes IA y CRM $175.000/mes.
6. "web_express": Página Web Profesional con SEO en Google llave en mano ($250.000 pago único sin abono) + opción de sumar Doble Agente de IA y CRM/Turnero con Gestión de Ingresos ($115.000 a $175.000/mes).
7. "rediseño_web": Renovación de Página Web SEO ($250.000) + Doble Agente de IA en WhatsApp y CRM/Turnero con Gestión de Ingresos incluido ($175.000/mes).

Devolvé ÚNICAMENTE un JSON válido con esta estructura exacta:
{
  "primaryPain": "Descripción concreta de 1 oración sobre su cuello de botella comercial u operativo real (SIN hablar de reseñas ni estrellas)",
  "painPoints": ["Dolor operativo 1", "Dolor operativo 2", "Oportunidad detectada 3"],
  "targetService": "software_custom_erp | software_turnero | gastronomia_pedidos | ia_natoh | ecommerce | web_express | rediseño_web",
  "targetServiceLabel": "Nombre comercial atractivo de la solución NatoH Systems",
  "consultativeHook": "Mensaje rompehielo de WhatsApp (máx 38 palabras, español argentino natural con voseo cercano, PROHIBIDO mencionar estrellas ⭐, calificaciones o reseñas, enfocándose en cómo manejan hoy sus turnos, pedidos, stock o web, terminando en una pregunta abierta)",
  "suggestedPitch": "Explicación de 1 párrafo corto de cómo el sistema de NatoH Systems le resuelve ese problema (SIN URLs)",
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
        const forbiddenRx = /reseña|estrella|calificaci[oó]n|⭐|★|https?:\/\/|natohsystems\.com|nextemarketing\.com/i;
        const safeHook = (parsed.consultativeHook && !forbiddenRx.test(parsed.consultativeHook))
            ? parsed.consultativeHook
            : baseDossier.consultativeHook;
        const safePains = Array.isArray(parsed.painPoints)
            ? parsed.painPoints.filter(p => !forbiddenRx.test(p))
            : [];

        return {
            analyzedAt: new Date(),
            primaryPain: (parsed.primaryPain && !forbiddenRx.test(parsed.primaryPain)) ? parsed.primaryPain : baseDossier.primaryPain,
            painPoints: safePains.length > 0 ? safePains : baseDossier.painPoints,
            targetService: parsed.targetService || baseDossier.targetService,
            targetServiceLabel: parsed.targetServiceLabel || baseDossier.targetServiceLabel,
            consultativeHook: safeHook,
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
