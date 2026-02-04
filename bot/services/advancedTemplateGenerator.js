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

        // HOOKS "SIN WEB" (Dependencia de Google) - 30 variantes
        this.hooksNoWeb = [
            "Vi que no tienen web. Sin sitio propio, dependés 100% de lo que decida Google.",
            "Noté que no hay página web. Hoy día, eso es perder el 70% de clientes potenciales.",
            "Sin web propia, tu negocio está atado a las reglas de Google Maps u otras apps.",
            "¿Sabías que una web te da independencia total de las plataformas de terceros?",
            "Vi que usan solo Maps. Una web propia te asegura que los clientes sean tuyos.",
            "Sin sitio web, es difícil captar emails o hacer marketing real.",
            "Depender solo de Google Maps es riesgoso si te bajan el perfil.",
            "Una web propia es el único activo digital que realmente controlás.",
            "Hoy los clientes buscan web para validar antes de ir. Si no está, desconfían.",
            "Tener solo ficha en Maps limita mucho tu alcance local.",
            "Sin web, no podés hacer publicidad efectiva en Google o Instagram.",
            "Una web te permite automatizar consultas que hoy contestás a mano.",
            "Vi su perfil pero no encontré su página web oficial. Es clave para dar imagen profesional.",
            "La web propia es tu casa digital; las redes son prestadas.",
            "Si Google cambia el algoritmo, sin web propia desaparecés. Es mejor prevenir.",
            "¿Han pensado en tener un sitio web propio? Te libera de depender solo de referidos.",
            "Sin página web oficial, estás dejando que la competencia se lleve los clics.",
            "Una web simple te pone por encima del 80% de locales que no tienen.",
            "Maps ayuda, pero la web es la que termina de cerrar la venta.",
            "Sin web, no podés medir bien quién te visita ni volver a contactarlos.",
            "Tener web transmite seriedad. Solo redes a veces queda corto.",
            "Hoy el 'boca a boca' es digital, y la web es tu tarjeta de presentación.",
            "Sin web, perdés la chance de aparecer en búsquedas más específicas.",
            "Una web es un vendedor que trabaja 24/7 sin que estés ahí.",
            "Depender solo de redes o Maps es construir sobre terreno ajeno.",
            "¿Tienen web caída? Porque no figura. Es fundamental arreglarlo.",
            "Sin web, te perdés de usar herramientas como el Pixel de Facebook.",
            "Tener tu dominio te da correos profesionales, que venden más que Gmail.",
            "La web es el centro de cualquier estrategia que funcione de verdad.",
            "Hacer una web hoy es barato y te independiza de las plataformas."
        ];

        // HOOKS "CON WEB" (Auditoría/Mejora) - 30 variantes
        this.hooksConWeb = [
            "Vi que tienen web, pero podríamos instalar Analytics para medir mejor.",
            "Tienen web, ¡genial! ¿Están midiendo cuántas visitas se convierten en ventas?",
            "Vi su sitio. Con unos ajustes de SEO podrían aparecer mucho más arriba.",
            "La web está, pero podríamos mejorar la velocidad para que no pierdan visitas.",
            "Tienen presencia web, pero ¿están usando Pixel para re-captar interesados?",
            "Vi la página. Se podría modernizar para captar más consultas.",
            "¿Saben si su web está convirtiendo visitas en clientes reales?",
            "La web se ve bien, pero hay cosas técnicas de SEO que ayudarían mucho.",
            "Tener web es el primer paso. El segundo es que venda por ustedes.",
            "Podríamos auditar su web gratis para ver por qué no rankea mejor.",
            "Vi que tienen web. ¿Están haciendo publicidad o solo orgánico?",
            "Su web podría vender mucho más con una buena landing de ventas.",
            "La competencia está invirtiendo en SEO. Su web tiene potencial para ganarles.",
            "¿Están conformes con la cantidad de turnos/ventas que trae la web?",
            "Vi su sitio y hay oportunidades claras para mejorar la conversión.",
            "Podemos conectar su web con WhatsApp para cerrar ventas más rápido.",
            "Una auditoría rápida nos diría qué frenar para vender más.",
            "Tienen la base (web). Ahora falta acelerarla con buen marketing.",
            "¿Su web está sumando leads todos los días o está quieta?",
            "Vi detalles en la versión móvil de su web que se pueden pulir.",
            "Con esa web, una campaña de Google Ads andaría muy bien.",
            "La web existe, pero ¿les está trayendo retorno de inversión?",
            "Podemos potenciar su sitio actual con herramientas de medición serias.",
            "Vi que tienen dominio propio. ¿Lo están aprovechando al máximo?",
            "Su web tiene buena info, pero le falta 'llamada a la acción'.",
            "¿Usan Analytics 4? Es clave para entender qué hace la gente en su web.",
            "Esa web con un poco de optimización vuela.",
            "Podemos hacer que su web aparezca cuando buscan sus servicios.",
            "Vi su página. ¿Les gustaría recibir un reporte de mejoras posibles?",
            "Tienen buen sitio. Sería ideal sumarle un bot de agendamiento."
        ];

        // HOOKS GENÉRICOS (Fallback)
        this.hooks = this.hooksNoWeb;

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
            "Nexte es transparencia y resultados. Trabajamos codo a codo para cumplir tus objetivos."
        ];

        // MSG 3: PROPUESTAS DE VALOR - PROMO FEBRERO 2025
        this.propuestas = [
            "🎉 *PROMO FEBRERO 2025*\n\n🏢 *¿QUÉ PODEMOS HACER POR TU NEGOCIO?*\n\nTe lo explico simple, sin palabras raras:\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🌐 *OPCIÓN A: TU PROPIA PÁGINA WEB*\nPrecio: *$75.000* (pagás una vez)\n\n¿Qué es?\nTu propio sitio tipo \"www.tunegocio.com.ar\" donde los clientes ven tus servicios, precios, fotos de tu trabajo, y pueden contactarte.\n\n*¿Qué está incluido?*\n• El diseño completo de la página\n• El nombre de tu página (dominio)\n• El servidor donde funciona (hosting)\n• Candadito verde de seguridad\n• Durante 1 año podés pedirnos todos los cambios que necesites\n• Si algo falla, lo arreglamos\n\n*Después del año:* $25.000 cada 3 meses.\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n📍 *OPCIÓN B: QUE TE ENCUENTREN EN GOOGLE*\nPrecio: *$75.000* (pagás una vez)\n\n¿Qué es?\nHacemos que cuando busquen en Google tu rubro + tu ciudad, aparezcas PRIMERO.\n\n*¿Qué está incluido?*\n• Google Analytics: ver cuánta gente te visita\n• Search Console: ver qué palabras usan para buscarte\n• Google Maps: tu negocio en el mapa con fotos y reseñas\n• SEO Técnico: optimizamos para que Google te posicione arriba\n• Indexación desde el día 1\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n📱 *OPCIÓN C: MANEJO DE REDES SOCIALES*\nPrecio: *$75.000 por mes*\n\n¿Qué es?\nNos encargamos de tus redes para que vos te enfoques en tu negocio.\n\n*¿Qué está incluido?*\n• Creación de contenido (posts, stories, reels)\n• Diseños gráficos profesionales\n• Publicación programada\n• Respuestas a comentarios y mensajes\n• Estrategia mensual\n• Reportes de rendimiento\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🤖 *OPCIÓN D: BOT INTELIGENTE 24/7*\nPrecio: *$200.000* + *$5.000-$10.000/mes*\n\n¿Qué es?\nUn asistente virtual que atiende WhatsApp todo el día. No es un bot tonto - está entrenado con TU información.\n\n*Puede:*\n• Responder consultas de precios, servicios, horarios\n• Agendar turnos automáticamente\n• Verificar comprobantes de pago\n• Guiar al cliente hasta que compre\n• Panel de control para vos\n\n*Incluye:* 6 meses de ajustes gratis.\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🎁 *PACK COMPLETO: $320.000* + mensuales\nTodo junto con $30.000 de ahorro.\n\n🎯 Nuestro foco: que cada persona que te contacte termine siendo cliente.",

            "🚀 *OFERTAS FEBRERO 2025*\n\n🏢 *¿CÓMO PODEMOS AYUDARTE?*\n\nTe cuento de forma clara:\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🌐 *OPCIÓN A: PÁGINA WEB PROFESIONAL*\nInversión: *$75.000* (un solo pago)\n\nTu sitio propio tipo \"www.tunegocio.com.ar\" para mostrar servicios, precios, trabajos y que te contacten.\n\n*Incluye:*\n• Diseño completo de la web\n• Tu dominio (nombre de la página)\n• Hosting (donde \"vive\" tu web)\n• Certificado de seguridad (candadito verde)\n• Cambios ilimitados durante 1 año\n• Soporte técnico ante problemas\n\n*Renovación:* $25.000 trimestrales después del primer año.\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n📍 *OPCIÓN B: POSICIONAMIENTO EN GOOGLE*\nInversión: *$75.000* (un solo pago)\n\nQue cuando busquen tu rubro + tu ciudad, aparezcas primero.\n\n*Incluye:*\n• Google Analytics: medí cuánta gente te visita\n• Search Console: descubrí qué palabras usan para buscarte\n• Google Maps: tu negocio visible con fotos, horarios y reseñas\n• SEO Técnico: optimizamos para que Google te posicione arriba\n• Indexación inmediata: estás visible desde el día 1\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n📱 *OPCIÓN C: GESTIÓN DE REDES SOCIALES*\nInversión: *$75.000 mensuales*\n\nManejamos tus redes para que vos te enfoques en tu negocio.\n\n*Incluye:*\n• Creación de contenido (posts, stories, reels)\n• Diseños gráficos profesionales\n• Publicación programada\n• Respuestas a comentarios y mensajes\n• Estrategia mensual de contenido\n• Informes de rendimiento\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🤖 *OPCIÓN D: BOT INTELIGENTE 24/7*\nInversión: *$200.000* + *$5.000-$10.000/mes*\n\nAsistente virtual que atiende WhatsApp todo el día. No es un bot tonto - está entrenado con TU información.\n\n*Puede:*\n• Responder consultas de precios, servicios, horarios\n• Agendar turnos automáticamente\n• Verificar comprobantes de pago\n• Guiar al cliente hasta que compre\n• Panel de control para vos\n\n*Incluye:* 6 meses de ajustes gratis.\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🎁 *PACK COMPLETO*\nInversión: *$320.000* + mensuales\nTodo junto con $30.000 de ahorro.\n\n🎯 Nuestro foco: que cada persona que te contacte termine siendo cliente.",

            "💥 *OPORTUNIDAD FEBRERO 2025*\n\n🏢 *NUESTROS SERVICIOS EXPLICADOS SIMPLE:*\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🌐 *A) TU WEB PROPIA*\n*$75.000* (pago único)\n\nTu página \"www.tunegocio.com.ar\" donde mostrás todo lo que hacés.\n\n*Tenés:*\n• Diseño profesional\n• Dominio incluido\n• Hosting incluido\n• Seguridad SSL\n• Cambios gratis por 1 año\n• Soporte técnico\n\n*Después:* $25.000/trimestre.\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n📍 *B) APARECER EN GOOGLE*\n*$75.000* (pago único)\n\nQue te encuentren cuando busquen tu rubro en tu zona.\n\n*Tenés:*\n• Google Analytics (ver visitas)\n• Search Console (ver búsquedas)\n• Google Maps optimizado\n• SEO Técnico completo\n• Indexación desde el día 1\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n📱 *C) REDES SOCIALES*\n*$75.000/mes*\n\nNos encargamos de tus redes.\n\n*Tenés:*\n• Contenido (posts, stories, reels)\n• Diseños gráficos\n• Publicación programada\n• Respuestas a mensajes\n• Estrategia mensual\n• Reportes\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🤖 *D) BOT CON INTELIGENCIA ARTIFICIAL*\n*$200.000* + *$5.000-$10.000/mes*\n\nAsistente que atiende WhatsApp 24hs como si fueras vos.\n\n*Puede:*\n• Responder consultas automáticamente\n• Agendar turnos\n• Validar comprobantes de pago\n• Guiar hasta la compra\n• Panel de control incluido\n\n*Incluye:* 6 meses de ajustes.\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🎁 *TODO JUNTO: $320.000* + mensuales\nAhorrás $30.000.\n\n🎯 Hacemos que más gente que te contacte se convierta en cliente.",

            "⚡ *FEBRERO 2025 - SERVICIOS NEXTE*\n\nTe cuento qué podemos hacer por tu negocio:\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🌐 *WEB PROFESIONAL* → *$75.000*\n\nTu sitio www.tunegocio.com.ar con todo incluido por 1 año:\n• Diseño + dominio + hosting + SSL\n• Cambios ilimitados\n• Soporte técnico\n\nRenovación: $25.000 cada 3 meses.\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n📍 *GOOGLE + SEO* → *$75.000*\n\nQue aparezcas cuando busquen tu rubro:\n• Analytics + Search Console\n• Google Maps optimizado\n• SEO Técnico\n• Indexación inmediata\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n📱 *REDES SOCIALES* → *$75.000/mes*\n\nManejamos tus redes:\n• Contenido + diseños\n• Publicación + respuestas\n• Estrategia mensual\n• Reportes\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🤖 *BOT INTELIGENTE* → *$200.000* + servidor\n\nAsistente 24hs en WhatsApp:\n• Responde como vos\n• Agenda turnos\n• Valida pagos\n• Panel de control\n\nIncluye 6 meses de ajustes.\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🎁 *COMBO TOTAL: $320.000* + mensuales\nAhorro de $30.000.\n\n🎯 Todo pensado para convertir contactos en clientes.",

            "🔥 *PROMO NEXTE - FEBRERO 2025*\n\nServicios para digitalizar tu negocio:\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🌐 *1. PÁGINA WEB*\nPrecio: *$75.000* (una vez)\n\nTu sitio propio con dominio, hosting, diseño, cambios por 1 año y soporte incluido.\n\nDespués del año: $25.000/trimestre.\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n📍 *2. POSICIONAMIENTO GOOGLE*\nPrecio: *$75.000* (una vez)\n\nAnalytics, Search Console, Maps, SEO técnico e indexación inmediata.\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n📱 *3. REDES SOCIALES*\nPrecio: *$75.000/mes*\n\nContenido, diseños, publicación, respuestas, estrategia y reportes.\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🤖 *4. BOT INTELIGENTE*\nPrecio: *$200.000* + servidor mensual\n\nAtiende WhatsApp 24hs, agenda turnos, valida pagos. Incluye 6 meses de ajustes.\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🎁 *PACK COMPLETO: $320.000*\nTodo junto con $30k de descuento.\n\n🎯 Nuestro objetivo: que cada contacto se convierta en venta.",

            "✨ *SERVICIOS FEBRERO 2025*\n\nTe cuento nuestras opciones:\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🌐 *WEB COMPLETA* → *$75.000*\nDiseño + dominio + hosting + cambios x1 año + soporte.\nRenovación: $25.000/trimestre.\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n📍 *GOOGLE + SEO* → *$75.000*\nAnalytics + Search Console + Maps + SEO + indexación.\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n📱 *REDES SOCIALES* → *$75.000/mes*\nContenido + diseños + publicación + respuestas + reportes.\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🤖 *BOT INTELIGENTE* → *$200.000 + servidor*\nAsistente 24hs que atiende, agenda y valida pagos. 6 meses de ajustes incluidos.\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🎁 *COMBO: $320.000* + mensuales (ahorrás $30k)\n\n🎯 Convertimos contactos en clientes.",

            "🎯 *QUÉ OFRECEMOS - FEBRERO 2025*\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🌐 *PÁGINA WEB:* $75.000\nTodo incluido por 1 año (diseño, dominio, hosting, cambios, soporte).\nDespués: $25.000/trimestre.\n\n📍 *GOOGLE + SEO:* $75.000\nAnalytics, Search Console, Maps, SEO técnico, indexación.\n\n📱 *REDES:* $75.000/mes\nContenido, diseños, publicación, respuestas, reportes.\n\n🤖 *BOT IA:* $200.000 + $5k-$10k/mes\nAsistente 24hs, agenda turnos, valida pagos. 6 meses de ajustes.\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🎁 *TODO JUNTO:* $320.000 + mensuales\nAhorrás $30.000.\n\n🎯 Objetivo: que más gente que te contacte se convierta en cliente.",

            "💪 *PROMO FEBRERO - NEXTE MARKETING*\n\nEsto es lo que hacemos:\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🌐 *TU WEB:* $75.000\n• Diseño + dominio + hosting + SSL\n• Cambios ilimitados 1 año\n• Soporte incluido\n• Renovación: $25k/trimestre\n\n📍 *GOOGLE:* $75.000\n• Analytics + Search Console\n• Maps + SEO técnico\n• Indexación inmediata\n\n📱 *REDES:* $75.000/mes\n• Contenido + diseños\n• Publicación + respuestas\n• Estrategia + reportes\n\n🤖 *BOT IA:* $200.000 + servidor\n• Atiende 24hs\n• Agenda turnos\n• Valida pagos\n• 6 meses de ajustes\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🎁 *PACK COMPLETO:* $320.000 (-$30k)\n\n🎯 Todo orientado a conseguirte más clientes.",

            "🌟 *FEBRERO 2025 - OFERTAS NEXTE*\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n*A) WEB PROFESIONAL* → $75.000\nDiseño, dominio, hosting, seguridad, cambios x1 año, soporte.\nRenovación: $25.000/trimestre.\n\n*B) GOOGLE + SEO* → $75.000\nAnalytics, Search Console, Maps, SEO, indexación día 1.\n\n*C) REDES SOCIALES* → $75.000/mes\nContenido, diseños, publicación, respuestas, reportes.\n\n*D) BOT INTELIGENTE* → $200.000 + servidor\nWhatsApp 24hs, turnos, validación de pagos, panel. 6 meses de ajustes.\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🎁 *COMBO: $320.000* + mensuales\nAhorro de $30.000.\n\n🎯 Todo para convertir contactos en ventas.",

            "🏆 *SERVICIOS NEXTE - PROMO FEBRERO*\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🌐 *WEB:* $75.000 (1 pago)\nIncluye: diseño, dominio, hosting, SSL, cambios 1 año, soporte.\nRenovación: $25k cada 3 meses.\n\n📍 *GOOGLE:* $75.000 (1 pago)\nIncluye: Analytics, Search Console, Maps, SEO, indexación.\n\n📱 *REDES:* $75.000/mes\nIncluye: contenido, diseños, publicación, respuestas, reportes.\n\n🤖 *BOT:* $200.000 + servidor mensual\nIncluye: atención 24hs, turnos, validación pagos, panel. 6 meses de ajustes.\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🎁 *PACK:* $320.000 + mensuales (-$30k)\n\n🎯 Foco en resultados: más clientes para vos."
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
        this.serviciosCompletos = [
            "🚀 **Servicios Integrales Nexte:**\n\n• **Bots de Respuesta Inteligente:** Atendé consultas automáticamente.\n• **Gestión de Turnos a Medida:** Sistema de reservas personalizado.\n• **Web Autoadministrable:** Modificá tus fotos y textos fácilmente.\n• **Gestión de Google Maps:** Optimizamos tu ficha para destacar.\n• **SEO Técnico:** Posicionamiento real en buscadores.\n• **Soporte Web:** Cambios y mejoras continuas en tu sitio.",

            "🔧 **Soluciones que ofrecemos:**\n\n• **Bots de WhatsApp:** Respuestas y filtros automáticos 24/7.\n• **Sistema de Turnos Custom:** Adaptado 100% a tu agenda.\n• **Gestión de Contenido:** Panel para cambiar fotos de tu web.\n• **Optimización Google Maps:** Aparecé en las búsquedas locales.\n• **SEO Técnico Avanzado:** Tu sitio rápido y visible.\n• **Actualizaciones Web:** Hacemos los cambios que necesites.",

            "💼 **Digitalizá tu negocio con:**\n\n• **Chatbots Automáticos:** No pierdas ni un cliente por demoras.\n• **Gestión de Citas:** Agenda a medida para tu rubro.\n• **Sistemas de Gestión:** Subí y cambiá fotos de tu web al instante.\n• **Posicionamiento en Maps:** Dominá tu zona geográfica.\n• **SEO Técnico:** Mejora tu ranking en Google.\n• **Mantenimiento Web:** Ajustes y cambios incluidos.",

            "⚡ **Nuestro catálogo de servicios:**\n\n• **Bots de Respuesta:** Automatizá la primera atención.\n• **Turneros a Medida:** Organización total de tus horarios.\n• **Web Dinámica:** Panel propio para editar imágenes y textos.\n• **Gestión de Maps:** Optimizamos tu perfil de negocio.\n• **SEO & Performance:** Webs veloces que Google ama.\n• **Cambios en Sitio Web:** Renovamos tu imagen cuando quieras.",

            "🛠️ **Herramientas para crecer:**\n\n• **Bots IA:** Respuestas inmediatas a cada consulta.\n• **Gestión de Turnos:** Software dedicado para tu flujo de trabajo.\n• **Panel Autoadministrable:** Control total de las fotos de tu web.\n• **Google Maps Pro:** Gestión profesional de tu ubicación.\n• **SEO Técnico:** Estrategias para subir en el buscador.\n• **Soporte de Cambios:** Tu web siempre al día.",

            "📱 **Todo lo que necesitas:**\n\n• **Automatización (Bots):** Respondé aunque estés durmiendo.\n• **Agendas Custom:** Sistema de turnos diseñado para vos.\n• **CMS a Medida:** Cambiá las fotos de tu web sin saber programar.\n• **Maps & Local SEO:** Destacá en el mapa de tu ciudad.\n• **SEO Técnico:** Auditoría y mejoras de posicionamiento.\n• **Gestión Web:** Nos encargamos de todos los cambios.",

            "🌐 **Pack de Servicios Nexte:**\n\n• **Bots de Respuesta:** Filtra y atiende leads en automático.\n• **Sistema de Turnos:** Solución exacta para tu tipo de atención.\n• **Web Editable:** Herramienta para modificar tu galería de fotos.\n• **Optimización Maps:** Tu ficha de Google, impecable.\n• **SEO Técnico:** Optimizamos la estructura de tu sitio.\n• **Actualizaciones:** Cambios de diseño y contenido a pedido.",

            "💡 **Potenciá tu presencia:**\n\n• **Chatbots 24/7:** Atención inmediata garantizada.\n• **Turnos Inteligentes:** Gestión a medida de tu calendario.\n• **Sistema de Fotos:** Actualizá tu web vos mismo.\n• **Gestión de Perfil Maps:** Mejoramos tu visibilidad local.\n• **Posicionamiento SEO:** Estrategias técnicas de indexación.\n• **Cambios Web:** Soporte técnico permanente.",

            "🏆 **Servicios Premium:**\n\n• **Bots de Auto-Respuesta:** Agilidad para tus clientes.\n• **Gestión de Turnos:** Desarrollo a medida de tu agenda.\n• **Web Autogestionable:** Panel para rotar tus imágenes.\n• **Google Maps:** Estrategia de posicionamiento local.\n• **SEO Técnico:** Optimizamos código y velocidad.\n• **Mantenimiento:** Cambios y ajustes en tu sitio web.",

            "🚀 **Lo que hacemos por vos:**\n\n• **Bots Inteligentes:** Respuestas rápidas y efectivas.\n• **Software de Turnos:** Adaptado a cómo trabajás.\n• **Panel de Control Web:** Modificá fotos y contenido fácil.\n• **Gestión de Maps:** Hacemos brillar tu negocio en el mapa.\n• **SEO Técnico:** Tu web optimizada para Google.\n• **Cambios Web:** Nos pedís, nosotros lo hacemos."
        ];

        // MSG 5: CTAs SUAVES (30 variantes) - Tono Sobrio, sin emojis
        this.ctasReunion = [
            "Si te interesa, podemos organizar una reunión o llamada. Estoy a tu disposición.",
            "Si te sirve la info, podemos charlar 5 minutos cuando tengas tiempo.",
            "Quedo a tu disposición si querés que organicemos una llamada para ver detalles.",
            "Si te parece bien, podemos agendar una reunión breve. Avisame cuando puedas.",
            "Estoy disponible para una llamada si querés profundizar. Sin apuro.",
            "Si le interesa, podemos coordinar una reunión breve, ahora o cuando quiera.",
            "Quedo atento. Si querés charlar mejor, coordinamos llamada.",
            "Si tenés un momento, podemos organizar una llamada rápida. Estoy a disposición.",
            "Si te gustaría saber más, podemos agendar una videollamada cuando quieras.",
            "Si te interesa la propuesta, charlamos 10 minutos cuando vos puedas.",
            "Estoy a tu disposición para una reunión si querés ver cómo funcionaría.",
            "Si te resuena algo de esto, avisame y coordinamos llamada.",
            "Podemos organizar una charla informal cuando te quede cómodo.",
            "Si querés avanzar, podemos hacer una llamada rápida. Estoy disponible.",
            "Cuando tengas un rato, si te interesa, charlamos mejor por teléfono.",
            "Si te parece útil, podemos agendar una reunión cuando vos digas.",
            "Cualquier duda estoy a disposición. Podemos organizar llamada si preferís.",
            "Si querés ver más, coordinamos una videollamada breve.",
            "Si te interesa la idea, avisame y organizamos para hablar.",
            "Estoy a tu entera disposición si querés coordinar una reunión.",
            "Podemos charlarlo en una llamada si tenés disponibilidad.",
            "Si te sirve, agendamos una reunión para ver tu caso puntual.",
            "Quedo a la espera. Si querés, organizamos una llamada.",
            "Si te interesa, estoy disponible para una charla corta cuando puedas.",
            "Si querés que lo veamos en detalle, coordinamos reunión.",
            "Estoy a disposición para una llamada o reunión cuando te quede bien.",
            "Si le interesa, podemos organizar algo breve por Meet o Zoom.",
            "Avisame si querés charlar. Estoy a tu disposición.",
            "Si te gustaría explorar esto, podemos agendar una llamada.",
            "Quedo a disposición. Si te interesa, coordinamos cuando quieras."
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
        this.fetchTemplates();
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

        // MSG 1: SALUDO + INTRO + HOOK (Depende de si tiene WEB o NO)
        const saludo = this.random(this.saludos);
        const intro = this.random(this.introsNegocio);

        // LÓGICA WEB vs NO WEB
        // Mejora: Considerar facebook, instagram o google sites como "NO WEB" real
        let hasWebsite = lead.website && lead.website.length > 4;
        if (hasWebsite) {
            const lowerWeb = lead.website.toLowerCase();
            if (lowerWeb.includes('google') || lowerWeb.includes('facebook') || lowerWeb.includes('instagram') || lowerWeb.includes('linktr.ee')) {
                hasWebsite = false;
            }
        }

        let hook;
        if (hasWebsite) {
            hook = this.random(this.hooksConWeb); // Hook de auditoría/mejora
        } else {
            hook = this.random(this.hooksNoWeb); // Hook de dependencia Google
            // Si es categoría específica y no tiene web, a veces usar específico
            if (catPhrases.hooks && Math.random() > 0.5) {
                hook = this.random(catPhrases.hooks);
            }
        }

        const msg1 = this.fill(`${saludo} ${intro} ${hook}`, lead);

        // MSG 2: EXPLICACIÓN NEXTE
        const presentacion = this.random(this.presentaciones);
        const msg2 = this.fill(presentacion, lead);

        // MSG 3: PROMOCIONES 2025 (Forzar uso de las nuevas promos con precios actualizados)
        // Ignoramos las específicas de categoría por ahora porque tienen precios desactualizados
        const propuesta = this.random(this.propuestas);
        const msg3 = this.fill(propuesta, lead);

        // MSG 4: TODOS LOS SERVICIOS
        const servicios = this.random(this.serviciosCompletos);
        const msg4 = servicios;

        // MSG 5: CTA LLAMADA/REUNIÓN
        const ctaReunion = this.random(this.ctasReunion);
        const msg5 = ctaReunion;

        this.stats.generated += 5;
        console.log(`🎯 [ADVANCED] Cat: ${cat} | Generados: ${this.stats.generated}`);
        console.log(`📝 Mensajes generados:`);
        console.log(`   1️⃣ Saludo: "${msg1.substring(0, 60)}..."`);
        console.log(`   2️⃣ Nexte: "${msg2.substring(0, 60)}..."`);
        console.log(`   3️⃣ Promo: "${msg3.substring(0, 60)}..."`);
        console.log(`   4️⃣ Servicios: "${msg4.substring(0, 60)}..."`);
        console.log(`   5️⃣ CTA: "${msg5}"`);

        return [msg1, msg2, msg3, msg4, msg5];
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
