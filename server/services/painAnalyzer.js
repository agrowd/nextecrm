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
        targetServiceLabel = 'Doble Agente IA (Respondedor 24/7 + Gestor) + Sistema CRM y Pedidos Incluido';
        primaryPain = 'Consultas de precios, toma de pedidos y seguimiento de presupuestos hechos a mano por WhatsApp y planillas';
        painPoints.push('Tiempo perdido pasando precios o revisando stock a mano en vez de tener respuesta en segundos');
        painPoints.push('Presupuestos enviados por WhatsApp que quedan sin seguimiento ni registro en un CRM');
        if (!hasWeb) painPoints.push('Sin catálogo o página web propia en Google Maps');

        consultativeHook = `Hola! ¿Cómo estás? Vimos a ${name} en Google Maps y el movimiento que manejan en el rubro. Te hago una consulta cortita: ¿hoy las consultas de precios, los pedidos y el seguimiento de clientes los llevan a mano por WhatsApp y planillas?`;
        suggestedPitch = `Instalar 2 Agentes de IA + tu propio Sistema CRM y de Pedidos incluido: un Agente IA responde precios y dudas en WhatsApp las 24 hs, y el segundo Agente IA carga cada pedido y hace seguimiento automático en el sistema.`;
        suggestedOffer = `Servicio mensual Doble Agente IA + CRM/Sistema incluido $175.000/mes (o Agente IA Respondedor 24/7 $115.000/mes, o Sistema a Medida de pago único $350.000 en 2 pagos).`;
    }
    // 2. Rubros de Salud, Turnos y Servicios con Agenda (Clínicas, Odontología, Estética, Veterinaria, Talleres, Hoteles, Gimnasios)
    else if (/odont|dent|clinic|medic|salud|kinesi|psicol|veterin|peluquer|barber|estetic|spa|depil|gimnasio|crossfit|pilates|taller|lubricentro|cancha|futbol|padel|hotel|cabañ|alojamiento/.test(cat)) {
        targetService = 'software_turnero';
        targetServiceLabel = 'Doble Agente IA (Atención 24/7 + Gestor de Agenda) + Turnero y CRM Incluido';
        primaryPain = !hasWeb
            ? (extPlat === 'instagram'
                ? 'Coordinan turnos por Instagram/WhatsApp a mano sin un Agente IA que responda en el acto y agende solo en el turnero'
                : 'No cuentan con web ni turnero automático en Google Maps; pierden horas respondiendo horarios y anotando turnos a mano')
            : 'Tienen web pero carecen de los 2 Agentes IA que respondan en WhatsApp 24/7, anoten el turno en la agenda y manden recordatorios';

        painPoints.push('Horas de recepción invertidas en pasar precios y coordinar horarios a mano por WhatsApp');
        painPoints.push('Pacientes/clientes que faltan al turno por no recibir recordatorio automático el día anterior');
        if (!hasWeb) painPoints.push(extPlat ? `En Google Maps redirigen a ${extPlat} sin página web propia` : 'Sin página web propia en su ficha de Google Maps');

        consultativeHook = !hasWeb
            ? `Hola! ¿Cómo estás? Vi a ${name} en Google Maps y te quería hacer una consulta cortita: ¿hoy los turnos y las dudas de precios por WhatsApp los siguen contestando y anotando todos a mano?`
            : `Hola! ¿Cómo estás? Estuve visitando la página de ${name} desde Google Maps y noté que aún no tienen un asistente que responda WhatsApp 24/7 y agende los turnos solo con recordatorios. ¿Cómo manejan hoy los turnos?`;

        suggestedPitch = `En NatoH Systems instalamos 2 Agentes de IA + Agenda de Turnos y CRM incluido: el primer Agente IA responde dudas y precios en WhatsApp en 10 segundos 24/7, y el segundo Agente IA anota el turno solo y envía recordatorios automáticos.`;
        suggestedOffer = `Plan Doble Agente IA + Turnero/CRM y Web incluidos $175.000/mes (o solo Agente IA Respondedor 24/7 $115.000/mes, o Turnero pago único $350.000 en 2 pagos).`;
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
    // 4. Inmobiliarias, Concesionarias, Institutos, Estudios Profesionales (Agentes IA + CRM + Web)
    else if (/inmobiliar|propiedad|concesionari|automotor|autos|instituto|academia|colegio|capacitacion|abogad|juridic|contabl|contador|arquitect|constructora|seguros|consultor/.test(cat)) {
        targetService = 'ia_natoh';
        targetServiceLabel = 'Doble Agente de IA (Respondedor 24/7 + Gestor de CRM) + CRM y Web Incluidos';
        primaryPain = hasWeb
            ? 'Entran consultas por WhatsApp y la web sin un Agente IA que responda en 10 segundos 24/7 ni un segundo Agente IA que cargue y haga seguimiento en un CRM'
            : 'Sin página web propia en Google Maps ni Agentes de IA que respondan consultas 24/7 y ordenen el seguimiento de interesados en un CRM';

        painPoints.push('Consultas fuera de horario o fines de semana que se van con otro por no recibir respuesta rápida');
        painPoints.push('Interesados y presupuestos que quedan sueltos en el chat de WhatsApp sin seguimiento en un CRM');

        consultativeHook = `Hola! ¿Cómo estás? Vi a ${name} en Google Maps y te hago una consulta rápida: ¿les pasa que entran consultas por WhatsApp fuera de horario o mientras están ocupados y después quedan interesados sin seguimiento?`;
        suggestedPitch = `Instalamos 2 Empleados con IA para tu negocio: un Agente IA Vendedor que contesta WhatsApp y tu Web en 10 segundos las 24 hs, y un Agente IA Gestor que carga cada interesado en el CRM que te incluimos y hace seguimiento automático.`;
        suggestedOffer = `Agente IA Respondedor 24/7 por $115.000/mes, o Doble Agente IA + CRM y Web incluidos por $175.000/mes.`;
    }
    // 5. Comercio Minorista / E-Commerce (Indumentaria, Mueblerías, Deco, Electrónica)
    else if (/ropa|indumentaria|calzado|zapateria|muebler|colchon|decoracion| Bazar|electronica|computacion|jugueteria|joyeria|optica|regaleria|vivero|vinoteca/.test(cat)) {
        targetService = 'ecommerce';
        targetServiceLabel = 'Catálogo Web + Doble Agente IA (Vendedor 24/7 + Gestor de CRM y Pedidos)';
        primaryPain = !hasWeb
            ? (extPlat === 'instagram'
                ? 'Venden por Instagram pero carecen de Catálogo Web propio y de Agentes IA que respondan precios/stock 24/7 y carguen pedidos en un CRM'
                : 'Sin catálogo online en Google Maps ni Agente IA que responda consultas de precios y anote pedidos 24/7')
            : 'Tienen web pero les falta el Agente IA que responda precios/stock en WhatsApp 24/7 y el Agente que haga seguimiento en el CRM';

        painPoints.push('Horas contestando las mismas preguntas de precios, talles, modelos y stock por WhatsApp');
        painPoints.push('Clientes que preguntan precio y quedan sin seguimiento por no tener un Agente IA con CRM');

        consultativeHook = `Hola! ¿Cómo estás? Estuve viendo a ${name} en Google Maps y te quería consultar: ¿hoy cuando les escriben por WhatsApp preguntando precios o stock llegan a contestar rápido o se les acumulan los mensajes?`;
        suggestedPitch = `Te armamos tu Catálogo Web + 2 Agentes de IA: el primero contesta precios y muestra productos en WhatsApp las 24 hs, y el segundo guarda al cliente en tu CRM de Ventas y le hace seguimiento si pidió precio y todavía no compró.`;
        suggestedOffer = `Catálogo Web pago único $250.000 (en 2 pagos), Agente IA Respondedor $115.000/mes o Doble Agente IA + CRM incluido $175.000/mes.`;
    }
    // 6. Caso General (Con o Sin Web)
    else if (!hasWeb) {
        targetService = 'web_express';
        targetServiceLabel = 'Página Web Profesional + Doble Agente IA con CRM/Turnero Incluido';
        primaryPain = isSocialOnly
            ? `En Google Maps solo tienen ${extPlat || 'redes sociales'} sin página web propia ni Agente IA que atienda y ordene clientes en WhatsApp`
            : 'Negocio activo en Google Maps pero sin página web propia ni sistema que atienda y registre consultas de WhatsApp 24/7';
        painPoints.push('Clientes que buscan en Google Maps no encuentran una página web donde ver qué ofrecen');
        painPoints.push('Consultas de WhatsApp atendidas 100% a mano sin un Agente IA ni un CRM de seguimiento');

        consultativeHook = `Hola! ¿Cómo estás? Te escribo porque vimos a ${name} en Google Maps y notamos que hoy figuran sin página web propia. ¿Las consultas, presupuestos o turnos de WhatsApp los están manejando todos a mano?`;
        suggestedPitch = `En NatoH Systems te armamos tu Página Web Profesional lista en 7 días, y podemos sumarte nuestros 2 Agentes de IA en WhatsApp (uno que responde precios y dudas 24/7 y otro que te anota todo en un CRM o Turnero incluido).`;
        suggestedOffer = `Página Web Profesional $250.000 pago único (50% y 50%), o Plan Mensual de Web + Agentes de IA + CRM/Turnero incluido desde $115.000 a $175.000/mes.`;
    } else {
        targetService = 'rediseño_web';
        targetServiceLabel = 'Doble Agente IA (Atención 24/7 + Gestor de CRM/Turnero) + Renovación Web';
        const missingItems = [];
        if (!audit.hasWhatsAppWidget) missingItems.push('conexión directa a WhatsApp');
        if (!audit.hasBookingSystem) missingItems.push('asistente automático de atención y turnos');

        primaryPain = `Tienen página web activa, pero hoy no cuenta con un Agente de IA que atienda en segundos 24/7 ni un sistema CRM/Turnero que registre y siga a cada cliente automáticamente`;

        if (Array.isArray(audit.insights) && audit.insights.length > 0) {
            painPoints.push(...audit.insights.slice(0, 3));
        }

        consultativeHook = `Hola! ¿Cómo estás? Entré a la página web de ${name} desde Google Maps y vi que hoy quien los busca no tiene un asistente que le responda en el acto ni conecte con un sistema de seguimiento en WhatsApp. ¿Cómo manejan hoy las consultas que entran?`;

        suggestedPitch = `Sumar nuestros 2 Agentes de IA en WhatsApp y en tu Web: el primero responde consultas de clientes en 10 segundos las 24 hs, y el segundo carga a cada interesado en tu propio CRM o Agenda de Turnos que te incluimos.`;
        suggestedOffer = `Agente IA Respondedor 24/7 $115.000/mes, Doble Agente IA + CRM/Turnero y Web incluidos $175.000/mes, o Renovación Web pago único $250.000.`;
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

CATÁLOGO DE SOLUCIONES NATOH SYSTEMS (Elegí la que genere mayor resultado para el dueño del negocio, usando lenguaje claro de dueño y CERO tecnicismos):
1. "software_custom_erp": 2 Agentes de IA (uno que responde consultas 24/7 + otro que carga pedidos y sigue presupuestos) + Sistema de Gestión / CRM / Stock incluido — Plan mensual $175.000/mes o Sistema a medida pago único $350.000 (ideal distribuidoras, mayoristas, corralones, fábricas, logística).
2. "software_turnero": 2 Agentes de IA (uno que atiende dudas 24/7 + otro que anota el turno y envía recordatorios) + Agenda de Turnos y CRM incluido — Plan mensual $175.000/mes o Turnero pago único $350.000 (ideal clínicas, odontólogos, estética, veterinarias, talleres, gimnasios, hoteles).
3. "gastronomia_pedidos": Carta Digital QR + Agentes de IA en WhatsApp que toman pedidos y reservas con 0% comisión — Pago único $350.000 o Plan mensual con IA desde $115.000/mes (ideal restaurantes, bares, cafeterías, heladerías).
4. "ia_natoh": 2 Agentes de IA en WhatsApp y Web (el Agente Respondedor 24/7 en <15s + el Agente Gestor que carga y persigue presupuestos en el CRM que incluimos) — $115.000/mes (Solo Respondedor) o $175.000/mes (Doble Agente + CRM/Turnero y Web incluidos).
5. "ecommerce": Catálogo / Tienda Online + 2 Agentes de IA en WhatsApp que responden precios/stock 24/7 y anotan pedidos en el CRM — Web pago único $250.000 o Plan mensual con Agentes IA y CRM $175.000/mes.
6. "web_express": Página Web Profesional llave en mano ($250.000 pago único sin abono) + opción de sumar Agentes de IA y CRM/Turnero mensual ($115.000 a $175.000/mes).
7. "rediseño_web": Renovación de Página Web ($250.000) + Doble Agente de IA en WhatsApp y CRM/Turnero incluido ($175.000/mes).

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
