/**
 * Script para actualizar los templates de PROPUESTAS (MSG 3) en MongoDB
 * Ejecutar en el VPS: node server/scripts/update-propuestas.js
 */

require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://rascapp:Federyco18@neste.kk5zwkb.mongodb.net/gmaps-leads-scraper?appName=Neste';

// Nuevas propuestas MARZO 2025
const PROPUESTAS_MARZO_2025 = [
    "🎉 *PROMO MARZO 2025*\n\n🏢 *¿QUÉ PODEMOS HACER POR TU NEGOCIO?*\n\nTe lo explico simple, sin palabras raras:\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🌐 *OPCIÓN A: TU PROPIA PÁGINA WEB*\nPrecio: *$75.000* (pagás una vez)\n\n¿Qué es?\nTu propio sitio tipo \"www.tunegocio.com.ar\" donde los clientes ven tus servicios, precios, fotos de tu trabajo, y pueden contactarte.\n\n*¿Qué está incluido?*\n• El diseño completo de la página\n• El nombre de tu página (dominio)\n• El servidor donde funciona (hosting)\n• Candadito verde de seguridad\n• Durante 1 año podés pedirnos todos los cambios que necesites\n• Si algo falla, lo arreglamos\n\n*Después del año:* $25.000 cada 3 meses.\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n📍 *OPCIÓN B: QUE TE ENCUENTREN EN GOOGLE*\nPrecio: *$75.000* (pagás una vez)\n\n¿Qué es?\nHacemos que cuando busquen en Google tu rubro + tu ciudad, aparezcas PRIMERO.\n\n*¿Qué está incluido?*\n• Google Analytics: ver cuánta gente te visita\n• Search Console: ver qué palabras usan para buscarte\n• Google Maps: tu negocio en el mapa con fotos y reseñas\n• SEO Técnico: optimizamos para que Google te posicione arriba\n• Indexación desde el día 1\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n📱 *OPCIÓN C: MANEJO DE REDES SOCIALES*\nPrecio: *$75.000 por mes*\n\n¿Qué es?\nNos encargamos de tus redes para que vos te enfoques en tu negocio.\n\n*¿Qué está incluido?*\n• Creación de contenido (posts, stories, reels)\n• Diseños gráficos profesionales\n• Publicación programada\n• Respuestas a comentarios y mensajes\n• Estrategia mensual\n• Reportes de rendimiento\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🤖 *OPCIÓN D: BOT INTELIGENTE 24/7*\nPrecio: *$200.000* + *$5.000-$10.000/mes*\n\n¿Qué es?\nUn asistente virtual que atiende WhatsApp todo el día. No es un bot tonto - está entrenado con TU información.\n\n*Puede:*\n• Responder consultas de precios, servicios, horarios\n• Agendar turnos automáticamente\n• Verificar comprobantes de pago\n• Guiar al cliente hasta que compre\n• Panel de control para vos\n\n*Incluye:* 6 meses de ajustes gratis.\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🎁 *PACK COMPLETO: $320.000* + mensuales\nTodo junto con $30.000 de ahorro.\n\n🎯 Nuestro foco: que cada persona que te contacte termine siendo cliente.",

    "🚀 *OFERTAS MARZO 2025*\n\n🏢 *¿CÓMO PODEMOS AYUDARTE?*\n\nTe cuento de forma clara:\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🌐 *OPCIÓN A: PÁGINA WEB PROFESIONAL*\nInversión: *$75.000* (un solo pago)\n\nTu sitio propio tipo \"www.tunegocio.com.ar\" para mostrar servicios, precios, trabajos y que te contacten.\n\n*Incluye:*\n• Diseño completo de la web\n• Tu dominio (nombre de la página)\n• Hosting (donde \"vive\" tu web)\n• Certificado de seguridad (candadito verde)\n• Cambios ilimitados durante 1 año\n• Soporte técnico ante problemas\n\n*Renovación:* $25.000 trimestrales después del primer año.\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n📍 *OPCIÓN B: POSICIONAMIENTO EN GOOGLE*\nInversión: *$75.000* (un solo pago)\n\nQue cuando busquen tu rubro + tu ciudad, aparezcas primero.\n\n*Incluye:*\n• Google Analytics: medí cuánta gente te visita\n• Search Console: descubrí qué palabras usan para buscarte\n• Google Maps: tu negocio visible con fotos, horarios y reseñas\n• SEO Técnico: optimizamos para que Google te posicione arriba\n• Indexación inmediata: estás visible desde el día 1\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n📱 *OPCIÓN C: GESTIÓN DE REDES SOCIALES*\nInversión: *$75.000 mensuales*\n\nManejamos tus redes para que vos te enfoques en tu negocio.\n\n*Incluye:*\n• Creación de contenido (posts, stories, reels)\n• Diseños gráficos profesionales\n• Publicación programada\n• Respuestas a comentarios y mensajes\n• Estrategia mensual de contenido\n• Informes de rendimiento\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🤖 *OPCIÓN D: BOT INTELIGENTE 24/7*\nInversión: *$200.000* + *$5.000-$10.000/mes*\n\nAsistente virtual que atiende WhatsApp todo el día. No es un bot tonto - está entrenado con TU información.\n\n*Puede:*\n• Responder consultas de precios, servicios, horarios\n• Agendar turnos automáticamente\n• Verificar comprobantes de pago\n• Guiar al cliente hasta que compre\n• Panel de control para vos\n\n*Incluye:* 6 meses de ajustes gratis.\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🎁 *PACK COMPLETO*\nInversión: *$320.000* + mensuales\nTodo junto con $30.000 de ahorro.\n\n🎯 Nuestro foco: que cada persona que te contacte termine siendo cliente.",

    "💥 *OPORTUNIDAD MARZO 2025*\n\n🏢 *NUESTROS SERVICIOS EXPLICADOS SIMPLE:*\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🌐 *A) TU WEB PROPIA*\n*$75.000* (pago único)\n\nTu página \"www.tunegocio.com.ar\" donde mostrás todo lo que hacés.\n\n*Tenés:*\n• Diseño profesional\n• Dominio incluido\n• Hosting incluido\n• Seguridad SSL\n• Cambios gratis por 1 año\n• Soporte técnico\n\n*Después:* $25.000/trimestre.\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n📍 *B) APARECER EN GOOGLE*\n*$75.000* (pago único)\n\nQue te encuentren cuando busquen tu rubro en tu zona.\n\n*Tenés:*\n• Google Analytics (ver visitas)\n• Search Console (ver búsquedas)\n• Google Maps optimizado\n• SEO Técnico completo\n• Indexación desde el día 1\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n📱 *C) REDES SOCIALES*\n*$75.000/mes*\n\nNos encargamos de tus redes.\n\n*Tenés:*\n• Contenido (posts, stories, reels)\n• Diseños gráficos\n• Publicación programada\n• Respuestas a mensajes\n• Estrategia mensual\n• Reportes\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🤖 *D) BOT CON INTELIGENCIA ARTIFICIAL*\n*$200.000* + *$5.000-$10.000/mes*\n\nAsistente que atiende WhatsApp 24hs como si fueras vos.\n\n*Puede:*\n• Responder consultas automáticamente\n• Agendar turnos\n• Validar comprobantes de pago\n• Guiar hasta la compra\n• Panel de control incluido\n\n*Incluye:* 6 meses de ajustes.\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🎁 *TODO JUNTO: $320.000* + mensuales\nAhorrás $30.000.\n\n🎯 Hacemos que más gente que te contacte se convierta en cliente.",

    "⚡ *MARZO 2025 - SERVICIOS NEXTE*\n\nTe cuento qué podemos hacer por tu negocio:\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🌐 *WEB PROFESIONAL* → *$75.000*\n\nTu sitio www.tunegocio.com.ar con todo incluido por 1 año:\n• Diseño + dominio + hosting + SSL\n• Cambios ilimitados\n• Soporte técnico\n\nRenovación: $25.000 cada 3 meses.\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n📍 *GOOGLE + SEO* → *$75.000*\n\nQue aparezcas cuando busquen tu rubro:\n• Analytics + Search Console\n• Google Maps optimizado\n• SEO Técnico\n• Indexación inmediata\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n📱 *REDES SOCIALES* → *$75.000/mes*\n\nManejamos tus redes:\n• Contenido + diseños\n• Publicación + respuestas\n• Estrategia mensual\n• Reportes\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🤖 *BOT INTELIGENTE* → *$200.000* + servidor\n\nAsistente 24hs en WhatsApp:\n• Responde como vos\n• Agenda turnos\n• Valida pagos\n• Panel de control\n\nIncluye 6 meses de ajustes.\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🎁 *COMBO TOTAL: $320.000* + mensuales\nAhorro de $30.000.\n\n🎯 Todo pensado para convertir contactos en clientes.",

    "🔥 *PROMO NEXTE - MARZO 2025*\n\nServicios para digitalizar tu negocio:\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🌐 *1. PÁGINA WEB*\nPrecio: *$75.000* (una vez)\n\nTu sitio propio con dominio, hosting, diseño, cambios por 1 año y soporte incluido.\n\nDespués del año: $25.000/trimestre.\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n📍 *2. POSICIONAMIENTO GOOGLE*\nPrecio: *$75.000* (una vez)\n\nAnalytics, Search Console, Maps, SEO técnico e indexación inmediata.\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n📱 *3. REDES SOCIALES*\nPrecio: *$75.000/mes*\n\nContenido, diseños, publicación, respuestas, estrategia y reportes.\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🤖 *4. BOT INTELIGENTE*\nPrecio: *$200.000* + servidor mensual\n\nAtiende WhatsApp 24hs, agenda turnos, valida pagos. Incluye 6 meses de ajustes.\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🎁 *PACK COMPLETO: $320.000*\nTodo junto con $30k de descuento.\n\n🎯 Nuestro objetivo: que cada contacto se convierta en venta.",

    "✨ *SERVICIOS MARZO 2025*\n\nTe cuento nuestras opciones:\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🌐 *WEB COMPLETA* → *$75.000*\nDiseño + dominio + hosting + cambios x1 año + soporte.\nRenovación: $25.000/trimestre.\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n📍 *GOOGLE + SEO* → *$75.000*\nAnalytics + Search Console + Maps + SEO + indexación.\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n📱 *REDES SOCIALES* → *$75.000/mes*\nContenido + diseños + publicación + respuestas + reportes.\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🤖 *BOT INTELIGENTE* → *$200.000 + servidor*\nAsistente 24hs que atiende, agenda y valida pagos. 6 meses de ajustes incluidos.\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🎁 *COMBO: $320.000* + mensuales (ahorrás $30k)\n\n🎯 Convertimos contactos en clientes.",

    "🎯 *QUÉ OFRECEMOS - MARZO 2025*\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🌐 *PÁGINA WEB:* $75.000\nTodo incluido por 1 año (diseño, dominio, hosting, cambios, soporte).\nDespués: $25.000/trimestre.\n\n📍 *GOOGLE + SEO:* $75.000\nAnalytics, Search Console, Maps, SEO técnico, indexación.\n\n📱 *REDES:* $75.000/mes\nContenido, diseños, publicación, respuestas, reportes.\n\n🤖 *BOT IA:* $200.000 + $5k-$10k/mes\nAsistente 24hs, agenda turnos, valida pagos. 6 meses de ajustes.\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🎁 *TODO JUNTO:* $320.000 + mensuales\nAhorrás $30.000.\n\n🎯 Objetivo: que más gente que te contacte se convierta en cliente.",

    "💪 *PROMO MARZO - NEXTE MARKETING*\n\nEsto es lo que hacemos:\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🌐 *TU WEB:* $75.000\n• Diseño + dominio + hosting + SSL\n• Cambios ilimitados 1 año\n• Soporte incluido\n• Renovación: $25k/trimestre\n\n📍 *GOOGLE:* $75.000\n• Analytics + Search Console\n• Maps + SEO técnico\n• Indexación inmediata\n\n📱 *REDES:* $75.000/mes\n• Contenido + diseños\n• Publicación + respuestas\n• Estrategia + reportes\n\n🤖 *BOT IA:* $200.000 + servidor\n• Atiende 24hs\n• Agenda turnos\n• Valida pagos\n• 6 meses de ajustes\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🎁 *PACK COMPLETO:* $320.000 (-$30k)\n\n🎯 Todo orientado a conseguirte más clientes.",

    "🌟 *MARZO 2025 - OFERTAS NEXTE*\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n*A) WEB PROFESIONAL* → $75.000\nDiseño, dominio, hosting, seguridad, cambios x1 año, soporte.\nRenovación: $25.000/trimestre.\n\n*B) GOOGLE + SEO* → $75.000\nAnalytics, Search Console, Maps, SEO, indexación día 1.\n\n*C) REDES SOCIALES* → $75.000/mes\nContenido, diseños, publicación, respuestas, reportes.\n\n*D) BOT INTELIGENTE* → $200.000 + servidor\nWhatsApp 24hs, turnos, validación de pagos, panel. 6 meses de ajustes.\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🎁 *COMBO: $320.000* + mensuales\nAhorro de $30.000.\n\n🎯 Todo para convertir contactos en ventas.",

    "🏆 *SERVICIOS NEXTE - PROMO MARZO*\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🌐 *WEB:* $75.000 (1 pago)\nIncluye: diseño, dominio, hosting, SSL, cambios 1 año, soporte.\nRenovación: $25k cada 3 meses.\n\n📍 *GOOGLE:* $75.000 (1 pago)\nIncluye: Analytics, Search Console, Maps, SEO, indexación.\n\n📱 *REDES:* $75.000/mes\nIncluye: contenido, diseños, publicación, respuestas, reportes.\n\n🤖 *BOT:* $200.000 + servidor mensual\nIncluye: atención 24hs, turnos, validación pagos, panel. 6 meses de ajustes.\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🎁 *PACK:* $320.000 + mensuales (-$30k)\n\n🎯 Foco en resultados: más clientes para vos."
];

async function updatePropuestas() {
    try {
        console.log('🔌 Conectando a MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Conectado a MongoDB');

        // Definir el modelo inline
        const TemplateVariantSchema = new mongoose.Schema({
            category: { type: String, required: true, unique: true },
            variants: [{
                content: { type: String, required: true },
                isActive: { type: Boolean, default: true }
            }]
        }, { timestamps: true });

        const TemplateVariant = mongoose.model('TemplateVariant', TemplateVariantSchema);

        // Buscar el template de propuestas
        console.log('🔍 Buscando template "propuestas"...');
        const existing = await TemplateVariant.findOne({ category: 'propuestas' });

        if (existing) {
            console.log(`📝 Template encontrado con ${existing.variants.length} variantes`);
            console.log('🔄 Actualizando variantes...');

            existing.variants = PROPUESTAS_MARZO_2025.map(content => ({
                content,
                isActive: true
            }));

            await existing.save();
            console.log(`✅ Template actualizado con ${PROPUESTAS_MARZO_2025.length} nuevas variantes`);
        } else {
            console.log('📝 Template no existe, creando nuevo...');
            await TemplateVariant.create({
                category: 'propuestas',
                variants: PROPUESTAS_MARZO_2025.map(content => ({
                    content,
                    isActive: true
                }))
            });
            console.log(`✅ Template creado con ${PROPUESTAS_MARZO_2025.length} variantes`);
        }

        // Verificar
        const updated = await TemplateVariant.findOne({ category: 'propuestas' });
        console.log('\n📋 Verificación:');
        console.log(`   Categoría: ${updated.category}`);
        console.log(`   Variantes: ${updated.variants.length}`);
        console.log(`   Primera variante (preview): ${updated.variants[0].content.substring(0, 100)}...`);
        console.log(`   ¿Contiene "$75.000"? ${updated.variants[0].content.includes('$75.000') ? '✅ SÍ' : '❌ NO'}`);

        await mongoose.disconnect();
        console.log('\n✅ Script completado. Reiniciá el bot para que tome los cambios.');

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

updatePropuestas();
