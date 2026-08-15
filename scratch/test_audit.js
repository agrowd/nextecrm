const https = require('https');
const http = require('http');

async function testAudit(targetUrl) {
    try {
        let url = targetUrl.trim();
        if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
        
        console.log('Testing audit for:', url);
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
            },
            redirect: 'follow'
        });

        const html = await res.text();
        const lower = html.toLowerCase();

        console.log('Status:', res.status, 'HTML length:', html.length);
        
        // 1. WhatsApp
        const hasWhatsApp = lower.includes('wa.me') || 
                            lower.includes('api.whatsapp.com') || 
                            lower.includes('web.whatsapp.com') || 
                            lower.includes('chat.whatsapp.com') || 
                            lower.includes('whatsapp.com/send') ||
                            lower.includes('joinchat') ||
                            lower.includes('wp-block-whatsapp') ||
                            lower.includes('whatsapp-button') ||
                            lower.includes('whatsapp') && (lower.includes('chat') || lower.includes('widget') || lower.includes('floating') || lower.includes('msg') || lower.includes('send'));

        // 2. CMS
        let cms = 'Custom / Desconocido';
        if (lower.includes('wp-content') || lower.includes('wp-includes') || lower.includes('wordpress')) cms = 'WordPress';
        else if (lower.includes('cdn.shopify.com') || lower.includes('shopify')) cms = 'Shopify';
        else if (lower.includes('wixsite') || lower.includes('wix.com') || lower.includes('_wix')) cms = 'Wix';
        else if (lower.includes('tiendanube') || lower.includes('mitiendanube')) cms = 'Tiendanube';
        else if (lower.includes('squarespace')) cms = 'Squarespace';
        else if (lower.includes('vtex')) cms = 'VTEX';
        else if (lower.includes('webflow')) cms = 'Webflow';

        // 3. Analytics & Pixel
        const hasGA4 = lower.includes('googletagmanager.com/gtag/js?id=g-') || 
                       lower.includes('gtag(\'config\', \'g-') || 
                       lower.includes('gtag("config", "g-') || 
                       /g-[a-z0-9]{6,12}/i.test(html) ||
                       lower.includes('analytics.js') || 
                       lower.includes('googletagmanager.com/gtm.js');

        const hasMetaPixel = lower.includes('fbevents.js') || 
                             lower.includes('connect.facebook.net') || 
                             lower.includes('fbq(') || 
                             lower.includes('fb_pixel');

        console.log({
            hasWhatsApp,
            cms,
            hasGA4,
            hasMetaPixel
        });
    } catch (e) {
        console.error('Audit test failed:', e);
    }
}

testAudit('queenfit.com.ar');
testAudit('http://www.queenfit.com.ar/');
