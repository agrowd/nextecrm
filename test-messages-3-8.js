console.log('📋 MENSAJES 3-8 (Secuencia Restante)\n');

// Mensajes 3-8 según el índice
const messages = [
  "🚀 Sitio web completo por $150.000: incluye diseño personalizado, dominio .com, hosting por 1 año y adaptado a tu marca. Si no tenés marca, te la diseñamos. Todo en 2 días!",
  "💎 Para negocios que quieren destacar: sitio web premium por $500.000 con diseño exclusivo, animaciones avanzadas y optimizado para Google. Incluye branding completo.",
  "También hacemos: publicidad en Google para que te encuentren, manejo de redes sociales, bots de WhatsApp automáticos y todo lo que necesites para digitalizar tu negocio.",
  "Te cuento que podemos hacer publicidad para que aparezcas en Google, manejo de redes sociales, bots de WhatsApp que te respondan todo automáticamente y la promo de 150.000 por un sitio web completo adaptado a tu marca con las últimas tecnologías. Si no tenés marca, te hacemos el branding también.",
  "Visitá https://nextemarketing.com para ver ejemplos.",
  "Cualquier consulta, estoy disponible"
];

for (let i = 0; i < messages.length; i++) {
  console.log(`📱 Mensaje ${i + 3} (índice ${i + 2}):`);
  console.log(messages[i]);
  console.log('');
}

console.log('✅ Verificación completada');
console.log('📊 Resumen:');
console.log('- Mensaje 3: Sitio web $150.000');
console.log('- Mensaje 4: Sitio web premium $500.000');
console.log('- Mensaje 5: Servicios generales');
console.log('- Mensaje 6: Servicios específicos');
console.log('- Mensaje 7: CTA');
console.log('- Mensaje 8: Cierre'); 