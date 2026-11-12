/**
 * 🌐 AGENTE 2: WEB SCRAPER, AUDITOR TÉCNICO & CLASIFICADOR DE PLATAFORMAS (NatoH Systems)
 * 
 * Visita la URL del negocio (si tiene), clasifica si es una red social o plataforma
 * de terceros (Instagram, Facebook, Linktree, PedidosYa, Tiendanube, Turnito, WhatsApp),
 * o audita su HTML real buscando CMS, píxeles, widgets de chat/turnos, links sociales,
 * adaptabilidad móvil y velocidad de respuesta (Zero-Dependency Regex Engine).
 */

const axios = require('axios');

function classifyExternalUrl(rawUrl) {
    if (!rawUrl) return null;
    const lower = rawUrl.toLowerCase();

    if (lower.includes('instagram.com/')) {
        return {
            isSocialOnly: true,
            externalPlatform: 'instagram',
            cms: 'Instagram (Sin Web Propia)',
            instagramUrl: rawUrl,
            insight: 'No posee sitio web propio: en Google Maps redirige únicamente a su perfil de Instagram'
        };
    }
    if (lower.includes('facebook.com/') || lower.includes('fb.com/')) {
        return {
            isSocialOnly: true,
            externalPlatform: 'facebook',
            cms: 'Facebook (Sin Web Propia)',
            facebookUrl: rawUrl,
            insight: 'No posee sitio web propio: en Google Maps redirige únicamente a una página de Facebook'
        };
    }
    if (lower.includes('linktr.ee/') || lower.includes('bio.link/') || lower.includes('beacons.ai/') || lower.includes('cafecito.app/') || lower.includes('lnk.bio/')) {
        return {
            isSocialOnly: true,
            externalPlatform: 'linktree',
            cms: 'Linktree / Bio Link',
            insight: 'Usa un árbol de links gratuito (Linktree) en lugar de tener un sitio web profesional o sistema propio'
        };
    }
    if (lower.includes('wa.me/') || lower.includes('api.whatsapp.com') || lower.includes('wa.link/')) {
        return {
            isSocialOnly: true,
            externalPlatform: 'whatsapp_link',
            cms: 'Link Directo WhatsApp (Sin Web)',
            insight: 'No tiene sitio web: su botón de web en Google Maps lleva directo a un chat manual de WhatsApp'
        };
    }
    if (lower.includes('pedidosya.com') || lower.includes('rappi.com')) {
        return {
            isSocialOnly: true,
            externalPlatform: 'pedidosya',
            cms: 'App de Delivery (PedidosYa/Rappi)',
            insight: 'Redirige su tráfico a PedidosYa/Rappi pagando altas comisiones por pedido en vez de tener Carta QR propia'
        };
    }
    if (lower.includes('turnito.app') || lower.includes('agendapro.com') || lower.includes('calendly.com') || lower.includes('simplybook') || lower.includes('docturno.com') || lower.includes('wono.app')) {
        return {
            isSocialOnly: false,
            externalPlatform: 'third_party_booking',
            cms: 'Turnero Terciarizado',
            insight: 'Utiliza una plataforma de turnos alquilada de terceros sin portal corporativo propio'
        };
    }
    if (lower.includes('mercadolibre.com') || lower.includes('mercadoshops.com')) {
        return {
            isSocialOnly: false,
            externalPlatform: 'mercadolibre',
            cms: 'Mercado Libre / Mercado Shops',
            insight: 'Depende de Mercado Libre en lugar de contar con su propio E-Commerce o sistema B2B sin comisiones'
        };
    }
    return null;
}

async function auditWebsite(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string' || rawUrl.trim() === '') {
        return null;
    }

    let url = rawUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
    }

    const result = {
        auditedAt: new Date(),
        hasWebsite: true,
        isSocialOnly: false,
        externalPlatform: '',
        url: url,
        ssl: url.startsWith('https://'),
        cms: 'HTML / A Medida',
        hasGA4: false,
        hasMetaPixel: false,
        hasGTM: false,
        hasGoogleAds: false,
        hasWhatsAppWidget: false,
        hasBookingSystem: false,
        hasChatWidget: false,
        isMobileResponsive: true,
        loadTimeMs: null,
        instagramUrl: '',
        facebookUrl: '',
        title: '',
        insights: []
    };

    // 1. Clasificación rápida si la URL en Google Maps es una red social o plataforma externa
    const extClass = classifyExternalUrl(url);
    if (extClass) {
        result.isSocialOnly = extClass.isSocialOnly;
        result.hasWebsite = !extClass.isSocialOnly;
        result.externalPlatform = extClass.externalPlatform;
        result.cms = extClass.cms;
        if (extClass.instagramUrl) result.instagramUrl = extClass.instagramUrl;
        if (extClass.facebookUrl) result.facebookUrl = extClass.facebookUrl;
        result.insights.push(extClass.insight);
        result.insights.push('Oportunidad directa para NatoH Systems: crear su portal web corporativo y/o sistema de gestión propio');
        return result;
    }

    try {
        const t0 = Date.now();
        const response = await axios.get(url, {
            timeout: 8000,
            maxRedirects: 5,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'es-AR,es;q=0.9,en;q=0.8'
            }
        });
        result.loadTimeMs = Date.now() - t0;

        const html = typeof response.data === 'string' ? response.data : '';
        const lowerHtml = html.toLowerCase();

        // Extraer <title>
        const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        if (titleMatch && titleMatch[1]) {
            result.title = titleMatch[1].replace(/\s+/g, ' ').trim().substring(0, 120);
        }

        // Detectar CMS / Plataforma
        if (lowerHtml.includes('tiendanube') || lowerHtml.includes('nuvemshop') || lowerHtml.includes('d26lpennugtm8s.cloudfront.net')) {
            result.cms = 'TiendaNube';
            result.externalPlatform = 'tiendanube';
        } else if (lowerHtml.includes('woocommerce')) {
            result.cms = 'WooCommerce (WordPress)';
        } else if (lowerHtml.includes('wp-content') || lowerHtml.includes('wp-includes')) {
            result.cms = 'WordPress';
        } else if (lowerHtml.includes('shopify.com') || lowerHtml.includes('cdn.shopify.com')) {
            result.cms = 'Shopify';
        } else if (lowerHtml.includes('wix.com') || lowerHtml.includes('wixstatic.com')) {
            result.cms = 'Wix';
        } else if (lowerHtml.includes('mercadoshops')) {
            result.cms = 'MercadoShops';
            result.externalPlatform = 'mercadolibre';
        } else if (lowerHtml.includes('empretienda')) {
            result.cms = 'Empretienda';
        }

        // Detectar Píxeles y Analítica
        result.hasGA4 = lowerHtml.includes('gtag(') || lowerHtml.includes('google-analytics.com') || lowerHtml.includes('g-');
        result.hasGTM = lowerHtml.includes('googletagmanager.com/gtm.js');
        result.hasMetaPixel = lowerHtml.includes('connect.facebook.net') || lowerHtml.includes('fbq(') || lowerHtml.includes('facebook.com/tr');
        result.hasGoogleAds = lowerHtml.includes('googleadservices.com') || lowerHtml.includes('aw-');

        // Detectar Widget de WhatsApp
        result.hasWhatsAppWidget = lowerHtml.includes('wa.me/') ||
            lowerHtml.includes('api.whatsapp.com') ||
            lowerHtml.includes('whatsapp.com/send') ||
            lowerHtml.includes('joinchat') ||
            lowerHtml.includes('wa-widget');

        // Detectar Sistemas de Turnos o Reservas embebidos
        result.hasBookingSystem = lowerHtml.includes('calendly.com') ||
            lowerHtml.includes('turnito') ||
            lowerHtml.includes('agendapro') ||
            lowerHtml.includes('simplybook') ||
            lowerHtml.includes('docturno') ||
            lowerHtml.includes('reservo');

        // Detectar Chatbots o Live Chat
        result.hasChatWidget = lowerHtml.includes('tawk.to') ||
            lowerHtml.includes('tidio') ||
            lowerHtml.includes('crisp.chat') ||
            lowerHtml.includes('manychat') ||
            lowerHtml.includes('cliengo') ||
            lowerHtml.includes('kommo') ||
            lowerHtml.includes('landbot');

        // Detectar Viewport Mobile
        result.isMobileResponsive = /<meta[^>]+name=["']viewport["']/i.test(html);

        // Extraer enlaces a Instagram y Facebook dentro de la web mediante Regex
        const igMatch = html.match(/https?:\/\/(?:www\.)?instagram\.com\/[a-zA-Z0-9_.\-]+/i);
        if (igMatch && !igMatch[0].includes('/p/') && !igMatch[0].includes('/reel/')) {
            result.instagramUrl = igMatch[0];
        }
        const fbMatch = html.match(/https?:\/\/(?:www\.)?(?:facebook|fb)\.com\/[a-zA-Z0-9_.\-]+/i);
        if (fbMatch && !fbMatch[0].toLowerCase().includes('sharer') && !fbMatch[0].toLowerCase().includes('tr')) {
            result.facebookUrl = fbMatch[0];
        }

        // Construir Insights accionables para Agente 3 y Agente 4 (NatoH Systems)
        if (!result.hasWhatsAppWidget && !result.hasChatWidget) {
            result.insights.push('No tiene botón ni agente de WhatsApp en su web (pierde consultas en vivo)');
        }
        if (!result.hasBookingSystem) {
            result.insights.push('Sin turnero ni sistema de autogestión online integrado');
        }
        if (!result.hasMetaPixel && !result.hasGA4) {
            result.insights.push('Sin píxeles de seguimiento (Meta Pixel / Google Analytics 4)');
        }
        if (!result.ssl) {
            result.insights.push('Sitio sin certificado seguro SSL (muestra alerta de No Seguro)');
        }
        if (!result.isMobileResponsive) {
            result.insights.push('Diseño web antiguo no adaptado a celulares (sin etiqueta viewport)');
        }
        if (result.loadTimeMs && result.loadTimeMs > 4500) {
            result.insights.push(`Carga web lenta (${(result.loadTimeMs / 1000).toFixed(1)}s), afectando retención de clientes`);
        }
        if (result.insights.length === 0) {
            result.insights.push(`Web activa en ${result.cms}, oportunidad de integrar Agente IA 24/7 o Sistema de Gestión NatoH`);
        }

        return result;
    } catch (error) {
        result.hasWebsite = false;
        result.error = error.message;
        result.insights.push('El sitio web registrado en Google Maps está caído o no responde (oportunidad crítica de renovación)');
        return result;
    }
}

module.exports = {
    auditWebsite,
    classifyExternalUrl
};
