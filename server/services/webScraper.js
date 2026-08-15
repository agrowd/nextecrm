const axios = require('axios');

/**
 * Servicio de Auditoría de Sitios Web
 * Realiza un análisis profundo y rápido del código HTML para detectar:
 * - CMS (WordPress, Shopify, Wix, Tiendanube, Squarespace, VTEX, Webflow, etc.)
 * - Botón / Widget de WhatsApp (wa.me, api.whatsapp.com, joinchat, widgets flotantes, plugins)
 * - Píxel de Meta (Facebook / Instagram)
 * - Google Analytics 4 (GA4) / Google Tag Manager / Ads
 * - Certificado SSL
 * - Generación de insights técnicos para los mensajes de IA
 */
async function auditWebsite(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) {
        return {
            hasWebsite: false,
            reason: 'URL vacía o no provista'
        };
    }

    let targetUrl = rawUrl.trim();
    if (!/^https?:\/\//i.test(targetUrl)) {
        targetUrl = 'https://' + targetUrl;
    }

    const tryFetch = async (urlToFetch) => {
        return await axios.get(urlToFetch, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'es-ES,es;q=0.9,en-US;q=0.8,en;q=0.7',
                'Cache-Control': 'no-cache'
            },
            timeout: 10000,
            maxRedirects: 5,
            validateStatus: (status) => status >= 200 && status < 400
        });
    };

    let response = null;
    let finalUrl = targetUrl;
    let isSsl = targetUrl.startsWith('https://');

    try {
        response = await tryFetch(targetUrl);
    } catch (err) {
        // Si falló con HTTPS, intentar con HTTP o viceversa
        try {
            const alternateUrl = targetUrl.startsWith('https://') 
                ? targetUrl.replace('https://', 'http://') 
                : targetUrl.replace('http://', 'https://');
            response = await tryFetch(alternateUrl);
            finalUrl = alternateUrl;
            isSsl = alternateUrl.startsWith('https://');
        } catch (fallbackErr) {
            console.warn(`⚠️ Falló auditoría en ${targetUrl}: ${fallbackErr.message}`);
            return {
                auditedAt: new Date(),
                hasWebsite: true,
                url: targetUrl,
                ssl: isSsl,
                cms: 'No accesible',
                hasGA4: false,
                hasMetaPixel: false,
                hasGTM: false,
                hasGoogleAds: false,
                hasWhatsAppWidget: false,
                title: '',
                insights: ['El sitio web no respondió a la inspección automática.'],
                error: fallbackErr.message
            };
        }
    }

    try {
        const html = response.data;
        if (typeof html !== 'string') {
            return {
                auditedAt: new Date(),
                hasWebsite: true,
                url: finalUrl,
                ssl: isSsl,
                cms: 'Formato no HTML',
                hasGA4: false,
                hasMetaPixel: false,
                hasGTM: false,
                hasGoogleAds: false,
                hasWhatsAppWidget: false,
                title: '',
                insights: []
            };
        }

        const lowerHtml = html.toLowerCase();
        const insights = [];

        // 1. 🔍 Detección de Botón / Widget de WhatsApp
        const hasWhatsAppWidget = 
            lowerHtml.includes('wa.me/') ||
            lowerHtml.includes('wa.link/') ||
            lowerHtml.includes('api.whatsapp.com') ||
            lowerHtml.includes('web.whatsapp.com') ||
            lowerHtml.includes('chat.whatsapp.com') ||
            lowerHtml.includes('whatsapp.com/send') ||
            lowerHtml.includes('joinchat') ||
            lowerHtml.includes('wp-block-whatsapp') ||
            lowerHtml.includes('whatsapp-button') ||
            lowerHtml.includes('floating-whatsapp') ||
            lowerHtml.includes('whatsapp-widget') ||
            lowerHtml.includes('whatsapp_widget') ||
            lowerHtml.includes('btn-whatsapp') ||
            lowerHtml.includes('boton-whatsapp') ||
            lowerHtml.includes('fa-whatsapp') ||
            lowerHtml.includes('elfsight-app-whatsapp') ||
            (lowerHtml.includes('whatsapp') && (
                lowerHtml.includes('widget') || 
                lowerHtml.includes('float') || 
                lowerHtml.includes('button') || 
                lowerHtml.includes('icono') || 
                lowerHtml.includes('chat') ||
                lowerHtml.includes('flotante') ||
                lowerHtml.includes('contact')
            ));

        if (hasWhatsAppWidget) {
            insights.push('Tiene botón directo de WhatsApp integrado.');
        } else {
            insights.push('No posee botón flotante visible de WhatsApp.');
        }

        // 2. 🏗️ Detección de CMS / Plataforma
        let cms = 'Custom / Código a medida';
        if (lowerHtml.includes('wp-content') || lowerHtml.includes('wp-includes') || lowerHtml.includes('wordpress')) {
            cms = 'WordPress';
            insights.push('Desarrollado sobre WordPress.');
        } else if (lowerHtml.includes('cdn.shopify.com') || lowerHtml.includes('shopify')) {
            cms = 'Shopify';
            insights.push('Tienda online montada en Shopify.');
        } else if (lowerHtml.includes('tiendanube') || lowerHtml.includes('mitiendanube') || lowerHtml.includes('d26lpennugtm8s.cloudfront.net')) {
            cms = 'Tiendanube';
            insights.push('E-commerce montado en Tiendanube.');
        } else if (lowerHtml.includes('wixsite.com') || lowerHtml.includes('wix.com') || lowerHtml.includes('_wix_') || lowerHtml.includes('wix-image')) {
            cms = 'Wix';
            insights.push('Creado con constructor Wix.');
        } else if (lowerHtml.includes('squarespace')) {
            cms = 'Squarespace';
            insights.push('Sitio montado en Squarespace.');
        } else if (lowerHtml.includes('vteximg.com') || lowerHtml.includes('vtex.com')) {
            cms = 'VTEX';
            insights.push('Plataforma corporativa VTEX.');
        } else if (lowerHtml.includes('assets.website-files.com') || lowerHtml.includes('webflow')) {
            cms = 'Webflow';
            insights.push('Diseñado en Webflow.');
        } else if (lowerHtml.includes('prestashop')) {
            cms = 'PrestaShop';
            insights.push('Tienda montada en PrestaShop.');
        } else if (lowerHtml.includes('magento') || lowerHtml.includes('mage/')) {
            cms = 'Magento';
            insights.push('E-commerce en Magento.');
        }

        // 3. 📊 Detección de GA4 (Google Analytics 4) y GTM
        const hasGTM = lowerHtml.includes('googletagmanager.com/gtm.js') || lowerHtml.includes('gtm-');
        const hasGA4 = lowerHtml.includes('googletagmanager.com/gtag/js?id=g-') ||
                       lowerHtml.includes("gtag('config', 'g-") ||
                       lowerHtml.includes('gtag("config", "g-') ||
                       lowerHtml.includes("gtag('config','g-") ||
                       /g-[a-z0-9]{6,12}/i.test(html) ||
                       lowerHtml.includes('analytics.js') ||
                       hasGTM;

        if (hasGA4) {
            insights.push('Medición analítica activa con Google Analytics (GA4/GTM).');
        } else {
            insights.push('Falta configuración de Google Analytics 4 (GA4) para medir visitantes.');
        }

        // 4. 🎯 Detección de Meta Pixel (Facebook / Instagram Ads)
        const hasMetaPixel = lowerHtml.includes('fbevents.js') ||
                             lowerHtml.includes('connect.facebook.net') ||
                             lowerHtml.includes('fbq(') ||
                             lowerHtml.includes('fb_pixel') ||
                             lowerHtml.includes('pixel_id');

        if (hasMetaPixel) {
            insights.push('Posee Píxel de Meta instalado para campañas de anuncios.');
        } else {
            insights.push('No tiene Píxel de Meta instalado (oportunidad de remarketing).');
        }

        // 5. 🏷️ Título del Sitio
        let title = '';
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (titleMatch && titleMatch[1]) {
            title = titleMatch[1].trim();
        }

        console.log(`✅ [WebAuditor] Auditoría completada para ${finalUrl}: CMS=${cms}, WA=${hasWhatsAppWidget}, GA4=${hasGA4}, Pixel=${hasMetaPixel}`);

        return {
            auditedAt: new Date(),
            hasWebsite: true,
            url: finalUrl,
            ssl: isSsl,
            cms,
            hasGA4,
            hasMetaPixel,
            hasGTM,
            hasGoogleAds: lowerHtml.includes('googleads') || lowerHtml.includes('conversion_id'),
            hasWhatsAppWidget,
            title,
            insights
        };

    } catch (parseError) {
        console.error(`❌ Error analizando HTML de ${finalUrl}:`, parseError);
        return {
            auditedAt: new Date(),
            hasWebsite: true,
            url: finalUrl,
            ssl: isSsl,
            cms: 'Error de análisis',
            hasGA4: false,
            hasMetaPixel: false,
            hasGTM: false,
            hasGoogleAds: false,
            hasWhatsAppWidget: false,
            title: '',
            insights: []
        };
    }
}

module.exports = { auditWebsite };
