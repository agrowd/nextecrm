const axios = require('axios');

class AdvancedTemplateGenerator {
    constructor() {
        this.backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
        // ============ PARTES COMBINABLES ============

        // SALUDOS (30 variantes) - Consistentes con identidad
        this.saludos = [
            "¡Hola {nombre}! Soy Juan Cruz de Nexte Marketing.",
            "¡Buen día {nombre}! Te saluda Juan Cruz de Nexte Marketing.",
            "¡Buenas tardes {nombre}! Soy Juan Cruz, de Nexte Marketing.",
            "Hola {nombre}, ¿cómo estás? Soy Juan Cruz de Nexte Marketing.",
            "¡Hola! Te habla Juan Cruz, de Nexte Marketing.",
            "¡Qué tal {nombre}! Soy Juan Cruz de Nexte Marketing.",
            "¡Hola {nombre}! Juan Cruz de Nexte Marketing por acá.",
            "Buenas {nombre}! Te escribe Juan Cruz de Nexte Marketing.",
            "¡Hola {nombre}! Te contacta Juan Cruz desde Nexte Marketing.",
            "¡Hola! Soy Juan Cruz de Nexte Marketing, vi tu negocio.",
            "¡Buen día! Soy Juan Cruz, director de Nexte Marketing.",
            "Hey {nombre}! Soy Juan Cruz de Nexte Marketing.",
            "Hola {nombre}! Te saluda Juan Cruz de Nexte Marketing.",
            "¡Hola! Soy Juan Cruz de Nexte Marketing.",
            "¡Hola {nombre}! Soy Juan Cruz de Nexte Marketing, te molesto un segundo.",
            "Buen día {nombre}, soy Juan Cruz de Nexte Marketing.",
            "¡Hola! Soy Juan Cruz de Nexte Marketing, ¿me das un minuto?",
            "¡Hola {nombre}! Soy Juan Cruz de Nexte Marketing.",
            "Hola, ¿hablo con {nombre}? Soy Juan Cruz de Nexte Marketing.",
            "¡Buenas! Te escribe Juan Cruz de Nexte Marketing.",
            "¡Hola {nombre}! Juan Cruz de Nexte Marketing saludando.",
            "Buen día! Soy Juan Cruz de Nexte Marketing.",
            "¡Hola! ¿Sos {nombre}? Soy Juan Cruz de Nexte Marketing.",
            "¡Hola {nombre}! Soy Juan Cruz de Nexte Marketing.",
            "Buenas tardes {nombre}! Te habla Juan Cruz de Nexte Marketing.",
            "¡Hola! Soy Juan Cruz de Nexte Marketing.",
            "¡Holaa {nombre}! Soy Juan Cruz de Nexte Marketing.",
            "¡Hola {nombre}! Un gusto, soy Juan Cruz de Nexte Marketing.",
            "¡Hola! Soy Juan Cruz de Nexte Marketing.",
            "Buen día {nombre}! Soy Juan Cruz de Nexte Marketing."
        ];

        // INTROS DE NEGOCIO (30 variantes)
        this.introsNegocio = [
            "Vi {negocio} en Google Maps y me llamó la atención.",
            "Encontré {negocio} buscando negocios en {ubicacion}.",
            "Estaba viendo {negocio} en Maps y quise contactarte.",
            "Me topé con {negocio} en internet y me pareció interesante.",
            "Vi que {negocio} tiene buenas reseñas en Google.",
            "Noté que {negocio} aparece en Maps pero sin web.",
            "Encontré {negocio} y vi que tienen muy buena puntuación.",
            "Vi tu perfil de {negocio} en Google Maps.",
            "Me crucé con {negocio} buscando en {ubicacion}.",
            "Vi {negocio} destacado en Google Maps.",
            "Estuve revisando negocios en {ubicacion} y vi {negocio}.",
            "Tu negocio {negocio} me llamó la atención.",
            "Vi que {negocio} tiene buenas reviews pero pocas.",
            "Encontré {negocio} y noté que no tienen presencia web.",
            "Me interesó {negocio} por las buenas reseñas.",
            "Vi tu ficha de {negocio} en Google.",
            "Me crucé con {negocio} investigando el rubro.",
            "Vi que {negocio} está bien posicionado en Maps.",
            "Tu negocio salió en mi búsqueda de {ubicacion}.",
            "Vi {negocio} y pensé que podrían necesitar algo.",
            "Encontré {negocio} y me pareció que tenían potencial.",
            "Noté que {negocio} tiene varias reseñas positivas.",
            "Vi tu local {negocio} en internet.",
            "Me apareció {negocio} buscando en la zona.",
            "Vi el perfil de {negocio} y quise contactarte.",
            "Encontré {negocio} online y me interesó.",
            "Vi que tenés {negocio} y me pareció que podíamos hablar.",
            "Tu negocio apareció en mi investigación de mercado.",
            "Vi {negocio} en Maps con muy buena puntuación.",
            "Estuve viendo el rubro y me topé con {negocio}."
        ];

        // HOOKS GENERALES Y SEGUROS (30 variantes) - Libres de asunciones del scraper
        this.hooksGenerales = [
            "Vi su ficha y veo mucho potencial para aumentar el volumen de clientes que les escriben directo.",
            "Noté que tienen excelentes reseñas. Con algunas mejoras, podrían captar el doble de consultas desde internet.",
            "Estaba buscando negocios de su rubro en {ubicacion} y me pareció que se le puede sacar mucho más provecho a su presencia digital.",
            "Vi su negocio destacado en Maps. Hay detalles técnicos simples que los ayudarían a aparecer primeros en las búsquedas locales.",
            "Noté que tienen muy buena reputación online, lo cual es la base ideal para automatizar el ingreso de nuevos clientes.",
            "Revisando perfiles de la zona, veo oportunidades claras para optimizar sus canales de contacto y cerrar más ventas.",
            "¿Han pensado en implementar un sistema que responda consultas automáticas por WhatsApp las 24 horas?",
            "Vi su perfil de Maps. Hoy en día, una estrategia digital bien pulida puede triplicar los contactos diarios que reciben.",
            "Tienen muy buena presencia en Maps, pero veo que la competencia en su rubro se está posicionando fuerte.",
            "¿Sabían que con un sistema automatizado de turnos o reservas pueden reducir a cero las consultas perdidas?",
            "Me llamó la atención su negocio. Con un par de integraciones simples podrían liberar tiempo de chat y agendar en automático.",
            "Estaba viendo su ficha de Google. Optimizando la conversión digital pueden multiplicar sus resultados actuales.",
            "Noté que tienen buena reputación en {ubicacion}, lo cual es la base ideal para lanzar un embudo de ventas que funcione solo.",
            "Vi su negocio en internet. Creo que con una landing enfocada a ventas y automatización de chat podrían escalar rápido.",
            "Estaba analizando el mercado local y noté que su ficha tiene todo para liderar las búsquedas del rubro en la zona.",
            "¿Cómo manejan actualmente las consultas fuera de horario? Un asistente digital podría estar atendiendo y agendando por ustedes.",
            "Vi su perfil y me pareció interesante. Sumarle un sitio profesional con SEO local los pondría muy por encima de la competencia.",
            "Revisando su ficha en Google Maps, noté que se le pueden aplicar un par de mejoras para duplicar las llamadas directas.",
            "Tienen un perfil muy sólido, pero veo que podrían aprovechar mucho más la demanda que hoy ya busca sus servicios en Google.",
            "¿Están conformes con la cantidad de clientes que les llegan a través de internet hoy en día?",
            "Vi su negocio online. Quería comentarte una forma sencilla de automatizar las preguntas frecuentes para no perder ninguna venta.",
            "Estaba analizando negocios del rubro y veo que su marca tiene el perfil perfecto para automatizar el agendamiento.",
            "Con unas optimizaciones en su canal de WhatsApp y Google, podrían convertir muchas más visitas en clientes reales.",
            "Vi su negocio destacado en Maps y quise escribirte. Hay formas sencillas de digitalizar el negocio para ahorrar horas de trabajo.",
            "¿Tienen algún sistema automático para recordarle turnos a sus clientes? Reduce un 40% las ausencias.",
            "Noté su buen posicionamiento local. Es el momento perfecto para consolidar su presencia con herramientas digitales profesionales.",
            "Vi su perfil y pensé que podríamos charlar sobre cómo captar más consultas directas sin depender del boca a boca.",
            "Tienen excelentes valoraciones. Sumarles automatización y un embudo web haría que el negocio crezca de forma predecible.",
            "Estaba revisando su rubro en {ubicacion} y noté oportunidades clave de optimización que hoy sus competidores están ignorando.",
            "Vi su ficha comercial y quería presentarte una propuesta simple para digitalizar procesos y aumentar la facturación."
        ];

        // HOOKS GENÉRICOS (Fallback)
        this.hooks = this.hooksGenerales;

        // PRESENTACIONES NEXTE (30 variantes)
        // PRESENTACIONES DE NEXTE - DATOS REALES (Based on nextemarketing.com)
        this.presentaciones = [
            "Desde 2015, en Nexte nos enfocamos en el crecimiento real: +300% en conversiones promedio para nuestros clientes.",
            "En Nexte no somos una fábrica de clientes. Trabajamos 1 a 1 para entender tu negocio y mejorarlo.",
            "Nos especializamos en CRO (Optimización de Conversiones). No solo traemos visitas, hacemos que compren.",
            "Nexte tiene 10 años de trayectoria (2015-2025) ayudando a negocios a digitalizarse de verdad.",
            "Somos tu socio estratégico. Analizamos tu competencia y audiencia para darte un plan único, no recetas genéricas.",
            "En Nexte combinamos tecnología y estrategia para crear sistemas de venta que funcionan 24/7.",
            "No hacemos solo webs bonitas. Creamos herramientas de venta enfocadas en resultados rápidos y medibles.",
            "Nuestro enfoque 1 a 1 garantiza que tu negocio tenga la atención personalizada que necesita para crecer.",
            "Auditamos, implementamos y optimizamos. En Nexte nos obsesiona que recuperes tu inversión con ventas.",
            "Somos expertos en transformar negocios locales en referentes digitales con estrategias de alto impacto.",
            "Nexte Marketing es sinónimo de crecimiento medible. Te mostramos los números claros, sin vueltas.",
            "Con un stack técnico completo, resolvemos desde el diseño web hasta la automatización de tus ventas.",
            "Ayudamos a emprendedores y PYMEs a competir con los grandes usando las mismas herramientas.",
            "En Nexte nos enfocamos en resultados visibles desde la primera semana de implementación.",
            "Somos especialistas en captar la demanda real que hoy ya busca tus servicios en Google.",
            "Más que una agencia, somos tu departamento de marketing externo. Nos ocupamos de todo.",
            "En Nexte usamos datos, no intuición. Cada decisión se basa en mejorar tus conversiones.",
            "Llevamos una década perfeccionando el método para que negocios como el tuyo vendan más online.",
            "Hacemos que tu marca transmita confianza y profesionalismo desde el primer clic.",
            "En Nexte no atamos clientes con contratos, los fidelizamos con resultados constantes.",
            "Somos expertos en Google Ads y Meta Ads, certificados para maximizar cada peso de tu inversión.",
            "Nexte transforma tu presencia digital en un canal de ventas predecible y escalable.",
            "Analizamos tu negocio a fondo para detectar dónde estás perdiendo ventas y corregirlo.",
            "En Nexte creemos en el trato humano. Vas a hablar con expertos, no con máquinas.",
            "Somos la agencia que eligen quienes quieren dejar de depender del 'boca a boca'.",
            "Nexte te ofrece soluciones de calidad internacional adaptadas al mercado local.",
            "Optimizamos cada punto de contacto digital para que tus clientes tengan una experiencia 10 puntos.",
            "En Nexte marketing es inversión, no gasto. Todo está orientado a tu retorno (ROI).",
            "Llevamos tu negocio al siguiente nivel con auditorías profundas y ejecución impecable.",
            "Nexte es transparencia y resultados reales. Trabajamos 1 a 1 para hacer crecer tu facturación."
        ];

        this.propuestas = [
            "🍂 *PROMO OTOÑO - NEXTE 2026*\n\n🏢 *¿CÓMO PODEMOS IMPULSAR TU NEGOCIO?*\n\nTe lo explico simple, sin palabras raras:\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🌐 *OPCIÓN A: PÁGINA WEB PROFESIONAL*\nPrecio de lista: *$500.000* → 🔥 *$250.000 en 2 pagos antes del próximo sábado* (hasta las 21hs)\n\n¿Qué es? \nTu propio sitio profesional donde los clientes ven tus servicios, precios, fotos de tu trabajo y te contactan fácil.\n\n*¿Qué está incluido?*\n• Diseño completo hecho a tu medida\n• Tu dirección web propia (.com / .com.ar)\n• Servidor de alojamiento (hosting) por 1 año\n• Certificado de seguridad SSL (candado verde)\n• Modificaciones y cambios incluidos por 12 meses\n• Soporte técnico permanente ante cualquier falla\n\n*Mantenimiento posterior:* $25.000 cada 3 meses.\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🛒 *OPCIÓN B: TIENDA ONLINE / E-COMMERCE*\nPrecio de lista: *$800.000* → 🔥 *$500.000 antes del próximo sábado* (hasta las 21hs)\n\n¿Qué es?\nTu plataforma de ventas propia con carrito de compras, catálogo autogestionable y pasarela de pagos integrada.\n\n*¿Qué está incluido?*\n• Carga del catálogo inicial de productos\n• Configuración de Mercado Pago o transferencia bancaria\n• Sistema de gestión de stock y pedidos\n• Diseño óptimo para celulares\n• Cupones de descuento y calculador de envíos\n• Capacitación para que administres tus ventas\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n📍 *OPCIÓN C: QUE TE ENCUENTREN EN GOOGLE*\nPrecio de lista: *$300.000* → 🔥 *$150.000 antes del próximo sábado* (hasta las 21hs)\n\n¿Qué es?\nHacemos que cuando alguien busque en Google lo que vos vendés en tu zona, tu negocio aparezca PRIMERO.\n\n*¿Qué está incluido?*\n• Ficha de Google Maps/My Business 100% optimizada para llamadas directas\n• Google Analytics y Search Console configurados para medir visitas\n• SEO Técnico Local: Te indexamos rápido para que estés visible desde el día 1\n• Optimización para aparecer arriba de tu competencia\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n📱 *OPCIÓN D: MANEJO DE REDES SOCIALES*\nPrecio de lista: *$180.000/mes* → 🔥 *$100.000/mes antes del próximo sábado* (hasta las 21hs)\n\n¿Qué es?\nEquipo de diseñadores y redactores profesionales manejando tus redes comerciales:\n\n*¿Qué está incluido?*\n• Producción de contenido multimedia (posteos, historias, reels)\n• Identidad visual y diseño gráfico premium\n• Calendario editorial programado en los mejores horarios\n• Moderación activa de comentarios y mensajes de clientes\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🤖 *OPCIÓN E: GESTIÓN COMERCIAL + BOT IA*\nPrecio de lista: *$200.000* → 🔥 *$100.000 antes del próximo sábado* (hasta las 21hs)\n*+ $5.000 a $10.000/mes de servidor*\n\n¿Qué es?\nSoftware completo para administrar tu negocio integrado con un asistente inteligente en WhatsApp.\n\n*📊 Panel de Control:*\n• CRM completo para registrar clientes, ventas y turnos organizados\n\n*🤖 Asistente Virtual por WhatsApp:*\nEmpleado virtual que conversa con tus clientes de manera humana porque lo entrenamos con tus datos.\n• Toma turnos y agenda directo en tu calendario 24/7\n• Valida y procesa comprobantes de pago (visión artificial)\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n📣 *OPCIÓN F: PUBLICIDAD DIGITAL (ADS)*\nPrecio de lista: *$280.000/mes* → 🔥 *$180.000/mes antes del próximo sábado* (hasta las 21hs)\n*+ Presupuesto de inversión en anuncios aparte*\n\n¿Qué es?\nCampañas publicitarias profesionales en Google Ads y Meta Ads (Facebook/Instagram) enfocadas exclusivamente en retorno de inversión rápido.\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n⚙️ *SISTEMAS Y SOFTWARE A MEDIDA*\nDesarrollamos soluciones a medida según las necesidades exactas de tu negocio: sistemas de turnos y agendas para clínicas y estéticas, control de stock y facturación para ferreterías y locales comerciales, integraciones de CRMs propios. Presupuesto personalizado 100% adaptado.\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🎁 *COMBO COMPLETO OTOÑO*\nPrecio de lista: *$950.000* → 🔥 *$420.000 antes del próximo sábado* (hasta las 21hs)\n*Ahorro gigante de $530.000 sobre precio de lista.* Llevate Web + Google SEO/Maps + Redes + Bot IA.\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n⏰ *Los descuentos de otoño son válidos hasta el próximo sábado a las 21 hrs.*\n\n💬 *¡Escribime y te paso ejemplos de sitios web reales que ya diseñamos para otros negocios para que veas cómo quedan!*",

            "🚀 *ESPECIAL OTOÑO NEXTE 2026*\n\n💼 *¿Cómo puedo ayudarte a crecer?*\n\nTe cuento nuestros servicios de forma simple:\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🌐 *OPCIÓN A: PÁGINA WEB PROFESIONAL*\nInversión regular: *$500.000* → 💥 *$250.000 en 2 pagos antes del próximo sábado* (hasta las 21hs)\n\n¿De qué se trata?\nTu propio sitio web donde mostrar todo lo que ofrecés, tus trabajos, precios y forma de contacto.\n• Diseño hecho a tu medida y adaptado a celulares\n• Dominio propio (.com / .ar) y hosting por 1 año\n• Certificado SSL de seguridad\n• Cambios ilimitados durante el primer año\n\n*Renovación posterior:* $25.000 trimestrales.\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🛒 *OPCIÓN B: TIENDA ONLINE / E-COMMERCE*\nInversión regular: *$800.000* → 💥 *$500.000 antes del próximo sábado* (hasta las 21hs)\n\n¿De qué se trata?\nPlataforma de ventas con catálogo, carrito y pagos integrados (Mercado Pago, transferencia).\n• Carga inicial de productos, control de stock y cupones\n• Capacitación para que administres tus ventas de forma simple\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n📍 *OPCIÓN C: POSICIONAMIENTO EN GOOGLE*\nInversión regular: *$300.000* → 💥 *$150.000 antes del próximo sábado* (hasta las 21hs)\n\n¿De qué se trata?\nQue cuando busquen en Google tu rubro en tu ciudad, aparezcas primero en los mapas y búsquedas.\n• Ficha de Google Maps/My Business 100% optimizada\n• Analytics y SEO Técnico para que Google te prefiera y te muestre arriba\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n📱 *OPCIÓN D: GESTIÓN DE REDES SOCIALES*\nInversión regular: *$180.000/mes* → 💥 *$100.000/mes antes del próximo sábado* (hasta las 21hs)\n\n¿De qué se trata?\nNos encargamos de tus redes para que vos no tengas que preocuparte:\n• Contenido diario (posts, stories, reels) diseñado profesionalmente\n• Atención y moderación activa de comentarios y mensajes de clientes\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🤖 *OPCIÓN E: PLATAFORMA DE GESTIÓN CON BOT IA*\nInversión regular: *$200.000* → 💥 *$100.000 antes del próximo sábado* (hasta las 21hs)\n*+ $5.000 a $10.000/mes de servidor*\n\n¿De qué se trata?\nPanel centralizado para administrar tu agenda, clientes y ventas, integrado con un bot conversacional inteligente para WhatsApp que atiende consultas 24/7 y agenda solo.\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n📣 *OPCIÓN F: PUBLICIDAD DIGITAL (ADS)*\nInversión regular: *$280.000/mes* → 💥 *$180.000/mes antes del próximo sábado* (hasta las 21hs)\n*+ Presupuesto de anuncios aparte*\n\n¿De qué se trata?\nCampañas en Google y Meta Ads enfocadas al 100% en retorno rápido de inversión.\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n⚙️ *SISTEMAS Y SOFTWARE A MEDIDA*\nDesarrollamos soluciones a medida según las necesidades exactas de tu negocio: sistemas de turnos y agendas para clínicas y estéticas, control de stock y facturación para ferreterías y locales comerciales, integraciones de CRMs propios. Presupuesto personalizado 100% adaptado.\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🎁 *PAQUETE COMPLETO OTOÑO*\nInversión regular: *$950.000* → 💥 *$420.000 antes del próximo sábado* (hasta las 21hs)\n*Ahorrás $530.000 contratando todo junto sobre el precio de lista.* Web + Google Maps + Redes + Bot IA.\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n⏰ *Condición: Descuento por otoño válido hasta el próximo sábado a las 21 hrs.*\n\n💬 *¡Escribime y te paso ejemplos de sitios web reales que ya diseñamos para otros negocios para que veas cómo quedan!*",

            "🔥 *OFERTAS DE OTOÑO - NEXTE*\n\n🏢 *Servicios para hacer crecer tu negocio*\n\nSin tecnicismos, acá va:\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🌐 *OPCIÓN A: SITIO WEB COMPLETO*\nValor regular: *$500.000* → ⚡ *$250.000 en 2 pagos antes del próximo sábado* (hasta las 21hs)\n\n¿Qué te damos?\nUn sitio web completo a tu medida. Incluye dominio propio (.com / .ar), alojamiento en la nube (hosting), seguridad SSL, cambios gratis por 1 año y soporte completo.\n• Costo a partir del año 2: $25.000 trimestrales.\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🛒 *OPCIÓN B: TIENDA ONLINE / E-COMMERCE*\nValor regular: *$800.000* → ⚡ *$500.000 antes del próximo sábado* (hasta las 21hs)\n\n¿Qué te damos?\nPlataforma propia con carrito, stock, cupones y pasarelas de pago (Mercado Pago, transferencia). Capacitación de uso incluida.\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n📍 *OPCIÓN C: APARECER EN GOOGLE*\nValor regular: *$300.000* → ⚡ *$150.000 antes del próximo sábado* (hasta las 21hs)\n\n¿Qué te damos?\nConfiguramos y optimizamos tu ficha de Google Maps y SEO técnico local para que salgas primero cuando busquen tu rubro en tu zona.\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n📱 *OPCIÓN D: ADMINISTRACIÓN DE REDES*\nValor regular: *$180.000/mes* → ⚡ *$100.000/mes antes del próximo sábado* (hasta las 21hs)\n\n¿Qué te damos?\nManejamos tu Instagram, Facebook y TikTok: producción de contenido, diseño gráfico, publicaciones y respuesta a mensajes.\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🤖 *OPCIÓN E: PLATAFORMA + ASISTENTE VIRTUAL*\nValor regular: *$200.000* → ⚡ *$100.000 antes del próximo sábado* (hasta las 21hs)\n*+ $5.000-$10.000/mes de servidor*\n\n¿Qué te damos?\nSistema de administración (turnos, clientes, ventas) más un bot asistente en WhatsApp con IA entrenado con tus datos que agenda y procesa pagos solo.\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n📣 *OPCIÓN F: CAMPAÑAS DE PUBLICIDAD (ADS)*\nValor regular: *$280.000/mes* → ⚡ *$180.000/mes antes del próximo sábado* (hasta las 21hs)\n*+ Presupuesto de anuncios aparte*\n\n¿Qué te damos?\nGestión profesional de campañas en Google Ads y Meta Ads para retorno inmediato de inversión.\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n⚙️ *SISTEMAS Y SOFTWARE A MEDIDA*\nDesarrollamos soluciones a medida según las necesidades exactas de tu negocio: sistemas de turnos y agendas para clínicas y estéticas, control de stock y facturación para ferreterías y locales comerciales, integraciones de CRMs propios. Presupuesto personalizado 100% adaptado.\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🎁 *PACK TOTAL OTOÑO*\nValor regular: *$950.000* → ⚡ *$420.000 antes del próximo sábado* (hasta las 21hs)\n*Ahorrás $530.000 sobre el precio de lista.* Todo incluido: Web + Google SEO/Maps + Redes + Bot IA.\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n⏰ *Condición: Los precios rebajados son válidos hasta el próximo sábado a las 21 hrs.*\n\n💬 *¡Escribime y te paso ejemplos de sitios web reales que ya diseñamos para otros negocios para que veas cómo quedan!*",

            "🍂 *PROMO OTOÑO - OTOÑO NEXTE*\n\n🏢 *¿Qué necesita tu negocio para crecer?*\n\nTe explico cada servicio sin vueltas:\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🌐 *SERVICIO 1: WEB PROFESIONAL*\nPrecio lista: *$500.000* → 🎯 *$250.000 en 2 pagos antes del próximo sábado* (hasta las 21hs)\n• Diseño a medida, dominio, hosting, certificado SSL y cambios ilimitados x 1 año.\n• Post primer año: $25.000 cada 3 meses.\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🛒 *SERVICIO 2: E-COMMERCE / TIENDA*\nPrecio lista: *$800.000* → 🎯 *$500.000 antes del próximo sábado* (hasta las 21hs)\n• Carrito de compras, catálogo autogestionable, stock, pagos y envíos configurados.\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n📍 *SERVICIO 3: VISIBILIDAD GOOGLE*\nPrecio lista: *$300.000* → 🎯 *$150.000 antes del próximo sábado* (hasta las 21hs)\n• Alta y optimización de Google Maps y SEO técnico local para liderar las búsquedas de tu zona.\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n📱 *SERVICIO 4: COMMUNITY MANAGEMENT*\nPrecio lista: *$180.000/mes* → 🎯 *$100.000/mes antes del próximo sábado* (hasta las 21hs)\n• Generación de contenido original, diseño premium, moderación y respuestas activas.\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🤖 *SERVICIO 5: ECOSISTEMA + BOT IA*\nPrecio lista: *$200.000* → 🎯 *$100.000 antes del próximo sábado* (hasta las 21hs)\n*+ $5.000 a $10.000 mensuales de infraestructura*\n• CRM de gestión comercial más bot conversacional en WhatsApp entrenado con tu información.\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n📣 *SERVICIO 6: PUBLICIDAD DIGITAL (ADS)*\nPrecio lista: *$280.000/mes* → 🎯 *$180.000/mes antes del próximo sábado* (hasta las 21hs)\n*+ Presupuesto de anuncios aparte*\n• Campañas en Google y Meta Ads enfocadas en conversiones reales y retorno rápido.\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n⚙️ *SISTEMAS Y SOFTWARE A MEDIDA*\nDesarrollamos soluciones a medida según las necesidades exactas de tu negocio: sistemas de turnos y agendas para clínicas y estéticas, control de stock y facturación para ferreterías y locales comerciales, integraciones de CRMs propios. Presupuesto personalizado 100% adaptado.\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🎁 *BUNDLE EMPRESARIAL OTOÑO*\nPrecio lista: *$950.000* → 🎯 *$420.000 antes del próximo sábado* (hasta las 21hs)\n*Ahorro de $530.000 sobre el precio de lista.* Conjunto completo: Web + Google SEO/Maps + Redes + Bot IA.\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n⏰ *Importante: Descuentos válidos confirmando antes del próximo sábado a las 21 hrs.*\n\n💬 *¡Escribime y te paso ejemplos de sitios web reales que ya diseñamos para otros negocios para que veas cómo quedan!*",

            "✨ *OTOÑO NEXTE - OFERTAS OTOÑO 2026*\n\n🏢 *Soluciones digitales para tu negocio*\n\nExplicado de forma clara:\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🌐 *ALTERNATIVA A: DESARROLLO WEB*\nTarifa regular: *$500.000* → 🌟 *$250.000 en 2 pagos antes del próximo sábado* (hasta las 21hs)\n• Desarrollo y diseño integral, dominio propio, hosting por 1 año, certificado de seguridad SSL y soporte ante incidencias.\n• Renovación anual: $25.000 trimestrales desde el mes 13.\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🛒 *ALTERNATIVA B: E-COMMERCE TIENDA*\nTarifa regular: *$800.000* → 🌟 *$500.000 antes del próximo sábado* (hasta las 21hs)\n• Carrito de compras, catálogo, pasarela de pagos integrada, control de stock y soporte.\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n📍 *ALTERNATIVA C: SEO + GOOGLE MAPS*\nTarifa regular: *$300.000* → 🌟 *$150.000 antes del próximo sábado* (hasta las 21hs)\n• Perfil de Google Maps optimizado al 100% para llamadas y visitas directas y SEO local.\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n📱 *ALTERNATIVA D: REDES SOCIALES*\nTarifa regular: *$180.000/mes* → 🌟 *$100.000/mes antes del próximo sábado* (hasta las 21hs)\n• Administración de presencia en redes, producción multimedia y diseño premium diario.\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🤖 *ALTERNATIVA E: SISTEMA COMERCIAL + IA*\nTarifa regular: *$200.000* → 🌟 *$100.000 antes del próximo sábado* (hasta las 21hs)\n*+ $5.000-$10.000 mensuales de servidor*\n• Plataforma de administración (turnos, base CRM) con asistente virtual WhatsApp entrenado.\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n📣 *ALTERNATIVA F: PUBLICIDAD (ADS)*\nTarifa regular: *$280.000/mes* → 🌟 *$180.000/mes antes del próximo sábado* (hasta las 21hs)\n*+ Presupuesto de anuncios aparte*\n• Campañas en Google Ads y Meta Ads para captar clientes masivos con retorno de inversión.\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n⚙️ *SISTEMAS Y SOFTWARE A MEDIDA*\nDesarrollamos soluciones a medida según las necesidades exactas de tu negocio: sistemas de turnos y agendas para clínicas y estéticas, control de stock y facturación para ferreterías y locales comerciales, integraciones de CRMs propios. Presupuesto personalizado 100% adaptado.\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🎁 *SOLUCIÓN INTEGRAL OTOÑO*\nTarifa regular: *$950.000* → 🌟 *$420.000 antes del próximo sábado* (hasta las 21hs)\n*Ahorrás $530.000.* Paquete completo: Web + SEO/Maps + Redes + Bot IA.\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n⏰ *Condición: Precios promocionales válidos únicamente confirmando antes del próximo sábado a las 21 hrs.*\n\n💬 *¡Escribime y te paso ejemplos de sitios web reales que ya diseñamos para otros negocios para que veas cómo quedan!*",

            "🎊 *CELEBRAMOS NUESTRO OTOÑO*\n\n🏢 *¿Cómo podemos impulsar tu negocio?*\n\nDirecto al punto:\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🌐 *PRODUCTO 1: WEB PROFESIONAL*\nValor: *$500.000* → 💎 *$250.000 en 2 pagos antes del próximo sábado* (hasta las 21hs)\n• Web corporativa con toda tu información comercial disponible online, dominio y hosting.\n• Costo desde el año 2: $25.000 trimestrales.\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🛒 *PRODUCTO 2: TIENDA ONLINE / CATALOGO*\nValor: *$800.000* → 💎 *$500.000 antes del próximo sábado* (hasta las 21hs)\n• E-commerce completo con catálogo autogestionable, stock, pagos y cálculo de envíos.\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n📍 *PRODUCTO 3: MARKETING EN GOOGLE*\nValor: *$300.000* → 💎 *$150.000 antes del próximo sábado* (hasta las 21hs)\n• Posicionamiento local fuerte en Google Maps y SEO para superar a tu competencia.\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n📱 *PRODUCTO 4: REDES SOCIALES / CM*\nValor: *$180.000/mes* → 💎 *$100.000/mes antes del próximo sábado* (hasta las 21hs)\n• Diseño premium, producción multimedia y publicación automatizada en redes.\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🤖 *PRODUCTO 5: SUITE EMPRESARIAL CON IA*\nValor: *$200.000* → 💎 *$100.000 antes del próximo sábado* (hasta las 21hs)\n*+ $5.000-$10.000/mes de servidor*\n• Software integral de gestión comercial más bot conversacional en WhatsApp con IA.\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n📣 *PRODUCTO 6: CAMPAÑAS DE ANUNCIOS (ADS)*\nValor: *$280.000/mes* → 💎 *$180.000/mes antes del próximo sábado* (hasta las 21hs)\n*+ Inversión en pauta aparte*\n• Campañas publicitarias profesionales en Google y Meta para conversiones y ventas rápidas.\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n⚙️ *SISTEMAS Y SOFTWARE A MEDIDA*\nDesarrollamos soluciones a medida según las necesidades exactas de tu negocio: sistemas de turnos y agendas para clínicas y estéticas, control de stock y facturación para ferreterías y locales comerciales, integraciones de CRMs propios. Presupuesto personalizado 100% adaptado.\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🎁 *ECOSISTEMA COMPLETO OTOÑO*\nValor: *$950.000* → 💎 *$420.000 antes del próximo sábado* (hasta las 21hs)\n*Ahorro de $530.000 sobre el precio de lista.* Todo incluido: Web + SEO/Maps + Redes + Bot IA.\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n⏰ *Requisito: Tarifas promocionales vigentes confirmando antes del próximo sábado a las 21 hrs.*\n\n💬 *¡Escribime y te paso ejemplos de sitios web reales que ya diseñamos para otros negocios para que veas cómo quedan!*",

            "🎉 *OTOÑO 2026 - PROMO ESPECIAL*\n\n🏢 *Herramientas digitales para crecer*\n\nExplicado simple:\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🌐 *OPCIÓN 1: TU PÁGINA WEB* ($500k → *$250k en 2 pagos*)\nTu propio sitio web profesional con dominio, hosting y SSL. Modificaciones ilimitadas por 1 año. Mantenimiento desde el segundo año a $25.000 cada 3 meses.\n\n🛒 *OPCIÓN 2: TU TIENDA ONLINE* ($800k → *$500k*)\nPlataforma e-commerce completa con carrito, stock, pasarela de pagos integrada y capacitación.\n\n📍 *OPCIÓN 3: SALIR PRIMERO EN GOOGLE* ($300k → *$150k*)\nOptimización completa local de ficha Google Maps y SEO técnico local para liderar las búsquedas.\n\n📱 *OPCIÓN 4: MANEJO DE REDES CM* ($180k/mes → *$100k/mes*)\nManejamos tus perfiles comerciales: generación de contenido original, diseño premium diario y respuestas.\n\n🤖 *OPCIÓN 5: SISTEMA + BOT IA* ($200k → *$100k*)\nSoftware de gestión interna (turnos/reservas) y chatbot autónomo por WhatsApp que agenda solo. (Servidor cloud aparte).\n\n📣 *OPCIÓN 6: PUBLICIDAD ADS* ($280k/mes → *$180k/mes*)\nCampañas integrales en Google y Meta Ads enfocadas en retorno real de inversión. (Pauta aparte).\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n⚙️ *SISTEMAS Y SOFTWARE A MEDIDA*\nDesarrollamos soluciones a medida según las necesidades exactas de tu negocio: sistemas de turnos y agendas para clínicas y estéticas, control de stock y facturación para ferreterías y locales comerciales, integraciones de CRMs propios. Presupuesto personalizado 100% adaptado.\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🎁 *PACK TOTAL OTOÑO* ($950k → *$420k*)\nEcosistema completo con descuento de $530.000 sobre precio de lista: Web + Google Maps + Redes + Bot IA.\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n⏰ *Ojo: Los precios promocionales vencen el próximo sábado a las 21 hrs.*\n\n💬 *¡Escribime y te paso ejemplos de sitios web reales que ya diseñamos para otros negocios para que veas cómo quedan!*",

            "💫 *OFERTAS POR OTOÑO NEXTE*\n\n🏢 *Acelerá el crecimiento de tu empresa*\n\nMirá lo que tenemos:\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🌐 *PLAN A: PRESENCIA WEB*\nInversión regular: *$500.000* → ⚡ *$250.000 en 2 pagos antes del próximo sábado* (hasta las 21hs)\n• Diseño profesional a medida, dominio, hosting y SSL. Soporte completo por 1 año.\n• Renovación posterior: $25.000 trimestrales.\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🛒 *PLAN B: TIENDA ONLINE*\nInversión regular: *$800.000* → ⚡ *$500.000 antes del próximo sábado* (hasta las 21hs)\n• Plataforma e-commerce autogestionable con catálogo, stock, pagos y cálculo de envíos.\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n📍 *PLAN C: DOMINAR GOOGLE*\nInversión regular: *$300.000* → ⚡ *$150.000 antes del próximo sábado* (hasta las 21hs)\n• Optimización integral de Google Maps y SEO técnico local para salir primero en tu zona.\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n📱 *PLAN D: SOCIAL MEDIA / CM*\nInversión regular: *$180.000/mes* → ⚡ *$100.000/mes antes del próximo sábado* (hasta las 21hs)\n• Creación de contenidos originales, línea de diseño premium y moderación activa de canales.\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🤖 *PLAN E: AUTOMATIZACIÓN 360°*\nInversión regular: *$200.000* → ⚡ *$100.000 antes del próximo sábado* (hasta las 21hs)\n*+ $5.000-$10.000/mes de servidor cloud*\n• Software comercial y asistente virtual inteligente para WhatsApp que responde y agenda solo.\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n📣 *PLAN F: PUBLICIDAD ADS*\nInversión regular: *$280.000/mes* → ⚡ *$180.000/mes antes del próximo sábado* (hasta las 21hs)\n*+ Presupuesto de anuncios aparte*\n• Campañas avanzadas en Google y Meta para ventas inmediatas.\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n⚙️ *SISTEMAS Y SOFTWARE A MEDIDA*\nDesarrollamos soluciones a medida según las necesidades exactas de tu negocio: sistemas de turnos y agendas para clínicas y estéticas, control de stock y facturación para ferreterías y locales comerciales, integraciones de CRMs propios. Presupuesto personalizado 100% adaptado.\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🎁 *TRANSFORMACIÓN TOTAL OTOÑO*\nInversión regular: *$950.000* → ⚡ *$420.000 antes del próximo sábado* (hasta las 21hs)\n*Ahorrás $530.000 sobre el precio de lista contratando todo junto.* Web + Google Maps + Redes + Bot IA.\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n⏰ *Atención: Valores promocionales vigentes hasta el próximo sábado a las 21 hrs.*\n\n💬 *¡Escribime y te paso ejemplos de sitios web reales que ya diseñamos para otros negocios para que veas cómo quedan!*",

            "🌟 *PROMO OTOÑO - VÁLIDA HASTA EL SÁBADO*\n\n🏢 *Todo lo que necesitás en un solo lugar*\n\nNuestras opciones explicadas:\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🌐 *MÓDULO WEB* ($500k → *$250k en 2 pagos*)\nTu sitio web \\\"dominio propio\\\". Incluye diseño, hosting, dominio y SSL. 1 año de soporte gratis.\n\n🛒 *MÓDULO TIENDA ONLINE* ($800k → *$500k*)\nTu e-commerce completo con catálogo, carrito, stock, Mercado Pago y envíos configurados.\n\n📍 *MÓDULO GOOGLE* ($300k → *$150k*)\nPosicionamiento SEO local fuerte en Google Maps para captar llamadas y clientes directos.\n\n📱 *MÓDULO REDES* ($180k/mes → *$100k/mes*)\nGestión y diseño premium para Instagram, Facebook y TikTok con moderación activa de mensajes.\n\n🤖 *MÓDULO IA + GESTIÓN* ($200k → *$100k*)\nSoftware de control interno y bot inteligente para WhatsApp que agenda turnos. (Servidor cloud aparte).\n\n📣 *MÓDULO PUBLICIDAD ADS* ($280k/mes → *$180k/mes*)\nCampañas masivas de captación en buscadores y redes sociales. (Inversión en pauta aparte).\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n⚙️ *SISTEMAS Y SOFTWARE A MEDIDA*\nDesarrollamos soluciones a medida según las necesidades exactas de tu negocio: sistemas de turnos y agendas para clínicas y estéticas, control de stock y facturación para ferreterías y locales comerciales, integraciones de CRMs propios. Presupuesto personalizado 100% adaptado.\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🎁 *SUITE EMPRESARIAL PACK* ($950k → *$420k*)\nTodo el ecosistema completo ahorrando $530.000 en el combo sobre el precio de lista.\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n⏰ *Solo válido antes del próximo sábado a las 21 hrs.*\n\n💬 *¡Escribime y te paso ejemplos de sitios web reales que ya diseñamos para otros negocios para que veas cómo quedan!*",

            "🚀 *OTOÑO 2026 - OFERTAS LIMITADAS*\n\n🏢 *Soluciones reales para tu emprendimiento*\n\nElegí lo que te sirva:\n\n🌐 *DESARROLLO WEB* ($500k → *$250k en 2 pagos*)\nTu página web corporativa a medida. Incluye diseño, dominio, hosting y SSL. Soporte por 1 año.\n\n🛒 *TIENDA ONLINE / E-COMMERCE* ($800k → *$500k*)\nTu plataforma de ventas completa con catálogo, carrito, stock y pagos. Capacitación incluida.\n\n📍 *POSICIONAMIENTO MAPS + SEO* ($300k → *$150k*)\nQue te encuentren fácil en tu zona. Analytics, ficha Maps optimizada y SEO técnico local.\n\n📱 *GESTIÓN REDES SOCIALES* ($180k/mes → *$100k/mes*)\nNos ocupamos de tu contenido diario, diseño estético, grilla y respuestas a seguidores.\n\n🤖 *TECNOLOGÍA + IA* ($200k → *$100k*)\nSoftware de turnos/reservas y asistente virtual autónomo por WhatsApp que agenda solo. (Servidor cloud aparte).\n\n📣 *PUBLICIDAD EN META / GOOGLE* ($280k/mes → *$180k/mes*)\nCampañas avanzadas enfocadas exclusivamente en retorno rápido y ventas masivas. (Pauta aparte).\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n⚙️ *SISTEMAS Y SOFTWARE A MEDIDA*\nDesarrollamos soluciones a medida según las necesidades exactas de tu negocio: sistemas de turnos y agendas para clínicas y estéticas, control de stock y facturación para ferreterías y locales comerciales, integraciones de CRMs propios. Presupuesto personalizado 100% adaptado.\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🎁 *PAQUETE INTEGRAL OTOÑO* ($950k → *$420k*)\nDescuento gigante contratando el ecosistema completo junto. Ahorrás $530.000 sobre precio de lista.\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n⏰ *Precios promocionales congelados hasta el próximo sábado a las 21 hrs.*\n\n💬 *¡Escribime y te paso ejemplos de sitios web reales que ya diseñamos para otros negocios para que veas cómo quedan!*"
        ];

        // RESPUESTA PARA BOT AUTOMÁTICO (Venta de Bot)
        this.respuestasBotAutomatico = [
            "Veo que tenés una respuesta automática activada. Nosotros podemos transformar eso en un bot inteligente que agende pacientes y explique tus servicios. ¿Te interesa?",
            "Noté tu mensaje automático. En Nexte configuramos bots con IA que cierran ventas y agendan solos, mucho más que una respuesta fija. ¿Te cuento más?",
            "Esa respuesta automática es útil, pero un bot real podría estar agendando clientes en tu calendario ahora mismo. ¿Te gustaría ver cómo funciona?",
            "Vi que usás mensajes automáticos. Podríamos mejorarlo con un bot que responda preguntas específicas y filtre leads las 24hs.",
            "¿Sabías que podemos convertir esa respuesta automática en un asistente virtual que venda por vos? Te ahorraría mucho tiempo de chat."
        ];

        // MSG 4: TODOS LOS SERVICIOS (Variantes con nuevos servicios solicitados)
        // MSG 4: TODOS LOS SERVICIOS (DESHABILITADO - Ya incluido en Msg 3)
        this.serviciosCompletos = [];

        // MSG 5: CTAs SUAVES - Con mención ABRIL + Llamada/Explicación
        // MSG 5: CTAs SUAVES - Con mención ABRIL + Llamada/Explicación + Adaptabilidad
        this.ctasReunion = [
            "Cualquier cosa, organizamos una charla telefónica o nos juntamos.\n\n📌 *Dato:* En nuestro sitio web tenemos más servicios y nos adaptamos a lo que necesites.\n\n⏰ La promo especial es válida hasta el próximo sábado a las 21 hrs. Guardamos tu lugar si te interesa.",
            "Si tenés dudas, lo charlamos por teléfono o videollamada sin compromiso.\n\n📌 *Importante:* Tenemos más opciones en la web y podemos adaptar cualquier plan a tu medida.\n\n⏰ La promo abril es válida hasta el próximo sábado a las 21 hrs. Avisame para guardarte el cupo.",
            "¿Te interesa algún servicio? Podemos agendar una llamada para ver qué te sirve más.\n\n📌 *Ojo:* En nuestra web hay más servicios disponibles y nos adaptamos 100% a tu negocio.\n\n⏰ Recordá que los precios rebajados aplican hasta el próximo sábado a las 21 hrs. Podemos reservarte el cupo.",
            "Estoy disponible para una reunión o videollamada si querés conocer más.\n\n📌 *Nota:* Si buscás algo puntual, en la web hay más info y nos ajustamos a tus necesidades.\n\n⏰ Importante: el descuento por abril es válido hasta el próximo sábado a las 21 hrs. Te guardamos lugar.",
            "Si alguna opción te convence, armamos una charla para darte todos los detalles.\n\n📌 *A saber:* En nuestro sitio tenemos un catálogo más amplio y flexibilidad para armar algo a medida.\n\n⏰ Los precios de abril están disponibles hasta el próximo sábado a las 21 hrs. Se puede asegurar el cupo ahora.",
            "Para lo que necesites, podemos hacer una llamada y lo charlamos tranquilos.\n\n📌 *Plus:* En la web vas a ver más servicios. Nos adaptamos a lo que tu empresa necesite.\n\n⏰ Atención: la oferta especial es válida hasta el próximo sábado a las 21 hrs. Si querés aprovecharla, avisame y te reservo.",
            "¿Querés más info? Coordinamos una reunión o llamada cuando te venga bien.\n\n📌 *Info:* Tenemos más soluciones en nuestro sitio y podemos personalizar todo a tu gusto.\n\n⏰ Tené en cuenta: descuentos disponibles hasta el próximo sábado a las 21 hrs. Puedo guardar tu cupo si te decidís.",
            "Si te copa, programamos una videollamada o nos encontramos.\n\n📌 *Tip:* Si necesitás algo específico, mirá nuestra web o chiflame, nos adaptamos a vos.\n\n⏰ Ojo que la promo de abril es válida hasta el próximo sábado a las 21 hrs. Avisame si querés asegurar el precio.",
            "Cualquier duda, hablamos por teléfono o agendamos algo presencial.\n\n📌 *Recordá:* En la web hay más servicios y somos super flexibles para adaptarnos a tu proyecto.\n\n⏰ Recordatorio: los valores promocionales son válidos hasta el próximo sábado a las 21 hrs. Te guardo lugar si confirmás.",
            "Estoy a disposición para lo que necesites. Podemos tener una charla o llamada.\n\n📌 *Aclaración:* En el sitio web tenemos más alternativas y nos ajustamos a tu requerimiento.\n\n⏰ Dato importante: precios de abril válidos hasta el próximo sábado a las 21 hrs. Puedo reservar tu cupo."
        ];

        // ============ TEMPLATES POR CATEGORÍA ============

        this.categoryKeywords = {
            salud: ['doctor', 'médico', 'clínica', 'hospital', 'dentista', 'odontólogo',
                'kinesiólogo', 'kinesiología', 'kinesiologo', 'kinesiologia', 'kinesio',
                'osteópata', 'osteopata', 'fisioterapia', 'fisioterapeuta', 'psicólogo', 'nutricionista',
                'veterinario', 'farmacia', 'laboratorio', 'traumatólogo', 'dermatólogo',
                'pediatra', 'ginecólogo', 'oftalmólogo', 'consultorio', 'salud', 'medicina'],
            gastronomia: ['restaurant', 'restaurante', 'bar', 'café', 'cafetería', 'pizzería',
                'parrilla', 'sushi', 'delivery', 'comida', 'cocina', 'catering', 'heladería',
                'pastelería', 'panadería', 'food', 'burger', 'hamburguesería', 'cervecería'],
            belleza: ['peluquería', 'barbería', 'spa', 'estética', 'manicura', 'depilación',
                'maquillaje', 'beauty', 'salón', 'uñas', 'cejas', 'pestañas', 'masajes',
                'cosmetología', 'belleza', 'tratamiento facial'],
            fitness: ['gym', 'gimnasio', 'crossfit', 'pilates', 'yoga', 'fitness',
                'entrenamiento', 'personal trainer', 'deportes', 'natación', 'box'],
            comercio: ['tienda', 'shop', 'store', 'venta', 'comercio', 'local', 'boutique',
                'ropa', 'calzado', 'accesorios', 'joyería', 'relojería', 'óptica', 'librería',
                'juguetería', 'ferretería', 'bazar', 'kiosco'],
            servicios: ['abogado', 'contador', 'estudio', 'consultora', 'inmobiliaria', 'seguros',
                'automotriz', 'taller', 'mecánico', 'electricista', 'plomero', 'cerrajería',
                'mudanza', 'limpieza', 'fumigación', 'arquitecto'],
            educacion: ['escuela', 'colegio', 'universidad', 'instituto', 'academia', 'curso',
                'clases', 'idiomas', 'inglés', 'capacitación', 'jardín', 'maternal', 'profesor'],
            tecnologia: ['software', 'sistemas', 'informática', 'computación', 'reparación',
                'celulares', 'electrónica', 'tech', 'digital', 'desarrollo', 'programación']
        };

        // Frases específicas por categoría - PROMO 2025
        this.categoryPhrases = {
            salud: {
                hooks: [
                    "8 de cada 10 pacientes buscan turnos online.",
                    "Los consultorios con web captan 3x más pacientes.",
                    "¿Tienen sistema de turnos online? El 70% lo prefiere.",
                    "Sin web, perdés pacientes que buscan profesionales online.",
                    "Una web te permite mostrar especialidades y equipo."
                ],
                propuestas: [
                    "🏥 PROMO SALUD 2025: Web + turnos online + WhatsApp por $150k.",
                    "🎉 Oferta enero para consultorios: web con sistema de turnos por $150.000.",
                    "💪 Arrancá 2025 digitalizado: web médica + formulario de turnos.",
                    "✨ Promo especial salud: digitalizamos tu consultorio completo por $150k."
                ]
            },
            gastronomia: {
                hooks: [
                    "¿Tienen carta digital con QR? Hoy es casi obligatorio.",
                    "Con web propia + delivery ahorrás comisiones de apps.",
                    "El 60% busca el menú online antes de ir.",
                    "Una carta digital mejora la experiencia del cliente.",
                    "Con pedidos online propios no pagás comisiones."
                ],
                propuestas: [
                    "🍕 PROMO GASTRO 2025: Web + carta QR + pedidos online por $150k.",
                    "🎉 Oferta enero: tu sistema de delivery sin pagar a Rappi/PedidosYa.",
                    "🔥 Arrancá 2025 digital: web + carta + reservas por $150.000.",
                    "✨ Promo especial gastro: delivery propio sin comisiones."
                ]
            },
            belleza: {
                hooks: [
                    "Los salones con turnos online tienen 40% menos cancelaciones.",
                    "Una galería de trabajos online atrae más clientes.",
                    "El 80% prefiere reservar turno por web o WhatsApp.",
                    "Mostrar tu portfolio online genera confianza.",
                    "Con recordatorios automáticos reducís ausencias."
                ],
                propuestas: [
                    "💅 PROMO BELLEZA 2025: Web + galería + turnos por $150k.",
                    "🎉 Oferta enero: web estética con portfolio y reservas.",
                    "✨ Arrancá 2025: mostrá tus trabajos + tomá turnos automáticamente.",
                    "🔥 Promo especial: web para salón con fotos y reservas online."
                ]
            }
        };

        this.stats = { generated: 0 };

        // Cargar desde DB (Asincrónico, se llenará gradualmente)
        // this.fetchTemplates(); // DESHABILITADO TEMPORALMENTE: Usar hardcoded Feb 2025
    }

    async fetchTemplates() {
        try {
            console.log('🔄 [ADVANCED] Cargando plantillas desde la base de datos...');
            const res = await axios.get(`${this.backendUrl}/api/templates`);
            if (res.data.success && res.data.templates) {
                this.updateLocalVariants(res.data.templates);
                console.log('✅ [ADVANCED] Plantillas cargadas correctamente desde DB');
            }
        } catch (error) {
            console.error('❌ [ADVANCED] Error cargando plantillas desde DB, usando hardcoded:', error.message);
        }
    }

    updateLocalVariants(templates) {
        templates.forEach(t => {
            const activeVariants = t.variants.filter(v => v.isActive).map(v => v.content);
            if (activeVariants.length > 0) {
                if (this[t.category]) {
                    this[t.category] = activeVariants;
                }
            }
        });
    }

    // Detectar categoría
    detectCategory(lead) {
        const text = `${lead.name} ${lead.businessName || ''} ${lead.keyword || ''}`.toLowerCase();
        for (const [cat, keys] of Object.entries(this.categoryKeywords)) {
            if (keys.some(k => text.includes(k))) return cat;
        }
        return 'general';
    }

    // Selección aleatoria
    random(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    // Extraer nombre
    extractName(lead) {
        const full = lead.name || lead.businessName || 'amigo/a';
        if (full.includes(' - ')) {
            const parts = full.split(' - ');
            return parts[parts.length - 1].split(' ')[0];
        }
        const first = full.split(' ')[0];
        return (first.length > 2 && first.length < 15) ? first : 'amigo/a';
    }

    // Reemplazar variables
    fill(text, lead) {
        const nombre = this.extractName(lead);
        const negocio = lead.businessName || lead.name || 'tu negocio';
        const ubicacion = lead.location || 'tu zona';
        return text
            .replace(/{nombre}/g, nombre)
            .replace(/{negocio}/g, negocio)
            .replace(/{ubicacion}/g, ubicacion);
    }

    // Generar 5 mensajes únicos - NUEVA ESTRUCTURA
    generatePersonalizedSequence(lead) {
        const cat = this.detectCategory(lead);
        const catPhrases = this.categoryPhrases[cat] || {};

        // MSG 1: SALUDO + INTRO + HOOK (Mensaje General y Seguro)
        const saludo = this.random(this.saludos);
        const intro = this.random(this.introsNegocio);
        const hook = this.random(this.hooksGenerales);

        const msg1 = this.fill(`${saludo} ${intro} ${hook}`, lead);

        // MSG 2: EXPLICACIÓN NEXTE
        const presentacion = this.random(this.presentaciones);
        const msg2 = this.fill(presentacion, lead);

        // MSG 3: PROMOCIONES 2025 (Forzar uso de las nuevas promos con precios actualizados)
        // Ignoramos las específicas de categoría por ahora porque tienen precios desactualizados
        const propuesta = this.random(this.propuestas);
        const msg3 = this.fill(propuesta, lead);

        // MSG 4: TODOS LOS SERVICIOS (DESHABILITADO - Msg 3 ya tiene todo)
        // const servicios = this.random(this.serviciosCompletos);
        // const msg4 = servicios;

        // MSG 5: CTA LLAMADA/REUNIÓN (Ahora es el 4to mensaje)
        const ctaReunion = this.random(this.ctasReunion);
        const msg5 = ctaReunion;

        this.stats.generated += 4;
        console.log(`🎯 [ADVANCED] Cat: ${cat} | Generados: ${this.stats.generated}`);
        console.log(`📝 Mensajes generados:`);
        console.log(`   1️⃣ Saludo: "${msg1.substring(0, 60)}..."`);
        console.log(`   2️⃣ Nexte: "${msg2.substring(0, 60)}..."`);
        console.log(`   3️⃣ Promo: "${msg3.substring(0, 60)}..."`);
        console.log(`   4️⃣ CTA: "${msg5.substring(0, 60)}..."`);

        const templateMessages = [msg1, msg2, msg3, msg5];
        templateMessages.templateVariantUsed = this.propuestas.indexOf(propuesta);
        return templateMessages;
    }

    getStats() {
        const combos = this.saludos.length * this.introsNegocio.length * this.hooks.length;
        return {
            saludos: this.saludos.length,
            intros: this.introsNegocio.length,
            hooks: this.hooks.length,
            presentaciones: this.presentaciones.length,
            propuestas: this.propuestas.length,
            servicios: this.serviciosCompletos.length,
            ctasReunion: this.ctasReunion.length,
            combinacionesPosibles: combos,
            mensajesGenerados: this.stats.generated
        };
    }
}

module.exports = AdvancedTemplateGenerator;
