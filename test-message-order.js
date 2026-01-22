// Simular la secuencia de mensajes directamente
const messageSequences = [
  // Mensaje 1 - Saludo con nombre del negocio
  [
    "Hola, soy Juan Cruz de Nexte Marketing. Estuve viendo su negocio {businessName} y me pareció muy interesante",
    "¡Hola! Soy Juan Cruz, de Nexte Marketing 👋 Estuve revisando {businessName} y quería contactarte",
    "Hola! Te saludo, soy Juan Cruz de Nexte Marketing. Estuve viendo {businessName} y me llamó la atención",
    "¡Buen día! Soy Juan Cruz, de Nexte Marketing 😊 Estuve revisando {businessName} y quería saludarte",
    "Hola! Un placer, soy Juan Cruz de Nexte Marketing. Estuve viendo {businessName} y me pareció interesante proponerte un servicio"
  ],
  // Mensaje 2 - Presentación
  [
    "En Nexte Marketing llevamos 10 años (2015-2025) potenciando marcas: hemos trabajado con empresas en 5 países, evolucionando de un estudio freelance a una boutique de growth con especialistas multidisciplinarios y casos de éxito comprobados.",
    "Llevamos 10 años en Nexte Marketing (2015-2025) potenciando marcas. Trabajamos con empresas en 5 países, desde estudio freelance hasta boutique de growth con especialistas multidisciplinarios.",
    "En Nexte Marketing tenemos 10 años (2015-2025) potenciando marcas. Hemos trabajado con empresas en 5 países, evolucionando de estudio freelance a boutique de growth con especialistas multidisciplinarios.",
    "Nexte Marketing lleva 10 años (2015-2025) potenciando marcas. Trabajamos con empresas en 5 países, desde estudio freelance hasta boutique de growth con especialistas multidisciplinarios.",
    "En Nexte Marketing tenemos 10 años (2015-2025) potenciando marcas: hemos trabajado con empresas en 5 países, evolucionando de un estudio freelance a una boutique de growth con especialistas multidisciplinarios."
  ],
  // Mensaje 3 - Promo Web Express (más claro)
  [
    "🚀 Te ofrecemos un sitio web completo por $150.000: incluye diseño personalizado, dominio .com, hosting por 1 año y adaptado a tu marca. Si no tenés marca, te la diseñamos. Todo en 2 días!",
    "💻 Sitio web completo por $150.000: diseño personalizado, dominio .com, hosting por 1 año y adaptado a tu marca. Si no tenés marca, te la creamos. Listo en 2 días!",
    "⚡ Sitio web completo por $150.000: diseño personalizado, dominio .com, hosting por 1 año y adaptado a tu marca. Si no tenés marca, te la diseñamos. En 2 días!",
    "🎯 Sitio web completo por $150.000: diseño personalizado, dominio .com, hosting por 1 año y adaptado a tu marca. Si no tenés marca, te la creamos. Listo en 2 días!",
    "🌟 Sitio web completo por $150.000: diseño personalizado, dominio .com, hosting por 1 año y adaptado a tu marca. Si no tenés marca, te la diseñamos. En 2 días!"
  ],
  // Mensaje 4 - Plan Web Premium (más claro)
  [
    "💎 Para negocios que quieren destacar: sitio web premium por $500.000 con diseño exclusivo, animaciones avanzadas y optimizado para Google. Incluye branding completo.",
    "🏆 Para negocios que quieren destacar: sitio web premium por $500.000 con diseño exclusivo, animaciones avanzadas y optimizado para Google. Incluye branding completo.",
    "⭐ Para negocios que quieren destacar: sitio web premium por $500.000 con diseño exclusivo, animaciones avanzadas y optimizado para Google. Incluye branding completo.",
    "✨ Para negocios que quieren destacar: sitio web premium por $500.000 con diseño exclusivo, animaciones avanzadas y optimizado para Google. Incluye branding completo.",
    "💎 Para negocios que quieren destacar: sitio web premium por $500.000 con diseño exclusivo, animaciones avanzadas y optimizado para Google. Incluye branding completo."
  ],
  // Mensaje 5 - Servicios (más claro)
  [
    "También hacemos: publicidad en Google para que te encuentren, manejo de redes sociales, bots de WhatsApp automáticos y todo lo que necesites para digitalizar tu negocio.",
    "Además ofrecemos: publicidad en Google para que te encuentren, manejo de redes sociales, bots de WhatsApp automáticos y todo lo que necesites para digitalizar tu negocio.",
    "También brindamos: publicidad en Google para que te encuentren, manejo de redes sociales, bots de WhatsApp automáticos y todo lo que necesites para digitalizar tu negocio.",
    "Además trabajamos en: publicidad en Google para que te encuentren, manejo de redes sociales, bots de WhatsApp automáticos y todo lo que necesites para digitalizar tu negocio.",
    "También ofrecemos: publicidad en Google para que te encuentren, manejo de redes sociales, bots de WhatsApp automáticos y todo lo que necesites para digitalizar tu negocio."
  ],
  // Mensaje 6 - Servicios específicos (más humano)
  [
    "Te cuento que podemos hacer publicidad para que aparezcas en Google, manejo de redes sociales, bots de WhatsApp que te respondan todo automáticamente y la promo de 150.000 por un sitio web completo adaptado a tu marca con las últimas tecnologías. Si no tenés marca, te hacemos el branding también.",
    "Mirá, podemos hacer publicidad para que te encuentren en Google, manejo de redes sociales, bots de WhatsApp que contesten automáticamente y la promo de 150.000 por sitio web completo adaptado a tu marca con las últimas tecnologías. Si no tenés marca, te diseñamos todo.",
    "Te comento que hacemos publicidad para Google, manejo de redes sociales, bots de WhatsApp automáticos y la promo de 150.000 por sitio web completo adaptado a tu marca con las últimas tecnologías. Si no tenés marca, te hacemos el branding.",
    "Podemos hacer publicidad para que aparezcas en Google, manejo de redes sociales, bots de WhatsApp que contesten solos y la promo de 150.000 por sitio web completo adaptado a tu marca con las últimas tecnologías. Si no tenés marca, te diseñamos todo.",
    "Te cuento que hacemos publicidad para Google, manejo de redes sociales, bots de WhatsApp automáticos y la promo de 150.000 por sitio web completo adaptado a tu marca con las últimas tecnologías. Si no tenés marca, te hacemos el branding también."
  ],
  // Mensaje 7 - CTA
  [
    "Visitá https://nextemarketing.com para ver ejemplos.",
    "Visitá https://nextemarketing.com para ver ejemplos.",
    "Visitá https://nextemarketing.com para ver ejemplos.",
    "Visitá https://nextemarketing.com para ver ejemplos.",
    "Visitá https://nextemarketing.com para ver ejemplos."
  ],
  // Mensaje 8 - Cierre
  [
    "Cualquier consulta, estoy disponible",
    "Cualquier pregunta, estoy disponible",
    "Cualquier duda, estoy disponible",
    "Cualquier consulta, estoy disponible",
    "Cualquier pregunta, estoy disponible"
  ]
];

// Función para obtener mensaje aleatorio
function getRandomMessage(messageIndex, businessName = '') {
  const variations = messageSequences[messageIndex];
  const randomIndex = Math.floor(Math.random() * variations.length);
  let message = variations[randomIndex];
  
  // Solo reemplazar {businessName} en el primer mensaje (índice 0)
  if (businessName && messageIndex === 0) {
    message = message.replace(/{businessName}/g, businessName);
  }
  
  return message;
}

// Simular la secuencia de mensajes
console.log('🧪 Probando orden de mensajes...\n');

// Mensaje 1 (índice 0)
const message1 = getRandomMessage(0, 'Test Business');
console.log('📱 Mensaje 1 (índice 0):', message1.substring(0, 80) + '...');

// Mensaje 2 (índice 1) 
const message2 = getRandomMessage(1, 'Test Business');
console.log('📱 Mensaje 2 (índice 1):', message2.substring(0, 80) + '...');

// Mensaje 3 (índice 2) - Sitio web $150.000
const message3 = getRandomMessage(2, 'Test Business');
console.log('📱 Mensaje 3 (índice 2):', message3.substring(0, 80) + '...');

// Mensaje 4 (índice 3) - Sitio web premium $500.000
const message4 = getRandomMessage(3, 'Test Business');
console.log('📱 Mensaje 4 (índice 3):', message4.substring(0, 80) + '...');

// Mensaje 5 (índice 4) - Servicios generales
const message5 = getRandomMessage(4, 'Test Business');
console.log('📱 Mensaje 5 (índice 4):', message5.substring(0, 80) + '...');

// Mensaje 6 (índice 5) - Servicios específicos
const message6 = getRandomMessage(5, 'Test Business');
console.log('📱 Mensaje 6 (índice 5):', message6.substring(0, 80) + '...');

// Mensaje 7 (índice 6) - CTA
const message7 = getRandomMessage(6, 'Test Business');
console.log('📱 Mensaje 7 (índice 6):', message7.substring(0, 80) + '...');

// Mensaje 8 (índice 7) - Cierre
const message8 = getRandomMessage(7, 'Test Business');
console.log('📱 Mensaje 8 (índice 7):', message8.substring(0, 80) + '...');

console.log('\n✅ Prueba completada. Verifica que:');
console.log('- Mensaje 3 (índice 2) contenga "$150.000"');
console.log('- Mensaje 4 (índice 3) contenga "$500.000"');
console.log('- Mensaje 5 (índice 4) contenga "También hacemos" o "Además ofrecemos"');

console.log('\n🔍 Verificación específica:');
console.log('Mensaje 3 contiene $150.000:', message3.includes('$150.000'));
console.log('Mensaje 4 contiene $500.000:', message4.includes('$500.000'));
console.log('Mensaje 5 contiene servicios:', message5.includes('También') || message5.includes('Además')); 