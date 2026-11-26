/**
 * 🗺️ AGENTE 1: GEO-GRID SCANNER NACIONAL (CAPITAL + GBA + 18 PROVINCIAS) & MEMORIA ANTI-REPETICIÓN
 * (NatoH Systems B2B Edition)
 *
 * - Catálogo nacional de 80+ sub-zonas de alto poder adquisitivo en CABA, GBA e Interior/Provincias Argentinas
 * - Resolución inteligente de zonas por coordenadas GPS (Haversine), dirección extraída de leads y nombre limpio (nunca más "Vista GPS")
 * - Reconstrucción/sincronización automática de zonas históricas desde la colección `Lead`
 * - Integrado con lugares/rubros personalizados del CRM (`Config: scraper_config`) y Ruta IA (`Config: ai_route_plan`)
 */

const ScannedZone = require('../models/ScannedZone');
const Config = require('../models/Config');

const PRESET_ZONES = {
    caba: {
        name: 'CABA (Capital Federal)',
        province: 'CABA',
        region: 'AMBA',
        center: { lat: -34.6037, lng: -58.3816 },
        bounds: { north: -34.535, south: -34.685, west: -58.530, east: -58.350 },
        defaultZoom: 15
    },
    gba_norte: {
        name: 'GBA Zona Norte (Vicente López, San Isidro, Tigre, Pilar)',
        province: 'Buenos Aires (GBA Norte)',
        region: 'AMBA',
        center: { lat: -34.4708, lng: -58.5286 },
        bounds: { north: -34.390, south: -34.540, west: -58.620, east: -58.460 },
        defaultZoom: 15
    },
    gba_sur: {
        name: 'GBA Zona Sur (Lomas, Quilmes, Lanús, Adrogué, Canning)',
        province: 'Buenos Aires (GBA Sur)',
        region: 'AMBA',
        center: { lat: -34.7200, lng: -58.3600 },
        bounds: { north: -34.650, south: -34.820, west: -58.460, east: -58.240 },
        defaultZoom: 15
    },
    gba_oeste: {
        name: 'GBA Zona Oeste (Ramos Mejía, Morón, Castelar, Luján)',
        province: 'Buenos Aires (GBA Oeste)',
        region: 'AMBA',
        center: { lat: -34.6500, lng: -58.6000 },
        bounds: { north: -34.580, south: -34.700, west: -58.720, east: -58.530 },
        defaultZoom: 15
    },
    pba_interior: {
        name: 'Provincia de Buenos Aires — Interior (La Plata, MdP, Bahía, Tandil)',
        province: 'Buenos Aires (Interior)',
        region: 'Pampa',
        center: { lat: -37.3217, lng: -59.1332 },
        bounds: { north: -34.850, south: -38.800, west: -62.400, east: -57.400 },
        defaultZoom: 15
    },
    cordoba: {
        name: 'Córdoba (Capital, Carlos Paz, Río Cuarto, Villa María)',
        province: 'Córdoba',
        region: 'Centro',
        center: { lat: -31.4201, lng: -64.1888 },
        bounds: { north: -31.350, south: -31.480, west: -64.260, east: -64.120 },
        defaultZoom: 15
    },
    santa_fe: {
        name: 'Santa Fe (Rosario, Santa Fe Capital, Rafaela, Venado Tuerto)',
        province: 'Santa Fe',
        region: 'Centro',
        center: { lat: -32.9442, lng: -60.6505 },
        bounds: { north: -32.880, south: -33.010, west: -60.720, east: -60.610 },
        defaultZoom: 15
    },
    mendoza: {
        name: 'Mendoza (Capital, Godoy Cruz, Chacras, San Rafael)',
        province: 'Mendoza',
        region: 'Cuyo',
        center: { lat: -32.8895, lng: -68.8458 },
        bounds: { north: -32.850, south: -32.950, west: -68.890, east: -68.800 },
        defaultZoom: 15
    },
    patagonia_norte: {
        name: 'Neuquén & Río Negro (Neuquén, Bariloche, Cipolletti, Gral. Roca)',
        province: 'Neuquén / Río Negro',
        region: 'Patagonia',
        center: { lat: -38.9516, lng: -68.0591 },
        bounds: { north: -38.900, south: -39.000, west: -68.150, east: -67.950 },
        defaultZoom: 15
    },
    patagonia_sur: {
        name: 'Patagonia Sur (Comodoro Rivadavia, Puerto Madryn, Trelew, Ushuaia)',
        province: 'Chubut / Tierra del Fuego',
        region: 'Patagonia',
        center: { lat: -45.8641, lng: -67.4966 },
        bounds: { north: -45.800, south: -45.920, west: -67.580, east: -67.420 },
        defaultZoom: 15
    },
    tucuman: {
        name: 'Tucumán (San Miguel de Tucumán, Yerba Buena)',
        province: 'Tucumán',
        region: 'NOA',
        center: { lat: -26.8083, lng: -65.2176 },
        bounds: { north: -26.760, south: -26.860, west: -65.320, east: -65.160 },
        defaultZoom: 15
    },
    salta_jujuy: {
        name: 'Salta & Jujuy (Salta Capital, San Salvador de Jujuy)',
        province: 'Salta / Jujuy',
        region: 'NOA',
        center: { lat: -24.7821, lng: -65.4232 },
        bounds: { north: -24.730, south: -24.840, west: -65.480, east: -65.360 },
        defaultZoom: 15
    },
    entre_rios: {
        name: 'Entre Ríos (Paraná, Concordia, Gualeguaychú)',
        province: 'Entre Ríos',
        region: 'Litoral',
        center: { lat: -31.7413, lng: -60.5115 },
        bounds: { north: -31.700, south: -31.790, west: -60.560, east: -60.450 },
        defaultZoom: 15
    },
    nea: {
        name: 'NEA (Corrientes, Posadas Misiones, Resistencia Chaco)',
        province: 'Corrientes / Misiones / Chaco',
        region: 'NEA',
        center: { lat: -27.4692, lng: -58.8306 },
        bounds: { north: -27.420, south: -27.520, west: -58.900, east: -58.780 },
        defaultZoom: 15
    },
    cuyo_norte: {
        name: 'San Juan & San Luis (San Juan Capital, San Luis Capital)',
        province: 'San Juan / San Luis',
        region: 'Cuyo',
        center: { lat: -31.5375, lng: -68.5364 },
        bounds: { north: -31.490, south: -31.590, west: -68.590, east: -68.480 },
        defaultZoom: 15
    },
    centro_norte: {
        name: 'La Pampa, Santiago del Estero, Catamarca & La Rioja',
        province: 'Interior Federal',
        region: 'Interior',
        center: { lat: -36.6167, lng: -64.2833 },
        bounds: { north: -36.570, south: -36.660, west: -64.340, east: -64.220 },
        defaultZoom: 15
    },
    custom: {
        name: 'Lugares Personalizados (CRM)',
        province: 'Personalizado',
        region: 'Custom',
        center: { lat: -34.6037, lng: -58.3816 },
        bounds: { north: -34.535, south: -34.685, west: -58.530, east: -58.350 },
        defaultZoom: 15
    }
};

// Catálogo granular nacional (80+ sub-zonas de alta densidad comercial e industrial)
const GRANULAR_SUBZONES = [
    // ── CABA (14) ──
    { id: 'caba_palermo_soho', name: 'Palermo Soho (CABA)', city: 'caba', province: 'CABA', lat: -34.5889, lng: -58.4305, zoom: 16 },
    { id: 'caba_palermo_hollywood', name: 'Palermo Hollywood (CABA)', city: 'caba', province: 'CABA', lat: -34.5815, lng: -58.4385, zoom: 16 },
    { id: 'caba_belgrano_centro', name: 'Belgrano Centro / Cabildo (CABA)', city: 'caba', province: 'CABA', lat: -34.5625, lng: -58.4565, zoom: 16 },
    { id: 'caba_recoleta', name: 'Recoleta (CABA)', city: 'caba', province: 'CABA', lat: -34.5895, lng: -58.3974, zoom: 16 },
    { id: 'caba_caballito', name: 'Caballito / Acoyte y Rivadavia (CABA)', city: 'caba', province: 'CABA', lat: -34.6186, lng: -58.4368, zoom: 16 },
    { id: 'caba_villa_urquiza', name: 'Villa Urquiza (CABA)', city: 'caba', province: 'CABA', lat: -34.5736, lng: -58.4875, zoom: 16 },
    { id: 'caba_nunez', name: 'Núñez / Libertador (CABA)', city: 'caba', province: 'CABA', lat: -34.5453, lng: -58.4612, zoom: 16 },
    { id: 'caba_devoto', name: 'Villa Devoto (CABA)', city: 'caba', province: 'CABA', lat: -34.6003, lng: -58.5126, zoom: 16 },
    { id: 'caba_almagro', name: 'Almagro / Boedo (CABA)', city: 'caba', province: 'CABA', lat: -34.6122, lng: -58.4210, zoom: 16 },
    { id: 'caba_microcentro', name: 'Microcentro / Tribunales (CABA)', city: 'caba', province: 'CABA', lat: -34.6037, lng: -58.3816, zoom: 16 },
    { id: 'caba_puerto_madero', name: 'Puerto Madero / Retiro (CABA)', city: 'caba', province: 'CABA', lat: -34.6083, lng: -58.3635, zoom: 16 },
    { id: 'caba_colegiales_chacarita', name: 'Colegiales / Chacarita (CABA)', city: 'caba', province: 'CABA', lat: -34.5778, lng: -58.4492, zoom: 16 },
    { id: 'caba_villa_crespo', name: 'Villa Crespo (CABA)', city: 'caba', province: 'CABA', lat: -34.5996, lng: -58.4396, zoom: 16 },
    { id: 'caba_flores_floresta', name: 'Flores / Floresta (CABA)', city: 'caba', province: 'CABA', lat: -34.6285, lng: -58.4633, zoom: 16 },

    // ── GBA Zona Norte (8) ──
    { id: 'gba_vicente_lopez', name: 'Vicente López / Olivos (GBA Norte)', city: 'gba_norte', province: 'Buenos Aires (GBA Norte)', lat: -34.5105, lng: -58.4815, zoom: 15 },
    { id: 'gba_martinez', name: 'Martínez Centro (GBA Norte)', city: 'gba_norte', province: 'Buenos Aires (GBA Norte)', lat: -34.4882, lng: -58.5038, zoom: 15 },
    { id: 'gba_san_isidro', name: 'San Isidro Centro / Lomas (GBA Norte)', city: 'gba_norte', province: 'Buenos Aires (GBA Norte)', lat: -34.4708, lng: -58.5286, zoom: 15 },
    { id: 'gba_san_fernando', name: 'San Fernando Centro (GBA Norte)', city: 'gba_norte', province: 'Buenos Aires (GBA Norte)', lat: -34.4417, lng: -58.5582, zoom: 15 },
    { id: 'gba_nordelta_tigre', name: 'Nordelta / Tigre Centro (GBA Norte)', city: 'gba_norte', province: 'Buenos Aires (GBA Norte)', lat: -34.4018, lng: -58.6495, zoom: 15 },
    { id: 'gba_pilar', name: 'Pilar Centro / Panamericana Km 50 (GBA Norte)', city: 'gba_norte', province: 'Buenos Aires (GBA Norte)', lat: -34.4587, lng: -58.9142, zoom: 15 },
    { id: 'gba_escobar', name: 'Escobar / Ing. Maschwitz (GBA Norte)', city: 'gba_norte', province: 'Buenos Aires (GBA Norte)', lat: -34.3483, lng: -58.7927, zoom: 15 },
    { id: 'gba_san_martin', name: 'San Martín / Villa Ballester (GBA Norte)', city: 'gba_norte', province: 'Buenos Aires (GBA Norte)', lat: -34.5750, lng: -58.5370, zoom: 15 },

    // ── GBA Zona Sur (9) ──
    { id: 'gba_lomas_las_lomitas', name: 'Las Lomitas / Lomas de Zamora (GBA Sur)', city: 'gba_sur', province: 'Buenos Aires (GBA Sur)', lat: -34.7644, lng: -58.4022, zoom: 16 },
    { id: 'gba_banfield_temperley', name: 'Banfield / Temperley (GBA Sur)', city: 'gba_sur', province: 'Buenos Aires (GBA Sur)', lat: -34.7429, lng: -58.3935, zoom: 15 },
    { id: 'gba_quilmes_centro', name: 'Quilmes Centro (GBA Sur)', city: 'gba_sur', province: 'Buenos Aires (GBA Sur)', lat: -34.7242, lng: -58.2526, zoom: 16 },
    { id: 'gba_bernal_quilmes_oeste', name: 'Bernal / Quilmes Oeste (GBA Sur)', city: 'gba_sur', province: 'Buenos Aires (GBA Sur)', lat: -34.7124, lng: -58.2815, zoom: 15 },
    { id: 'gba_lanus_centro', name: 'Lanúsita / Lanús Oeste (GBA Sur)', city: 'gba_sur', province: 'Buenos Aires (GBA Sur)', lat: -34.7067, lng: -58.3935, zoom: 16 },
    { id: 'gba_adrogue', name: 'Adrogué Centro (GBA Sur)', city: 'gba_sur', province: 'Buenos Aires (GBA Sur)', lat: -34.7985, lng: -58.3920, zoom: 16 },
    { id: 'gba_avellaneda', name: 'Avellaneda Centro / Mitre (GBA Sur)', city: 'gba_sur', province: 'Buenos Aires (GBA Sur)', lat: -34.6625, lng: -58.3647, zoom: 16 },
    { id: 'gba_berazategui', name: 'Berazategui Centro (GBA Sur)', city: 'gba_sur', province: 'Buenos Aires (GBA Sur)', lat: -34.7634, lng: -58.2116, zoom: 15 },
    { id: 'gba_canning_ezeiza', name: 'Canning / Ezeiza (GBA Sur)', city: 'gba_sur', province: 'Buenos Aires (GBA Sur)', lat: -34.8624, lng: -58.5030, zoom: 15 },

    // ── GBA Zona Oeste (6) ──
    { id: 'gba_ramos_mejia', name: 'Ramos Mejía Centro (GBA Oeste)', city: 'gba_oeste', province: 'Buenos Aires (GBA Oeste)', lat: -34.6433, lng: -58.5647, zoom: 16 },
    { id: 'gba_castelar_ituzaingo', name: 'Castelar / Parque Leloir / Ituzaingó (GBA Oeste)', city: 'gba_oeste', province: 'Buenos Aires (GBA Oeste)', lat: -34.6512, lng: -58.6435, zoom: 15 },
    { id: 'gba_moron_centro', name: 'Morón / Haedo (GBA Oeste)', city: 'gba_oeste', province: 'Buenos Aires (GBA Oeste)', lat: -34.6534, lng: -58.6198, zoom: 16 },
    { id: 'gba_san_justo', name: 'San Justo Centro (GBA Oeste)', city: 'gba_oeste', province: 'Buenos Aires (GBA Oeste)', lat: -34.6778, lng: -58.5608, zoom: 15 },
    { id: 'gba_merlo_moreno', name: 'Merlo / Moreno Centro (GBA Oeste)', city: 'gba_oeste', province: 'Buenos Aires (GBA Oeste)', lat: -34.6615, lng: -58.7294, zoom: 15 },
    { id: 'gba_lujan', name: 'Luján Centro (Buenos Aires)', city: 'gba_oeste', province: 'Buenos Aires (GBA Oeste)', lat: -34.5703, lng: -59.1050, zoom: 15 },

    // ── Interior Provincia de Buenos Aires (10) ──
    { id: 'pba_la_plata_centro', name: 'La Plata Centro (Buenos Aires)', city: 'pba_interior', province: 'Buenos Aires (Interior)', lat: -34.9205, lng: -57.9536, zoom: 15 },
    { id: 'pba_city_bell_gonnet', name: 'City Bell / Gonnet / La Plata Norte (Buenos Aires)', city: 'pba_interior', province: 'Buenos Aires (Interior)', lat: -34.8726, lng: -58.0468, zoom: 15 },
    { id: 'pba_mdp_guemes', name: 'Mar del Plata — Paseo Güemes / Alem (Buenos Aires)', city: 'pba_interior', province: 'Buenos Aires (Interior)', lat: -38.0128, lng: -57.5378, zoom: 16 },
    { id: 'pba_mdp_centro', name: 'Mar del Plata — Centro / Constitución (Buenos Aires)', city: 'pba_interior', province: 'Buenos Aires (Interior)', lat: -37.9977, lng: -57.5482, zoom: 15 },
    { id: 'pba_bahia_blanca', name: 'Bahía Blanca Centro (Buenos Aires)', city: 'pba_interior', province: 'Buenos Aires (Interior)', lat: -38.7183, lng: -62.2663, zoom: 15 },
    { id: 'pba_tandil', name: 'Tandil Centro (Buenos Aires)', city: 'pba_interior', province: 'Buenos Aires (Interior)', lat: -37.3288, lng: -59.1367, zoom: 15 },
    { id: 'pba_zarate_campana', name: 'Zárate / Campana (Buenos Aires)', city: 'pba_interior', province: 'Buenos Aires (Interior)', lat: -34.1632, lng: -58.9592, zoom: 15 },
    { id: 'pba_junin', name: 'Junín Centro (Buenos Aires)', city: 'pba_interior', province: 'Buenos Aires (Interior)', lat: -34.5838, lng: -60.9433, zoom: 15 },
    { id: 'pba_pergamino_san_nicolas', name: 'San Nicolás / Pergamino (Buenos Aires)', city: 'pba_interior', province: 'Buenos Aires (Interior)', lat: -33.3358, lng: -60.2252, zoom: 15 },
    { id: 'pba_pinamar_carilo', name: 'Pinamar / Cariló / Villa Gesell (Costa Atlántica)', city: 'pba_interior', province: 'Buenos Aires (Interior)', lat: -37.1079, lng: -56.8615, zoom: 15 },

    // ── Córdoba (6) ──
    { id: 'cba_nueva_cordoba', name: 'Nueva Córdoba / Centro (Córdoba)', city: 'cordoba', province: 'Córdoba', lat: -31.4258, lng: -64.1862, zoom: 16 },
    { id: 'cba_cerro_las_rosas', name: 'Cerro de las Rosas / Urca (Córdoba)', city: 'cordoba', province: 'Córdoba', lat: -31.3712, lng: -64.2368, zoom: 15 },
    { id: 'cba_general_paz', name: 'Barrio General Paz / Alta Córdoba (Córdoba)', city: 'cordoba', province: 'Córdoba', lat: -31.4112, lng: -64.1670, zoom: 15 },
    { id: 'cba_carlos_paz', name: 'Villa Carlos Paz (Córdoba)', city: 'cordoba', province: 'Córdoba', lat: -31.4241, lng: -64.4978, zoom: 15 },
    { id: 'cba_rio_cuarto', name: 'Río Cuarto (Córdoba)', city: 'cordoba', province: 'Córdoba', lat: -33.1232, lng: -64.3493, zoom: 15 },
    { id: 'cba_villa_maria', name: 'Villa María (Córdoba)', city: 'cordoba', province: 'Córdoba', lat: -32.4075, lng: -63.2402, zoom: 15 },

    // ── Santa Fe (5) ──
    { id: 'sf_rosario_pichincha', name: 'Rosario — Pichincha / Centro (Santa Fe)', city: 'santa_fe', province: 'Santa Fe', lat: -32.9365, lng: -60.6542, zoom: 16 },
    { id: 'sf_rosario_fisherton', name: 'Rosario — Fisherton / Funes (Santa Fe)', city: 'santa_fe', province: 'Santa Fe', lat: -32.9278, lng: -60.7510, zoom: 15 },
    { id: 'sf_santa_fe_capital', name: 'Santa Fe Capital — Recoleta / Centro (Santa Fe)', city: 'santa_fe', province: 'Santa Fe', lat: -31.6333, lng: -60.7000, zoom: 15 },
    { id: 'sf_rafaela', name: 'Rafaela (Santa Fe)', city: 'santa_fe', province: 'Santa Fe', lat: -31.2503, lng: -61.4867, zoom: 15 },
    { id: 'sf_venado_tuerto', name: 'Venado Tuerto (Santa Fe)', city: 'santa_fe', province: 'Santa Fe', lat: -33.7456, lng: -61.9688, zoom: 15 },

    // ── Mendoza (4) ──
    { id: 'mdz_centro_aristides', name: 'Mendoza Capital — Av. Arístides / Centro (Mendoza)', city: 'mendoza', province: 'Mendoza', lat: -32.8915, lng: -68.8555, zoom: 16 },
    { id: 'mdz_godoy_cruz', name: 'Godoy Cruz / Palmares (Mendoza)', city: 'mendoza', province: 'Mendoza', lat: -32.9310, lng: -68.8475, zoom: 15 },
    { id: 'mdz_chacras_lujan', name: 'Chacras de Coria / Luján de Cuyo (Mendoza)', city: 'mendoza', province: 'Mendoza', lat: -32.9875, lng: -68.8780, zoom: 15 },
    { id: 'mdz_san_rafael', name: 'San Rafael (Mendoza)', city: 'mendoza', province: 'Mendoza', lat: -34.6177, lng: -68.3301, zoom: 15 },

    // ── Patagonia Norte: Neuquén & Río Negro (4) ──
    { id: 'nqn_capital', name: 'Neuquén Capital — Centro / Alto (Neuquén)', city: 'patagonia_norte', province: 'Neuquén', lat: -38.9516, lng: -68.0591, zoom: 15 },
    { id: 'rn_bariloche', name: 'San Carlos de Bariloche (Río Negro)', city: 'patagonia_norte', province: 'Río Negro', lat: -41.1335, lng: -71.3103, zoom: 15 },
    { id: 'rn_cipolletti', name: 'Cipolletti (Río Negro)', city: 'patagonia_norte', province: 'Río Negro', lat: -38.9339, lng: -67.9903, zoom: 15 },
    { id: 'rn_general_roca', name: 'General Roca (Río Negro)', city: 'patagonia_norte', province: 'Río Negro', lat: -39.0333, lng: -67.5833, zoom: 15 },

    // ── Patagonia Sur: Chubut & Tierra del Fuego (3) ──
    { id: 'chu_comodoro', name: 'Comodoro Rivadavia (Chubut)', city: 'patagonia_sur', province: 'Chubut', lat: -45.8641, lng: -67.4966, zoom: 15 },
    { id: 'chu_madryn_trelew', name: 'Puerto Madryn / Trelew (Chubut)', city: 'patagonia_sur', province: 'Chubut', lat: -42.7692, lng: -65.0385, zoom: 15 },
    { id: 'tdf_ushuaia', name: 'Ushuaia (Tierra del Fuego)', city: 'patagonia_sur', province: 'Tierra del Fuego', lat: -54.8019, lng: -68.3030, zoom: 15 },

    // ── Tucumán (2) ──
    { id: 'tuc_capital', name: 'San Miguel de Tucumán — Barrio Norte / Centro (Tucumán)', city: 'tucuman', province: 'Tucumán', lat: -26.8241, lng: -65.2044, zoom: 15 },
    { id: 'tuc_yerba_buena', name: 'Yerba Buena (Tucumán)', city: 'tucuman', province: 'Tucumán', lat: -26.8167, lng: -65.3167, zoom: 15 },

    // ── Salta & Jujuy (2) ──
    { id: 'sal_capital', name: 'Salta Capital — Tres Cerritos / Centro (Salta)', city: 'salta_jujuy', province: 'Salta', lat: -24.7821, lng: -65.4232, zoom: 15 },
    { id: 'juj_capital', name: 'San Salvador de Jujuy (Jujuy)', city: 'salta_jujuy', province: 'Jujuy', lat: -24.1858, lng: -65.2995, zoom: 15 },

    // ── Entre Ríos (3) ──
    { id: 'er_parana', name: 'Paraná Centro (Entre Ríos)', city: 'entre_rios', province: 'Entre Ríos', lat: -31.7413, lng: -60.5115, zoom: 15 },
    { id: 'er_concordia', name: 'Concordia (Entre Ríos)', city: 'entre_rios', province: 'Entre Ríos', lat: -31.3930, lng: -58.0209, zoom: 15 },
    { id: 'er_gualeguaychu', name: 'Gualeguaychú (Entre Ríos)', city: 'entre_rios', province: 'Entre Ríos', lat: -33.0094, lng: -58.5172, zoom: 15 },

    // ── NEA: Corrientes, Misiones & Chaco (3) ──
    { id: 'cor_capital', name: 'Corrientes Capital (Corrientes)', city: 'nea', province: 'Corrientes', lat: -27.4692, lng: -58.8306, zoom: 15 },
    { id: 'mis_posadas', name: 'Posadas Centro (Misiones)', city: 'nea', province: 'Misiones', lat: -27.3671, lng: -55.8961, zoom: 15 },
    { id: 'cha_resistencia', name: 'Resistencia Centro (Chaco)', city: 'nea', province: 'Chaco', lat: -27.4514, lng: -58.9867, zoom: 15 },

    // ── Cuyo Norte: San Juan & San Luis (2) ──
    { id: 'sj_capital', name: 'San Juan Capital (San Juan)', city: 'cuyo_norte', province: 'San Juan', lat: -31.5375, lng: -68.5364, zoom: 15 },
    { id: 'sl_capital', name: 'San Luis Capital (San Luis)', city: 'cuyo_norte', province: 'San Luis', lat: -33.3017, lng: -66.3378, zoom: 15 },

    // ── Interior Federal (3) ──
    { id: 'lp_santa_rosa', name: 'Santa Rosa (La Pampa)', city: 'centro_norte', province: 'La Pampa', lat: -36.6167, lng: -64.2833, zoom: 15 },
    { id: 'sde_capital', name: 'Santiago del Estero Capital (Santiago del Estero)', city: 'centro_norte', province: 'Santiago del Estero', lat: -27.7834, lng: -64.2642, zoom: 15 },
    { id: 'cat_capital', name: 'San Fernando del Valle de Catamarca (Catamarca)', city: 'centro_norte', province: 'Catamarca', lat: -28.4696, lng: -65.7795, zoom: 15 }
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
    customZones: [],
    customRubros: [],
    disabledCities: [],
    disabledZoneIds: [],
    disabledRubroIds: [],
    defaultDirection: 'bottom-up',
    skipExistingLeads: true,
    skipScannedZones: true,
    speedPreset: 'balanced',
    useAiRouteByDefault: true
};

const GENERIC_ZONE_TOKENS = new Set([
    '', 'vista_gps', 'vista_maps', 'zona_actual', 'general', 'google_maps', 'argentina', 'custom'
]);

function stripAccents(str = '') {
    return String(str || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

function cleanPrepositions(str = '') {
    return stripAccents(str)
        .replace(/^(en|de|cerca de|zona)\s+/i, '')
        .replace(/\s+(en|de)$/i, '')
        .trim();
}

function normalizeSlug(str = '') {
    return cleanPrepositions(str)
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 80);
}

function haversineKm(lat1, lng1, lat2, lng2) {
    const toRad = d => (d * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function extractCoordsFromMapsUrl(url = '') {
    const m = String(url || '').match(/@(-?\d+\.\d+),(-?\d+\.\d+),(\d+(?:\.\d+)?)z/);
    if (m) {
        return { lat: parseFloat(m[1]), lng: parseFloat(m[2]), zoom: Math.round(parseFloat(m[3])) };
    }
    return null;
}

function inferLocalityFromAddresses(addresses = []) {
    if (!Array.isArray(addresses) || addresses.length === 0) return '';
    const counts = new Map();
    for (const addr of addresses) {
        const parts = String(addr || '').split(',').map(p => p.trim()).filter(Boolean);
        // En Google Maps AR: "Av. Siempreviva 123, B1878 Quilmes, Provincia de Buenos Aires" o "..., C1425 Cdad. Autónoma de Buenos Aires"
        for (let i = 1; i < parts.length; i++) {
            const cleaned = parts[i]
                .replace(/^[A-Z]?\d{4}[A-Z]{0,3}\s+/i, '')
                .replace(/^cdad\.?\s*aut[oó]noma de buenos aires$/i, 'CABA')
                .replace(/^provincia de buenos aires$/i, '')
                .replace(/^argentina$/i, '')
                .trim();
            if (cleaned.length >= 3) {
                counts.set(cleaned, (counts.get(cleaned) || 0) + 1);
            }
        }
    }
    let best = '';
    let bestCount = 0;
    for (const [loc, cnt] of counts.entries()) {
        if (cnt > bestCount) {
            best = loc;
            bestCount = cnt;
        }
    }
    return best;
}

function mapKeywordSynonyms(rawKw = '') {
    const k = cleanPrepositions(rawKw);
    if (!k) return '';
    if (/odontolog|dental|dentist|ortodoncia|implantolog/.test(k)) return 'odontologia';
    if (/estetic|depilac|depilasion|laser|cosmetolog|spa|belleza/.test(k)) return 'estetica';
    if (/veterinar|pet\s*shop/.test(k)) return 'veterinarias';
    if (/psicolog|psiquiatr|salud mental|terapia/.test(k)) return 'psicologia';
    if (/futbol|f[uú]tbol|cancha|padel|p[aá]del|predio deportivo/.test(k)) return 'predios_futbol';
    if (/construct|arquitect|obra/.test(k)) return 'arquitectura_construccion';
    if (/asociaci[oó]n civil|fundaci[oó]n|mutual|club social/.test(k)) return 'asociaciones_civiles';
    if (/policonsultorio|centro m[eé]dic|cl[ií]nica|diagn[oó]stico|kinesiolog/.test(k)) return 'clinicas_centros_medicos';
    if (/inmobiliar|propiedad/.test(k)) return 'inmobiliarias';
    if (/distribuidor|mayorist/.test(k)) return 'distribuidoras';
    if (/ferreter|corral[oó]n|materiales/.test(k)) return 'ferreterias_corralones';
    if (/log[ií]stica|transport|encomienda/.test(k)) return 'logistica_transporte';
    if (/f[aá]brica|metal[uú]rgic|industri/.test(k)) return 'fabricas_metalurgicas';
    if (/concesionar|agencia de auto/.test(k)) return 'concesionarias_autos';
    if (/taller|mec[aá]nic|lubricentro|repuesto/.test(k)) return 'talleres_lubricentros';
    if (/gimnasio|crossfit|pilates/.test(k)) return 'gimnasios';
    if (/peluquer|barber/.test(k)) return 'peluquerias';
    if (/hotel|apart|caba[ñn]a|alojamiento/.test(k)) return 'hoteles_alojamientos';
    if (/instituto|academia|curso/.test(k)) return 'institutos_academias';
    if (/abogad|jur[ií]dic|contab|contador/.test(k)) return 'abogados_contadores';
    if (/restauran|bar\b|cafeter|gastronom|panader|pizzer/.test(k)) return 'restaurantes';
    if (/muebler|colchoner|decoraci[oó]n/.test(k)) return 'mueblerias_deco';
    if (/indumentar|ropa|showroom|calzado/.test(k)) return 'indumentaria';
    return '';
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
        const next = { ...current, ...patch };

        if (Array.isArray(next.customZones)) {
            const seenZ = new Set();
            next.customZones = next.customZones
                .filter(z => z && (z.name || z.id))
                .map(z => {
                    const name = String(z.name || z.id).trim();
                    const id = z.id ? normalizeSlug(z.id) : `custom_${normalizeSlug(name)}`;
                    const presetCity = PRESET_ZONES[z.city] || PRESET_ZONES.custom;
                    return {
                        id,
                        name,
                        city: z.city || 'custom',
                        province: z.province || presetCity.province || 'Personalizado',
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
            province: z.province || PRESET_ZONES[z.city]?.province || 'Argentina',
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

    findNearestSubZoneByCoords(lat, lng, subZones = GRANULAR_SUBZONES, maxKm = 12) {
        if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) return null;
        let closest = null;
        let minDist = Infinity;
        for (const z of subZones) {
            if (typeof z.lat !== 'number' || typeof z.lng !== 'number') continue;
            const d = haversineKm(lat, lng, z.lat, z.lng);
            if (d < minDist) {
                minDist = d;
                closest = z;
            }
        }
        return minDist <= maxKm ? { zone: closest, distanceKm: Number(minDist.toFixed(2)) } : null;
    }

    /**
     * Resuelve cualquier búsqueda (manual, GPS o histórica) a una zona real con provincia + rubro canónico.
     * Evita para siempre que se guarde como "Vista GPS" cuando hay coordenadas o direcciones reales.
     */
    async resolveZoneAndRubro({
        zoneId = '',
        zoneName = '',
        location = '',
        keyword = '',
        keywordLabel = '',
        searchQuery = '',
        googleMapsUrl = '',
        center = null,
        sampleAddresses = []
    } = {}) {
        const merged = await this.getMergedCatalog();

        // 1. Extraer coordenadas de `center` o de `googleMapsUrl`
        let coords = (center && typeof center.lat === 'number' && typeof center.lng === 'number' && !isNaN(center.lat))
            ? { lat: center.lat, lng: center.lng, zoom: center.zoom || 15 }
            : extractCoordsFromMapsUrl(googleMapsUrl);

        // 2. Limpiar texto de localidad y detectar si vino genérico ("Vista GPS", "Zona Actual", vacío)
        const rawLocCandidates = [zoneId, zoneName, location].filter(Boolean);
        let rawLoc = '';
        for (const c of rawLocCandidates) {
            const slug = normalizeSlug(c);
            if (slug && !GENERIC_ZONE_TOKENS.has(slug)) {
                rawLoc = String(c).trim();
                break;
            }
        }

        // Si vino genérico ("Vista GPS"), intentar inferir localidad real desde sampleAddresses
        const inferredFromAddr = !rawLoc ? inferLocalityFromAddresses(sampleAddresses) : '';
        if (!rawLoc && inferredFromAddr) rawLoc = inferredFromAddr;

        const locNorm = cleanPrepositions(rawLoc);
        const locSlug = normalizeSlug(rawLoc);

        let matchedZone = null;
        if (locNorm && !GENERIC_ZONE_TOKENS.has(locSlug)) {
            matchedZone = merged.subZones.find(z => {
                const zIdNorm = stripAccents(z.id);
                const zNameNorm = stripAccents(z.name);
                const zBase = zNameNorm.split('(')[0].trim();
                const zParts = zBase.split('/').map(p => p.trim()).filter(Boolean);
                return (
                    zIdNorm === locNorm ||
                    zIdNorm === locSlug ||
                    zNameNorm === locNorm ||
                    zBase === locNorm ||
                    zParts.some(p => p === locNorm || (locNorm.length >= 4 && (p.includes(locNorm) || locNorm.includes(p))))
                );
            });
        }

        // 3. Si todavía no matcheó por texto pero tenemos coordenadas GPS, resolver por Haversine (<= 14km)
        if (!matchedZone && coords) {
            const near = this.findNearestSubZoneByCoords(coords.lat, coords.lng, merged.subZones, 14);
            if (near && near.zone) {
                matchedZone = near.zone;
            }
        }

        // 4. Resolver Rubro canónico (incluyendo sinónimos históricos como "odontologo en", "veterinaria en", "depilasion laser en")
        const rawKw = String(keyword || keywordLabel || '').trim();
        const kwNorm = cleanPrepositions(rawKw);
        const kwSlug = normalizeSlug(rawKw);
        const synonymId = mapKeywordSynonyms(rawKw);

        let matchedRubro = null;
        if (synonymId) {
            matchedRubro = merged.rubros.find(r => r.id === synonymId) || null;
        }
        if (!matchedRubro && kwNorm) {
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

        let resolvedZoneId = matchedZone ? matchedZone.id : locSlug;
        let resolvedZoneName = matchedZone ? matchedZone.name : (rawLoc || inferredFromAddr);
        let resolvedCity = matchedZone ? matchedZone.city : 'custom';
        let resolvedProvince = matchedZone
            ? (matchedZone.province || PRESET_ZONES[matchedZone.city]?.province || 'Argentina')
            : '';

        // Si no había texto ni sub-zona cercana pero sí GPS, guardar por cuadrante GPS limpio
        if (!resolvedZoneId || GENERIC_ZONE_TOKENS.has(resolvedZoneId)) {
            if (coords) {
                const rLat = Number(coords.lat).toFixed(2);
                const rLng = Number(coords.lng).toFixed(2);
                resolvedZoneId = `gps_${rLat}_${rLng}`.replace(/[^a-z0-9_-]/g, '_');
                resolvedZoneName = inferredFromAddr || `Zona GPS (${rLat}, ${rLng})`;
            } else {
                resolvedZoneId = 'zona_manual';
                resolvedZoneName = 'Zona Manual';
            }
        }

        const resolvedCenter = coords
            ? { lat: coords.lat, lng: coords.lng }
            : (matchedZone && typeof matchedZone.lat === 'number'
                ? { lat: matchedZone.lat, lng: matchedZone.lng }
                : { lat: null, lng: null });

        const resolvedZoom = coords?.zoom || matchedZone?.zoom || 15;
        const resolvedKeyword = matchedRubro ? matchedRubro.id : (kwSlug || 'general');
        const resolvedKeywordLabel = matchedRubro ? matchedRubro.label : (keywordLabel || cleanPrepositions(rawKw) || 'General');

        return {
            zoneId: resolvedZoneId,
            zoneName: resolvedZoneName,
            city: resolvedCity,
            province: resolvedProvince || PRESET_ZONES[resolvedCity]?.province || 'Argentina',
            center: resolvedCenter,
            zoom: resolvedZoom,
            keyword: resolvedKeyword,
            keywordLabel: resolvedKeywordLabel,
            searchQuery: searchQuery || `${matchedRubro ? matchedRubro.query : resolvedKeywordLabel} en ${resolvedZoneName.replace(/\(.*\)/, '').trim()}`,
            matchedZone,
            matchedRubro
        };
    }

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

        return { city, zoneName: zone.name, keyword, stepKm, totalCells: cells.length, cells };
    }

    getPresetZones() {
        return Object.entries(PRESET_ZONES).map(([key, val]) => ({
            id: key,
            name: val.name,
            province: val.province,
            region: val.region,
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

    async checkZoneScanned(params = {}) {
        const resolved = await this.resolveZoneAndRubro(params);
        if (GENERIC_ZONE_TOKENS.has(resolved.zoneId) || resolved.zoneId === 'zona_manual') {
            return { success: true, alreadyScanned: false, record: null, resolved };
        }
        const queryOr = [{ zoneId: resolved.zoneId, keyword: resolved.keyword }];
        if (params.searchQuery && String(params.searchQuery).trim().length >= 5) {
            const cleanQ = String(params.searchQuery).trim();
            queryOr.push({ searchQuery: new RegExp('^' + cleanQ.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') });
        }

        const record = await ScannedZone.findOne({ $or: queryOr, status: { $ne: 'pending' } }).lean();
        return {
            success: true,
            alreadyScanned: Boolean(record && (record.status === 'completed' || (record.totalLeadsFound || 0) >= 5)),
            record: record || null,
            resolved
        };
    }

    async getPendingTargets({ preferredCity = null, preferredRubro = null, excludeKeys = [], limit = 40 } = {}) {
        const merged = await this.getMergedCatalog();
        const scannedRecords = await ScannedZone.find({}).sort({ lastScannedAt: -1, scannedAt: -1 }).lean();

        const scannedMap = new Map();
        for (const rec of scannedRecords) {
            scannedMap.set(`${String(rec.zoneId).toLowerCase()}::${String(rec.keyword).toLowerCase()}`, rec);
        }
        const excludeSet = new Set((excludeKeys || []).map(k => String(k).toLowerCase()));

        let candidateZones = merged.subZones.filter(z => z.enabled);
        if (preferredCity && preferredCity !== 'all') {
            candidateZones = candidateZones.filter(z => z.city === preferredCity || z.id === preferredCity || stripAccents(z.province) === stripAccents(preferredCity));
        }

        let candidateRubros = merged.rubros.filter(r => r.enabled);
        if (preferredRubro && preferredRubro !== 'all') {
            candidateRubros = candidateRubros.filter(r => r.id === preferredRubro || r.query === preferredRubro);
        }

        const effectiveZones = candidateZones.length > 0 ? candidateZones : merged.subZones;
        const effectiveRubros = candidateRubros.length > 0 ? candidateRubros : merged.rubros;

        // Intercalar Provincias del Interior + GBA + Capital (no quedarse atascado solo en CABA!)
        const customZ = effectiveZones.filter(z => z.isCustom);
        const interiorZ = effectiveZones.filter(z => !z.isCustom && !['caba', 'gba_norte', 'gba_sur', 'gba_oeste'].includes(z.city));
        const ambaZ = effectiveZones.filter(z => !z.isCustom && ['caba', 'gba_norte', 'gba_sur', 'gba_oeste'].includes(z.city));
        const interleavedZones = [...customZ];
        const maxLen = Math.max(interiorZ.length, ambaZ.length);
        for (let i = 0; i < maxLen; i++) {
            if (interiorZ[i]) interleavedZones.push(interiorZ[i]);
            if (ambaZ[i]) interleavedZones.push(ambaZ[i]);
        }

        const sortedRubros = [...effectiveRubros].sort((a, b) => {
            if ((b.isCustom ? 1 : 0) !== (a.isCustom ? 1 : 0)) return (b.isCustom ? 1 : 0) - (a.isCustom ? 1 : 0);
            return (b.priority || 5) - (a.priority || 5);
        });

        const pending = [];
        const totalPossible = effectiveZones.length * effectiveRubros.length;
        let totalVirgin = 0;

        for (const rubro of sortedRubros) {
            for (const zone of interleavedZones) {
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
                                province: zone.province || PRESET_ZONES[zone.city]?.province || 'Argentina',
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
     * Obtiene el próximo objetivo recomendado:
     * 1) Si existe una Ruta IA (`ai_route_plan`) activa y no se pasó filtro manual contrario, sigue la Ruta IA por Provincias + Capital sin repetir!
     * 2) Caso contrario, calcula el próximo objetivo virgen intercalando Provincias + GBA + Capital.
     */
    async getNextRecommendedTarget(preferredCity = null, preferredRubro = null, excludeKeys = [], preferAiRoute = true) {
        const scannedRecords = await ScannedZone.find({}).lean();
        const scannedSet = new Set(scannedRecords.map(r => `${String(r.zoneId).toLowerCase()}::${String(r.keyword).toLowerCase()}`));
        const excludeSet = new Set((excludeKeys || []).map(k => String(k).toLowerCase()));

        // 1. Priorizar Ruta IA de ChatGPT si está generada y coincide con el filtro del usuario
        if (preferAiRoute) {
            try {
                const aiPlanDoc = await Config.findOne({ key: 'ai_route_plan' }).lean();
                const route = aiPlanDoc?.value?.recommendedRoute;
                if (Array.isArray(route) && route.length > 0) {
                    const aiMatch = route.find(step => {
                        const key = `${String(step.zoneId).toLowerCase()}::${String(step.rubroId).toLowerCase()}`;
                        if (scannedSet.has(key) || excludeSet.has(key)) return false;
                        if (preferredCity && preferredCity !== 'all' && step.city !== preferredCity && step.zoneId !== preferredCity) return false;
                        if (preferredRubro && preferredRubro !== 'all' && step.rubroId !== preferredRubro) return false;
                        return true;
                    });
                    if (aiMatch) {
                        const merged = await this.getMergedCatalog();
                        const totalPossible = Math.max(1, merged.subZones.filter(z => z.enabled).length * merged.rubros.filter(r => r.enabled).length);
                        const remainingAi = route.filter(s => !scannedSet.has(`${String(s.zoneId).toLowerCase()}::${String(s.rubroId).toLowerCase()}`)).length;
                        return {
                            success: true,
                            isNewTarget: true,
                            isAiRecommended: true,
                            allExhausted: false,
                            zone: {
                                id: aiMatch.zoneId,
                                name: aiMatch.zoneName,
                                city: aiMatch.city,
                                province: aiMatch.province,
                                center: aiMatch.center || { lat: null, lng: null },
                                zoom: aiMatch.zoom || 15
                            },
                            rubro: {
                                id: aiMatch.rubroId,
                                label: aiMatch.rubroLabel,
                                query: aiMatch.rubroQuery || aiMatch.rubroLabel,
                                targetSolution: aiMatch.targetSolution || 'software_turnero',
                                priority: Math.round((aiMatch.priorityScore || 90) / 10)
                            },
                            searchQuery: aiMatch.searchQuery,
                            googleMapsUrl: aiMatch.googleMapsUrl,
                            reason: `🧠 Ruta IA (${aiMatch.province}): ${aiMatch.whyGoHere}`,
                            aiBestOfferAngle: aiMatch.bestOfferAngle || '',
                            aiPriorityScore: aiMatch.priorityScore || 90,
                            totalScannedCount: scannedRecords.length,
                            totalPossibleCombinations: totalPossible,
                            remainingVirginCount: Math.max(remainingAi, totalPossible - scannedRecords.length)
                        };
                    }
                }
            } catch (e) {
                console.warn('⚠️ [GeoGridScanner] Error leyendo ai_route_plan:', e.message);
            }
        }

        // 2. Fallback a cálculo determinista intercalando Provincias + AMBA
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
                isAiRecommended: false,
                allExhausted: false,
                zone: first.zone,
                rubro: first.rubro,
                searchQuery: first.searchQuery,
                googleMapsUrl: first.googleMapsUrl,
                reason: first.zone.isCustom || first.rubro.isCustom
                    ? `Objetivo personalizado configurado en CRM: "${first.rubro.label}" en ${first.zone.name}.`
                    : `Zona virgen (${first.zone.province}): nunca se escaneó "${first.rubro.label}" en ${first.zone.name}.`,
                totalScannedCount: result.totalScannedCount,
                totalPossibleCombinations: result.totalPossibleCombinations,
                remainingVirginCount: result.totalVirgin,
                upcomingTargets: result.pending.slice(1, 6)
            };
        }

        const merged = await this.getMergedCatalog();
        const fallbackZone = merged.subZones[0];
        const fallbackRubro = merged.rubros[0];

        return {
            success: true,
            isNewTarget: false,
            isAiRecommended: false,
            allExhausted: true,
            zone: {
                id: fallbackZone.id,
                name: fallbackZone.name,
                city: fallbackZone.city,
                province: fallbackZone.province,
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
            reason: `¡Completaste el 100% de las zonas habilitadas! Agregá nuevos lugares/provincias o regenerá la Ruta IA.`,
            totalScannedCount: scannedRecords.length,
            totalPossibleCombinations: result.totalPossibleCombinations,
            remainingVirginCount: 0,
            upcomingTargets: []
        };
    }

    /**
     * Registra/actualiza en MongoDB una zona escaneada (soporta checkpoint incremental sin duplicar conteos)
     */
    async recordZoneScan({
        zoneId,
        zoneName,
        location,
        city,
        province,
        keyword,
        keywordLabel = '',
        searchQuery = '',
        googleMapsUrl = '',
        center,
        zoom,
        sampleAddresses = [],
        scrapeDirection = 'bottom-up',
        totalLeadsFound = 0,
        validLeadsIngested = 0,
        discardedLeads = 0,
        duplicatesSkipped = 0,
        status = 'completed',
        source = 'extension',
        notes = '',
        isCheckpoint = false
    }) {
        const resolved = await this.resolveZoneAndRubro({
            zoneId,
            zoneName,
            location,
            keyword,
            keywordLabel,
            searchQuery,
            googleMapsUrl,
            center,
            sampleAddresses
        });

        const finalCenter = (center && typeof center.lat === 'number' && typeof center.lng === 'number' && !isNaN(center.lat))
            ? { lat: center.lat, lng: center.lng }
            : resolved.center;

        const finalUrl = googleMapsUrl || buildGoogleMapsUrl(
            { id: resolved.zoneId, name: resolved.zoneName, lat: finalCenter.lat, lng: finalCenter.lng, zoom: zoom || resolved.zoom },
            { id: resolved.keyword, label: resolved.keywordLabel, query: resolved.matchedRubro?.query || resolved.keywordLabel }
        );

        const now = new Date();
        const setPayload = {
            zoneName: (zoneName && !GENERIC_ZONE_TOKENS.has(normalizeSlug(zoneName))) ? zoneName : resolved.zoneName,
            city: (city && city !== 'custom') ? city : resolved.city,
            province: province || resolved.province || 'Argentina',
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
        };

        const updateOp = isCheckpoint
            ? {
                $set: {
                    ...setPayload,
                    totalLeadsFound: Math.max(0, Number(totalLeadsFound) || 0),
                    validLeadsIngested: Math.max(0, Number(validLeadsIngested) || 0),
                    discardedLeads: Math.max(0, Number(discardedLeads) || 0),
                    duplicatesSkipped: Math.max(0, Number(duplicatesSkipped) || 0)
                }
            }
            : {
                $set: setPayload,
                $inc: {
                    scanCount: 1,
                    totalLeadsFound: Number(totalLeadsFound) || 0,
                    validLeadsIngested: Number(validLeadsIngested) || 0,
                    discardedLeads: Number(discardedLeads) || 0,
                    duplicatesSkipped: Number(duplicatesSkipped) || 0
                }
            };

        const updated = await ScannedZone.findOneAndUpdate(
            { zoneId: resolved.zoneId, keyword: resolved.keyword },
            updateOp,
            { upsert: true, new: true }
        );

        return {
            success: true,
            scannedZone: updated,
            resolved
        };
    }

    /**
     * Reconstruye y sincroniza `ScannedZone` a partir de todos los leads históricos en MongoDB
     * para que nunca se repitan las 40-60+ zonas que ya se scrapearon antes.
     */
    async syncZonesFromLeads(Lead) {
        const groups = await Lead.aggregate([
            {
                $group: {
                    _id: {
                        loc: { $ifNull: ['$scannedZoneName', '$location'] },
                        zoneId: { $ifNull: ['$scannedZoneId', ''] },
                        kw: { $ifNull: ['$keyword', '$category'] }
                    },
                    total: { $sum: 1 },
                    qualified: { $sum: { $cond: [{ $ne: ['$status', 'discarded'] }, 1, 0] } },
                    discarded: { $sum: { $cond: [{ $eq: ['$status', 'discarded'] }, 1, 0] } },
                    sampleAddresses: { $push: '$address' },
                    lastDate: { $max: '$createdAt' }
                }
            },
            { $match: { total: { $gte: 3 } } },
            { $sort: { total: -1 } }
        ]);

        let syncedCount = 0;
        let createdOrUpdated = [];

        for (const g of groups) {
            const rawLoc = String(g._id.loc || '').trim();
            const rawZoneId = String(g._id.zoneId || '').trim();
            const rawKw = String(g._id.kw || '').trim();
            if (!rawLoc && !rawZoneId) continue;

            const resolved = await this.resolveZoneAndRubro({
                zoneId: rawZoneId,
                zoneName: rawLoc,
                location: rawLoc,
                keyword: rawKw,
                sampleAddresses: (g.sampleAddresses || []).filter(Boolean).slice(0, 10)
            });

            if (GENERIC_ZONE_TOKENS.has(resolved.zoneId) || resolved.zoneId === 'zona_manual') continue;

            const finalUrl = buildGoogleMapsUrl(
                { id: resolved.zoneId, name: resolved.zoneName, lat: resolved.center.lat, lng: resolved.center.lng, zoom: resolved.zoom },
                { id: resolved.keyword, label: resolved.keywordLabel, query: resolved.matchedRubro?.query || resolved.keywordLabel }
            );

            await ScannedZone.findOneAndUpdate(
                { zoneId: resolved.zoneId, keyword: resolved.keyword },
                {
                    $set: {
                        zoneName: resolved.zoneName,
                        city: resolved.city,
                        province: resolved.province,
                        keywordLabel: resolved.keywordLabel,
                        searchQuery: resolved.searchQuery,
                        googleMapsUrl: finalUrl,
                        center: resolved.center,
                        zoom: resolved.zoom,
                        status: 'completed',
                        lastScannedAt: g.lastDate || new Date(),
                        scannedAt: g.lastDate || new Date()
                    },
                    $max: {
                        totalLeadsFound: g.total,
                        validLeadsIngested: g.qualified,
                        discardedLeads: g.discarded
                    },
                    $setOnInsert: {
                        source: 'historical_sync',
                        scanCount: 1,
                        notes: 'Sincronizado automáticamente desde leads históricos'
                    }
                },
                { upsert: true }
            );
            syncedCount++;
            createdOrUpdated.push(`${resolved.zoneName} (${resolved.province}) · ${resolved.keywordLabel}: ${g.total}`);
        }

        // Limpiar viejos registros genéricos "vista_gps" o "zona_actual" sin ubicación real si quedaron de versiones anteriores
        await ScannedZone.deleteMany({ zoneId: { $in: ['vista_gps', 'zona_actual', 'vista_maps'] } }).catch(() => {});

        return {
            success: true,
            syncedGroups: syncedCount,
            sample: createdOrUpdated.slice(0, 20)
        };
    }

    async deleteScannedZone(id) {
        const deleted = await ScannedZone.findByIdAndDelete(id);
        return { success: Boolean(deleted), deletedId: id };
    }

    async getScannedHistory(limit = 300) {
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
scannerInstance.PRESET_ZONES = PRESET_ZONES;
scannerInstance.normalizeSlug = normalizeSlug;
scannerInstance.buildGoogleMapsUrl = buildGoogleMapsUrl;

module.exports = scannerInstance;
