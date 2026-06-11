const axios = require('axios');

class AIHelper {
    static async generate(prompt, systemPrompt = '', jsonMode = false) {
        const geminiKey = process.env.GEMINI_API_KEY;
        const openAiKey = process.env.OPENAI_API_KEY;
        const openAiModel = process.env.OPENAI_MODEL || 'gpt-4o-mini';

        if (openAiKey) {
            // Usar OpenAI
            try {
                const payload = {
                    model: openAiModel,
                    messages: [
                        { role: 'system', content: systemPrompt || 'Eres un asistente experto.' },
                        { role: 'user', content: prompt }
                    ],
                    temperature: 0.7
                };
                if (jsonMode) {
                    payload.response_format = { type: "json_object" };
                }
                const res = await axios.post('https://api.openai.com/v1/chat/completions', payload, {
                    headers: {
                        'Authorization': `Bearer ${openAiKey}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 15000
                });
                return res.data?.choices?.[0]?.message?.content?.trim();
            } catch (err) {
                console.error('[AI] Error calling OpenAI API:', err.message);
                // Si falla y Gemini está disponible, reintentamos con Gemini
                if (!geminiKey) throw err;
            }
        }

        if (geminiKey) {
            // Usar Gemini 1.5 Flash
            try {
                const fullPrompt = systemPrompt ? `${systemPrompt}\n\nUsuario: ${prompt}` : prompt;
                const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
                const payload = {
                    contents: [{ parts: [{ text: fullPrompt }] }]
                };
                if (jsonMode) {
                    payload.generationConfig = {
                        responseMimeType: "application/json"
                    };
                }
                const res = await axios.post(url, payload, {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 15000
                });
                const text = res.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
                return text;
            } catch (err) {
                console.error('[AI] Error calling Gemini API:', err.message);
                throw err;
            }
        }

        throw new Error('No AI Keys configured (neither OPENAI_API_KEY nor GEMINI_API_KEY found)');
    }
}

module.exports = AIHelper;
