require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function listModels() {
    console.log('📋 Listando modelos disponibles de Gemini...\n');

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    // Modelos a probar
    const modelsToTest = [
        'gemini-2.5-flash',
        'gemini-2.0-flash',
        'gemini-1.5-pro',
        'gemini-1.5-flash',
        'gemini-1.0-pro',
        'gemini-pro',
        'gemini-pro-vision'
    ];

    for (const modelName of modelsToTest) {
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent("Hola");
            const text = result.response.text();
            console.log(`✅ ${modelName}: FUNCIONA (${text.length} chars)`);
        } catch (error) {
            const errorMsg = error.message.slice(0, 100);
            if (errorMsg.includes('429')) {
                console.log(`⚠️ ${modelName}: Rate Limit (pero existe)`);
            } else if (errorMsg.includes('404')) {
                console.log(`❌ ${modelName}: No existe`);
            } else {
                console.log(`❓ ${modelName}: ${errorMsg}`);
            }
        }
        // Esperar 1 segundo entre requests
        await new Promise(r => setTimeout(r, 1000));
    }
}

listModels();
