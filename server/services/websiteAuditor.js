let axiosRaw;
try {
    axiosRaw = require('axios');
} catch (e) {
    try {
        axiosRaw = require('../node_modules/axios');
    } catch (e2) {
        axiosRaw = require('../../bot/node_modules/axios');
    }
}
const axios = axiosRaw.default || axiosRaw;

class WebsiteAuditor {
    constructor() {
        this.timeout = 10000; // 10 segundos timeout para permitir redirects y conexiones lentas
    }

    /**
     * Inspeccionar URL de un negocio y extraer insights de código
     */
    async audit(url) {
        if (!url || typeof url !== 'string' || !url.trim()) {
            return {
                hasWebsite: false,
                auditedAt: new Date(),
                insights: ['Sin sitio web registrado']
            };
        }

        let targetUrl = url.trim();
        if (!/^https?:\/\//i.test(targetUrl)) {
            targetUrl = 'https://' + targetUrl;
        }

        console.log(`🔍 [WEBSITE AUDITOR] Auditando código de: ${targetUrl}...`);

        const auditData = {
            hasWebsite: true,
            auditedAt: new Date(),
            url: targetUrl,
            ssl: targetUrl.startsWith('https://'),
            cms: 'Desconocido / Código a medida',
            hasGA4: false,
            hasMetaPixel: false,
            hasGTM: false,
            hasGoogleAds: false,
            hasWhatsAppWidget: false,
            title: '',
            insights: []
        };

        const tryFetch = async (u) => {
            return await axios.get(u, {
                timeout: this.timeout,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                    'Accept-Language': 'es-ES,es;q=0.9,en-US;q=0.8,en;q=0.7',
                    'Cache-Control': 'no-cache'
                },
                maxRedirects: 5,
                validateStatus: status => status < 500
            });
        };

        let response;
        try {
            response = await tryFetch(targetUrl);
        } catch (err) {
            try {
                const altUrl = targetUrl.startsWith('https://') 
                    ? targetUrl.replace('https://', 'http://') 
                    : targetUrl.replace('http://', 'https://');
                response = await tryFetch(altUrl);
                auditData.url = altUrl;
                auditData.ssl = altUrl.startsWith('https://');
            } catch (fallbackErr) {
                console.warn(`⚠️ [WEBSITE AUDITOR] Falló conexión a ${targetUrl}: ${fallbackErr.message}`);
                auditData.cms = 'Inaccesible';
                auditData.insights = ['No se pudo conectar con el sitio web'];
                return auditData;
            }
        }

        try {
            const html = (response.data && typeof response.data === 'string') ? response.data : '';
            const htmlLower = html.toLowerCase();

            // 1. Extraer Título de la web
            const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
            if (titleMatch && titleMatch[1]) {
                auditData.title = titleMatch[1].trim().substring(0, 120);
            }

            // 2. Detección de Analítica y Medición
            auditData.hasGTM = /GTM-[A-Z0-9]{5,10}/i.test(html) || htmlLower.includes('googletagmanager.com/gtm.js');
            auditData.hasGA4 = /G-[A-Z0-9]{6,12}/i.test(html) || 
                               htmlLower.includes('googletagmanager.com/gtag/js') || 
                               htmlLower.includes("gtag('config', 'g-") ||
                               htmlLower.includes('gtag("config", "g-') ||
                               htmlLower.includes('analytics.js') ||
                               auditData.hasGTM;

            auditData.hasMetaPixel = htmlLower.includes('connect.facebook.net') || 
                                     htmlLower.includes('fbevents.js') || 
                                     htmlLower.includes('fbq(') || 
                                     htmlLower.includes('fb_pixel') ||
                                     htmlLower.includes('pixel_id');

            auditData.hasGoogleAds = htmlLower.includes('google_conversion') || /AW-[0-9]{8,11}/i.test(html);

            // 3. Detección Exhaustiva de Botón/Widget de WhatsApp
            auditData.hasWhatsAppWidget = 
                htmlLower.includes('wa.me/') ||
                htmlLower.includes('wa.link/') ||
                htmlLower.includes('api.whatsapp.com') ||
                htmlLower.includes('web.whatsapp.com') ||
                htmlLower.includes('chat.whatsapp.com') ||
                htmlLower.includes('whatsapp.com/send') ||
                htmlLower.includes('whatsapp://') ||
                htmlLower.includes('joinchat') ||
                htmlLower.includes('wp-block-whatsapp') ||
                htmlLower.includes('whatsapp-button') ||
                htmlLower.includes('floating-whatsapp') ||
                htmlLower.includes('whatsapp-widget') ||
                htmlLower.includes('whatsapp_widget') ||
                htmlLower.includes('btn-whatsapp') ||
                htmlLower.includes('boton-whatsapp') ||
                htmlLower.includes('fa-whatsapp') ||
                htmlLower.includes('elfsight-app-whatsapp') ||
                (htmlLower.includes('whatsapp') && (
                    htmlLower.includes('widget') || 
                    htmlLower.includes('float') || 
                    htmlLower.includes('button') || 
                    htmlLower.includes('icono') || 
                    htmlLower.includes('chat') ||
                    htmlLower.includes('flotante') ||
                    htmlLower.includes('contact')
                ));

            // 4. Detección de CMS / Tecnología
            if (htmlLower.includes('wp-content') || htmlLower.includes('wp-includes') || htmlLower.includes('wordpress')) {
                auditData.cms = 'WordPress';
            } else if (htmlLower.includes('cdn.shopify.com') || htmlLower.includes('shopify')) {
                auditData.cms = 'Shopify';
            } else if (htmlLower.includes('tiendanube') || htmlLower.includes('nuvemshop') || htmlLower.includes('d26lpennugtm8s.cloudfront.net')) {
                auditData.cms = 'Tiendanube';
            } else if (htmlLower.includes('wix.com') || htmlLower.includes('wixsite') || htmlLower.includes('_wix_')) {
                auditData.cms = 'Wix';
            } else if (htmlLower.includes('woocommerce')) {
                auditData.cms = 'WooCommerce';
            } else if (htmlLower.includes('squarespace')) {
                auditData.cms = 'Squarespace';
            } else if (htmlLower.includes('vteximg.com') || htmlLower.includes('vtex.com')) {
                auditData.cms = 'VTEX';
            } else if (htmlLower.includes('assets.website-files.com') || htmlLower.includes('webflow')) {
                auditData.cms = 'Webflow';
            } else if (htmlLower.includes('prestashop')) {
                auditData.cms = 'PrestaShop';
            } else if (htmlLower.includes('magento') || htmlLower.includes('mage/')) {
                auditData.cms = 'Magento';
            } else if (htmlLower.includes('__next_data__') || htmlLower.includes('/_next/')) {
                auditData.cms = 'Next.js';
            }

            // 5. Insights Clave
            const insights = [];
            if (auditData.cms !== 'Desconocido / Código a medida') {
                insights.push(`Sitio desarrollado en ${auditData.cms}`);
            }
            if (auditData.hasWhatsAppWidget) {
                insights.push('Tiene botón directo de WhatsApp integrado.');
            } else {
                insights.push('Sin botón flotante visible de WhatsApp.');
            }
            if (auditData.hasGA4) {
                insights.push('Medición activa con Google Analytics (GA4).');
            } else {
                insights.push('Falta Google Analytics 4 (GA4) para medir visitantes.');
            }
            if (auditData.hasMetaPixel) {
                insights.push('Posee Píxel de Meta instalado.');
            } else {
                insights.push('Sin Píxel de Meta instalado.');
            }

            auditData.insights = insights;
            console.log(`✅ [WEBSITE AUDITOR] Finalizado para ${targetUrl}: CMS=${auditData.cms}, WA=${auditData.hasWhatsAppWidget}, GA4=${auditData.hasGA4}, Pixel=${auditData.hasMetaPixel}`);
            return auditData;

        } catch (error) {
            console.warn(`⚠️ [WEBSITE AUDITOR] Error analizando contenido de ${targetUrl}: ${error.message}`);
            return auditData;
        }
    }
}

module.exports = new WebsiteAuditor();
