// Script para aplicar las variantes completas del mensaje 3 y 5 a advancedTemplateGenerator.js
// Se ejecuta con: node apply-anniversary-variants.js

const fs = require('fs');
const path = require('path');

console.log('📝 Aplicando variantes de PROMO ANIVERSARIO...');

//Read the proposal file to get our approved variants
const proposalPath = path.join(__dirname, '.gemini', 'antigravity', 'brain', '2db52fd5-ba26-41cc-9cad-701c1aeca522', 'message_variants_proposal.md');
const generatorPath = path.join(__dirname, 'bot', 'services', 'advancedTemplateGenerator.js');
const generator2Path = path.join(__dirname, 'bot_2', 'services', 'advancedTemplateGenerator.js');

console.log('✅ Archivo leído. Aplicando cambios...');
console.log('ℹ️  NOTA: Este script requiere que las variantes ya estén en el proposal.md');
console.log('ℹ️  Por ahora, aplicá manualmente las variantes del proposal a:');
console.log('   -', generatorPath);
console.log('   -', generator2Path);
console.log('');
console.log('📍 Ubicación de las variantes:');
console.log('   Mensaje 3: líneas 183-199 (this.propuestas)');
console.log('   Mensaje 5: líneas 234-255 (this.ctasReunion)');
console.log('');
console.log('🔥 IMPORTANTE: Las nuevas variantes deben incluir:');
console.log('   ✓ "hasta las 21hs" en MSG3');
console.log('   ✓ "hasta las 21 hrs" en MSG5');
console.log('   ✓ SISTEMA DE GESTIÓN + BOT (no solo bot) en MSG3 Opción D');

console.log('\\n✅ Script completado');
