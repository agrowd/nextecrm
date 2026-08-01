const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../bot/.env') });

const AITextGenerator = require('../bot/services/aiTextGenerator');

async function testSequence() {
    const generator = new AITextGenerator();
    const mockLead = {
        id: 'test_123',
        name: 'Clínica Odontológica DentalPlus',
        category: 'Consultorio odontológico',
        rating: 4.8,
        reviewCount: 65,
        location: 'Belgrano, CABA',
        website: ''
    };

    console.log('--- PROBANDO GENERACIÓN CON CHATGPT ---');
    console.log('Negocio:', mockLead.name, '(', mockLead.category, ')');
    
    try {
        const msgs = await generator.generatePersonalizedSequence(mockLead);
        msgs.forEach((m, i) => {
            console.log(`\n📩 [MENSAJE ${i + 1}]:\n${m}`);
        });
    } catch (e) {
        console.error('Error:', e);
    }
}

testSequence();
