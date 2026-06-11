const axios = require('axios');

/**
 * Servicio de Auditoría de Sitios Web
 * Realiza un análisis rápido de la página principal para buscar píxeles de publicidad y redes sociales.
 */
async function auditWebsite(url) {
    if (!url) {
        return { success: false, reason: 'URL vacía' };
    }

    // Normalizar URL
    let targetUrl = url.trim();
    if (!/^https?:\/\//i.test(targetUrl)) {
        targetUrl = 'http://' + targetUrl;
    }

    try {
        console.log(`🔍 Iniciando auditoría web en: ${targetUrl}...`);

        const response = await axios.get(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'es-ES,es;q=0.8,en-US;q=0.5,en;q=0.3'
            },
            timeout: 8000, // Timeout de 8 segundos para evitar colgar el servidor
            maxRedirects: 3
        });

        const html = response.data;
        if (typeof html !== 'string') {
            return { success: false, reason: 'El contenido recibido no es HTML' };
        }

        const lowerHtml = html.toLowerCase();

        // 1. Detección de Facebook Pixel
        const hasFacebookPixel = [
            'fbevents.js',
            'connect.facebook.net',
            'fbq(',
            'fb_pixel_'
        ].some(sig => lowerHtml.includes(sig));

        // 2. Detección de Google Pixel (GTM / Google Analytics / Google Ads)
        const hasGooglePixel = [
            'googletagmanager.com',
            'gtm.js',
            'gtag(',
            'analytics.js',
            'ga('
        ].some(sig => lowerHtml.includes(sig));

        // 3. Extracción de enlaces a Redes Sociales mediante Regex
        let instagramUrl = null;
        let facebookUrl = null;

        // Buscar Instagram
        const igMatch = html.match(/href="([^"]*instagram\.com\/[^"]+)"/i) || html.match(/href='([^']*instagram\.com\/[^']+)'/i);
        if (igMatch) {
            instagramUrl = igMatch[1];
        }

        // Buscar Facebook
        const fbMatch = html.match(/href="([^"]*facebook\.com\/[^"]+)"/i) || html.match(/href='([^']*facebook\.com\/[^']+)'/i);
        if (fbMatch) {
            facebookUrl = fbMatch[1];
        }

        console.log(`✅ Auditoría exitosa para ${targetUrl}. FB Pixel: ${hasFacebookPixel}, Google Pixel: ${hasGooglePixel}, IG: ${!!instagramUrl}, FB: ${!!facebookUrl}`);

        return {
            success: true,
            hasFacebookPixel,
            hasGooglePixel,
            instagramUrl,
            facebookUrl
        };

    } catch (error) {
        console.warn(`⚠️ Error al auditar sitio ${targetUrl}: ${error.message}`);
        return {
            success: false,
            reason: error.message
        };
    }
}

module.exports = { auditWebsite };
