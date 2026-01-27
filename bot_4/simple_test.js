require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function run() {
    const key = process.env.GEMINI_API_KEY;
    console.log(`🔑 Key loaded: ${key ? key.substring(0, 6) + '...' : '❌ NOT LOADED'}`);

    const genAI = new GoogleGenerativeAI(key);
    // Probamos 1.5-flash standard
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    try {
        console.log("📡 Enviando ping a Gemini 1.5 Flash...");
        const result = await model.generateContent("Respond only with: 'PONG'");
        const response = await result.response;
        console.log("✅ Respuesta recibida:", response.text());
    } catch (e) {
        console.error("❌ Error de API:");
        console.error(e.message); // Solo el mensaje principal
        if (e.message.includes('404')) {
            console.error("👉 Sugerencia: El modelo no existe o la API Key no tiene acceso a él.");
        }
    }
}
run();
