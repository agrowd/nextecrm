require('dotenv').config();
const AITextGenerator = require('./services/aiTextGenerator');

const apiKey = process.env.GEMINI_API_KEY;
console.log(`🔑 API KEY Loaded: ${apiKey ? apiKey.substring(0, 5) + '...' + apiKey.slice(-4) : 'UNDEFINED'}`);

async function testGeneration() {
    console.log("🔵 Iniciando prueba de generación de mensajes Gemini...");

    // Mock Lead (Simulación de un cliente real)
    const mockLead = {
        id: 'test_lead_001',
        name: 'Clínica Dental Sonrisas',
        phone: '5491112345678',
        category: 'dentista',
        location: 'Palermo, CABA',
        rating: 4.8,
        reviewCount: 12, // Pocas reviews -> debería activar insight
        website: '' // Sin web -> debería activar insight
    };

    console.log(`👤 Lead de prueba: ${mockLead.name} (${mockLead.category})`);
    console.log(`   Datos: Rating ${mockLead.rating}⭐ | Reviews ${mockLead.reviewCount} | Web: ${mockLead.website ? 'SI' : 'NO'}`);

    const ai = new AITextGenerator();

    try {
        // 1. Check Health
        console.log("\n1️⃣ Verificando conexión API...");
        const isHealthy = await ai.checkHealth();
        if (!isHealthy) {
            console.error("❌ Gemini Health Check Failed. Revisa tu API KEY.");
            return;
        }
        console.log("✅ Gemini API Conectado y Respondiendo.");

        // 2. Generate Sequence
        console.log("\n2️⃣ Generando secuencia de venta (4 mensajes)...");
        const messages = await ai.generatePersonalizedSequence(mockLead);

        messages.forEach((msg, i) => {
            console.log(`\n💬 Mensaje ${i + 1}:`);
            console.log(`"${msg}"`);
        });

        // 3. Test Auto-reply detection
        console.log("\n3️⃣ Probando detección de Auto-Respuesta...");
        const autoReplyMsg = "Hola, gracias por escribirnos. Por el momento no estamos atendiendo. Dejanos tu mensaje.";
        console.log(`   Mensaje entrante: "${autoReplyMsg}"`);

        const isAuto = await ai.detectAutoReply(autoReplyMsg);
        console.log(`   >> ¿Es Bot?: ${isAuto ? '✅ SI' : '❌ NO'}`);

        if (isAuto) {
            console.log("   >> Generando respuesta de venta anti-bot...");
            const pitch = await ai.generateBotSalesPitch(mockLead, autoReplyMsg);
            console.log(`   📢 Pitch Generado: "${pitch}"`);
        }

    } catch (error) {
        console.error("❌ Error durante la prueba:", error);
    }
}

testGeneration();
