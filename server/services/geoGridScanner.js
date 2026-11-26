/**
 * 🗺️ AGENTE 1: GEO-GRID SCANNER, CONFIGURADOR DE LUGARES & MEMORIA PERSISTENTE ANTI-REPETICIÓN
 * (NatoH Systems B2B Edition)
 *
 * - Gestiona el catálogo base + lugares/rubros personalizados configurados desde el CRM (`Config: scraper_config`)
 * - Registra en MongoDB (`ScannedZone`) cada lugar + rubro escaneado (tanto en modo Auto GPS como Manual)
 * - Impide repetir lugares/búsquedas ya escaneadas (y permite consultar, buscar, abrir en Maps o liberar desde el CRM y la Extensión)
 */

const ScannedZone = require('../models/ScannedZone');
const Config = require('../models/Config');

const PRESET_ZONES = {
    caba: {
        name: 'CABA (Ciudad Autónoma de Buenos Aires)',
        center: { lat: -34.6037, lng: -58.3816 },
        bounds: { north: -34.535, south: -34.685, west: -58.530, east: -58.350 },
        defaultZoom: 15
    },
    gba_norte: {
        name: 'GBA Zona Norte (Vicente López, San Isidro, Tigre)',
        center: { lat: -34.4708, lng: -58.5286 },
        bounds: { north: -34.390, south: -34.540, west: -58.620, east: -58.460 },
        defaultZoom: 15
    },
    gba_sur: {
        name: 'GBA Zona Sur (Avellaneda, Lanús, Lomas, Quilmes)',
        center: { lat: -34.7200, lng: -58.3600 },
        bounds: { north: -34.650, south: -34.820, west: -58.460, east: -58.240 },
        defaultZoom: 15
    },
    gba_oeste: {
        name: 'GBA Zona Oeste (Ramos Mejía, Morón, Ituzaingó)',
        center: { lat: -34.6500, lng: -58.6000 },
        bounds: { north: -34.580, south: -34.700, west: -58.720, east: -58.530 },
        defaultZoom: 15
    },
    cordoba: {
        name: 'Córdoba Capital',
        center: { lat: -31.4201, lng: -64.1888 },
        bounds: { north: -31.350, south: -31.480, west: -64.260, east: -64.120 },
        defaultZoom: 15
    },
    rosario: {
        name: 'Rosario (Santa Fe)',
        center: { lat: -32.9442, lng: -60.6505 },
        bounds: { north: -32.880, south: -33.010, west: -60.720, east: -60.610 },
        defaultZoom: 15
    },
    mendoza: {
        name: 'Mendoza Capital & Godoy Cruz',
        center: { lat: -32.8895, lng: -68.8458 },
        bounds: { north: -32.850, south: -32.950, west: -68.890, east: -68.800 },
        defaultZoom: 15
    },
    mar_del_plata: {
        name: 'Mar del Plata',
        center: { lat: -38.0055, lng: -57.5426 },
        bounds: { north: -37.950, south: -38.060, west: -57.620, east: -57.520 },
        defaultZoom: 15
    },
    custom: {
        name: 'Lugares Personalizados (CRM)',
        center: { lat: -34.6037, lng: -58.3816 },
        bounds: { north: -34.535, south: -34.685, west: -58.530, east: -58.350 },
        defaultZoom: 15
    }
};

// Catálogo granular de sub-zonas de alto poder adquisitivo y densidad comercial/industrial
const GRANULAR_SUBZONES = [
    // CABA
    { id: 'caba_palermo_soho', name: 'Palermo Soho (CABA)', city: 'caba', lat: -34.5889, lng: -58.4305, zoom: 16 },
    { id: 'caba_palermo_hollywood', name: 'Palermo Hollywood (CABA)', city: 'caba', lat: -34.5815, lng: -58.4385, zoom: 16 },
    { id: 'caba_belgrano_centro', name: 'Belgrano Centro / Cabildo (CABA)', city: 'caba', lat: -34.5625, lng: -58.4565, zoom: 16 },
    { id: 'caba_recoleta', name: 'Recoleta (CABA)', city: 'caba', lat: -34.5895, lng: -58.3974, zoom: 16 },
    { id: 'caba_caballito', name: 'Caballito / Acoyte y Rivadavia (CABA)', city: 'caba', lat: -34.6186, lng: -58.4368, zoom: 16 },
    { id: 'caba_villa_urquiza', name: 'Villa Urquiza (CABA)', city: 'caba', lat: -34.5736, lng: -58.4875, zoom: 16 },
    { id: 'caba_nunez', name: 'Núñez / Libertador (CABA)', city: 'caba', lat: -34.5453, lng: -58.4612, zoom: 16 },
    { id: 'caba_devoto', name: 'Villa Devoto (CABA)', city: 'caba', lat: -34.6003, lng: -58.5126, zoom: 16 },
    { id: 'caba_almagro', name: 'Almagro / Boedo (CABA)', city: 'caba', lat: -34.6122, lng: -58.4210, zoom: 16 },
    { id: 'caba_microcentro', name: 'Microcentro / Tribunales (CABA)', city: 'caba', lat: -34.6037, lng: -58.3816, zoom: 16 },
    { id: 'caba_puerto_madero', name: 'Puerto Madero / Retiro (CABA)', city: 'caba', lat: -34.6083, lng: -58.3635, zoom: 16 },
    { id: 'caba_colegiales_chacarita', name: 'Colegiales / Chacarita (CABA)', city: 'caba', lat: -34.5778, lng: -58.4492, zoom: 16 },
    // GBA Norte
    { id: 'gba_vicente_lopez', name: 'Vicente López / Olivos (Zona Norte)', city: 'gba_norte', lat: -34.5105, lng: -58.4815, zoom: 15 },
    { id: 'gba_martinez', name: 'Martínez Centro (Zona Norte)', city: 'gba_norte', lat: -34.4882, lng: -58.5038, zoom: 15 },
    { id: 'gba_san_isidro', name: 'San Isidro Centro / Lomas (Zona Norte)', city: 'gba_norte', lat: -34.4708, lng: -58.5286, zoom: 15 },
    { id: 'gba_nordelta_tigre', name: 'Nordelta / Tigre Centro (Zona Norte)', city: 'gba_norte', lat: -34.4018, lng: -58.6495, zoom: 15 },
    { id: 'gba_pilar', name: 'Pilar Centro / Panamericana Km 50', city: 'gba_norte', lat: -34.4587, lng: -58.9142, zoom: 15 },
    { id: 'gba_san_martin', name: 'San Martín / Polo Industrial (GBA)', city: 'gba_norte', lat: -34.5750, lng: -58.5370, zoom: 15 },
    // GBA Sur
    { id: 'gba_lomas_las_lomitas', name: 'Las Lomitas / Lomas de Zamora (Zona Sur)', city: 'gba_sur', lat: -34.7644, lng: -58.4022, zoom: 16 },
    { id: 'gba_quilmes_centro', name: 'Quilmes Centro (Zona Sur)', city: 'gba_sur', lat: -34.7242, lng: -58.2526, zoom: 16 },
    { id: 'gba_lanus_centro', name: 'Lanúsita / Lanús Oeste (Zona Sur)', city: 'gba_sur', lat: -34.7067, lng: -58.3935, zoom: 16 },
    { id: 'gba_adrogue', name: 'Adrogué Centro (Zona Sur)', city: 'gba_sur', lat: -34.7985, lng: -58.3920, zoom: 16 },
    { id: 'gba_avellaneda', name: 'Avellaneda Centro / Mitre (Zona Sur)', city: 'gba_sur', lat: -34.6625, lng: -58.3647, zoom: 16 },
    // GBA Oeste
    { id: 'gba_ramos_mejia', name: 'Ramos Mejía Centro (Zona Oeste)', city: 'gba_oeste', lat: -34.6433, lng: -58.5647, zoom: 16 },
    { id: 'gba_castelar_ituzaingo', name: 'Castelar / Parque Leloir (Zona Oeste)', city: 'gba_oeste', lat: -34.6512, lng: -58.6435, zoom: 15 },
    { id: 'gba_moron_centro', name: 'Morón Centro (Zona Oeste)', city: 'gba_oeste', lat: -34.6534, lng: -58.6198, zoom: 16 },
    // Interior
    { id: 'cba_nueva_cordoba', name: 'Nueva Córdoba / Centro (Córdoba)', city: 'cordoba', lat: -31.4258, lng: -64.1862, zoom: 16 },
    { id: 'cba_cerro_las_rosas', name: 'Cerro de las Rosas (Córdoba)', city: 'cordoba', lat: -31.3712, lng: -64.2368, zoom: 15 },
    { id: 'ros_centro_pichincha', name: 'Pichincha / Centro (Rosario)', city: 'rosario', lat: -32.9365, lng: -60.6542, zoom: 16 },
    { id: 'mdz_centro_aristides', name: 'Av. Arístides / Centro (Mendoza)', city: 'mendoza', lat: -32.8915, lng: -68.8555, zoom: 16 },
    { id: 'mdp_guemes_centro', name: 'Paseo Güemes / Alem (Mar del Plata)', city: 'mar_del_plata', lat: -38.0128, lng: -57.5378, zoom: 16 }
];

// Catálogo Estratégico de Rubros de Alta Conversión B2B & PyME para NatoH Systems (natohsystems.com)
const RUBROS_CATALOG = [
    // 1. SISTEMAS DE GESTIÓN, ERP, STOCK Y AUTOMATIZACIÓN A MEDIDA (Alto Ticket B2B)
    { id: 'distribuidoras', label: 'Distribuidoras y Mayoristas', query: 'distribuidora mayorista', targetSolution: 'software_custom_erp', priority: 10 },
    { id: 'ferreterias_corralones', label: 'Corralones y Ferreterías Industriales', query: 'corralon de materiales ferreteria industrial', targetSolution: 'software_custom_erp', priority: 10 },
    { id: 'logistica_transporte', label: 'Logística, Transporte y Encomiendas', query: 'empresa de logistica y transporte', targetSolution: 'software_custom_erp', priority: 9 },
    { id: 'fabricas_metalurgicas', label: 'Fábricas, Metalúrgicas e Industria PyME', query: 'fabrica metalurgica industrial', targetSolution: 'software_custom_erp', priority: 9 },
    { id: 'concesionarias_autos', label: 'Concesionarias y Agencias de Autos', query: 'concesionaria de autos multimarca', targetSolution: 'ia_natoh', priority: 9 },
    { id: 'talleres_lubricentros', label: 'Talleres Mecánicos, Lubricentros y Repuestos', query: 'taller mecanico integral repuestos', targetSolution: 'software_turnero', priority: 8 },

    // 2. CLÍNICAS, SALUD, PSICOLOGÍA, DEPILACIÓN Y PREDIOS DEPORTIVOS (Turneros + IA WhatsApp 24/7 + Gestión de Ingresos)
    { id: 'clinicas_centros_medicos', label: 'Clínicas, Policonsultorios y Diagnóstico', query: 'centro medico policonsultorio', targetSolution: 'software_turnero', priority: 10 },
    { id: 'odontologia', label: 'Consultorios y Clínicas Odontológicas', query: 'consultorio odontologico centro dental', targetSolution: 'software_turnero', priority: 10 },
    { id: 'estetica', label: 'Centros de Estética y Depilación Definitiva', query: 'centro de estetica depilacion definitiva', targetSolution: 'software_turnero', priority: 10 },
    { id: 'psicologia', label: 'Consultorios de Psicología y Salud Mental', query: 'centro de psicologia consultorio psicologico', targetSolution: 'software_turnero', priority: 9 },
    { id: 'predios_futbol', label: 'Predios de Fútbol, Canchas y Complejos Deportivos', query: 'complejo de canchas de futbol 5 padel predio deportivo', targetSolution: 'software_turnero', priority: 9 },
    { id: 'veterinarias', label: 'Clínicas Veterinarias y Pet Shops', query: 'veterinaria clinica veterinaria', targetSolution: 'software_turnero', priority: 9 },
    { id: 'gimnasios', label: 'Gimnasios, Crossfit y Pilates', query: 'gimnasio centro de entrenamiento', targetSolution: 'software_turnero', priority: 8 },
    { id: 'peluquerias', label: 'Peluquerías, Barberías y Salones', query: 'peluqueria barberia', targetSolution: 'software_turnero', priority: 7 },

    // 3. CONSTRUCCIÓN, ASOCIACIONES CIVILES, INMOBILIARIAS Y SERVICIOS PROFESIONALES (CRM + Gestión de Ingresos + Agentes IA)
    { id: 'inmobiliarias', label: 'Inmobiliarias y Desarrolladoras', query: 'inmobiliaria propiedades', targetSolution: 'ia_natoh', priority: 10 },
    { id: 'arquitectura_construccion', label: 'Empresas de Construcción y Estudios de Arquitectura', query: 'empresa constructora estudio de arquitectura obras', targetSolution: 'software_custom_erp', priority: 10 },
    { id: 'asociaciones_civiles', label: 'Asociaciones Civiles, Clubes, Fundaciones y Mutuales', query: 'asociacion civil fundacion mutual club social', targetSolution: 'software_custom_erp', priority: 9 },
    { id: 'hoteles_alojamientos', label: 'Hoteles, Apart Hotel y Cabañas', query: 'hotel apart hotel alojamiento', targetSolution: 'software_turnero', priority: 9 },
    { id: 'institutos_academias', label: 'Institutos Educativos y Academias', query: 'instituto educativo academia cursos', targetSolution: 'ia_natoh', priority: 8 },
    { id: 'abogados_contadores', label: 'Estudios Jurídicos y Contables', query: 'estudio juridico contable', targetSolution: 'web_express', priority: 8 },

    // 4. GASTRONOMÍA Y COMERCIO (Carta QR Sin Comisiones + E-Commerce)
    { id: 'restaurantes', label: 'Restaurantes, Bares y Cafeterías', query: 'restaurante bar gastronomia', targetSolution: 'gastronomia_pedidos', priority: 9 },
    { id: 'mueblerias_deco', label: 'Mueblerías, Colchonerías y Decoración', query: 'muebleria fabrica de muebles decoracion', targetSolution: 'ecommerce', priority: 8 },
    { id: 'indumentaria', label: 'Locales de Ropa, Calzado y Showrooms', query: 'tienda de ropa showroom indumentaria', targetSolution: 'ecommerce', priority: 7 }
];

const DEFAULT_SCRAPER_CONFIG = {
    customZones: [],      // [{ id, name, city, lat, lng, zoom, enabled: true }]
    customRubros: [],     // [{ id, label, query, targetSolution, priority, enabled: true }]
    disabledCities: [],   // ['mar_del_plata', ...]
    disabledZoneIds: [],  // ['caba_microcentro', ...]
    disabledRubroIds: [], // ['peluquerias', ...]
    defaultDirection: 'bottom-up', // 'bottom-up' | 'top-down'
    skipExistingLeads: true,
    skipScannedZones: true,
    speedPreset: 'balanced' // 'safe' | 'balanced' | 'fast'
};

function stripAccents(str = '') {
    return String(str || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

function normalizeSlug(str = '') {
    return stripAccents(str)
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 80);
}

function buildGoogleMapsUrl(zone, rubro) {
    const cleanZoneName = String(zone?.name || zone?.id || '').replace(/\(.*\)/, '').trim();
    const rawQuery = rubro?.query || rubro?.label || rubro?.id || 'comercio';
    if (zone && typeof zone.lat === 'number' && typeof zone.lng === 'number' && !isNaN(zone.lat) && !isNaN(zone.lng)) {
        const encodedQuery = encodeURIComponent(rawQuery);
        return `https://www.google.com/maps/search/${encodedQuery}/@${zone.lat},${zone.lng},${zone.zoom || 15}z`;
    }
    const fullQuery = cleanZoneName ? `${rawQuery} en ${cleanZoneName}` : rawQuery;
    return `https://www.google.com/maps/search/${encodeURIComponent(fullQuery)}`;
}

class GeoGridScanner {
    async getScraperConfig() {
        try {
            const doc = await Config.findOne({ key: 'scraper_config' }).lean();
            if (doc && doc.value && typeof doc.value === 'object') {
                return {
                    ...DEFAULT_SCRAPER_CONFIG,
                    ...doc.value,
                    customZones: Array.isArray(doc.value.customZones) ? doc.value.customZones : [],
                    customRubros: Array.isArray(doc.value.customRubros) ? doc.value.customRubros : [],
                    disabledCities: Array.isArray(doc.value.disabledCities) ? doc.value.disabledCities : [],
                    disabledZoneIds: Array.isArray(doc.value.disabledZoneIds) ? doc.value.disabledZoneIds : [],
                    disabledRubroIds: Array.isArray(doc.value.disabledRubroIds) ? doc.value.disabledRubroIds : []
                };
            }
        } catch (err) {
            console.warn('⚠️ [GeoGridScanner] Error leyendo scraper_config:', err.message);
        }
        return { ...DEFAULT_SCRAPER_CONFIG };
    }

    async saveScraperConfig(patch = {}) {
        const current = await this.getScraperConfig();
        const next = {
            ...current,
            ...patch
        };

        // Sanitizar customZones
        if (Array.isArray(next.customZones)) {
            const seenZ = new Set();
            next.customZones = next.customZones
                .filter(z => z && (z.name || z.id))
                .map(z => {
                    const name = String(z.name || z.id).trim();
                    const id = z.id ? normalizeSlug(z.id) : `custom_${normalizeSlug(name)}`;
                    return {
                        id,
                        name,
                        city: z.city || 'custom',
                        lat: z.lat !== '' && z.lat !== null && z.lat !== undefined && !isNaN(Number(z.lat)) ? Number(z.lat) : null,
                        lng: z.lng !== '' && z.lng !== null && z.lng !== undefined && !isNaN(Number(z.lng)) ? Number(z.lng) : null,
                        zoom: Number(z.zoom) || 15,
                        isCustom: true,
                        enabled: z.enabled !== false
                    };
                })
                .filter(z => {
                    if (!z.id || seenZ.has(z.id)) return false;
                    seenZ.add(z.id);
                    return true;
                });
        }

        // Sanitizar customRubros
        if (Array.isArray(next.customRubros)) {
            const seenR = new Set();
            next.customRubros = next.customRubros
                .filter(r => r && (r.label || r.query || r.id))
                .map(r => {
                    const label = String(r.label || r.query || r.id).trim();
                    const query = String(r.query || r.label || r.id).trim();
                    const id = r.id ? normalizeSlug(r.id) : `custom_${normalizeSlug(label)}`;
                    return {
                        id,
                        label,
                        query,
                        targetSolution: r.targetSolution || 'ia_natoh',
                        priority: Number(r.priority) || 10,
                        isCustom: true,
                        enabled: r.enabled !== false
                    };
                })
                .filter(r => {
                    if (!r.id || seenR.has(r.id)) return false;
                    seenR.add(r.id);
                    return true;
                });
        }

        await Config.findOneAndUpdate(
            { key: 'scraper_config' },
            { $set: { key: 'scraper_config', value: next, updatedAt: new Date() } },
            { upsert: true, new: true }
        );

        return next;
    }

    /**
     * Devuelve el catálogo unificado (presets + personalizados en CRM)
     */
    async getMergedCatalog() {
        const cfg = await this.getScraperConfig();
        const disabledCitiesSet = new Set(cfg.disabledCities || []);
        const disabledZonesSet = new Set(cfg.disabledZoneIds || []);
        const disabledRubrosSet = new Set(cfg.disabledRubroIds || []);

        const allSubZones = [
            ...cfg.customZones.map(z => ({ ...z, isCustom: true })),
            ...GRANULAR_SUBZONES.map(z => ({ ...z, isCustom: false }))
        ].map(z => ({
            ...z,
            enabled: z.enabled !== false && !disabledZonesSet.has(z.id) && !disabledCitiesSet.has(z.city)
        }));

        const allRubros = [
            ...cfg.customRubros.map(r => ({ ...r, isCustom: true })),
            ...RUBROS_CATALOG.map(r => ({ ...r, isCustom: false }))
        ].map(r => ({
            ...r,
            enabled: r.enabled !== false && !disabledRubrosSet.has(r.id)
        }));

        return {
            cities: this.getPresetZones().map(c => ({
                ...c,
                enabled: !disabledCitiesSet.has(c.id)
            })),
            subZones: allSubZones,
            rubros: allRubros,
            config: cfg
        };
    }

    /**
     * Resuelve cualquier input manual o automático contra el catálogo para evitar duplicar zonas con nombres parecidos
     */
    async resolveZoneAndRubro({ zoneId = '', zoneName = '', location = '', keyword = '', keywordLabel = '', searchQuery = '' } = {}) {
        const merged = await this.getMergedCatalog();
        const rawLoc = String(zoneId || zoneName || location || '').trim();
        const locNorm = stripAccents(rawLoc);
        const locSlug = normalizeSlug(rawLoc);

        let matchedZone = null;
        if (locNorm) {
            matchedZone = merged.subZones.find(z => {
                const zIdNorm = stripAccents(z.id);
                const zNameNorm = stripAccents(z.name);
                const zBase = zNameNorm.split('(')[0].trim();
                return (
                    zIdNorm === locNorm ||
                    zIdNorm === locSlug ||
                    zNameNorm === locNorm ||
                    zBase === locNorm ||
                    (locNorm.length >= 4 && (zBase.includes(locNorm) || locNorm.includes(zBase)))
                );
            });
        }

        const rawKw = String(keyword || keywordLabel || '').trim();
        const kwNorm = stripAccents(rawKw);
        const kwSlug = normalizeSlug(rawKw);

        let matchedRubro = null;
        if (kwNorm) {
            matchedRubro = merged.rubros.find(r => {
                const rIdNorm = stripAccents(r.id);
                const rLabelNorm = stripAccents(r.label);
                const rQueryNorm = stripAccents(r.query);
                return (
                    rIdNorm === kwNorm ||
                    rIdNorm === kwSlug ||
                    rLabelNorm === kwNorm ||
                    rQueryNorm === kwNorm ||
                    (kwNorm.length >= 4 && (rLabelNorm.includes(kwNorm) || rQueryNorm.includes(kwNorm) || kwNorm.includes(rIdNorm)))
                );
            });
        }

        const resolvedZoneId = matchedZone ? matchedZone.id : (locSlug || 'vista_maps');
        const resolvedZoneName = matchedZone ? matchedZone.name : (zoneName || location || zoneId || 'Vista Google Maps');
        const resolvedCity = matchedZone ? matchedZone.city : 'custom';
        const resolvedCenter = matchedZone && typeof matchedZone.lat === 'number' && typeof matchedZone.lng === 'number'
            ? { lat: matchedZone.lat, lng: matchedZone.lng }
            : { lat: null, lng: null };
        const resolvedZoom = matchedZone?.zoom || 15;

        const resolvedKeyword = matchedRubro ? matchedRubro.id : (kwSlug || 'general');
        const resolvedKeywordLabel = matchedRubro ? matchedRubro.label : (keywordLabel || keyword || 'General');

        return {
            zoneId: resolvedZoneId,
            zoneName: resolvedZoneName,
            city: resolvedCity,
            center: resolvedCenter,
            zoom: resolvedZoom,
            keyword: resolvedKeyword,
            keywordLabel: resolvedKeywordLabel,
            searchQuery: searchQuery || `${matchedRubro ? matchedRubro.query : resolvedKeywordLabel} en ${resolvedZoneName.replace(/\(.*\)/, '').trim()}`,
            matchedZone,
            matchedRubro
        };
    }

    /**
     * Genera una cuadrícula de puntos GPS dentro de un área para búsquedas hiper-locales
     */
    generateGrid({ city = 'caba', keyword = 'comercio', stepKm = 2.0, zoom = 15 } = {}) {
        const zone = PRESET_ZONES[city] || PRESET_ZONES.caba;
        const { north, south, west, east } = zone.bounds;

        const latStep = stepKm / 111.0;
        const lngStep = stepKm / 92.0;

        const cells = [];
        let row = 0;

        for (let lat = north; lat >= south; lat -= latStep) {
            let col = 0;
            for (let lng = west; lng <= east; lng += lngStep) {
                const roundedLat = Number(lat.toFixed(5));
                const roundedLng = Number(lng.toFixed(5));
                const encodedQuery = encodeURIComponent(keyword);

                cells.push({
                    cellId: `${city}_r${row}_c${col}`,
                    row,
                    col,
                    lat: roundedLat,
                    lng: roundedLng,
                    zoom,
                    searchUrl: `https://www.google.com/maps/search/${encodedQuery}/@${roundedLat},${roundedLng},${zoom}z`
                });
                col++;
            }
            row++;
        }

        return {
            city,
            zoneName: zone.name,
            keyword,
            stepKm,
            totalCells: cells.length,
            cells
        };
    }

    getPresetZones() {
        return Object.entries(PRESET_ZONES).map(([key, val]) => ({
            id: key,
            name: val.name,
            center: val.center,
            defaultZoom: val.defaultZoom
        }));
    }

    getAllSubZones() {
        return GRANULAR_SUBZONES;
    }

    getCatalog() {
        return {
            cities: this.getPresetZones(),
            subZones: GRANULAR_SUBZONES,
            rubros: RUBROS_CATALOG
        };
    }

    /**
     * Verifica si una zona + rubro (o búsqueda manual) YA fue escaneada previamente
     */
    async checkZoneScanned(params = {}) {
        const resolved = await this.resolveZoneAndRubro(params);
        const queryOr = [
            { zoneId: resolved.zoneId, keyword: resolved.keyword }
        ];
        if (params.searchQuery && String(params.searchQuery).trim().length >= 4) {
            const cleanQ = String(params.searchQuery).trim();
            queryOr.push({ searchQuery: new RegExp('^' + cleanQ.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') });
        }

        const record = await ScannedZone.findOne({ $or: queryOr }).lean();
        return {
            success: true,
            alreadyScanned: Boolean(record),
            record: record || null,
            resolved
        };
    }

    /**
     * Devuelve la lista de próximas combinaciones vírgenes (no escaneadas) respetando la config del CRM
     */
    async getPendingTargets({ preferredCity = null, preferredRubro = null, excludeKeys = [], limit = 30 } = {}) {
        const merged = await this.getMergedCatalog();
        const scannedRecords = await ScannedZone.find({}).sort({ lastScannedAt: -1, scannedAt: -1 }).lean();

        const scannedMap = new Map();
        for (const rec of scannedRecords) {
            scannedMap.set(`${String(rec.zoneId).toLowerCase()}::${String(rec.keyword).toLowerCase()}`, rec);
        }
        const excludeSet = new Set((excludeKeys || []).map(k => String(k).toLowerCase()));

        let candidateZones = merged.subZones.filter(z => z.enabled);
        if (preferredCity && preferredCity !== 'all') {
            candidateZones = candidateZones.filter(z => z.city === preferredCity || z.id === preferredCity);
        }

        let candidateRubros = merged.rubros.filter(r => r.enabled);
        if (preferredRubro && preferredRubro !== 'all') {
            candidateRubros = candidateRubros.filter(r => r.id === preferredRubro || r.query === preferredRubro);
        }

        const effectiveZones = candidateZones.length > 0 ? candidateZones : merged.subZones;
        const effectiveRubros = candidateRubros.length > 0 ? candidateRubros : merged.rubros;

        // Priorizar lugares personalizados y rubros de mayor ticket
        const sortedZones = [...effectiveZones].sort((a, b) => (b.isCustom ? 1 : 0) - (a.isCustom ? 1 : 0));
        const sortedRubros = [...effectiveRubros].sort((a, b) => {
            if ((b.isCustom ? 1 : 0) !== (a.isCustom ? 1 : 0)) return (b.isCustom ? 1 : 0) - (a.isCustom ? 1 : 0);
            return (b.priority || 5) - (a.priority || 5);
        });

        const pending = [];
        let totalPossible = effectiveZones.length * effectiveRubros.length;
        let totalVirgin = 0;

        for (const rubro of sortedRubros) {
            for (const zone of sortedZones) {
                const key = `${zone.id.toLowerCase()}::${rubro.id.toLowerCase()}`;
                if (!scannedMap.has(key) && !excludeSet.has(key)) {
                    totalVirgin++;
                    if (pending.length < limit) {
                        const searchQuery = `${rubro.query} en ${zone.name.replace(/\(.*\)/, '').trim()}`;
                        pending.push({
                            key,
                            isNewTarget: true,
                            zone: {
                                id: zone.id,
                                name: zone.name,
                                city: zone.city,
                                isCustom: Boolean(zone.isCustom),
                                center: { lat: zone.lat ?? null, lng: zone.lng ?? null },
                                zoom: zone.zoom || 15
                            },
                            rubro: {
                                id: rubro.id,
                                label: rubro.label,
                                query: rubro.query,
                                targetSolution: rubro.targetSolution,
                                isCustom: Boolean(rubro.isCustom),
                                priority: rubro.priority || 8
                            },
                            searchQuery,
                            googleMapsUrl: buildGoogleMapsUrl(zone, rubro)
                        });
                    }
                }
            }
        }

        return {
            success: true,
            pending,
            totalVirgin,
            totalScannedCount: scannedRecords.length,
            totalPossibleCombinations: totalPossible
        };
    }

    /**
     * Calcula la próxima combinación (Sub-zona + Rubro) que NO haya sido escaneada aún,
     * respetando la configuración del CRM y evitando repeticiones.
     */
    async getNextRecommendedTarget(preferredCity = null, preferredRubro = null, excludeKeys = []) {
        const result = await this.getPendingTargets({
            preferredCity,
            preferredRubro,
            excludeKeys,
            limit: 10
        });

        if (result.pending.length > 0) {
            const first = result.pending[0];
            return {
                success: true,
                isNewTarget: true,
                allExhausted: false,
                zone: first.zone,
                rubro: first.rubro,
                searchQuery: first.searchQuery,
                googleMapsUrl: first.googleMapsUrl,
                reason: first.zone.isCustom || first.rubro.isCustom
                    ? `Objetivo personalizado configurado en CRM: "${first.rubro.label}" en ${first.zone.name} (nunca escaneado).`
                    : `Zona virgen sin repetir: nunca se escaneó "${first.rubro.label}" en ${first.zone.name}.`,
                totalScannedCount: result.totalScannedCount,
                totalPossibleCombinations: result.totalPossibleCombinations,
                remainingVirginCount: result.totalVirgin,
                upcomingTargets: result.pending.slice(1, 6)
            };
        }

        // Si TODAS las combinaciones del filtro fueron escaneadas, devolver aviso claro (y la más antigua solo como referencia)
        const merged = await this.getMergedCatalog();
        const scannedRecords = await ScannedZone.find({}).sort({ lastScannedAt: 1, scannedAt: 1 }).lean();
        const fallbackZone = merged.subZones[0];
        const fallbackRubro = merged.rubros[0];

        return {
            success: true,
            isNewTarget: false,
            allExhausted: true,
            zone: {
                id: fallbackZone.id,
                name: fallbackZone.name,
                city: fallbackZone.city,
                center: { lat: fallbackZone.lat ?? null, lng: fallbackZone.lng ?? null },
                zoom: fallbackZone.zoom || 15
            },
            rubro: {
                id: fallbackRubro.id,
                label: fallbackRubro.label,
                query: fallbackRubro.query,
                targetSolution: fallbackRubro.targetSolution,
                priority: fallbackRubro.priority || 8
            },
            searchQuery: `${fallbackRubro.query} en ${fallbackZone.name.replace(/\(.*\)/, '').trim()}`,
            googleMapsUrl: buildGoogleMapsUrl(fallbackZone, fallbackRubro),
            reason: `¡Completaste el 100% de las zonas habilitadas para este filtro! Agregá nuevos lugares/rubros desde el CRM o liberá una zona antigua.`,
            totalScannedCount: scannedRecords.length,
            totalPossibleCombinations: result.totalPossibleCombinations,
            remainingVirginCount: 0,
            upcomingTargets: []
        };
    }

    /**
     * Registra en la base de datos que una zona + rubro fue escaneada y actualiza sus métricas
     */
    async recordZoneScan({
        zoneId,
        zoneName,
        location,
        city,
        keyword,
        keywordLabel = '',
        searchQuery = '',
        googleMapsUrl = '',
        center,
        zoom,
        scrapeDirection = 'bottom-up',
        totalLeadsFound = 0,
        validLeadsIngested = 0,
        discardedLeads = 0,
        duplicatesSkipped = 0,
        status = 'completed',
        source = 'extension',
        notes = ''
    }) {
        const resolved = await this.resolveZoneAndRubro({
            zoneId,
            zoneName,
            location,
            keyword,
            keywordLabel,
            searchQuery
        });

        const finalCenter = (center && typeof center.lat === 'number' && typeof center.lng === 'number')
            ? { lat: center.lat, lng: center.lng }
            : resolved.center;

        const finalUrl = googleMapsUrl || buildGoogleMapsUrl(
            { id: resolved.zoneId, name: resolved.zoneName, lat: finalCenter.lat, lng: finalCenter.lng, zoom: zoom || resolved.zoom },
            { id: resolved.keyword, label: resolved.keywordLabel, query: resolved.matchedRubro?.query || resolved.keywordLabel }
        );

        const now = new Date();
        const updated = await ScannedZone.findOneAndUpdate(
            { zoneId: resolved.zoneId, keyword: resolved.keyword },
            {
                $set: {
                    zoneName: zoneName || resolved.zoneName,
                    city: city || resolved.city || 'custom',
                    keywordLabel: keywordLabel || resolved.keywordLabel,
                    searchQuery: searchQuery || resolved.searchQuery,
                    googleMapsUrl: finalUrl,
                    center: finalCenter,
                    zoom: zoom || resolved.zoom || 15,
                    scrapeDirection: scrapeDirection === 'top-down' ? 'top-down' : 'bottom-up',
                    status,
                    source,
                    scannedAt: now,
                    lastScannedAt: now,
                    ...(notes ? { notes } : {})
                },
                $inc: {
                    scanCount: 1,
                    totalLeadsFound: Number(totalLeadsFound) || 0,
                    validLeadsIngested: Number(validLeadsIngested) || 0,
                    discardedLeads: Number(discardedLeads) || 0,
                    duplicatesSkipped: Number(duplicatesSkipped) || 0
                }
            },
            { upsert: true, new: true }
        );

        return {
            success: true,
            scannedZone: updated
        };
    }

    async deleteScannedZone(id) {
        const deleted = await ScannedZone.findByIdAndDelete(id);
        return {
            success: Boolean(deleted),
            deletedId: id
        };
    }

    /**
     * Obtiene el historial completo de zonas escaneadas y estadísticas de cobertura
     */
    async getScannedHistory(limit = 200) {
        const merged = await this.getMergedCatalog();
        const records = await ScannedZone.find({})
            .sort({ lastScannedAt: -1, scannedAt: -1, updatedAt: -1 })
            .limit(limit)
            .lean();

        const enabledZonesCount = merged.subZones.filter(z => z.enabled).length || merged.subZones.length;
        const enabledRubrosCount = merged.rubros.filter(r => r.enabled).length || merged.rubros.length;
        const totalPossible = Math.max(1, enabledZonesCount * enabledRubrosCount);
        const totalScanned = await ScannedZone.countDocuments({});

        return {
            success: true,
            coveragePercent: Math.min(100, Math.round((totalScanned / totalPossible) * 100)),
            totalScannedCombinations: totalScanned,
            totalPossibleCombinations: totalPossible,
            records
        };
    }
}

const scannerInstance = new GeoGridScanner();
scannerInstance.GRANULAR_SUBZONES = GRANULAR_SUBZONES;
scannerInstance.RUBROS_CATALOG = RUBROS_CATALOG;
scannerInstance.normalizeSlug = normalizeSlug;

module.exports = scannerInstance;
