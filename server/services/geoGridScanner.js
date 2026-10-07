/**
 * 🗺️ AGENTE 1: MINERO MASIVO GEOGRÁFICO (GEO-GRID SCANNER)
 * 
 * Divide ciudades y regiones en micro-cuadrículas de coordenadas GPS (latitud/longitud)
 * para realizar búsquedas hiper-densas en Google Maps y superar el límite de 120 resultados
 * por término impuesto por la interfaz estándar.
 */

// Zonas y ciudades predefinidas con sus Bounding Boxes (coordenadas min/max)
const PRESET_ZONES = {
    'caba': {
        name: 'Ciudad Autónoma de Buenos Aires (CABA)',
        minLat: -34.705,
        maxLat: -34.530,
        minLng: -58.530,
        maxLng: -58.350,
        center: { lat: -34.6037, lng: -58.3816 },
        defaultRadiusKm: 12
    },
    'gba_norte': {
        name: 'GBA Zona Norte (Vicente López, San Isidro, Tigre, San Fernando)',
        minLat: -34.530,
        maxLat: -34.410,
        minLng: -58.620,
        maxLng: -58.460,
        center: { lat: -34.4700, lng: -58.5200 },
        defaultRadiusKm: 15
    },
    'gba_sur': {
        name: 'GBA Zona Sur (Avellaneda, Lanús, Quilmes, Lomas de Zamora)',
        minLat: -34.790,
        maxLat: -34.660,
        minLng: -58.440,
        maxLng: -58.240,
        center: { lat: -34.7200, lng: -58.3400 },
        defaultRadiusKm: 15
    },
    'gba_oeste': {
        name: 'GBA Zona Oeste (Ramos Mejía, Morón, San Justo, Castelar, Haedo)',
        minLat: -34.710,
        maxLat: -34.610,
        minLng: -58.680,
        maxLng: -58.530,
        center: { lat: -34.6500, lng: -58.6000 },
        defaultRadiusKm: 12
    },
    'la_plata': {
        name: 'La Plata y alrededores',
        minLat: -34.960,
        maxLat: -34.880,
        minLng: -58.020,
        maxLng: -57.880,
        center: { lat: -34.9205, lng: -57.9536 },
        defaultRadiusKm: 10
    },
    'cordoba': {
        name: 'Córdoba Capital',
        minLat: -31.470,
        maxLat: -31.330,
        minLng: -64.280,
        maxLng: -64.120,
        center: { lat: -31.4201, lng: -64.1888 },
        defaultRadiusKm: 12
    },
    'rosario': {
        name: 'Rosario (Santa Fe)',
        minLat: -33.010,
        maxLat: -32.890,
        minLng: -60.740,
        maxLng: -60.620,
        center: { lat: -32.9587, lng: -60.6930 },
        defaultRadiusKm: 10
    },
    'mendoza': {
        name: 'Mendoza Capital y Gran Mendoza',
        minLat: -32.950,
        maxLat: -32.840,
        minLng: -68.900,
        maxLng: -68.800,
        center: { lat: -32.8895, lng: -68.8458 },
        defaultRadiusKm: 10
    },
    'mar_del_plata': {
        name: 'Mar del Plata',
        minLat: -38.070,
        maxLat: -37.950,
        minLng: -57.620,
        maxLng: -57.510,
        center: { lat: -38.0055, lng: -57.5560 },
        defaultRadiusKm: 10
    }
};

/**
 * Convierte distancia en kilómetros a delta aproximado de grados (Lat/Lng)
 */
function kmToLatDelta(km) {
    return km / 111.0;
}

function kmToLngDelta(km, lat = -34.6) {
    const latRad = (lat * Math.PI) / 180.0;
    return km / (111.0 * Math.cos(latRad));
}

class GeoGridScanner {
    /**
     * Devuelve el catálogo de zonas predefinidas
     */
    getPresetZones() {
        return Object.entries(PRESET_ZONES).map(([key, zone]) => ({
            id: key,
            name: zone.name,
            center: zone.center,
            defaultRadiusKm: zone.defaultRadiusKm
        }));
    }

    /**
     * Genera la cuadrícula de puntos de exploración para una zona
     * @param {Object} options
     * @param {string} [options.zoneId] - Identificador de zona preestablecida (ej: 'caba')
     * @param {number} [options.centerLat] - Latitud central personalizada
     * @param {number} [options.centerLng] - Longitud central personalizada
     * @param {number} [options.radiusKm=8] - Radio de cobertura en km
     * @param {number} [options.stepKm=1.5] - Distancia entre cada punto de la cuadrícula en km (1.2 a 2.0 km recomendado)
     * @param {string} [options.keyword='odontologia'] - Rubro o término de búsqueda
     * @param {number} [options.zoom=15] - Zoom de exploración en Google Maps
     */
    generateGrid(options = {}) {
        const {
            zoneId,
            radiusKm = 8,
            stepKm = 1.5,
            keyword = 'odontologia',
            zoom = 15
        } = options;

        let centerLat = options.centerLat;
        let centerLng = options.centerLng;
        let zoneName = 'Área personalizada';

        if (zoneId && PRESET_ZONES[zoneId]) {
            const z = PRESET_ZONES[zoneId];
            centerLat = z.center.lat;
            centerLng = z.center.lng;
            zoneName = z.name;
        }

        if (typeof centerLat !== 'number' || typeof centerLng !== 'number') {
            // Default a CABA Obelisco
            centerLat = -34.6037;
            centerLng = -58.3816;
            zoneName = PRESET_ZONES.caba.name;
        }

        const effectiveStep = Math.max(0.8, Math.min(stepKm, 5.0)); // Entre 800m y 5km
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

        // Doble barrido por filas y columnas
        for (let lat = minLat; lat <= maxLat; lat += latDelta) {
            for (let lng = minLng; lng <= maxLng; lng += lngDelta) {
                // Filtrar solo puntos dentro de la elipse/círculo euclidiano para no dispersar esquinas
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
