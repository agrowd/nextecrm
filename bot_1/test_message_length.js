require('dotenv').config();
const AITextGenerator = require('./services/aiTextGenerator');

async function testMessageGeneration() {
    console.log('🧪 === TEST DE GENERACIÓN DE MENSAJES ===\n');

    const aiGenerator = new AITextGenerator();

    // Lead de prueba
    const mockLead = {
        name: 'NC Kinesiología Deportiva - Noelia Cáceres',
        phone: '011 5106-8600',
        businessName: 'NC Kinesiología Deportiva',
        location: 'Palermo',
        keyword: 'kinesiología deportiva',
        category: 'Salud'
    };

    console.log('📋 Lead de prueba:', mockLead.name);
    console.log('🤖 Generando 4 mensajes con Gemini 2.5-flash...\n');

    try {
        const messages = await aiGenerator.generatePersonalizedSequence(mockLead);

        console.log('\n✅ === MENSAJES GENERADOS ===\n');

        messages.forEach((msg, i) => {
            const wordCount = msg.split(' ').length;
            const charCount = msg.length;

            console.log(`📝 MENSAJE ${i + 1}:`);
            console.log(`   Palabras: ${wordCount}`);
            console.log(`   Caracteres: ${charCount}`);
            console.log(`   Contenido: "${msg}"`);
            console.log('');

            // Verificar si el mensaje parece cortado
            const lastChar = msg.trim().slice(-1);
            const seemsTruncated = !lastChar.match(/[.!?]/) && wordCount > 20;

            if (seemsTruncated) {
                console.log(`   ⚠️ ADVERTENCIA: Este mensaje parece estar CORTADO (no termina con puntuación)`);
            } else {
                console.log(`   ✅ Mensaje parece completo`);
            }
            console.log('---\n');
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
    }
}

testMessageGeneration();
