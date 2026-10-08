/**
 * 🗺️ AGENTE 1: MINERO MASIVO GEOGRÁFICO CON MEMORIA PERSISTENTE (GEO-GRID SCANNER)
 * 
 * Divide ciudades y regiones en micro-cuadrículas de coordenadas GPS (latitud/longitud)
 * para realizar búsquedas hiper-densas en Google Maps y superar el límite de 120 resultados.
 * Almacena el historial de escaneos para no repetir nunca zonas ni rubros ya cubiertos
 * y sugiere automáticamente el próximo objetivo de prospección.
 */

const ScannedZone = require('../models/ScannedZone');

// Zonas y micro-barrios de alta densidad comercial en Argentina
const SUB_ZONES = [
    // --- CABA ---
    { id: 'caba_palermo', name: 'Palermo (Soho & Hollywood)', city: 'CABA', center: { lat: -34.5889, lng: -58.4305 }, radiusKm: 2.5, zoom: 15 },
    { id: 'caba_belgrano', name: 'Belgrano & Colegiales', city: 'CABA', center: { lat: -34.5623, lng: -58.4564 }, radiusKm: 2.2, zoom: 15 },
    { id: 'caba_recoleta', name: 'Recoleta & Barrio Norte', city: 'CABA', center: { lat: -34.5875, lng: -58.3974 }, radiusKm: 2.0, zoom: 15 },
    { id: 'caba_caballito', name: 'Caballito', city: 'CABA', center: { lat: -34.6186, lng: -58.4438 }, radiusKm: 2.0, zoom: 15 },
    { id: 'caba_almagro', name: 'Almagro & Boedo', city: 'CABA', center: { lat: -34.6062, lng: -58.4214 }, radiusKm: 2.0, zoom: 15 },
    { id: 'caba_microcentro', name: 'Microcentro & San Nicolás', city: 'CABA', center: { lat: -34.6037, lng: -58.3750 }, radiusKm: 1.8, zoom: 15 },
    { id: 'caba_villa_urquiza', name: 'Villa Urquiza & Villa Pueyrredón', city: 'CABA', center: { lat: -34.5735, lng: -58.4878 }, radiusKm: 2.2, zoom: 15 },
    { id: 'caba_flores', name: 'Flores & Parque Chacabuco', city: 'CABA', center: { lat: -34.6288, lng: -58.4632 }, radiusKm: 2.2, zoom: 15 },

    // --- GBA NORTE ---
    { id: 'gba_vicente_lopez', name: 'Vicente López & Florida', city: 'GBA Norte', center: { lat: -34.5284, lng: -58.4754 }, radiusKm: 2.5, zoom: 15 },
    { id: 'gba_olivos', name: 'Olivos & La Lucila', city: 'GBA Norte', center: { lat: -34.5097, lng: -58.4903 }, radiusKm: 2.2, zoom: 15 },
    { id: 'gba_san_isidro', name: 'San Isidro Centro & Acassuso', city: 'GBA Norte', center: { lat: -34.4721, lng: -58.5273 }, radiusKm: 2.5, zoom: 15 },
    { id: 'gba_martinez', name: 'Martínez', city: 'GBA Norte', center: { lat: -34.4932, lng: -58.5108 }, radiusKm: 2.2, zoom: 15 },
    { id: 'gba_tigre', name: 'Tigre & Rincón de Milberg', city: 'GBA Norte', center: { lat: -34.4258, lng: -58.5796 }, radiusKm: 3.0, zoom: 14 },
    { id: 'gba_san_fernando', name: 'San Fernando & Victoria', city: 'GBA Norte', center: { lat: -34.4441, lng: -58.5583 }, radiusKm: 2.5, zoom: 15 },

    // --- GBA OESTE ---
    { id: 'gba_ramos_mejia', name: 'Ramos Mejía & Haedo', city: 'GBA Oeste', center: { lat: -34.6492, lng: -58.5647 }, radiusKm: 2.5, zoom: 15 },
    { id: 'gba_moron', name: 'Morón Centro', city: 'GBA Oeste', center: { lat: -34.6534, lng: -58.6198 }, radiusKm: 2.5, zoom: 15 },
    { id: 'gba_castelar', name: 'Castelar & Ituzaingó', city: 'GBA Oeste', center: { lat: -34.6617, lng: -58.6417 }, radiusKm: 2.5, zoom: 15 },
    { id: 'gba_san_justo', name: 'San Justo (La Matanza)', city: 'GBA Oeste', center: { lat: -34.6781, lng: -58.5587 }, radiusKm: 2.5, zoom: 15 },

    // --- GBA SUR ---
    { id: 'gba_avellaneda', name: 'Avellaneda Centro', city: 'GBA Sur', center: { lat: -34.6622, lng: -58.3653 }, radiusKm: 2.2, zoom: 15 },
    { id: 'gba_lanus', name: 'Lanús Centro & Oeste', city: 'GBA Sur', center: { lat: -34.7061, lng: -58.3927 }, radiusKm: 2.5, zoom: 15 },
    { id: 'gba_quilmes', name: 'Quilmes & Bernal', city: 'GBA Sur', center: { lat: -34.7242, lng: -58.2610 }, radiusKm: 2.8, zoom: 15 },
    { id: 'gba_lomas', name: 'Lomas de Zamora & Banfield', city: 'GBA Sur', center: { lat: -34.7601, lng: -58.4012 }, radiusKm: 2.8, zoom: 15 },

    // --- LA PLATA ---
    { id: 'la_plata_centro', name: 'La Plata Casco Urbano', city: 'La Plata', center: { lat: -34.9205, lng: -57.9536 }, radiusKm: 3.0, zoom: 14 },
    { id: 'la_plata_city_bell', name: 'City Bell & Gonnet', city: 'La Plata', center: { lat: -34.8690, lng: -58.0483 }, radiusKm: 3.0, zoom: 14 },

    // --- CÓRDOBA ---
    { id: 'cordoba_centro', name: 'Córdoba Capital Centro', city: 'Córdoba', center: { lat: -31.4167, lng: -64.1833 }, radiusKm: 2.5, zoom: 15 },
    { id: 'cordoba_nueva_cordoba', name: 'Nueva Córdoba & Güemes', city: 'Córdoba', center: { lat: -31.4286, lng: -64.1873 }, radiusKm: 2.0, zoom: 15 },
    { id: 'cordoba_cerro_rosas', name: 'Cerro de las Rosas & Argüello', city: 'Córdoba', center: { lat: -31.3789, lng: -64.2389 }, radiusKm: 3.0, zoom: 14 },

    // --- ROSARIO ---
    { id: 'rosario_centro', name: 'Rosario Centro & Monumento', city: 'Rosario', center: { lat: -32.9468, lng: -60.6393 }, radiusKm: 2.5, zoom: 15 },
    { id: 'rosario_pichincha', name: 'Pichincha & Echesortu', city: 'Rosario', center: { lat: -32.9348, lng: -60.6558 }, radiusKm: 2.2, zoom: 15 },

    // --- MENDOZA ---
    { id: 'mendoza_capital', name: 'Mendoza Capital Centro', city: 'Mendoza', center: { lat: -32.8895, lng: -68.8458 }, radiusKm: 2.5, zoom: 15 },
    { id: 'mendoza_godoy_cruz', name: 'Godoy Cruz', city: 'Mendoza', center: { lat: -32.9254, lng: -68.8436 }, radiusKm: 2.5, zoom: 15 },

    // --- MAR DEL PLATA ---
    { id: 'mdp_centro', name: 'Mar del Plata Centro', city: 'Mar del Plata', center: { lat: -38.0055, lng: -57.5560 }, radiusKm: 2.5, zoom: 15 },
    { id: 'mdp_guemes', name: 'Zona Güemes & Playa Grande', city: 'Mar del Plata', center: { lat: -38.0163, lng: -57.5458 }, radiusKm: 2.2, zoom: 15 }
];

// Catálogo de rubros comerciales estratégicos con alta conversión a software / web / IA
const RUBROS_CATALOG = [
    { id: 'odontologia', label: 'Odontología & Dentistas', targetSolution: 'software_turnero', priority: 1 },
    { id: 'veterinarias', label: 'Veterinarias & Clínicas Animales', targetSolution: 'software_turnero', priority: 1 },
    { id: 'esteticas', label: 'Centros de Estética, Spa & Belleza', targetSolution: 'software_turnero', priority: 1 },
    { id: 'consultorios_medicos', label: 'Consultorios Médicos & Policonsultorios', targetSolution: 'software_turnero', priority: 2 },
    { id: 'talleres_mecanicos', label: 'Talleres Mecánicos & Frenos', targetSolution: 'software_turnero', priority: 2 },
    { id: 'restaurantes', label: 'Restaurantes, Pizzerías & Bares', targetSolution: 'gastronomia_pedidos', priority: 2 },
    { id: 'inmobiliarias', label: 'Inmobiliarias & Propiedades', targetSolution: 'web_express', priority: 2 },
    { id: 'gimnasios', label: 'Gimnasios & Centros de Fitness', targetSolution: 'software_turnero', priority: 3 },
    { id: 'peluquerias', label: 'Peluquerías & Barberías', targetSolution: 'software_turnero', priority: 3 },
    { id: 'estudios_contables', label: 'Estudios Contables & Impositivos', targetSolution: 'web_express', priority: 3 },
    { id: 'estudios_juridicos', label: 'Estudios Jurídicos & Abogados', targetSolution: 'web_express', priority: 3 },
    { id: 'tiendas_ropa', label: 'Tiendas de Ropa & Calzado', targetSolution: 'ecommerce_tienda', priority: 3 }
];

function kmToLatDelta(km) {
    return km / 111.0;
}

function kmToLngDelta(km, lat = -34.6) {
    const latRad = (lat * Math.PI) / 180.0;
    return km / (111.0 * Math.cos(latRad));
}

class GeoGridScanner {
    /**
     * Catálogo completo de sub-zonas y ciudades
     */
    getAllSubZones() {
        return SUB_ZONES;
    }

    /**
     * Catálogo de rubros con prioridad
     */
    getRubrosCatalog() {
        return RUBROS_CATALOG;
    }

    /**
     * Compatibilidad hacia atrás: Zonas agrupadas por ciudad
     */
    getPresetZones() {
        const cities = {};
        SUB_ZONES.forEach(z => {
            if (!cities[z.city]) {
                cities[z.city] = { id: z.city.toLowerCase().replace(/\s+/g, '_'), name: z.city, zones: [] };
            }
            cities[z.city].zones.push(z);
        });
        return Object.values(cities);
    }

    /**
     * 🧠 DETERMINAR EL PRÓXIMO OBJETIVO RECOMENDADO
     * Analiza MongoDB para encontrar una combinación (Zona, Rubro) que NO haya sido escaneada
     * o cuya última exploración tenga más de 30 días, evitando repeticiones.
     */
    async getNextRecommendedTarget(preferredCity = null) {
        try {
            // Obtener registros de zonas ya escaneadas
            const scannedRecords = await ScannedZone.find({}).lean();
            const scannedMap = new Map();

            scannedRecords.forEach(rec => {
                const key = `${rec.zoneId}__${rec.keyword}`.toLowerCase();
                scannedMap.set(key, rec);
            });

            // Filtrar zonas por ciudad si se especificó
            let candidateZones = SUB_ZONES;
            if (preferredCity) {
                candidateZones = SUB_ZONES.filter(z => z.city.toLowerCase() === preferredCity.toLowerCase());
                if (candidateZones.length === 0) candidateZones = SUB_ZONES;
            }

            // Buscar la primera combinación de alta prioridad no escaneada
            for (const rubro of RUBROS_CATALOG) {
                for (const zone of candidateZones) {
                    const key = `${zone.id}__${rubro.id}`.toLowerCase();
                    const existing = scannedMap.get(key);

                    // Si no está escaneada o fue escaneada hace más de 30 días
                    const isOld = existing && existing.scannedAt && ((Date.now() - new Date(existing.scannedAt).getTime()) > 30 * 24 * 3600 * 1000);

                    if (!existing || isOld) {
                        const cleanLat = zone.center.lat.toFixed(6);
                        const cleanLng = zone.center.lng.toFixed(6);
                        const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(rubro.id)}/@${cleanLat},${cleanLng},${zone.zoom}z`;

                        return {
                            success: true,
                            isNewTarget: !existing,
                            reason: !existing ? 'Zona y rubro nunca antes explorados' : 'Exploración anterior con más de 30 días de antigüedad',
                            zone: {
                                id: zone.id,
                                name: zone.name,
                                city: zone.city,
                                center: zone.center,
                                radiusKm: zone.radiusKm,
                                zoom: zone.zoom
                            },
                            rubro: {
                                id: rubro.id,
                                label: rubro.label,
                                targetSolution: rubro.targetSolution
                            },
                            searchQuery: `${rubro.label} en ${zone.name}`,
                            googleMapsUrl: mapsUrl,
                            previousScan: existing ? {
                                scannedAt: existing.scannedAt,
                                totalLeadsFound: existing.totalLeadsFound || 0,
                                validLeadsIngested: existing.validLeadsIngested || 0
                            } : null
                        };
                    }
                }
            }

            // Si todas fueron escaneadas, devolver la más antigua
            const oldest = scannedRecords.sort((a, b) => new Date(a.scannedAt) - new Date(b.scannedAt))[0];
            const fallbackZone = SUB_ZONES.find(z => z.id === oldest?.zoneId) || SUB_ZONES[0];
            const fallbackRubro = RUBROS_CATALOG.find(r => r.id === oldest?.keyword) || RUBROS_CATALOG[0];

            return {
                success: true,
                isNewTarget: false,
                reason: 'Todas las combinaciones fueron cubiertas. Reiniciando ciclo por la zona más antigua.',
                zone: fallbackZone,
                rubro: fallbackRubro,
                searchQuery: `${fallbackRubro.label} en ${fallbackZone.name}`,
                googleMapsUrl: `https://www.google.com/maps/search/${encodeURIComponent(fallbackRubro.id)}/@${fallbackZone.center.lat},${fallbackZone.center.lng},${fallbackZone.zoom}z`,
                previousScan: oldest
            };

        } catch (error) {
            console.error('Error calculando próximo objetivo en GeoGridScanner:', error);
            // Fallback determinista
            const z = SUB_ZONES[0];
            const r = RUBROS_CATALOG[0];
            return {
                success: true,
                isNewTarget: true,
                reason: 'Modo autónomo por defecto',
                zone: z,
                rubro: r,
                searchQuery: `${r.label} en ${z.name}`,
                googleMapsUrl: `https://www.google.com/maps/search/${encodeURIComponent(r.id)}/@${z.center.lat},${z.center.lng},${z.zoom}z`
            };
        }
    }

    /**
     * Registrar la finalización de un escaneo en una zona
     */
    async recordZoneScan(data) {
        try {
            const {
                zoneId,
                zoneName,
                city,
                keyword,
                keywordLabel,
                center,
                radiusKm = 2.0,
                zoom = 15,
                totalLeadsFound = 0,
                validLeadsIngested = 0,
                discardedLeads = 0,
                notes = ''
            } = data;

            if (!zoneId || !keyword) {
                throw new Error('zoneId y keyword son requeridos para registrar el escaneo');
            }

            const cleanCenter = center || (SUB_ZONES.find(z => z.id === zoneId)?.center) || { lat: -34.6037, lng: -58.3816 };
            const cleanZoneName = zoneName || (SUB_ZONES.find(z => z.id === zoneId)?.name) || zoneId;
            const cleanCity = city || (SUB_ZONES.find(z => z.id === zoneId)?.city) || 'Argentina';

            const record = await ScannedZone.findOneAndUpdate(
                { zoneId, keyword },
                {
                    zoneId,
                    zoneName: cleanZoneName,
                    city: cleanCity,
                    keyword,
                    keywordLabel: keywordLabel || keyword,
                    center: cleanCenter,
                    radiusKm,
                    zoom,
                    status: 'completed',
                    scannedAt: new Date(),
                    $inc: {
                        totalLeadsFound: totalLeadsFound,
                        validLeadsIngested: validLeadsIngested,
                        discardedLeads: discardedLeads
                    },
                    notes
                },
                { upsert: true, new: true }
            );

            return { success: true, record };
        } catch (error) {
            console.error('Error guardando registro de zona escaneada:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Obtener historial de zonas ya escaneadas
     */
    async getScannedHistory(limit = 40) {
        try {
            const history = await ScannedZone.find({})
                .sort({ scannedAt: -1 })
                .limit(limit)
                .lean();

            const totalScanned = await ScannedZone.countDocuments({});
            const totalValidLeads = history.reduce((sum, h) => sum + (h.validLeadsIngested || 0), 0);

            return {
                success: true,
                totalScanned,
                totalValidLeads,
                history
            };
        } catch (error) {
            console.error('Error obteniendo historial de zonas:', error);
            return { success: false, error: error.message, history: [] };
        }
    }

    /**
     * Generar cuadrícula de coordenadas GPS detallada para una zona
     */
    generateGrid(options = {}) {
        const {
            zoneId,
            radiusKm = 2.5,
            stepKm = 1.2,
            keyword = 'odontologia',
            zoom = 15
        } = options;

        let centerLat = options.centerLat;
        let centerLng = options.centerLng;
        let zoneName = 'Área personalizada';

        if (zoneId) {
            const match = SUB_ZONES.find(z => z.id === zoneId);
            if (match) {
                centerLat = match.center.lat;
                centerLng = match.center.lng;
                zoneName = match.name;
            }
        }

        if (typeof centerLat !== 'number' || typeof centerLng !== 'number') {
            centerLat = -34.6037;
            centerLng = -58.3816;
            zoneName = 'CABA Centro';
        }

        const effectiveStep = Math.max(0.8, Math.min(stepKm, 4.0));
        const latDelta = kmToLatDelta(effectiveStep);
        const lngDelta = kmToLngDelta(effectiveStep, centerLat);

        const radiusLat = kmToLatDelta(radiusKm);
        const radiusLng = kmToLngDelta(radiusKm, centerLat);

        const minLat = centerLat - radiusLat;
        const maxLat = centerLat + radiusLat;
        const minLng = centerLng - radiusLng;
        const maxLng = centerLng + radiusLng;

        const points = [];
        let index = 1;

        for (let lat = minLat; lat <= maxLat; lat += latDelta) {
            for (let lng = minLng; lng <= maxLng; lng += lngDelta) {
                const dLat = (lat - centerLat) / radiusLat;
                const dLng = (lng - centerLng) / radiusLng;
                if ((dLat * dLat + dLng * dLng) <= 1.05) {
                    const cleanLat = Number(lat.toFixed(6));
                    const cleanLng = Number(lng.toFixed(6));
                    const queryUrl = `https://www.google.com/maps/search/${encodeURIComponent(keyword)}/@${cleanLat},${cleanLng},${zoom}z`;

                    points.push({
                        index: index++,
                        lat: cleanLat,
                        lng: cleanLng,
                        keyword,
                        zoom,
                        searchUrl: queryUrl,
                        searchQuery: `${keyword} (@${cleanLat},${cleanLng})`
                    });
                }
            }
        }

        return {
            zoneName,
            keyword,
            center: { lat: centerLat, lng: centerLng },
            radiusKm,
            stepKm: effectiveStep,
            totalPoints: points.length,
            points
        };
    }
}

module.exports = new GeoGridScanner();
