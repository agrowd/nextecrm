require('dotenv').config();
const SmartTemplateGenerator = require('./services/smartTemplateGenerator');

async function testTemplates() {
    console.log('🧪 === TEST PLANTILLAS INTELIGENTES ===\n');

    const generator = new SmartTemplateGenerator();

    // Leads de prueba de diferentes categorías
    const testLeads = [
        {
            name: 'NC Kinesiología Deportiva - Noelia Cáceres',
            phone: '011 5106-8600',
            businessName: 'NC Kinesiología Deportiva',
            location: 'Palermo',
            keyword: 'kinesiología'
        },
        {
            name: 'La Parrilla de Juan - Restaurante',
            phone: '011 5555-1234',
            businessName: 'La Parrilla de Juan',
            location: 'Belgrano',
            keyword: 'restaurante parrilla'
        },
        {
            name: 'Beauty Salon María',
            phone: '011 4444-5678',
            businessName: 'Beauty Salon María',
            location: 'Recoleta',
            keyword: 'peluquería'
        },
        {
            name: 'Ferretería El Tornillo',
            phone: '011 3333-9999',
            businessName: 'Ferretería El Tornillo',
            location: 'Flores',
            keyword: 'ferretería'
        }
    ];

    for (const lead of testLeads) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`📋 Lead: ${lead.name}`);
        console.log(`🏷️ Keyword: ${lead.keyword}`);

        const messages = generator.generatePersonalizedSequence(lead);

        messages.forEach((msg, i) => {
            console.log(`\n📝 Mensaje ${i + 1} (${msg.length} chars):`);
            console.log(`   "${msg}"`);
        });
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log('📊 ESTADÍSTICAS:');
    console.log(generator.getStats());
}

testTemplates();
