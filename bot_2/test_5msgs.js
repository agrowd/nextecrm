require('dotenv').config();
const AdvancedTemplateGenerator = require('./services/advancedTemplateGenerator');

console.log('🧪 === TEST 5 MENSAJES ===\n');

const gen = new AdvancedTemplateGenerator();

const lead = {
    name: 'Consultorio Dr. García',
    keyword: 'kinesiologo',
    location: 'Palermo'
};

console.log(`👤 Lead: ${lead.name}\n`);

const mensajes = gen.generatePersonalizedSequence(lead);

console.log('\n📨 MENSAJES COMPLETOS:\n');
mensajes.forEach((msg, i) => {
    console.log(`${'='.repeat(60)}`);
    console.log(`MENSAJE ${i + 1}/5:`);
    console.log(msg);
});

console.log(`\n${'='.repeat(60)}`);
console.log(`✅ Total: ${mensajes.length} mensajes generados`);
