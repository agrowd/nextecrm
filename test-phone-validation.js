#!/usr/bin/env node

/**
 * Script de prueba para la doble validación de teléfonos
 * 
 * Uso:
 * node test-phone-validation.js
 * 
 * Prueba diferentes formatos de números argentinos y muestra
 * los resultados de la validación local y con APIs externas.
 */

require('dotenv').config();
const phoneValidator = require('./bot/services/phoneValidator');

const API = 'http://localhost:3001';

// Números de prueba más realistas
const testNumbers = [
  // Números válidos argentinos
  "5492641234567",      // San Juan
  "5493871234567",      // Salta
  "5493511234567",      // Córdoba
  "5493411234567",      // Santa Fe
  "5492211234567",      // La Plata
  "5492201234567",      // La Plata
  "5492231234567",      // Mar del Plata
  "5492241234567",      // Bahía Blanca
  "5492251234567",      // Tandil
  "5492261234567",      // Olavarría
  "5492271234567",      // Azul
  "5492281234567",      // Necochea
  "5492291234567",      // Balcarce
  "5492301234567",      // La Pampa
  "5492311234567",      // La Pampa
  "5492321234567",      // La Pampa
  "5492331234567",      // La Pampa
  "5492341234567",      // La Pampa
  "5492351234567",      // La Pampa
  "5492361234567",      // La Pampa
  "5492371234567",      // La Pampa
  "5492381234567",      // La Pampa
  "5492391234567",      // La Pampa
  "5492601234567",      // Mendoza
  "5492611234567",      // Mendoza
  "5492621234567",      // Mendoza
  "5492631234567",      // Mendoza
  "5492651234567",      // Mendoza
  "5492661234567",      // Mendoza
  "5492671234567",      // Mendoza
  "5492681234567",      // Mendoza
  "5492691234567",      // Mendoza
  "5493401234567",      // Santa Fe
  "5493421234567",      // Santa Fe
  "5493431234567",      // Santa Fe
  "5493441234567",      // Santa Fe
  "5493451234567",      // Santa Fe
  "5493461234567",      // Santa Fe
  "5493471234567",      // Santa Fe
  "5493481234567",      // Santa Fe
  "5493491234567",      // Santa Fe
  "5493521234567",      // Córdoba
  "5493531234567",      // Córdoba
  "5493541234567",      // Córdoba
  "5493551234567",      // Córdoba
  "5493561234567",      // Córdoba
  "5493571234567",      // Córdoba
  "5493581234567",      // Córdoba
  "5493591234567",      // Córdoba
  "5493621234567",      // Chaco
  "5493631234567",      // Chaco
  "5493641234567",      // Chaco
  "5493651234567",      // Chaco
  "5493661234567",      // Chaco
  "5493671234567",      // Chaco
  "5493681234567",      // Chaco
  "5493691234567",      // Chaco
  "5493701234567",      // Formosa
  "5493711234567",      // Formosa
  "5493721234567",      // Formosa
  "5493731234567",      // Formosa
  "5493741234567",      // Formosa
  "5493751234567",      // Formosa
  "5493761234567",      // Formosa
  "5493771234567",      // Formosa
  "5493781234567",      // Formosa
  "5493791234567",      // Formosa
  "5493801234567",      // La Rioja
  "5493811234567",      // Tucumán
  "5493821234567",      // Tucumán
  "5493831234567",      // Tucumán
  "5493841234567",      // Tucumán
  "5493851234567",      // Tucumán
  "5493861234567",      // Tucumán
  "5493881234567",      // Tucumán
  "5493891234567",      // Tucumán
  "5492921234567",      // Río Negro
  "5492931234567",      // Río Negro
  "5492941234567",      // Río Negro
  "5492951234567",      // Río Negro
  "5492961234567",      // Río Negro
  "5492971234567",      // Río Negro
  "5492981234567",      // Río Negro
  "5492991234567",      // Río Negro
  "5492801234567",      // Chubut
  "5492811234567",      // Chubut
  "5492821234567",      // Chubut
  "5492831234567",      // Chubut
  "5492841234567",      // Chubut
  "5492851234567",      // Chubut
  "5492861234567",      // Chubut
  "5492871234567",      // Chubut
  "5492881234567",      // Chubut
  "5492891234567",      // Chubut
  "5492901234567",      // Tierra del Fuego
  "5492911234567",      // Tierra del Fuego
  "5492651234567",      // San Luis
  "5492661234567",      // San Luis
  "5492671234567",      // San Luis
  "5492681234567",      // San Luis
  "5492691234567",      // San Luis
  "5492641234567",      // San Juan
  "5492651234567",      // San Juan
  "5492661234567",      // San Juan
  "5492671234567",      // San Juan
  "5492681234567",      // San Juan
  "5492691234567",      // San Juan
  "5493831234567",      // Catamarca
  "5493841234567",      // Catamarca
  "5493851234567",      // Catamarca
  "5493861234567",      // Catamarca
  "5493871234567",      // Catamarca
  "5493881234567",      // Catamarca
  "5493891234567",      // Catamarca
  "5493881234567",      // Jujuy
  "5493891234567",      // Jujuy
  "5493841234567",      // Santiago del Estero
  "5493851234567",      // Santiago del Estero
  "5493861234567",      // Santiago del Estero
  "5493871234567",      // Santiago del Estero
  "5493881234567",      // Santiago del Estero
  "5493891234567",      // Santiago del Estero
  "5493781234567",      // Corrientes
  "5493791234567",      // Corrientes
  "5493751234567",      // Misiones
  "5493761234567",      // Misiones
  "5493771234567",      // Misiones
  "5493781234567",      // Misiones
  "5493791234567",      // Misiones
  "5492991234567",      // Neuquén
  // Formatos con +54
  "+5492641234567",
  "+5493871234567",
  "+5493511234567",
  "+5493411234567",
  "+5492211234567",
  "+5492201234567",
  "+5492231234567",
  "+5492241234567",
  "+5492251234567",
  "+5492261234567",
  "+5492271234567",
  "+5492281234567",
  "+5492291234567",
  "+5492301234567",
  "+5492311234567",
  "+5492321234567",
  "+5492331234567",
  "+5492341234567",
  "+5492351234567",
  "+5492361234567",
  "+5492371234567",
  "+5492381234567",
  "+5492391234567",
  "+5492601234567",
  "+5492611234567",
  "+5492621234567",
  "+5492631234567",
  "+5492651234567",
  "+5492661234567",
  "+5492671234567",
  "+5492681234567",
  "+5492691234567",
  "+5493401234567",
  "+5493421234567",
  "+5493431234567",
  "+5493441234567",
  "+5493451234567",
  "+5493461234567",
  "+5493471234567",
  "+5493481234567",
  "+5493491234567",
  "+5493521234567",
  "+5493531234567",
  "+5493541234567",
  "+5493551234567",
  "+5493561234567",
  "+5493571234567",
  "+5493581234567",
  "+5493591234567",
  "+5493621234567",
  "+5493631234567",
  "+5493641234567",
  "+5493651234567",
  "+5493661234567",
  "+5493671234567",
  "+5493681234567",
  "+5493691234567",
  "+5493701234567",
  "+5493711234567",
  "+5493721234567",
  "+5493731234567",
  "+5493741234567",
  "+5493751234567",
  "+5493761234567",
  "+5493771234567",
  "+5493781234567",
  "+5493791234567",
  "+5493801234567",
  "+5493811234567",
  "+5493821234567",
  "+5493831234567",
  "+5493841234567",
  "+5493851234567",
  "+5493861234567",
  "+5493881234567",
  "+5493891234567",
  "+5492921234567",
  "+5492931234567",
  "+5492941234567",
  "+5492951234567",
  "+5492961234567",
  "+5492971234567",
  "+5492981234567",
  "+5492991234567",
  "+5492801234567",
  "+5492811234567",
  "+5492821234567",
  "+5492831234567",
  "+5492841234567",
  "+5492851234567",
  "+5492861234567",
  "+5492871234567",
  "+5492881234567",
  "+5492891234567",
  "+5492901234567",
  "+5492911234567",
  "+5492651234567",
  "+5492661234567",
  "+5492671234567",
  "+5492681234567",
  "+5492691234567",
  "+5492641234567",
  "+5492651234567",
  "+5492661234567",
  "+5492671234567",
  "+5492681234567",
  "+5492691234567",
  "+5493831234567",
  "+5493841234567",
  "+5493851234567",
  "+5493861234567",
  "+5493871234567",
  "+5493881234567",
  "+5493891234567",
  "+5493881234567",
  "+5493891234567",
  "+5493841234567",
  "+5493851234567",
  "+5493861234567",
  "+5493871234567",
  "+5493881234567",
  "+5493891234567",
  "+5493781234567",
  "+5493791234567",
  "+5493751234567",
  "+5493761234567",
  "+5493771234567",
  "+5493781234567",
  "+5493791234567",
  "+5492991234567",
  // Formatos locales
  "011 1234-5678",
  "011 12345678",
  "11 1234-5678",
  "11 12345678",
  "1234-5678",
  "12345678",
  "011 4567-8901",
  "11 4567-8901",
  "4567-8901",
  "45678901",
  "011 123-4567",
  "123456789",
  "1234567",
  // Números de prueba (deben ser rechazados)
  "abc123def",
  "",
  "null",
  "00000000",
  "11111111",
  "87654321",
  "22222222",
  "33333333",
  "44444444",
  "55555555",
  "66666666",
  "77777777",
  "88888888",
  "99999999"
];

console.log('🧪 Iniciando pruebas de validación de teléfonos...\n');

console.log('📋 Números a probar:', testNumbers.length, '\n');

// Probar validación individual
console.log('🔍 Probando validación individual:');
console.log('============================================================');

let validCount = 0;
let invalidCount = 0;
const validNumbers = [];
const invalidNumbers = [];

for (let i = 0; i < testNumbers.length; i++) {
  const phone = testNumbers[i];
  console.log(`\n📞 Probando: "${phone}"`);
  
  try {
    const result = await phoneValidator.doubleValidatePhone(phone);
    
    if (result.success) {
      validCount++;
      validNumbers.push(result.formatted);
      console.log(`  ✅ VÁLIDO`);
      console.log(`     Formateado: ${result.formatted}`);
      console.log(`     Método: ${result.method}`);
    } else {
      invalidCount++;
      invalidNumbers.push({ original: phone, error: result.error, method: result.method });
      console.log(`  ❌ INVÁLIDO`);
      console.log(`     Error: ${result.error}`);
      console.log(`     Método: ${result.method}`);
    }
  } catch (error) {
    invalidCount++;
    invalidNumbers.push({ original: phone, error: error.message, method: 'error' });
    console.log(`  ❌ ERROR`);
    console.log(`     Error: ${error.message}`);
  }
}

// Probar validación múltiple
console.log('\n📊 Probando validación múltiple:');
console.log('============================================================');

try {
  const stats = await phoneValidator.getValidationStats(testNumbers);
  console.log('\n📈 Estadísticas:');
  console.log(`   Total: ${stats.total}`);
  console.log(`   Válidos: ${stats.valid}`);
  console.log(`   Inválidos: ${stats.invalid}`);
  console.log(`   Métodos:`);
  console.log(`     Local: ${stats.methods.local}`);
  console.log(`     Doble: ${stats.methods.double}`);
  console.log(`     API: ${stats.methods.api}`);
  
  console.log('\n✅ Números válidos:');
  stats.validNumbers.forEach(num => console.log(`   - ${num}`));
  
  console.log('\n❌ Números inválidos:');
  stats.invalidNumbers.forEach(item => {
    console.log(`   - "${item.original}": ${item.error} (${item.method})`);
  });
} catch (error) {
  console.error('❌ Error en validación múltiple:', error.message);
}

// Probar método de compatibilidad
console.log('\n🔄 Probando método de compatibilidad (sync):');
console.log('============================================================');

for (let i = 0; i < Math.min(5, testNumbers.length); i++) {
  const phone = testNumbers[i];
  console.log(`\n📞 Probando: "${phone}"`);
  
  try {
    const result = phoneValidator.formatForWhatsAppSync(phone);
    
    if (result.success) {
      console.log(`  ✅ VÁLIDO (sync)`);
      console.log(`     Formateado: ${result.formatted}`);
    } else {
      console.log(`  ❌ INVÁLIDO (sync)`);
      console.log(`     Error: ${result.error}`);
    }
  } catch (error) {
    console.log(`  ❌ ERROR (sync)`);
    console.log(`     Error: ${error.message}`);
  }
}

console.log('\n🏁 Pruebas completadas!');

// Verificar APIs configuradas
console.log('\n🌐 Probando con APIs específicas...\n');

if (process.env.NUMVERIFY_API_KEY) {
  console.log('✅ NumVerify API configurada');
  try {
    const testResult = await phoneValidator.validateWithAPI('+5492641234567', 'numverify');
    console.log('📋 Test NumVerify:', testResult.valid ? '✅ OK' : '❌ Error');
  } catch (error) {
    console.log('❌ Error test NumVerify:', error.message);
  }
} else {
  console.log('⚠️ No hay APIs configuradas. Agrega NUMVERIFY_API_KEY o ABSTRACT_API_KEY al .env');
} 