/**
 * 🗺️ AGENTE 1: GEO-GRID SCANNER & MEMORIA PERSISTENTE DE ZONAS (NatoH Systems B2B Edition)
 * 
 * Calcula y planifica cuadrículas de coordenadas GPS sobre ciudades argentinas
 * y lleva el registro histórico en MongoDB (`ScannedZone`) de qué sub-zonas
 * y qué rubros ya fueron escaneados para evitar repeticiones y maximizar
 * el descubrimiento de negocios calificados para NatoH Systems (natohsystems.com).
 */

const ScannedZone = require('../models/ScannedZone');

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

    // 2. CLÍNICAS, SALUD Y BIENESTAR (Turneros + IA WhatsApp 24/7 + Gestión de Pacientes)
    { id: 'clinicas_centros_medicos', label: 'Clínicas, Policonsultorios y Diagnóstico', query: 'centro medico policonsultorio', targetSolution: 'software_turnero', priority: 10 },
    { id: 'odontologia', label: 'Consultorios y Clínicas Odontológicas', query: 'consultorio odontologico centro dental', targetSolution: 'software_turnero', priority: 10 },
    { id: 'estetica', label: 'Centros de Estética, Spa y Depilación', query: 'centro de estetica corporal', targetSolution: 'software_turnero', priority: 9 },
    { id: 'veterinarias', label: 'Clínicas Veterinarias y Pet Shops', query: 'veterinaria clinica veterinaria', targetSolution: 'software_turnero', priority: 9 },
    { id: 'gimnasios', label: 'Gimnasios, Crossfit y Pilates', query: 'gimnasio centro de entrenamiento', targetSolution: 'software_turnero', priority: 8 },
    { id: 'peluquerias', label: 'Peluquerías, Barberías y Salones', query: 'peluqueria barberia', targetSolution: 'software_turnero', priority: 7 },

    // 3. INMOBILIARIAS, EDUCACIÓN, TURISMO Y SERVICIOS PROFESIONALES (Webs Corporativas + Agentes IA)
    { id: 'inmobiliarias', label: 'Inmobiliarias y Desarrolladoras', query: 'inmobiliaria propiedades', targetSolution: 'ia_natoh', priority: 10 },
    { id: 'hoteles_alojamientos', label: 'Hoteles, Apart Hotel y Cabañas', query: 'hotel apart hotel alojamiento', targetSolution: 'software_turnero', priority: 9 },
    { id: 'institutos_academias', label: 'Institutos Educativos y Academias', query: 'instituto educativo academia cursos', targetSolution: 'ia_natoh', priority: 8 },
    { id: 'abogados_contadores', label: 'Estudios Jurídicos y Contables', query: 'estudio juridico contable', targetSolution: 'web_express', priority: 8 },
    { id: 'arquitectura_construccion', label: 'Estudios de Arquitectura y Constructoras', query: 'estudio de arquitectura empresa constructora', targetSolution: 'web_express', priority: 8 },

    // 4. GASTRONOMÍA Y COMERCIO (Carta QR Sin Comisiones + E-Commerce)
    { id: 'restaurantes', label: 'Restaurantes, Bares y Cafeterías', query: 'restaurante bar gastronomia', targetSolution: 'gastronomia_pedidos', priority: 9 },
    { id: 'mueblerias_deco', label: 'Mueblerías, Colchonerías y Decoración', query: 'muebleria fabrica de muebles decoracion', targetSolution: 'ecommerce', priority: 8 },
    { id: 'indumentaria', label: 'Locales de Ropa, Calzado y Showrooms', query: 'tienda de ropa showroom indumentaria', targetSolution: 'ecommerce', priority: 7 }
];

class GeoGridScanner {
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
     * Calcula la próxima combinación (Sub-zona + Rubro) que NO haya sido escaneada aún,
     * o bien la que se haya escaneado hace más tiempo.
     * Permite filtrar opcionalmente por `preferredCity` y/o `preferredRubro`.
     */
    async getNextRecommendedTarget(preferredCity = null, preferredRubro = null) {
        const scannedRecords = await ScannedZone.find({}).sort({ lastScannedAt: -1 }).lean();

        const scannedMap = new Map();
        for (const rec of scannedRecords) {
            const key = `${rec.zoneId}::${rec.keyword}`;
            scannedMap.set(key, rec);
        }

        const candidateZones = (preferredCity && preferredCity !== 'all')
            ? GRANULAR_SUBZONES.filter(z => z.city === preferredCity || z.id === preferredCity)
            : GRANULAR_SUBZONES;

        const candidateRubros = (preferredRubro && preferredRubro !== 'all')
            ? RUBROS_CATALOG.filter(r => r.id === preferredRubro || r.query === preferredRubro)
            : RUBROS_CATALOG;

        const effectiveZones = candidateZones.length > 0 ? candidateZones : GRANULAR_SUBZONES;
        const effectiveRubros = candidateRubros.length > 0 ? candidateRubros : RUBROS_CATALOG;

        // 1. Buscar primera combinación virgen (priorizando rubros de mayor ticket / prioridad)
        const sortedRubros = [...effectiveRubros].sort((a, b) => (b.priority || 5) - (a.priority || 5));

        for (const rubro of sortedRubros) {
            for (const zone of effectiveZones) {
                const key = `${zone.id}::${rubro.id}`;
                if (!scannedMap.has(key)) {
                    const searchQuery = `${rubro.query} en ${zone.name.replace(/\(.*\)/, '').trim()}`;
                    const encodedQuery = encodeURIComponent(rubro.query);
                    return {
                        success: true,
                        isNewTarget: true,
                        zone: {
                            id: zone.id,
                            name: zone.name,
                            city: zone.city,
                            center: { lat: zone.lat, lng: zone.lng },
                            zoom: zone.zoom
                        },
                        rubro: {
                            id: rubro.id,
                            label: rubro.label,
                            query: rubro.query,
                            targetSolution: rubro.targetSolution,
                            priority: rubro.priority || 8
                        },
                        searchQuery,
                        googleMapsUrl: `https://www.google.com/maps/search/${encodedQuery}/@${zone.lat},${zone.lng},${zone.zoom}z`,
                        reason: `Zona virgen de alta conversión NatoH Systems: nunca se escaneó "${rubro.label}" en ${zone.name}.`,
                        totalScannedCount: scannedRecords.length,
                        totalPossibleCombinations: GRANULAR_SUBZONES.length * RUBROS_CATALOG.length
                    };
                }
            }
        }

        // 2. Si todas fueron escaneadas, devolver la más antigua dentro del filtro
        let oldestCombo = null;
        let oldestDate = new Date();

        for (const rubro of effectiveRubros) {
            for (const zone of effectiveZones) {
                const rec = scannedMap.get(`${zone.id}::${rubro.id}`);
                if (rec && new Date(rec.lastScannedAt) <= oldestDate) {
                    oldestDate = new Date(rec.lastScannedAt);
                    oldestCombo = { zone, rubro, rec };
                }
            }
        }

        const fallbackZone = oldestCombo?.zone || effectiveZones[0];
        const fallbackRubro = oldestCombo?.rubro || effectiveRubros[0];
        const searchQuery = `${fallbackRubro.query} en ${fallbackZone.name.replace(/\(.*\)/, '').trim()}`;
        const encodedQuery = encodeURIComponent(fallbackRubro.query);

        return {
            success: true,
            isNewTarget: false,
            zone: {
                id: fallbackZone.id,
                name: fallbackZone.name,
                city: fallbackZone.city,
                center: { lat: fallbackZone.lat, lng: fallbackZone.lng },
                zoom: fallbackZone.zoom
            },
            rubro: {
                id: fallbackRubro.id,
                label: fallbackRubro.label,
                query: fallbackRubro.query,
                targetSolution: fallbackRubro.targetSolution,
                priority: fallbackRubro.priority || 8
            },
            searchQuery,
            googleMapsUrl: `https://www.google.com/maps/search/${encodedQuery}/@${fallbackZone.lat},${fallbackZone.lng},${fallbackZone.zoom}z`,
            reason: `Re-escaneo de ciclo: esta combinación fue la más antigua en memoria.`,
            totalScannedCount: scannedRecords.length,
            totalPossibleCombinations: GRANULAR_SUBZONES.length * RUBROS_CATALOG.length
        };
    }

    /**
     * Registra en la base de datos que una zona + rubro fue escaneada y actualiza sus métricas
     */
    async recordZoneScan({
        zoneId,
        zoneName,
        city = 'caba',
        keyword,
        keywordLabel = '',
        center = { lat: null, lng: null },
        zoom = 15,
        totalLeadsFound = 0,
        validLeadsIngested = 0,
        discardedLeads = 0,
        status = 'completed',
        notes = ''
    }) {
        if (!zoneId || !keyword) {
            throw new Error('zoneId y keyword son obligatorios para registrar zona escaneada');
        }

        const normZoneId = String(zoneId).toLowerCase().trim();
        const normKeyword = String(keyword).toLowerCase().trim();

        const updated = await ScannedZone.findOneAndUpdate(
            { zoneId: normZoneId, keyword: normKeyword },
            {
                $set: {
                    zoneName: zoneName || normZoneId,
                    city,
                    keywordLabel: keywordLabel || normKeyword,
                    center,
                    zoom,
                    status,
                    lastScannedAt: new Date(),
                    ...(notes ? { notes } : {})
                },
                $inc: {
                    scanCount: 1,
                    totalLeadsFound: Number(totalLeadsFound) || 0,
                    validLeadsIngested: Number(validLeadsIngested) || 0,
                    discardedLeads: Number(discardedLeads) || 0
                }
            },
            { upsert: true, new: true }
        );

        return {
            success: true,
            scannedZone: updated
        };
    }

    /**
     * Obtiene el historial completo de zonas escaneadas y estadísticas de cobertura
     */
    async getScannedHistory(limit = 50) {
        const records = await ScannedZone.find({})
            .sort({ lastScannedAt: -1 })
            .limit(limit)
            .lean();

        const totalPossible = GRANULAR_SUBZONES.length * RUBROS_CATALOG.length;
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

module.exports = scannerInstance;
