const fs = require('fs');
const path = require('path');

// New propuestas templates with ANNIVERSARY discount
const newPropuestas = [
    `🎉 *PROMO FEBRERO 2025 + DESCUENTO ANIVERSARIO*

📅 *PRECIOS FEBRERO:* $75.000 cada servicio
🎂 *DESCUENTO ANIVERSARIO (solo hoy):* $50.000 (aplica también a mensuales)
🤖 *Sistema a medida:* $100.000 (en vez de $200.000)

👉 *Podés elegir el servicio que necesites, no es combo obligatorio.*

━━━━━━━━━━━━━━━━━━━━━━━━

🌐 *OPCIÓN A: TU PROPIA PÁGINA WEB*
Febrero: $75.000 → *ANIVERSARIO: $50.000*

Tu sitio "www.tunegocio.com.ar" profesional.

*Incluye:*
• Diseño completo + dominio + hosting + SSL
• Cambios ilimitados durante 1 año
• Soporte técnico
• Te mostramos ejemplos

*Renovación:* Solo si necesitás cambios o la página crece.

━━━━━━━━━━━━━━━━━━━━━━━━

📍 *OPCIÓN B: GOOGLE + MODIFICACIONES WEB*
Febrero: $75.000 → *ANIVERSARIO: $50.000*

Que te encuentren + mejoramos tu página actual.

*Incluye:*
• Google Analytics + Search Console + Maps + SEO
• Cambios en tu página actual (Wix, WordPress o código)
• Si no tenés el código, la replicamos en 2 días
• Indexación desde el día 1

━━━━━━━━━━━━━━━━━━━━━━━━

📱 *OPCIÓN C: REDES SOCIALES (mensual)*
Febrero: $75.000/mes → *ANIVERSARIO: $50.000/mes*

Nos encargamos de tu Instagram/Facebook.

*Incluye:*
• Contenido + diseños + publicación
• Respuestas a mensajes
• Estrategia mensual + reportes

━━━━━━━━━━━━━━━━━━━━━━━━

🤖 *OPCIÓN D: SISTEMA DE GESTIÓN AUTOMÁTICO*
Febrero: $200.000 → *ANIVERSARIO: $100.000*

Tu negocio funcionando 24/7 sin vos.

*Este sistema puede:*
• Responder como una persona real
• Menús de selección para guiar al cliente
• Analizar pagos y comprobantes automáticamente
• Enviar recordatorios y notificaciones
• Agendar turnos
• Y más según lo que necesites

*Incluye:*
• 6 meses de ajustes gratis
• Después: $10.000/mes (servidor + cambios + mejoras)
• Te mostramos ejemplos funcionando

━━━━━━━━━━━━━━━━━━━━━━━━

🎁 *PACK COMPLETO (opcional):* Si querés todo junto, consultá precio especial.

🎯 Todo pensado para convertir contactos en clientes.`,

    `🚀 *OFERTAS FEBRERO 2025 + PROMO ANIVERSARIO*

📅 *PRECIO TODO FEBRERO:* $75.000 por servicio
🎂 *POR ANIVERSARIO HOY:* $50.000 (incluye mensuales)
🤖 *Sistema automatizado:* $100.000 (normalmente $200.000)

👉 *Cada servicio se contrata por separado, el pack es opcional.*

━━━━━━━━━━━━━━━━━━━━━━━━

🌐 *A) PÁGINA WEB PROFESIONAL*
Febrero: $75.000 → *ANIVERSARIO: $50.000*

Tu sitio propio www.tunegocio.com.ar

*Tenés:*
• Diseño + dominio + hosting + SSL
• 1 año de cambios incluidos
• Soporte técnico
• Ejemplos para que veas

*Renovación:* Solo por cambios o crecimiento.

━━━━━━━━━━━━━━━━━━━━━━━━

📍 *B) GOOGLE + MEJORAS EN TU WEB*
Febrero: $75.000 → *ANIVERSARIO: $50.000*

Posicionamiento + modificaciones en tu página.

*Tenés:*
• Analytics + Search Console + Maps + SEO
• Cambios en Wix, WordPress o código
• ¿No tenés el código? La replicamos en 2 días
• Indexación inmediata

━━━━━━━━━━━━━━━━━━━━━━━━

📱 *C) REDES SOCIALES*
Febrero: $75.000/mes → *ANIVERSARIO: $50.000/mes*

Manejamos tus redes.

*Tenés:*
• Contenido + diseños
• Publicación + respuestas
• Estrategia + reportes

━━━━━━━━━━━━━━━━━━━━━━━━

🤖 *D) SISTEMA DE GESTIÓN AUTOMÁTICO*
Febrero: $200.000 → *ANIVERSARIO: $100.000*

Tu negocio en piloto automático.

*Puede:*
• Responder como persona real
• Menús de selección para clientes
• Verificar pagos y comprobantes
• Recordatorios y notificaciones
• Agendar turnos
• Todo lo que necesites

*Incluye:*
• 6 meses de ajustes
• Después: $10.000/mes (servidor + cambios)
• Te mostramos ejemplos

━━━━━━━━━━━━━━━━━━━━━━━━

🎁 *PACK OPCIONAL:* Todo junto a precio especial.

🎯 Convertimos contactos en clientes.`,

    `💥 *PROMO ESPECIAL - ANIVERSARIO NEXTE*

📅 *PRECIO FEBRERO:* $75.000 cada servicio
🎂 *DESCUENTO ANIVERSARIO (solo hoy):* $50.000 (aplica a mensuales también)
🤖 *Sistema a medida:* $100.000 (antes $200.000)

👉 *Elegí el servicio que quieras, no es obligatorio el combo.*

━━━━━━━━━━━━━━━━━━━━━━━━

🌐 *OPCIÓN 1: WEB PROFESIONAL*
Febrero: $75.000 → *ANIVERSARIO: $50.000*

Tu página www.tunegocio.com.ar

*Incluye:*
• Diseño completo + dominio + hosting + SSL
• Cambios durante 1 año
• Soporte incluido
• Te mostramos ejemplos reales

*Renovación:* Solo si hay cambios o crece la página.

━━━━━━━━━━━━━━━━━━━━━━━━

📍 *OPCIÓN 2: GOOGLE + MODIFICACIÓN DE WEB*
Febrero: $75.000 → *ANIVERSARIO: $50.000*

Posicionate + mejoramos tu web actual.

*Incluye:*
• Google Analytics + Search Console + Maps
• SEO técnico
• Cambios en tu web (Wix, WordPress, código)
• ¿Sin código? La replicamos en 2 días

━━━━━━━━━━━━━━━━━━━━━━━━

📱 *OPCIÓN 3: REDES SOCIALES*
Febrero: $75.000/mes → *ANIVERSARIO: $50.000/mes*

Manejo completo de redes.

*Incluye:*
• Contenido + diseños + publicación
• Respuestas + estrategia + reportes

━━━━━━━━━━━━━━━━━━━━━━━━

🤖 *OPCIÓN 4: SISTEMA DE GESTIÓN AUTOMÁTICO*
Febrero: $200.000 → *ANIVERSARIO: $100.000*

Automatizá tu negocio.

*El sistema puede:*
• Responder como una persona
• Menús de selección para guiar clientes
• Analizar pagos y comprobantes
• Enviar recordatorios
• Agendar turnos
• Lo que necesites

*Incluye:*
• 6 meses de ajustes
• Luego: $10.000/mes (servidor + mejoras)
• Ejemplos funcionando

━━━━━━━━━━━━━━━━━━━━━━━━

🎁 *PACK (opcional):* Todo junto con precio especial.

🎯 Hacemos que más contactos se conviertan en clientes.`,

    `⚡ *FEBRERO 2025 - PRECIOS ANIVERSARIO*

📅 *ESTE MES:* $75.000 por servicio
🎂 *DESCUENTO ANIVERSARIO HOY:* $50.000 (incluye mensuales)
🤖 *Sistema automatizado:* $100.000 (normalmente $200.000)

👉 *Servicios individuales, el pack es opcional.*

━━━━━━━━━━━━━━━━━━━━━━━━

🌐 *WEB PROPIA* → Febrero $75k → *ANIVERSARIO $50k*
• Diseño + dominio + hosting + SSL
• Cambios x1 año + soporte
• Te mostramos ejemplos
• Renovación solo si hay cambios

━━━━━━━━━━━━━━━━━━━━━━━━

📍 *GOOGLE + MODIFICACIONES* → Febrero $75k → *ANIVERSARIO $50k*
• Analytics + Search Console + Maps + SEO
• Cambios en tu web actual (Wix, WordPress, código)
• Sin código = la replicamos en 2 días

━━━━━━━━━━━━━━━━━━━━━━━━

📱 *REDES SOCIALES* → Febrero $75k/mes → *ANIVERSARIO $50k/mes*
• Contenido + diseños + publicación
• Respuestas + estrategia + reportes

━━━━━━━━━━━━━━━━━━━━━━━━

🤖 *SISTEMA DE GESTIÓN* → Febrero $200k → *ANIVERSARIO $100k*
• Responde como persona real
• Menús de selección
• Analiza pagos/comprobantes
• Recordatorios + notificaciones
• Agenda turnos
• 6 meses ajustes incluidos
• Después: $10k/mes (servidor + mejoras)
• Te mostramos ejemplos

━━━━━━━━━━━━━━━━━━━━━━━━

🎁 *PACK OPCIONAL:* Consultá precio especial.

🎯 Todo orientado a resultados.`,

    `🔥 *PROMO NEXTE - ANIVERSARIO 2025*

📅 *FEBRERO:* $75.000 cada servicio
🎂 *POR ANIVERSARIO HOY:* $50.000 (también mensuales)
🤖 *Sistema:* $100.000 (antes $200.000)

👉 *Elegí lo que necesites, no es combo.*

━━━━━━━━━━━━━━━━━━━━━━━━

🌐 *1. PÁGINA WEB*
Febrero $75k → *ANIVERSARIO $50k*

• Diseño + dominio + hosting + SSL
• 1 año de cambios
• Soporte técnico
• Ejemplos disponibles
• Renovación: solo si hay cambios

━━━━━━━━━━━━━━━━━━━━━━━━

📍 *2. GOOGLE + CAMBIOS WEB*
Febrero $75k → *ANIVERSARIO $50k*

• Analytics + Search Console + Maps
• SEO técnico
• Modificamos tu web actual (Wix/WordPress/código)
• ¿Sin código? Replicamos en 2 días

━━━━━━━━━━━━━━━━━━━━━━━━

📱 *3. REDES SOCIALES*
Febrero $75k/mes → *ANIVERSARIO $50k/mes*

• Contenido + diseños + publicación
• Respuestas + estrategia + reportes

━━━━━━━━━━━━━━━━━━━━━━━━

🤖 *4. SISTEMA DE GESTIÓN AUTOMÁTICO*
Febrero $200k → *ANIVERSARIO $100k*

*Qué hace:*
• Responde como persona
• Menús de selección
• Verifica pagos/comprobantes
• Recordatorios
• Agenda turnos
• Lo que necesites

*Incluye:*
• 6 meses de ajustes
• Después: $10k/mes (servidor + cambios)
• Ejemplos funcionando

━━━━━━━━━━━━━━━━━━━━━━━━

🎁 *PACK OPCIONAL:* Precio especial.

🎯 Convertimos contactos en ventas.`,

    `✨ *SERVICIOS FEBRERO 2025 + DESCUENTO ANIVERSARIO*

📅 *PRECIO FEBRERO:* $75.000
🎂 *POR ANIVERSARIO HOY:* $50.000 (aplica a mensuales)
🤖 *Sistema:* $100.000 (mitad de precio)

👉 *Cada servicio es individual, pack opcional.*

━━━━━━━━━━━━━━━━━━━━━━━━

🌐 *WEB* → $75k → *$50k ANIVERSARIO*
Diseño + dominio + hosting + SSL + cambios 1 año + soporte.
Renovación solo si hay cambios. Te mostramos ejemplos.

━━━━━━━━━━━━━━━━━━━━━━━━

📍 *GOOGLE + MOD. WEB* → $75k → *$50k ANIVERSARIO*
Analytics + Search Console + Maps + SEO.
Cambios en Wix, WordPress o código. Sin código = replicamos en 2 días.

━━━━━━━━━━━━━━━━━━━━━━━━

📱 *REDES* → $75k/mes → *$50k/mes ANIVERSARIO*
Contenido + diseños + publicación + respuestas + reportes.

━━━━━━━━━━━━━━━━━━━━━━━━

🤖 *SISTEMA GESTIÓN* → $200k → *$100k ANIVERSARIO*
• Responde como persona
• Menús de selección
• Analiza pagos
• Recordatorios
• Agenda turnos
• 6 meses ajustes
• Después: $10k/mes
• Ejemplos para ver

━━━━━━━━━━━━━━━━━━━━━━━━

🎁 *PACK:* Precio especial.

🎯 Resultados garantizados.`,

    `🎯 *QUÉ OFRECEMOS - PROMO ANIVERSARIO*

📅 *PRECIO FEBRERO:* $75.000 cada servicio
🎂 *DESCUENTO ANIVERSARIO HOY:* $50.000 (también mensuales)
🤖 *Sistema:* $100.000 (era $200.000)

👉 *Servicios individuales, combo opcional.*

━━━━━━━━━━━━━━━━━━━━━━━━

🌐 *PÁGINA WEB:* $75k → *$50k ANIVERSARIO*
Incluye todo por 1 año (diseño, dominio, hosting, cambios).
Renovación solo si hay modificaciones. Ejemplos disponibles.

📍 *GOOGLE + MEJORAS WEB:* $75k → *$50k ANIVERSARIO*
Analytics, Search Console, Maps, SEO.
Cambios en tu página (Wix, WordPress, código).
Sin código = replicamos en 2 días.

📱 *REDES:* $75k/mes → *$50k/mes ANIVERSARIO*
Contenido, diseños, publicación, respuestas, reportes.

🤖 *SISTEMA AUTOMÁTICO:* $200k → *$100k ANIVERSARIO*
Responde como persona, menús de selección, analiza pagos,
recordatorios, agenda turnos. 6 meses ajustes.
Después: $10k/mes. Te mostramos cómo funciona.

━━━━━━━━━━━━━━━━━━━━━━━━

🎁 *TODO JUNTO (opcional):* Consultá precio especial.

🎯 Objetivo: más clientes para tu negocio.`,

    `💪 *PROMO ANIVERSARIO - NEXTE MARKETING*

📅 *FEBRERO:* $75.000 por servicio
🎂 *ANIVERSARIO HOY:* $50.000 (incluye mensuales)
🤖 *Sistema:* $100.000 (antes $200.000)

👉 *Elegí lo que quieras, pack opcional.*

━━━━━━━━━━━━━━━━━━━━━━━━

🌐 *TU WEB:* $75k → *$50k ANIVERSARIO*
• Diseño + dominio + hosting + SSL
• Cambios ilimitados 1 año
• Soporte incluido
• Ejemplos reales
• Renovación: solo si hay cambios

📍 *GOOGLE:* $75k → *$50k ANIVERSARIO*
• Analytics + Search Console
• Maps + SEO técnico
• Modificamos tu web (Wix/WP/código)
• Sin código = replicamos en 2 días

📱 *REDES:* $75k/mes → *$50k/mes ANIVERSARIO*
• Contenido + diseños
• Publicación + respuestas
• Estrategia + reportes

🤖 *SISTEMA:* $200k → *$100k ANIVERSARIO*
• Responde como persona
• Menús de selección
• Verifica pagos
• Recordatorios
• Agenda turnos
• 6 meses ajustes
• Después: $10k/mes
• Ejemplos disponibles

━━━━━━━━━━━━━━━━━━━━━━━━

🎁 *PACK COMPLETO (opcional):* Precio especial.

🎯 Todo orientado a conseguirte más clientes.`
];

// Bot folders to update
const botFolders = ['bot', 'bot_2', 'bot_3', 'bot_4'];
const baseDir = process.argv[2] || '.';

botFolders.forEach(folder => {
    const filePath = path.join(baseDir, folder, 'services', 'advancedTemplateGenerator.js');

    if (!fs.existsSync(filePath)) {
        console.log(`⚠️ File not found: ${filePath}`);
        return;
    }

    let content = fs.readFileSync(filePath, 'utf8');

    // Find the propuestas array and replace it
    const startMarker = '// MSG 3: PROPUESTAS DE VALOR';
    const endMarker = '// RESPUESTA PARA BOT AUTOMÁTICO';

    const startIdx = content.indexOf(startMarker);
    const endIdx = content.indexOf(endMarker);

    if (startIdx === -1 || endIdx === -1) {
        console.log(`⚠️ Markers not found in: ${filePath}`);
        return;
    }

    // Build new propuestas section
    const escapedPropuestas = newPropuestas.map(p => {
        return JSON.stringify(p);
    });

    const newSection = `// MSG 3: PROPUESTAS DE VALOR - PROMO FEBRERO 2025 + DESCUENTO ANIVERSARIO
        this.propuestas = [
            ${escapedPropuestas.join(',\n\n            ')}
        ];

        `;

    // Replace content
    const newContent = content.substring(0, startIdx) + newSection + content.substring(endIdx);

    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`✅ Updated: ${filePath}`);
});

console.log('\\n🎉 All files updated with ANIVERSARIO discount!');
