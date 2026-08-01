const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../bot/.env') });

let axios;
try {
    axios = require('axios');
} catch (e) {
    try {
        axios = require('./node_modules/axios');
    } catch (e2) {
        axios = require('../bot/node_modules/axios');
    }
}

const AITextGenerator = require('../bot/services/aiTextGenerator');

// 🎲 Lista de negocios falsos hiper-realistas de Argentina (como recién scrapeados de Maps con auditoría de código)
const mockBusinesses = [
    {
        name: 'Clínica Odontológica Recoleta',
        category: 'Consultorio odontológico',
        rating: 4.9,
        reviewCount: 84,
        location: 'Recoleta, CABA',
        website: 'https://odontorecoleta-ejemplo.com.ar',
        webAudit: {
            cms: 'WordPress',
            hasGA4: false,
            hasMetaPixel: false,
            hasWhatsAppWidget: true,
            insights: [
                'Sitio desarrollado en WordPress',
                'Sin Google Analytics 4 (No miden tráfico de búsqueda)',
                'Sin Píxel de Meta/Facebook (No hacen remarketing en Instagram/FB)'
            ]
        }
    },
    {
        name: 'Estética & Nutrición Palermo',
        category: 'Centro de estética y kinesiología',
        rating: 4.7,
        reviewCount: 42,
        location: 'Palermo, CABA',
        website: 'https://esteticapalermo-ejemplo.com',
        webAudit: {
            cms: 'Wix',
            hasGA4: true,
            hasMetaPixel: false,
            hasWhatsAppWidget: false,
            insights: [
                'Sitio desarrollado en Wix',
                'Sin botón flotante de WhatsApp directo en la web',
                'Sin Píxel de Meta/Facebook para campañas'
            ]
        }
    },
    {
        name: 'Parrilla & Cervecería El Ombú',
        category: 'Restaurante y Parrilla',
        rating: 4.6,
        reviewCount: 156,
        location: 'Belgrano, CABA',
        website: 'http://elomburestaurante.com.ar',
        webAudit: {
            cms: 'Tiendanube',
            hasGA4: false,
            hasMetaPixel: false,
            hasWhatsAppWidget: true,
            insights: [
                'Sitio desarrollado en Tiendanube',
                'Sin Google Analytics 4',
                'Sin Píxel de Meta instalado'
            ]
        }
    },
    {
        name: 'Estudio Jurídico & Contable San Isidro',
        category: 'Estudio jurídico',
        rating: 4.8,
        reviewCount: 29,
        location: 'San Isidro, GBA Norte',
        website: ''
    }
];

async function runTestSequence(targetPhone = '5491126642674') {
    const generator = new AITextGenerator();
    
    // Seleccionar negocio aleatorio
    const mockLead = mockBusinesses[Math.floor(Math.random() * mockBusinesses.length)];
    mockLead.phone = targetPhone;

    console.log('-------------------------------------------------------------');
    console.log('🧪 [TEST SEQUENCE] Generando secuencia de prueba con ChatGPT...');
    console.log(`🏢 Negocio Simulado: ${mockLead.name} (${mockLead.category})`);
    console.log(`📍 Ubicación: ${mockLead.location} | Rating: ${mockLead.rating}⭐ (${mockLead.reviewCount} reviews)`);
    console.log(`📞 Destino Admin: +${targetPhone}`);
    console.log('-------------------------------------------------------------');

    const messages = await generator.generatePersonalizedSequence(mockLead);

    console.log('\n💬 --- 4 MENSAJES GENERADOS POR IA ---');
    messages.forEach((msg, idx) => {
        console.log(`\n📩 MENSAJE ${idx + 1}:\n${msg}`);
    });
    console.log('\n-------------------------------------------------------------');

    // Intentar enviar mediante el backend / bot activo
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8484';
    
    try {
        console.log(`🚀 Enviando prueba a la API de WhatsApp del bot en ${backendUrl}...`);
        
        const cleanPhone = targetPhone.replace(/\D/g, '');
        const targetFormatted = cleanPhone.includes('@') ? cleanPhone : `${cleanPhone}@c.us`;

        for (let i = 0; i < messages.length; i++) {
            const msg = messages[i];
            console.log(`📤 Enviando mensaje ${i + 1}/4...`);
            
            await axios.post(`${backendUrl}/api/bot/test-send-message`, {
                phone: targetFormatted,
                message: msg,
                leadName: mockLead.name,
                messageNumber: i + 1
            });

            console.log(`✅ Mensaje ${i + 1} enviado.`);

            if (i < messages.length - 1) {
                console.log(`⏱️ Esperando 4 segundos entre mensajes de prueba...`);
                await new Promise(r => setTimeout(r, 4000));
            }
        }

        console.log('\n🎉 ¡SECUENCIA DE PRUEBA ENVIADA EXITOSAMENTE AL ADMIN!');

    } catch (error) {
        console.error('⚠️ No se pudo enviar por API (Asegurate que el bot esté iniciado en el servidor):', error.message);
    }
}

// Ejecutar si se llama directamente
const phoneArg = process.argv[2] || '5491126642674';
runTestSequence(phoneArg);
