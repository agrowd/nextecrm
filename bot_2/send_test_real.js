require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const AITextGenerator = require('./services/aiTextGenerator');

// Configuración
const TARGET_NUMBER = '5491126642674';
const TARGET_ID = `${TARGET_NUMBER}@c.us`;

// Mock Lead para validar lógica de ventas
const mockLead = {
    id: 'test_user_req',
    name: 'Clínica Dental Estética',
    category: 'odontología',
    location: 'Palermo, Buenos Aires',
    rating: 4.8,
    reviewCount: 12, // Pocas reviews -> Trigger de autoridad
    website: '' // Sin web -> Trigger de digitalización
};

async function runTest() {
    console.log(`🚀 Iniciando prueba de envío real a: ${TARGET_NUMBER}`);
    console.log(`📋 Lead Simulado: ${mockLead.name} (Sin web, pocas reviews)`);

    // 1. Verificar AI
    const ai = new AITextGenerator();
    console.log('🧠 Conectando a Gemini 2.5...');
    const healthy = await ai.checkHealth();
    if (!healthy) {
        console.error('❌ Error: Gemini API no responde. Abortando.');
        process.exit(1);
    }
    console.log('✅ Gemini funcionando.');

    // 2. Generar Mensajes
    console.log('📝 Generando secuencia de ventas...');
    let messages;
    try {
        messages = await ai.generatePersonalizedSequence(mockLead);
        console.log(`✅ Generados ${messages.length} mensajes.`);
    } catch (e) {
        console.error('❌ Error generando mensajes:', e);
        process.exit(1);
    }

    // 3. Conectar WhatsApp
    console.log('🔌 Conectando WhatsApp (esto puede tardar unos segundos)...');
    const client = new Client({
        authStrategy: new LocalAuth({
            clientId: 'gmaps-leads-bot',
            dataPath: './sessions'
        }),
        puppeteer: {
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        }
    });

    client.on('qr', (qr) => {
        console.log('📸 Escanea este QR para iniciar sesión:');
        qrcode.generate(qr, { small: true });
    });

    client.on('ready', async () => {
        console.log('✅ Cliente WhatsApp conectado y listo.');

        console.log(`📤 Enviando secuencia a ${TARGET_ID}...`);

        for (let i = 0; i < messages.length; i++) {
            const msg = messages[i];
            console.log(`\n💬 Mensaje ${i + 1}:`);
            console.log(msg);

            try {
                await client.sendMessage(TARGET_ID, msg);
                console.log(`   ✅ Enviado!`);
            } catch (err) {
                console.error(`   ❌ Falló envío:`, err.message);
            }

            // Pausa humana breve entre mensajes (3s)
            await new Promise(r => setTimeout(r, 3000));
        }

        console.log('\n✨ Prueba finalizada. Cerrando...');

        // Esperar un poco antes de matar el proceso para asegurar envío
        setTimeout(() => {
            client.destroy();
            process.exit(0);
        }, 5000);
    });

    client.on('auth_failure', msg => {
        console.error('❌ Fallo de autenticación:', msg);
        process.exit(1);
    });

    client.initialize();
}

runTest();
