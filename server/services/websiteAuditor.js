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
const path = require('path');

class WebsiteAuditor {
    constructor() {
        this.timeout = 4000; // 4 segundos timeout máximo
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
        if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
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

        try {
            const response = await axios.get(targetUrl, {
                timeout: this.timeout,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
                },
                maxRedirects: 3,
                validateStatus: status => status < 500 // Aceptar respuestas 2xx, 3xx, 4xx
            });

            const html = (response.data && typeof response.data === 'string') ? response.data : '';
            const htmlLower = html.toLowerCase();

            // 1. Extraer Título de la web
            const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
            if (titleMatch && titleMatch[1]) {
                auditData.title = titleMatch[1].trim().substring(0, 120);
            }

            // 2. Detección de Analítica y Medición
            auditData.hasGA4 = /G-[A-Z0-9]{8,12}/i.test(html) || htmlLower.includes('googletagmanager.com/gtag/js') || htmlLower.includes('analytics.js');
            auditData.hasMetaPixel = htmlLower.includes('connect.facebook.net') || htmlLower.includes('fbq(') || htmlLower.includes('pixel');
            auditData.hasGTM = /GTM-[A-Z0-9]{5,10}/i.test(html);
            auditData.hasGoogleAds = htmlLower.includes('google_conversion') || /AW-[0-9]{8,11}/i.test(html);

            // 3. Detección de Botón/Widget de WhatsApp
            auditData.hasWhatsAppWidget = htmlLower.includes('wa.me') || 
                                          htmlLower.includes('api.whatsapp.com') || 
                                          htmlLower.includes('whatsapp://') ||
                                          htmlLower.includes('joinchat') ||
                                          htmlLower.includes('whatsapp-button');

            // 4. Detección de CMS / Tecnología
            if (htmlLower.includes('wp-content') || htmlLower.includes('wp-includes') || htmlLower.includes('wordpress')) {
                auditData.cms = 'WordPress';
            } else if (htmlLower.includes('cdn.shopify.com') || htmlLower.includes('shopify')) {
                auditData.cms = 'Shopify';
            } else if (htmlLower.includes('tiendanube') || htmlLower.includes('nuvemshop') || htmlLower.includes('d26lpennug08bc.cloudfront.net')) {
                auditData.cms = 'Tiendanube';
            } else if (htmlLower.includes('wix.com') || htmlLower.includes('wixsite')) {
                auditData.cms = 'Wix';
            } else if (htmlLower.includes('woocommerce')) {
                auditData.cms = 'WooCommerce';
            } else if (htmlLower.includes('__next_data__') || htmlLower.includes('react')) {
                auditData.cms = 'Next.js / React';
            }

            // 5. Sintetizar Insights Técnicos Clave para ChatGPT
            const insights = [];

            if (auditData.cms !== 'Desconocido / Código a medida') {
                insights.push(`Sitio desarrollado en ${auditData.cms}`);
            }

            if (!auditData.hasGA4) {
                insights.push('Sin Google Analytics 4 (No miden tráfico de búsqueda)');
            } else {
                insights.push('Tiene Google Analytics 4 configurado');
            }

            if (!auditData.hasMetaPixel) {
                insights.push('Sin Píxel de Meta/Facebook (No miden ni hacen remarketing)');
            } else {
                insights.push('Tiene Píxel de Meta instalado');
            }

            if (!auditData.hasWhatsAppWidget) {
                insights.push('Sin botón flotante de WhatsApp directo en la web');
            } else {
                insights.push('Tiene botón flotante de WhatsApp');
            }

            if (!auditData.ssl) {
                insights.push('Sitio no seguro (sin SSL https)');
            }

            auditData.insights = insights;

            console.log(`✅ [WEBSITE AUDITOR] Inspección finalizada para ${targetUrl}:`, insights.join(' | '));
            return auditData;

        } catch (error) {
            console.warn(`⚠️ [WEBSITE AUDITOR] No se pudo acceder a ${targetUrl}: ${error.message}`);
            return {
                hasWebsite: true,
                auditedAt: new Date(),
                url: targetUrl,
                ssl: targetUrl.startsWith('https://'),
                cms: 'No accesible',
                hasGA4: false,
                hasMetaPixel: false,
                hasGTM: false,
                hasWhatsAppWidget: false,
                title: '',
                insights: ['Sitio web inaccesible o bloqueado temporalmente']
            };
        }
    }
}

module.exports = new WebsiteAuditor();
