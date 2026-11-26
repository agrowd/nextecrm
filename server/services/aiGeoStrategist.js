/**
 * 🧠 AGENTE 1-IA: ESTRATEGA GEOGRÁFICO NACIONAL CON CHATGPT (PROVINCIAS + GBA + CAPITAL)
 *
 * Analiza TODA la base de datos de MongoDB:
 * - Rendimiento real por rubro, provincia, tasa de móviles válidos, falta de web, respuestas y objeciones (Agente 6)
 * - Cobertura actual en `ScannedZone` (incluyendo zonas reconstruidas desde el histórico de leads)
 * - Consulta a ChatGPT (`gpt-4o-mini`) para elegir los 12 mejores destinos VÍRGENES mezclando Provincias del Interior + GBA + Capital
 * - Guarda la Hoja de Ruta IA en `Config` (`key: 'ai_route_plan'`) para que el CRM y la Extensión Chrome la sigan sin repetir zonas.
 */

const axios = require('axios');
const path = require('path');

try {
    require('dotenv').config({ path: path.join(__dirname, '../.env') });
    require('dotenv').config({ path: path.join(__dirname, '../../.env') });
    require('dotenv').config({ path: path.join(__dirname, '../../bot/.env') });
    require('dotenv').config({ path: path.join(__dirname, '../../bot_1/.env') });
} catch (e) {}

const geoGridScanner = require('./geoGridScanner');
const { buildHeuristicDossier } = require('./painAnalyzer');

function inferProvinceFromLeadText(loc = '', addr = '') {
    const txt = `${loc} ${addr}`.toLowerCase();
    if (/caba|palermo|belgrano|recoleta|caballito|urquiza|devoto|almagro|microcentro|retiro|flores|crespo|nuñez|nunez|mataderos|chacarita|colegiales|aut[oó]noma de buenos aires/.test(txt)) return 'CABA';
    if (/vicente l[oó]pez|olivos|mart[ií]nez|san isidro|tigre|nordelta|pilar|escobar|san mart[ií]n|ballester|san fernando/.test(txt)) return 'Buenos Aires (GBA Norte)';
    if (/quilmes|lan[uú]s|lomas|banfield|temperley|adrogu[eé]|avellaneda|berazategui|canning|ezeiza|bernal/.test(txt)) return 'Buenos Aires (GBA Sur)';
    if (/mor[oó]n|ramos mej[ií]a|castelar|ituzaing[oó]|haedo|merlo|moreno|san justo|luj[aá]n/.test(txt)) return 'Buenos Aires (GBA Oeste)';
    if (/la plata|los hornos|city bell|mar del plata|bah[ií]a blanca|tandil|z[aá]rate|campana|jun[ií]n|pergamino|san nicol[aá]s|pinamar/.test(txt)) return 'Buenos Aires (Interior)';
    if (/c[oó]rdoba|carlos paz|r[ií]o cuarto|villa mar[ií]a/.test(txt)) return 'Córdoba';
    if (/rosario|santa fe|rafaela|venado tuerto|funes/.test(txt)) return 'Santa Fe';
    if (/mendoza|godoy cruz|chacras|san rafael|luj[aá]n de cuyo/.test(txt)) return 'Mendoza';
    if (/neuqu[eé]n|bariloche|cipolletti|general roca|r[ií]o negro/.test(txt)) return 'Neuquén / Río Negro';
    if (/comodoro|madryn|trelew|ushuaia|chubut|tierra del fuego|santa cruz/.test(txt)) return 'Chubut / Tierra del Fuego';
    if (/tucum[aá]n|yerba buena/.test(txt)) return 'Tucumán';
    if (/salta|jujuy/.test(txt)) return 'Salta / Jujuy';
    if (/paran[aá]|concordia|gualeguaych[uú]|entre r[ií]os/.test(txt)) return 'Entre Ríos';
    if (/corrientes|posadas|misiones|resistencia|chaco/.test(txt)) return 'Corrientes / Misiones / Chaco';
    if (/san juan|san luis/.test(txt)) return 'San Juan / San Luis';
    if (/santa rosa|la pampa|santiago del estero|catamarca|la rioja/.test(txt)) return 'Interior Federal';
    return 'Sin clasificar';
}

async function gatherFullDatabaseAnalytics({ Lead, ScannedZone, Config }) {
    const [
        totalLeads,
        pendingLeads,
        contactedLeads,
        interestedLeads,
        notInterestedLeads,
        discardedLeads,
        withoutWebsite,
        hotLeads,
        missingDossier,
        missingWebAudit,
        scannedZones,
        mergedCatalog,
        notIntStudyDoc
    ] = await Promise.all([
        Lead.countDocuments({}),
        Lead.countDocuments({ status: 'pending', isQualified: { $ne: false } }),
        Lead.countDocuments({ status: 'contacted' }),
        Lead.countDocuments({ status: 'interested' }),
        Lead.countDocuments({ status: 'not_interested' }),
        Lead.countDocuments({ status: 'discarded' }),
        Lead.countDocuments({ status: { $ne: 'discarded' }, hasWebsite: false }),
        Lead.countDocuments({ status: { $ne: 'discarded' }, priorityTier: 'hot' }),
        Lead.countDocuments({ status: { $ne: 'discarded' }, $or: [{ dossier: { $exists: false } }, { 'dossier.primaryPain': { $in: [null, ''] } }] }),
        Lead.countDocuments({ status: { $ne: 'discarded' }, website: { $exists: true, $ne: '' }, 'webAudit.auditedAt': { $exists: false } }),
        ScannedZone.find({}).lean(),
        geoGridScanner.getMergedCatalog(),
        Config.findOne({ key: 'not_interested_study' }).lean().catch(() => null)
    ]);

    // Agrupar leads por ubicación y rubro
    const leadSamples = await Lead.find({})
        .select('location address keyword category status hasWebsite leadScore dossier.targetService')
        .lean();

    const provinceStatsMap = new Map();
    for (const c of mergedCatalog.cities) {
        if (c.id === 'custom') continue;
        const prov = c.province || c.name;
        if (!provinceStatsMap.has(prov)) {
            provinceStatsMap.set(prov, {
                province: prov,
                cityId: c.id,
                region: c.region || 'Interior',
                totalSubZones: mergedCatalog.subZones.filter(z => z.city === c.id && z.enabled).length,
                scannedZonesCount: 0,
                leadsTotal: 0,
                leadsQualified: 0,
                leadsPending: 0,
                leadsContacted: 0,
                leadsInterested: 0,
                leadsWithoutWeb: 0
            });
        }
    }

    const rubroStatsMap = new Map();
    for (const r of mergedCatalog.rubros) {
        rubroStatsMap.set(r.id, {
            rubroId: r.id,
            label: r.label,
            targetSolution: r.targetSolution,
            leadsTotal: 0,
            leadsQualified: 0,
            leadsContacted: 0,
            leadsInterested: 0,
            leadsNotInterested: 0,
            leadsWithoutWeb: 0
        });
    }

    for (const l of leadSamples) {
        const prov = inferProvinceFromLeadText(l.location, l.address);
        if (provinceStatsMap.has(prov)) {
            const ps = provinceStatsMap.get(prov);
            ps.leadsTotal++;
            if (l.status !== 'discarded') ps.leadsQualified++;
            if (l.status === 'pending') ps.leadsPending++;
            if (l.status === 'contacted') ps.leadsContacted++;
            if (l.status === 'interested') ps.leadsInterested++;
            if (!l.hasWebsite && l.status !== 'discarded') ps.leadsWithoutWeb++;
        }

        const kwText = `${l.keyword || ''} ${l.category || ''}`.toLowerCase();
        let matchedRubroId = null;
        if (/odontolog|dental|dentist/.test(kwText)) matchedRubroId = 'odontologia';
        else if (/estetic|depilac|depilasion|spa|belleza/.test(kwText)) matchedRubroId = 'estetica';
        else if (/veterinar/.test(kwText)) matchedRubroId = 'veterinarias';
        else if (/psicolog/.test(kwText)) matchedRubroId = 'psicologia';
        else if (/futbol|cancha|padel|predio/.test(kwText)) matchedRubroId = 'predios_futbol';
        else if (/construct|arquitect/.test(kwText)) matchedRubroId = 'arquitectura_construccion';
        else if (/asociaci[oó]n|club|fundaci[oó]n|mutual/.test(kwText)) matchedRubroId = 'asociaciones_civiles';
        else if (/policonsultorio|cl[ií]nica|m[eé]dic|kinesiolog/.test(kwText)) matchedRubroId = 'clinicas_centros_medicos';
        else if (/inmobiliar/.test(kwText)) matchedRubroId = 'inmobiliarias';
        else if (/distribuidor|mayorist/.test(kwText)) matchedRubroId = 'distribuidoras';
        else if (/ferreter|corral[oó]n/.test(kwText)) matchedRubroId = 'ferreterias_corralones';
        else if (/gimnasio|crossfit|pilates/.test(kwText)) matchedRubroId = 'gimnasios';
        else if (/peluquer|barber/.test(kwText)) matchedRubroId = 'peluquerias';
        else if (/restauran|panader|gastronom|bar\b/.test(kwText)) matchedRubroId = 'restaurantes';
        else if (/taller|mec[aá]nic|lubricentro/.test(kwText)) matchedRubroId = 'talleres_lubricentros';
        else if (/hotel|apart|caba[ñn]a/.test(kwText)) matchedRubroId = 'hoteles_alojamientos';

        if (matchedRubroId && rubroStatsMap.has(matchedRubroId)) {
            const rs = rubroStatsMap.get(matchedRubroId);
            rs.leadsTotal++;
            if (l.status !== 'discarded') rs.leadsQualified++;
            if (l.status === 'contacted') rs.leadsContacted++;
            if (l.status === 'interested') rs.leadsInterested++;
            if (l.status === 'not_interested') rs.leadsNotInterested++;
            if (!l.hasWebsite && l.status !== 'discarded') rs.leadsWithoutWeb++;
        }
    }

    for (const sz of scannedZones) {
        const prov = sz.province || inferProvinceFromLeadText(sz.zoneName, '');
        if (provinceStatsMap.has(prov)) {
            provinceStatsMap.get(prov).scannedZonesCount++;
        }
    }

    const provinceScorecard = Array.from(provinceStatsMap.values()).map(p => {
        const saturation = p.leadsTotal >= 500 ? 'saturado' : p.leadsTotal >= 100 ? 'parcial' : 'virgen';
        return {
            ...p,
            saturation,
            qualificationRate: p.leadsTotal > 0 ? Math.round((p.leadsQualified / p.leadsTotal) * 100) : null
        };
    });

    const rubroScorecard = Array.from(rubroStatsMap.values())
        .sort((a, b) => b.leadsTotal - a.leadsTotal);

    return {
        overview: {
            totalLeads,
            pendingLeads,
            contactedLeads,
            interestedLeads,
            notInterestedLeads,
            discardedLeads,
            withoutWebsite,
            hotLeads,
            missingDossier,
            missingWebAudit,
            totalScannedZones: scannedZones.length,
            totalSubZonesCatalog: mergedCatalog.subZones.length,
            totalProvincesCatalog: provinceScorecard.length
        },
        provinceScorecard,
        rubroScorecard,
        scannedZones,
        mergedCatalog,
        notInterestedSummary: notIntStudyDoc?.value?.aiStudy?.executiveSummary || ''
    };
}

/**
 * Construye un pool diverso y 100% VIRGEN de combinaciones (Provincias del Interior + GBA + Capital × Rubros NatoH)
 */
function buildDiverseVirginCandidates(mergedCatalog, scannedZones, provinceScorecard, rubroScorecard, preferredFocus = 'national') {
    const scannedSet = new Set(scannedZones.map(r => `${String(r.zoneId).toLowerCase()}::${String(r.keyword).toLowerCase()}`));

    const enabledZones = mergedCatalog.subZones.filter(z => z.enabled);
    const enabledRubros = mergedCatalog.rubros.filter(r => r.enabled);

    // Priorizar rubros de altísimo ticket/encaje NatoH (y menos saturados en la BD actual)
    const rubroLeadCountMap = new Map(rubroScorecard.map(r => [r.rubroId, r.leadsTotal]));
    const prioritizedRubros = [...enabledRubros].sort((a, b) => {
        const aScore = (a.priority || 8) * 12 - Math.min(40, (rubroLeadCountMap.get(a.id) || 0) / 30);
        const bScore = (b.priority || 8) * 12 - Math.min(40, (rubroLeadCountMap.get(b.id) || 0) / 30);
        return bScore - aScore;
    });

    // Agrupar zonas por ciudad/provincia para garantizar cobertura federal (Provincias + GBA + Capital)
    const byCity = new Map();
    for (const z of enabledZones) {
        if (!byCity.has(z.city)) byCity.set(z.city, []);
        byCity.get(z.city).push(z);
    }

    const interiorCities = ['cordoba', 'santa_fe', 'mendoza', 'patagonia_norte', 'tucuman', 'pba_interior', 'salta_jujuy', 'entre_rios', 'nea', 'patagonia_sur', 'cuyo_norte', 'centro_norte'];
    const ambaCities = ['caba', 'gba_norte', 'gba_sur', 'gba_oeste', 'custom'];

    const cityOrder = preferredFocus === 'provinces_only'
        ? interiorCities
        : [...interiorCities, ...ambaCities];

    const candidates = [];
    const usedKeys = new Set();

    // Tomar hasta 3 candidatos vírgenes por cada provincia/región variando rubros
    for (const cityId of cityOrder) {
        const zonesInCity = byCity.get(cityId) || [];
        if (zonesInCity.length === 0) continue;
        let pickedForCity = 0;

        for (let rIdx = 0; rIdx < prioritizedRubros.length && pickedForCity < 3; rIdx++) {
            const rubro = prioritizedRubros[(rIdx + candidates.length) % prioritizedRubros.length];
            for (const zone of zonesInCity) {
                const key = `${zone.id.toLowerCase()}::${rubro.id.toLowerCase()}`;
                if (scannedSet.has(key) || usedKeys.has(key)) continue;
                usedKeys.add(key);
                const searchQuery = `${rubro.query} en ${zone.name.replace(/\(.*\)/, '').trim()}`;
                candidates.push({
                    idx: candidates.length,
                    key,
                    zoneId: zone.id,
                    zoneName: zone.name,
                    city: zone.city,
                    province: zone.province || geoGridScanner.PRESET_ZONES[zone.city]?.province || 'Argentina',
                    isInteriorProvince: interiorCities.includes(zone.city),
                    center: { lat: zone.lat ?? null, lng: zone.lng ?? null },
                    zoom: zone.zoom || 15,
                    rubroId: rubro.id,
                    rubroLabel: rubro.label,
                    rubroQuery: rubro.query,
                    targetSolution: rubro.targetSolution,
                    searchQuery,
                    googleMapsUrl: geoGridScanner.buildGoogleMapsUrl(zone, rubro)
                });
                pickedForCity++;
                break;
            }
        }
        if (candidates.length >= 48) break;
    }

    return candidates;
}

/**
 * Genera con ChatGPT (`gpt-4o-mini`) la Hoja de Ruta Geográfica Inteligente (Provincias + Capital)
 */
async function generateAiGeoRoutePlan({ Lead, ScannedZone, Config, focus = 'national' }) {
    const analytics = await gatherFullDatabaseAnalytics({ Lead, ScannedZone, Config });
    const candidates = buildDiverseVirginCandidates(
        analytics.mergedCatalog,
        analytics.scannedZones,
        analytics.provinceScorecard,
        analytics.rubroScorecard,
        focus
    );

    const apiKey = process.env.OPENAI_API_KEY;
    let aiPlan = null;

    if (apiKey && apiKey !== 'your-api-key' && candidates.length > 0) {
        try {
            const candidateLines = candidates.map(c =>
                `[${c.idx}] ${c.province} | ${c.zoneName} | Rubro: ${c.rubroLabel} (Solución: ${c.targetSolution}) | ${c.isInteriorProvince ? 'PROVINCIA INTERIOR' : 'CAPITAL/GBA'}`
            ).join('\n');

            const provLines = analytics.provinceScorecard
                .map(p => `- ${p.province}: ${p.leadsTotal} leads (${p.leadsQualified} calif.), ${p.scannedZonesCount}/${p.totalSubZones} zonas escaneadas [${p.saturation.toUpperCase()}]`)
                .join('\n');

            const rubroLines = analytics.rubroScorecard
                .slice(0, 15)
                .map(r => `- ${r.label}: ${r.leadsTotal} leads (${r.leadsWithoutWeb} sin web, ${r.leadsContacted} contactados, ${r.leadsNotInterested} no interesados)`)
                .join('\n');

            const prompt = `Sos el Director de Inteligencia Comercial y Expansión Federal de *NatoH Systems* (Argentina).
Tu misión es analizar TODA nuestra base de datos actual y decidir **exactamente por dónde tiene que ir el scraper de Google Maps ahora**, priorizando expandirnos inteligentemente a **PROVINCIAS DEL INTERIOR (Córdoba, Santa Fe/Rosario, Mendoza, Neuquén/Patagonia, Tucumán, Salta, Interior Buenos Aires, Entre Ríos, NEA, Cuyo)** ADEMÁS de zonas estratégicas de **Capital y GBA**, sin repetir jamás lugares ya hechos.

SERVICIOS ESTRELLA DE NATOH SYSTEMS (con Demos interactivas en vivo + casos reales anónimos):
- Doble Agente IA 24/7 (escucha audios, valida comprobantes de señas, bloquea turnos/canchas, registra Gestión de Ingresos y sigue a las 24h en CRM) — $175.000/mes
- Agente IA Respondedor 24/7 — $115.000/mes
- Web SEO en Google ($250k pago único) / Sistema a Medida Gestión de Ingresos & Stock ($350k pago único)
- Rubros probados donde convertimos fuerte: Odontología, Estética/Depilación Definitiva, Psicología, Construcción/Arquitectura, Predios de Fútbol y Complejos Deportivos, Asociaciones Civiles/Clubes, Policonsultorios, Distribuidoras/Corralones, Inmobiliarias.

ESTADO REAL DE NUESTRA BASE DE DATOS (${analytics.overview.totalLeads} leads totales | ${analytics.overview.pendingLeads} pendientes | ${analytics.overview.totalScannedZones} zonas guardadas):
COBERTURA POR PROVINCIA / REGIÓN:
${provLines}

DESGLOSE POR RUBRO EN BASE ACTUAL:
${rubroLines}

${analytics.notInterestedSummary ? `APRENDIZAJE DE AGENTE 6 (NO INTERESADOS HUMANOS):\n${analytics.notInterestedSummary}\n` : ''}
CANDIDATOS 100% VÍRGENES DISPONIBLES (elegí EXACTAMENTE 12 índices distintos entre [0..${candidates.length - 1}], asegurando:
- AL MENOS 8 EN PROVINCIAS DISTINTAS DEL INTERIOR: ej. Córdoba, Santa Fe/Rosario, Mendoza, Neuquén/Río Negro, Tucumán, Salta, Interior Buenos Aires, Entre Ríos, NEA o Cuyo.
- Y 3 A 4 EN CAPITAL / GBA de rubros poco tocados o alto ticket.
- NO repitas la misma ciudad más de 1 o 2 veces en los 12 pasos):
${candidateLines}

Devolvé ESTRICTAMENTE un JSON válido con esta estructura (REGLA CRÍTICA: el array "recommendedRoute" DEBE contener EXACTAMENTE 12 objetos completos, uno por cada destino elegido):
{
  "executiveDiagnosis": "Análisis claro y profundo (2 a 3 oraciones) de toda la base actual: qué está saturado (ej. Odontología en CABA/GBA), qué gran oportunidad virgen hay en provincias del interior y en rubros de alto ticket.",
  "provinceStrategy": "Estrategia federal (2 oraciones): por qué expandir a provincias como Córdoba, Rosario, Neuquén, Mendoza, Tucumán o Interior PBA mejora tasa de respuesta y cierre vs competir solo en CABA.",
  "topRubrosToPrioritize": ["Rubro 1", "Rubro 2", "Rubro 3", "Rubro 4"],
  "saturatedToPause": ["Ej: Odontología en GBA Oeste/CABA (ya hay +1200 leads)"],
  "recommendedRoute": [
    { "candidateIndex": 0, "priorityScore": 98, "whyGoHere": "Razón comercial específica de esta provincia + rubro.", "bestOfferAngle": "Solución NatoH y gancho de demo ideal acá." },
    { "candidateIndex": 3, "priorityScore": 96, "whyGoHere": "...", "bestOfferAngle": "..." }
  ]
}`;

            const response = await axios.post(
                'https://api.openai.com/v1/chat/completions',
                {
                    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
                    messages: [{ role: 'user', content: prompt }],
                    response_format: { type: 'json_object' },
                    temperature: 0.45,
                    max_tokens: 2600
                },
                {
                    headers: {
                        'Authorization': `Bearer ${apiKey.trim()}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 30000
                }
            );

            aiPlan = JSON.parse(response.data.choices[0].message.content);
        } catch (err) {
            console.error('⚠️ [Agente 1-IA] Error consultando ChatGPT para Ruta Geográfica:', err.message);
        }
    }

    // Mapear los índices devueltos por ChatGPT a los candidatos reales verificados (cero alucinaciones)
    const usedIdx = new Set();
    let finalRoute = [];

    if (aiPlan && Array.isArray(aiPlan.recommendedRoute)) {
        for (const item of aiPlan.recommendedRoute) {
            const idx = Number(item.candidateIndex);
            const cand = candidates.find(c => c.idx === idx);
            if (!cand || usedIdx.has(idx)) continue;
            usedIdx.add(idx);
            finalRoute.push({
                ...cand,
                priorityScore: Math.min(99, Math.max(60, Number(item.priorityScore) || 90)),
                whyGoHere: item.whyGoHere || `Zona virgen de alta oportunidad en ${cand.province} para ${cand.rubroLabel}.`,
                bestOfferAngle: item.bestOfferAngle || 'Doble Agente IA 24/7 + Demo interactiva personalizada con Gestión de Ingresos.'
            });
        }
    }

    // Completar hasta 12 destinos si faltan (priorizando diversidad de provincias)
    for (const cand of candidates) {
        if (finalRoute.length >= 12) break;
        if (usedIdx.has(cand.idx)) continue;
        usedIdx.add(cand.idx);
        finalRoute.push({
            ...cand,
            priorityScore: cand.isInteriorProvince ? 91 : 86,
            whyGoHere: cand.isInteriorProvince
                ? `${cand.province} está virgen en tu base: menor saturación de agencias porteñas y alta demanda de automatización WhatsApp para ${cand.rubroLabel}.`
                : `Sub-zona comercial estratégica en ${cand.province} todavía sin explorar para ${cand.rubroLabel}.`,
            bestOfferAngle: 'Demo interactiva en vivo con audios, validación de señas y Gestión de Ingresos.'
        });
    }

    const planPayload = {
        generatedAt: new Date().toISOString(),
        focus,
        aiPowered: Boolean(aiPlan),
        overview: analytics.overview,
        executiveDiagnosis: aiPlan?.executiveDiagnosis || `Tu base cuenta con ${analytics.overview.totalLeads} leads concentrados mayormente en CABA y GBA. Las provincias del interior (Córdoba, Santa Fe, Mendoza, Neuquén, Tucumán e Interior PBA) están prácticamente vírgenes y ofrecen menor competencia comercial con altísima adopción de WhatsApp.`,
        provinceStrategy: aiPlan?.provinceStrategy || 'Expandir la prospección a capitales provinciales y polos económicos del interior (Vaca Muerta/Neuquén, Córdoba, Rosario, Mendoza, La Plata, Mar del Plata, Tucumán) reduce la fatiga publicitaria y eleva la tasa de respuesta en rubros de alto ticket.',
        topRubrosToPrioritize: Array.isArray(aiPlan?.topRubrosToPrioritize) && aiPlan.topRubrosToPrioritize.length > 0
            ? aiPlan.topRubrosToPrioritize
            : ['Empresas de Construcción y Arquitectura', 'Predios de Fútbol y Complejos Deportivos', 'Consultorios de Psicología y Policonsultorios', 'Asociaciones Civiles y Distribuidoras'],
        saturatedToPause: Array.isArray(aiPlan?.saturatedToPause) && aiPlan.saturatedToPause.length > 0
            ? aiPlan.saturatedToPause
            : ['Odontología en zonas ya saturadas de CABA/GBA Oeste'],
        provinceScorecard: analytics.provinceScorecard,
        rubroScorecard: analytics.rubroScorecard.slice(0, 14),
        recommendedRoute: finalRoute
    };

    await Config.findOneAndUpdate(
        { key: 'ai_route_plan' },
        { $set: { key: 'ai_route_plan', value: planPayload, updatedAt: new Date() } },
        { upsert: true, new: true }
    );

    return planPayload;
}

/**
 * 🚀 MOTOR "ANALIZAR TODO":
 * 1) Sincroniza todas las zonas históricas desde los leads existentes -> ScannedZone
 * 2) Califica y completa Dossier + LeadScore en lote para todos los leads sin analizar (y audita webs de leads pending en paralelo)
 * 3) Genera la Hoja de Ruta Geográfica IA con ChatGPT analizando toda la base
 */
async function runFullDatabaseAnalysis({
    Lead,
    ScannedZone,
    Config,
    auditWebsite,
    calculateLeadScore,
    cleanAndFormatArgentinianNumber,
    classifyExternalUrl
}) {
    const startedAt = Date.now();

    // PASO 1: Sincronizar zonas históricas desde los leads existentes para que queden guardadas y no se repitan
    const syncResult = await geoGridScanner.syncZonesFromLeads(Lead);

    // PASO 2: Completar Dossier + LeadScore + Calificación para todos los leads calificados sin dossier/score
    const unanalyzedLeads = await Lead.find({
        status: { $ne: 'discarded' },
        $or: [
            { dossier: { $exists: false } },
            { 'dossier.primaryPain': { $in: [null, ''] } },
            { leadScore: { $exists: false } },
            { leadScore: null }
        ]
    }).limit(2000);

    let dossiersGenerated = 0;
    let discardedNow = 0;
    const bulkOps = [];

    for (const lead of unanalyzedLeads) {
        const phoneCheck = cleanAndFormatArgentinianNumber(lead.phone || '');
        const rawWeb = (lead.website || '').trim();
        const extClass = classifyExternalUrl ? classifyExternalUrl(rawWeb) : null;
        const hasWeb = !!(rawWeb.length > 0 && (!extClass || !extClass.isSocialOnly));

        const isNonCommercial = /comisar|polic|ministerio|secretar|embajada|consulado|fiscal|hospital\s+p|anses|afip|ioma|pami|registro\s+civil|municipalidad|tribunal/i.test(lead.name || '');

        if (lead.status === 'pending' && (isNonCommercial || !phoneCheck.valid)) {
            bulkOps.push({
                updateOne: {
                    filter: { _id: lead._id },
                    update: {
                        $set: {
                            status: 'discarded',
                            isQualified: false,
                            qualificationReason: isNonCommercial ? 'Entidad pública / no comercial' : (phoneCheck.error || 'Sin teléfono móvil válido')
                        }
                    }
                }
            });
            discardedNow++;
            continue;
        }

        const dossier = buildHeuristicDossier({ ...lead.toObject(), hasWebsite: hasWeb });
        const scoreData = calculateLeadScore({
            ...lead.toObject(),
            phoneValidated: phoneCheck.valid,
            hasWebsite: hasWeb,
            externalPlatform: lead.externalPlatform || extClass?.externalPlatform || ''
        }, dossier);

        bulkOps.push({
            updateOne: {
                filter: { _id: lead._id },
                update: {
                    $set: {
                        ...(phoneCheck.valid ? { phoneValidated: true } : {}),
                        hasWebsite: hasWeb,
                        instagramUrl: lead.instagramUrl || extClass?.instagramUrl || '',
                        facebookUrl: lead.facebookUrl || extClass?.facebookUrl || '',
                        externalPlatform: lead.externalPlatform || extClass?.externalPlatform || '',
                        dossier,
                        leadScore: scoreData.leadScore,
                        priorityTier: scoreData.priorityTier,
                        scoreBreakdown: scoreData.scoreBreakdown
                    }
                }
            }
        });
        dossiersGenerated++;
    }

    if (bulkOps.length > 0) {
        await Lead.bulkWrite(bulkOps, { ordered: false }).catch(e => {
            console.warn('⚠️ [AnalyzeAll] Aviso en bulkWrite:', e.message);
        });
    }

    // PASO 3: Auditar sitios web en paralelo para los leads `pending` (cola activa del bot) que aún no tienen `webAudit`
    const pendingWithWeb = await Lead.find({
        status: 'pending',
        isQualified: { $ne: false },
        website: { $exists: true, $ne: '' },
        'webAudit.auditedAt': { $exists: false }
    }).limit(25);

    let websAudited = 0;
    const CONCURRENCY = 5;
    for (let i = 0; i < pendingWithWeb.length; i += CONCURRENCY) {
        const batch = pendingWithWeb.slice(i, i + CONCURRENCY);
        await Promise.all(batch.map(async (lead) => {
            try {
                const auditResult = await auditWebsite(lead.website);
                const isAccessible = Boolean(auditResult && !auditResult.error);
                const hasWeb = Boolean(isAccessible && !auditResult.isSocialOnly);
                const updatedObj = { ...lead.toObject(), websiteValid: isAccessible, hasWebsite: hasWeb, webAudit: auditResult };
                const dossier = buildHeuristicDossier(updatedObj);
                const scoreData = calculateLeadScore(updatedObj, dossier);
                await Lead.findByIdAndUpdate(lead._id, {
                    $set: {
                        websiteValid: isAccessible,
                        hasWebsite: hasWeb,
                        webAudit: auditResult,
                        externalPlatform: auditResult?.externalPlatform || lead.externalPlatform || '',
                        instagramUrl: auditResult?.instagramUrl || lead.instagramUrl || '',
                        facebookUrl: auditResult?.facebookUrl || lead.facebookUrl || '',
                        pixelFacebook: Boolean(auditResult?.hasMetaPixel),
                        pixelGoogle: Boolean(auditResult?.hasGA4),
                        dossier,
                        leadScore: scoreData.leadScore,
                        priorityTier: scoreData.priorityTier,
                        scoreBreakdown: scoreData.scoreBreakdown
                    }
                });
                websAudited++;
            } catch {}
        }));
    }

    // PASO 4: Generar Plan de Ruta Geográfica IA con ChatGPT sobre la base 100% actualizada
    const aiRoutePlan = await generateAiGeoRoutePlan({ Lead, ScannedZone, Config, focus: 'national' });

    return {
        success: true,
        durationMs: Date.now() - startedAt,
        zonesSyncedFromHistory: syncResult.syncedGroups,
        dossiersAndScoresAnalyzed: dossiersGenerated,
        discardedUnqualified: discardedNow,
        pendingWebsAudited: websAudited,
        aiRoutePlan
    };
}

module.exports = {
    gatherFullDatabaseAnalytics,
    generateAiGeoRoutePlan,
    runFullDatabaseAnalysis
};
