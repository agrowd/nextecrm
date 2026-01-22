require('dotenv').config();
const AdvancedTemplateGenerator = require('./services/advancedTemplateGenerator');

console.log('🧪 === TEST ADVANCED TEMPLATE GENERATOR ===\n');

const gen = new AdvancedTemplateGenerator();

// Stats
const stats = gen.getStats();
console.log('📊 ESTADÍSTICAS:');
console.log(`   Saludos: ${stats.saludos}`);
console.log(`   Intros: ${stats.intros}`);
console.log(`   Hooks: ${stats.hooks}`);
console.log(`   Presentaciones: ${stats.presentaciones}`);
console.log(`   Propuestas: ${stats.propuestas}`);
console.log(`   CTAs: ${stats.ctas}`);
console.log(`   COMBINACIONES POSIBLES: ${stats.combinacionesPosibles.toLocaleString()}`);

const leads = [
    { name: 'Dr. García Traumatología', keyword: 'traumatólogo', location: 'Palermo' },
    { name: 'La Parrilla de Juan', keyword: 'restaurante parrilla', location: 'Belgrano' },
    { name: 'Beauty Center María', keyword: 'peluquería', location: 'Recoleta' }
];

console.log('\n🎯 GENERANDO MENSAJES PARA 3 LEADS (2 veces cada uno):\n');

for (const lead of leads) {
    console.log(`${'='.repeat(60)}`);
    console.log(`👤 Lead: ${lead.name}`);
    console.log(`🏷️ Keyword: ${lead.keyword}`);

    // Primera generación
    console.log('\n📝 PRIMERA GENERACIÓN:');
    const msgs1 = gen.generatePersonalizedSequence(lead);
    msgs1.forEach((m, i) => console.log(`   ${i + 1}. "${m.substring(0, 80)}..."`));

    // Segunda generación (debería ser diferente)
    console.log('\n📝 SEGUNDA GENERACIÓN (debe ser diferente):');
    const msgs2 = gen.generatePersonalizedSequence(lead);
    msgs2.forEach((m, i) => console.log(`   ${i + 1}. "${m.substring(0, 80)}..."`));

    // Verificar si son diferentes
    const sonDiferentes = msgs1[0] !== msgs2[0] || msgs1[1] !== msgs2[1];
    console.log(`\n   ${sonDiferentes ? '✅ DIFERENTE - Variantes funcionando!' : '⚠️ Igual - revisar'}`);
}

console.log(`\n${'='.repeat(60)}`);
console.log(`✅ Total mensajes generados: ${gen.getStats().mensajesGenerados}`);
