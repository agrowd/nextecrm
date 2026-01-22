require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function checkGemini() {
    console.log('🔍 Checking Gemini API...');

    if (!process.env.GEMINI_API_KEY) {
        console.error('❌ GEMINI_API_KEY not found in .env');
        return;
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    try {
        // 1. List available models
        /* Note: listModels might not be directly exposed in the minimal client sometimes, 
           but let's try a simple generation with different known models to see which one bites. */

        const modelsToTry = [
            { model: "gemini-pro" }
        ];

        console.log('🧪 Testing models...');

        for (const config of modelsToTry) {
            console.log(`\n👉 Testing ${config.model}...`);
            try {
                const aiModel = genAI.getGenerativeModel({
                    model: config.model
                });

                const result = await aiModel.generateContent("Hola, esto es una prueba.");
                const response = await result.response;
                console.log(`   ✅ SUCCESS! Response: ${response.text()}`);
                console.log(`   🌟 RECOMMENDATION: Use model="${config.model}" and apiVersion="${config.version}"`);
                return; // Stop after first success
            } catch (error) {
                console.log(`   ❌ Failed: ${error.message.split('[')[0]}...`); // Shorten error
            }
        }

        console.error('\n❌ All models failed. Check your API KEY permissions or quota.');

    } catch (error) {
        console.error('❌ Fatal error:', error);
    }
}

checkGemini();
