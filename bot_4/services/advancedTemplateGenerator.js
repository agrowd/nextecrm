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

        // MSG 3: PROPUESTAS DE VALOR - PROMO ABRIL 2025 (10 Variantes Actualizadas $50k)
        this.propuestas = [
            "🎉 *PROMO ABRIL - ABRIL 2025*\n\n🏢 *¿QUÉ PODEMOS HACER POR TU NEGOCIO?*\n\nTe lo explico simple, sin palabras raras:\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🌐 *OPCIÓN A: TU PROPIA PÁGINA WEB*\nPrecio: *$75.000* → 🔥 *$50.000 antes del próximo sábado* (hasta las 21hs)\n\n¿Qué es? \nTu propio sitio profesional donde los clientes ven tus servicios, precios, fotos de tu trabajo, y pueden contactarte.\n\n*¿Qué está incluido?*\n• El diseño completo de la página\n• El nombre de tu página (se llama \"dominio\")\n• El servidor donde funciona (como si fuera el \"local\" de tu web)\n• Candadito verde de seguridad en el navegador\n• Durante 1 año podés pedirnos todos los cambios que necesites\n• Si algo falla, lo arreglamos\n\n*Después del año:* $25.000 cada 3 meses para mantener todo andando.\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n📍 *OPCIÓN B: QUE TE ENCUENTREN EN GOOGLE*\nPrecio: *$75.000* → 🔥 *$50.000 antes del próximo sábado* (hasta las 21hs)\n\n¿Qué es?\nHacemos que cuando alguien busque en Google \"lo que vos vendés + tu ciudad\", tu negocio aparezca PRIMERO.\n\n*¿Qué está incluido?*\n• Google Analytics: Te muestra cuántas personas visitan tu web, de dónde son, qué miran\n• Search Console: Te dice QUÉ PALABRAS usa la gente para encontrarte\n• Google Maps: Tu negocio aparece en el mapa con dirección, teléfono, fotos, horarios y reseñas\n• SEO Técnico: Optimizamos todo para que Google te \"quiera\" más y te muestre arriba\n• Aparecer rápido: Desde el día 1 te indexamos para que ya estés visible\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n📱 *OPCIÓN C: MANEJO DE REDES SOCIALES*\nPrecio: *$75.000/mes* → 🔥 *$50.000/mes antes del próximo sábado* (hasta las 21hs)\n\n¿Qué es?\nNos encargamos de tus redes sociales para que vos no tengas que hacerlo:\n\n*¿Qué está incluido?*\n• Creación de contenido (posteos, historias, reels)\n• Diseño gráfico de las publicaciones\n• Programación y publicación\n• Respuesta a comentarios y mensajes\n• Estrategia de contenido mensual\n• Reportes de cómo le está yendo a tu cuenta\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🤖 *OPCIÓN D: SISTEMA DE GESTIÓN + BOT ASISTENTE*\nPrecio: *$200.000* → 🔥 *$100.000 antes del próximo sábado* (hasta las 21hs)\n*+ entre $5.000 y $10.000 por mes de servidor*\n\n¿Qué es?\nUn sistema completo de gestión para tu negocio que incluye:\n\n*📊 Panel de Control:*\n• Vos ves todo desde un panel: quién escribió, qué preguntó, si compró\n• Gestión de turnos y reservas\n• Historial completo de conversaciones\n• Métricas de ventas y conversiones\n\n*🤖 Bot Asistente Inteligente (WhatsApp):*\nUn \"empleado virtual\" que atiende 24 horas. No es un bot tonto - está ENTRENADO con TU información y responde como si fueras vos.\n\n*¿Qué puede hacer el bot?*\n• Responder preguntas sobre precios, servicios, horarios (de día y de noche)\n• Agendar turnos automáticamente en tu agenda\n• Si el cliente manda foto de un comprobante, el bot lo ve y lo valida\n• Guiar al cliente hasta que compre o reserve\n\n*¿Por qué costo mensual?* El sistema necesita un servidor que nunca se apaga.\n\n*Incluye:* 6 meses de ajustes sin costo extra.\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🎁 *COMBO: TODO JUNTO*\nPrecio: *$320.000* → 🔥 *$215.000 antes del próximo sábado* (hasta las 21hs)\n*+ servidor + CM mensual*\n\nLlevate Web + Google + Sistema con Bot + Redes.\nAhorrás más de $105.000 vs comprarlos por separado.\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n⏰ *Los descuentos de abril aplican válidos hasta el próximo sábado a las 21 hrs.*\n\n🎯 *¿Por qué nosotros?*\nTodo lo que desarrollamos está pensado para que más personas que te contacten terminen siendo clientes reales.\n\n💬 ¿Tenés dudas? ¡Preguntame!",

            "🚀 *ESPECIAL ABRIL NEXTE 2025*\n\n💼 *¿Cómo puedo ayudarte a crecer?*\n\nTe cuento nuestros servicios de forma simple:\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🌐 *OPCIÓN A: PÁGINA WEB PROFESIONAL*\nInversión: *$75.000* → 💥 *$50.000 antes del próximo sábado* (oferta hasta las 21hs)\n\n¿De qué se trata?\nTu propio sitio web donde mostrar todo lo que ofrecés, tus trabajos, precios y forma de contacto.\n\n*Incluye:*\n• Diseño completo y personalizado\n• Dominio propio (tu nombre en internet)\n• Hosting (el lugar donde vive tu web)\n• Certificado de seguridad\n• Cambios ilimitados durante el primer año\n• Soporte técnico completo\n\n*Mantenimiento posterior:* $25.000 cada 3 meses.\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n📍 *OPCIÓN B: POSICIONAMIENTO EN GOOGLE*\nInversión: *$75.000* → 💥 *$50.000 antes del próximo sábado* (oferta hasta las 21hs)\n\n¿De qué se trata?\nQue cuando busquen en Google tu rubro + tu ciudad, aparezcas primero.\n\n*Incluye:*\n• Google Analytics: medí cuánta gente te visita y qué hacen\n• Search Console: descubrí qué palabras usan para buscarte\n• Google Maps: tu negocio visible con fotos, horarios y reseñas\n• SEO Técnico: optimizamos para que Google te posicione arriba\n• Indexación inmediata: estás visible desde el día 1\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n📱 *OPCIÓN C: GESTIÓN DE REDES SOCIALES*\nInversión: *$75.000/mes* → 💥 *$50.000/mes antes del próximo sábado* (oferta hasta las 21hs)\n\n¿De qué se trata?\nNosotros manejamos tus redes para que vos no tengas que preocuparte:\n\n*Incluye:*\n• Contenido creado por nosotros (posts, stories, reels)\n• Diseño profesional de publicaciones\n• Programación y subida automática\n• Atención de comentarios y mensajes\n• Plan de contenido mensual\n• Informes de rendimiento\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🤖 *OPCIÓN D: SISTEMA DE GESTIÓN CON BOT IA*\nInversión: *$200.000* → 💥 *$100.000 antes del próximo sábado* (oferta hasta las 21hs)\n*Más: $5.000 a $10.000/mes de servidor*\n\n¿De qué se trata?\nPlataforma completa para administrar tu negocio + asistente virtual inteligente.\n\n*📊 Sistema de Gestión:*\n• Panel donde ves todas las conversaciones\n• Control de turnos y agendas\n• Registro de clientes y ventas\n• Estadísticas en tiempo real\n\n*🤖 Asistente Virtual por WhatsApp:*\nNo parece robot - conversa naturalmente porque lo entrenamos con los datos de TU negocio.\n\n*Funciones del asistente:*\n• Atiende consultas 24/7 automáticamente\n• Agenda citas sin tu intervención\n• Valida comprobantes de pago (ve imágenes)\n• Acompaña al cliente hasta cerrar la venta\n\n*Nota:* El servidor es necesario para que funcione sin interrupciones.\n\n*Bonus:* 6 meses de soporte incluidos.\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🎁 *PAQUETE COMPLETO*\nInversión: *$320.000* → 💥 *$215.000 antes del próximo sábado* (oferta hasta las 21hs)\n*Más: servidor + CM mensuales*\n\nTodo incluido: Web + Google + Sistema IA + Redes.\nAhorrás $105.000 comprando junto.\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n⏰ *Descuento por abril válido válido hasta el próximo sábado a las 21 hrs.*\n\n🎯 *Nuestro diferencial:*\nNo vendemos solo diseño. Vendemos herramientas que convierten visitantes en clientes.\n\n💬 ¿Alguna duda? Escribime tranquilo.",

            "🔥 *OFERTAS DE ABRIL - NEXTE*\n\n🏢 *Servicios para hacer crecer tu negocio*\n\nSin tecnicismos, acá va:\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🌐 *OPCIÓN A: SITIO WEB COMPLETO*\nValor normal: *$75.000* → ⚡ *$50.000 antes del próximo sábado* (válido hasta las 21hs)\n\n¿Qué te damos?\nUn sitio web completo donde tus clientes pueden ver qué vendés, tus trabajos anteriores y contactarte fácil.\n\n*Todo esto incluido:*\n• Diseño hecho a medida\n• Tu dominio (.com.ar o .com)\n• Espacio en servidor (hosting)\n• Seguridad SSL activada\n• Modificaciones sin límite por 12 meses\n• Reparaciones si algo no funciona\n\n*Costo de mantenimiento:* $25.000 trimestrales a partir del año 2.\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n📍 *OPCIÓN B: APARECER EN GOOGLE*\nValor normal: *$75.000* → ⚡ *$50.000 antes del próximo sábado* (válido hasta las 21hs)\n\n¿Qué te damos?\nConfiguramos todo para que aparezcas cuando la gente busque negocios como el tuyo.\n\n*Todo esto incluido:*\n• Analytics configurado (sabés cuántos te visitan)\n• Search Console activo (sabés qué buscan)\n• Ficha de Google Maps optimizada\n• Trabajo técnico de SEO\n• Indexación rápida (Google te encuentra al toque)\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n📱 *OPCIÓN C: ADMINISTRACIÓN DE REDES*\nValor normal: *$75.000/mes* → ⚡ *$50.000/mes antes del próximo sábado* (válido hasta las 21hs)\n\n¿Qué te damos?\nManejamos Instagram, Facebook, TikTok por vos.\n\n*Todo esto incluido:*\n• Creamos el contenido (fotos, videos, textos)\n• Lo diseñamos profesionalmente\n• Lo publicamos en los mejores horarios\n• Respondemos a tu audiencia\n• Armamos estrategia cada mes\n• Te mostramos cómo crece tu cuenta\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🤖 *OPCIÓN D: PLATAFORMA + ASISTENTE VIRTUAL*\nValor normal: *$200.000* → ⚡ *$100.000 antes del próximo sábado* (válido hasta las 21hs)\n*Costo adicional: $5.000-$10.000/mes de servidor*\n\n¿Qué te damos?\nSistema de gestión empresarial + bot inteligente para WhatsApp.\n\n*📊 Lo que incluye la plataforma:*\n• Dashboard completo (ves todo lo que pasa)\n• Calendario de turnos integrado\n• Base de datos de clientes\n• Reportes automáticos\n\n*🤖 Lo que hace el bot:*\nAtiende a tus clientes automáticamente por WhatsApp como si fueras vos.\n\n*Capacidades del bot:*\n• Responde consultas las 24 horas\n• Toma turnos solo\n• Verifica pagos (analiza capturas)\n• Conduce ventas de principio a fin\n\n*Aclaración:* El costo mensual es por el servidor (computadora que lo mantiene activo).\n\n*Plus:* Mantenimiento gratis por medio año.\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🎁 *PACK TOTAL*\nValor normal: *$320.000* → ⚡ *$215.000 antes del próximo sábado* (válido hasta las 21hs)\n*Más: costos mensuales de servidor y CM*\n\nIncluye: Web + Google + Sistema + Redes.\nDescuento de $105.000 en el paquete.\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n⏰ *Condición: Los precios rebajados son únicamente válidos hasta el próximo sábado a las 21 hrs.*\n\n🎯 *Lo que nos diferencia:*\nHacemos soluciones que generan ventas reales, no solo diseño lindo.\n\n💬 Cualquier consulta, estoy acá.",

            "💥 *PROMO ABRIL - ABRIL NEXTE*\n\n🏢 *¿Qué necesita tu negocio para crecer?*\n\nTe explico cada servicio sin vueltas:\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🌐 *SERVICIO 1: WEB PROFESIONAL*\nPrecio lista: *$75.000* → 🎯 *$50.000 antes del próximo sábado* (hasta las 21hs)\n\n¿En qué consiste?\nSitio web donde mostrar servicios, portfolio, precios y recibir contactos.\n\n*Lo que incluye el precio:*\n• Diseño personalizado completo\n• Nombre de dominio incluido\n• Alojamiento web (hosting)\n• Certificado de seguridad https\n• Actualizaciones ilimitadas x 1 año\n• Asistencia técnica permanente\n\n*Post primer año:* $25.000 cada 3 meses de mantenimiento.\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n📍 *SERVICIO 2: VISIBILIDAD GOOGLE*\nPrecio lista: *$75.000* → 🎯 *$50.000 antes del próximo sábado* (hasta las 21hs)\n\n¿En qué consiste?\nTrabajo completo para que tu negocio aparezca en las primeras posiciones de Google.\n\n*Lo que incluye el precio:*\n• Instalación de Google Analytics\n• Configuración de Search Console\n• Optimización de Google Maps\n• Trabajo SEO técnico profesional\n• Indexación prioritaria\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n📱 *SERVICIO 3: COMMUNITY MANAGEMENT*\nPrecio lista: *$75.000/mes* → 🎯 *$50.000/mes antes del próximo sábado* (hasta las 21hs)\n\n¿En qué consiste?\nGestión profesional de todas tus redes sociales.\n\n*Lo que incluye el precio:*\n• Generación de contenido original\n• Diseño gráfico para cada post\n• Calendario de publicaciones\n• Engagement con seguidores\n• Planificación estratégica mensual\n• Métricas de crecimiento\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🤖 *SERVICIO 4: ECOSISTEMA + BOT INTELIGENTE*\nPrecio lista: *$200.000* → 🎯 *$100.000 antes del próximo sábado* (hasta las 21hs)\n*Adicional: $5.000 a $10.000 mensuales de infraestructura*\n\n¿En qué consiste?\nPlataforma de gestión empresarial integrada con asistente de IA por WhatsApp.\n\n*📊 Módulo de gestión:*\n• Panel centralizado de operaciones\n• Sistema de agendamiento\n• CRM de clientes\n• Analytics de conversión\n\n*🤖 Módulo de IA conversacional:*\nAsistente que conversa naturalmente porque está capacitado con información específica de tu empresa.\n\n*Acciones que realiza:*\n• Atiende consultas automáticamente\n• Gestiona agenda de reuniones\n• Procesa comprobantes (visión artificial)\n• Guía proceso de compra completo\n\n*Importante:* Requiere servidor dedicado para operar 24/7.\n\n*Garantía:* 180 días de soporte sin cargo.\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🎁 *BUNDLE EMPRESARIAL*\nPrecio lista: *$320.000* → 🎯 *$215.000 antes del próximo sábado* (hasta las 21hs)\n*Adicional: mensualidades de servidor y CM*\n\nConjunto completo: Web + Google + IA + Redes.\nBeneficio: $105.000 menos que contratándolos separados.\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n⏰ *Importante: Descuentos aplicables únicamente con confirmación antes del próximo sábado a las 21 hrs.*\n\n🎯 *Propuesta de valor:*\nDiseñamos soluciones orientadas a conversión, no solo estética.\n\n💬 ¿Necesitás más info? Consultame sin compromiso.",

            "✨ *ABRIL NEXTE - OFERTAS ABRIL 2025*\n\n🏢 *Soluciones digitales para tu negocio*\n\nExplicado de forma clara:\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🌐 *ALTERNATIVA A: DESARROLLO WEB*\nTarifa regular: *$75.000* → 🌟 *$50.000 antes del próximo sábado* (descuento hasta 21hs)\n\n¿Qué obtenes?\nPágina web completa donde presentar tu empresa, servicios, trabajos y vías de contacto.\n\n*Incluido en el servicio:*\n• Desarrollo y diseño integral\n• Dominio web propio\n• Servidor de alojamiento\n• Protocolo seguro SSL\n• Mantenimiento incluido 12 meses\n• Soporte ante problemas técnicos\n\n*Renovación anual:* $25.000 por trimestre desde el mes 13.\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n📍 *ALTERNATIVA B: SEO + GOOGLE MAPS*\nTarifa regular: *$75.000* → 🌟 *$50.000 antes del próximo sábado* (descuento hasta 21hs)\n\n¿Qué obtenes?\nOptimización completa para búsquedas locales en Google.\n\n*Incluido en el servicio:*\n• Google Analytics operativo\n• Search Console conectada\n• Perfil Google Maps completo\n• Optimización SEO on-page\n• Alta en motores de búsqueda\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n📱 *ALTERNATIVA C: REDES SOCIALES*\nTarifa regular: *$75.000/mes* → 🌟 *$50.000/mes antes del próximo sábado* (descuento hasta 21hs)\n\n¿Qué obtenes?\nAdministración total de presencia en redes.\n\n*Incluido en el servicio:*\n• Producción de contenido multimedia\n• Identidad visual coherente\n• Publicación programada\n• Gestión de comunidad\n• Estrategia de contenidos\n• Reportería mensual\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🤖 *ALTERNATIVA D: SISTEMA EMPRESARIAL + IA*\nTarifa regular: *$200.000* → 🌟 *$100.000 antes del próximo sábado* (descuento hasta 21hs)\n*Mantenimiento: $5.000-$10.000 mensuales*\n\n¿Qué obtenes?\nSoftware de gestión a medida con inteligencia artificial integrada.\n\n*📊 Sistema de administración:*\n• Interfaz de control total\n• Módulo de citas y turnos\n• Historial de interacciones\n• Indicadores de performance\n\n*🤖 Asistente virtual WhatsApp:*\nAlgoritmo entrenado específicamente para tu industria que simula conversación humana.\n\n*Funcionalidades:*\n• Atención continua sin horarios\n• Reservas automatizadas\n• Validación de transferencias\n• Cierre asistido de ventas\n\n*Requerimiento técnico:* Infraestructura cloud permanente.\n\n*Bonus:* Ajustes incluidos por 6 meses.\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🎁 *SOLUCIÓN INTEGRAL*\nTarifa regular: *$320.000* → 🌟 *$215.000 antes del próximo sábado* (descuento hasta 21hs)\n*Mantenimiento: mensuales según servicios*\n\nPaquete: Web + SEO + IA + Redes.\nAhorro: $105.000 en pack vs individual.\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n⏰ *Condición: Tarifas promocionales válidas exclusivamente para transacciones concretadas antes del próximo sábado a las 21 hrs.*\n\n🎯 *Filosofía de trabajo:*\nDesarrollamos activos digitales enfocados en ROI y conversión efectiva.\n\n💬 ¿Dudas? Hablemos.",

            "🎊 *CELEBRAMOS NUESTRO ABRIL*\n\n🏢 *¿Cómo podemos impulsar tu negocio?*\n\nSin tecnicismos, directo al punto:\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🌐 *PRODUCTO 1: SITIO WEB CORPORATIVO*\nValor: *$75.000* → 💎 *$50.000 antes del próximo sábado* (promo hasta las 21hs)\n\n¿Qué recibís?\nWeb profesional con toda tu información comercial disponible online.\n\n*Componentes incluidos:*\n• Diseño según tu marca\n• Dirección web (dominio)\n• Almacenamiento en la nube\n• Encriptación y seguridad\n• Ediciones sin cargo por 1 año\n• Resolución de incidencias\n\n*A partir del año 2:* $25.000 trimestrales.\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n📍 *PRODUCTO 2: MARKETING EN BUSCADORES*\nValor: *$75.000* → 💎 *$50.000 antes del próximo sábado* (promo hasta las 21hs)\n\n¿Qué recibís?\nPosicionamiento estratégico en resultados de Google.\n\n*Componentes incluidos:*\n• Herramientas analíticas Google\n• Consola de búsqueda activa\n• Presencia en Google Maps\n• Optimización SEO completa\n• Rastreo acelerado por Google\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n📱 *PRODUCTO 3: MARKETING DE CONTENIDOS*\nValor: *$75.000/mes* → 💎 *$50.000/mes antes del próximo sábado* (promo hasta las 21hs)\n\n¿Qué recibís?\nEquipo dedicado a tus plataformas sociales.\n\n*Componentes incluidos:*\n• Redacción y producción audiovisual\n• Línea gráfica profesional\n• Automatización de posteos\n• Moderación de audiencia\n• Plan editorial mensual\n• Dashboard de resultados\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🤖 *PRODUCTO 4: SUITE EMPRESARIAL CON IA*\nValor: *$200.000* → 💎 *$100.000 antes del próximo sábado* (promo hasta las 21hs)\n*Infraestructura: $5.000-$10.000/mes*\n\n¿Qué recibís?\nPlataforma integral de gestión comercial con automatización inteligente.\n\n*📊 Core del sistema:*\n• Centro de comando unificado\n• Agenda digital sincronizada\n• Base de contactos integrada\n• Estadísticas en vivo\n\n*🤖 Capa de IA:*\nAgente conversacional entrenado con los datos y procesos de tu empresa.\n\n*Capacidades del agente:*\n• Servicio al cliente 24/7/365\n• Coordinación de agendas\n• Verificación de pagos\n• Nurturing de leads\n\n*Aclaración:* Requiere servidor cloud para funcionamiento ininterrumpido.\n\n*Incluye:* Medio año de actualizaciones.\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🎁 *ECOSISTEMA COMPLETO*\nValor: *$320.000* → 💎 *$215.000 antes del próximo sábado* (promo hasta las 21hs)\n*Infraestructura: según uso*\n\nIncluye: Web + SEO + IA + Social Media.\nReducción: $105.000 vs compra modular.\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n⏰ *Requisito: Precios promocionales aplicables solo con pago efectuado antes del próximo sábado a las 21 hrs.*\n\n🎯 *Metodología:*\nConstruimos herramientas de crecimiento medible, no solo presencia digital.\n\n💬 Consultas: disponible ahora.",

            "🎉 *ABRIL 2025 - PROMO ESPECIAL*\n\n🏢 *Herramientas digitales para crecer*\n\nExplicado simple:\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🌐 *OPCIÓN 1: TU SITIO EN INTERNET*\nPrecio normal: *$75.000* → 🔥 *$50.000 antes del próximo sábado* (hasta 21hs)\n\n¿Qué es exactamente?\nTu propia página donde mostrar todo: servicios, galería, precios, contacto.\n\n*Qué está incluido:*\n• Diseño hecho para vos\n• Tu dirección web (.com/.com.ar)\n• Lugar donde se aloja (hosting)\n• Seguridad activada (https)\n• Cambios gratis durante un año\n• Ayuda si algo falla\n\n*Desde el segundo año:* $25.000 cada 3 meses.\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n📍 *OPCIÓN 2: SALIR PRIMERO EN GOOGLE*\nPrecio normal: *$75.000* → 🔥 *$50.000 antes del próximo sábado* (hasta 21hs)\n\n¿Qué es exactamente?\nConfiguramos todo para que cuando busquen tu rubro, te vean primero.\n\n*Qué está incluido:*\n• Analytics (cuántos entran a tu web)\n• Search Console (qué buscan)\n• Maps (con fotos y datos)\n• SEO técnico (que Google te prefiera)\n• Te hacemos visible rápido\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n📱 *OPCIÓN 3: MANEJAR TUS REDES*\nPrecio normal: *$75.000/mes* → 🔥 *$50.000/mes antes del próximo sábado* (hasta 21hs)\n\n¿Qué es exactamente?\nNosotros publicamos, diseñamos y respondemos en tus redes.\n\n*Qué está incluido:*\n• Hacemos el contenido\n• Lo diseñamos lindo\n• Lo subimos en horarios clave\n• Respondemos comentarios\n• Armamos plan de qué publicar\n• Te mostramos los números\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🤖 *OPCIÓN 4: SISTEMA + CHATBOT INTELIGENTE*\nPrecio normal: *$200.000* → 🔥 *$100.000 antes del próximo sábado* (hasta 21hs)\n*Plus: $5.000-$10.000/mes de servidor*\n\n¿Qué es exactamente?\nSoftware propio para tu negocio + un asistente que atiende por WhatsApp automático.\n\n*📊 Parte de gestión:*\n• Panel donde ves todo\n• Turnos organizados\n• Registro de clientes\n• Números de rendimiento\n\n*🤖 Parte del bot:*\nResponde como humano porque lo entrenamos con tu info.\n\n*Qué hace:*\n• Atiende a cualquier hora\n• Toma turnos solo\n• Revisa comprobantes\n• Ayuda a cerrar ventas\n\n*Dato:* El servidor es la \"casa\" donde vive el bot 24/7.\n\n*Regalo:* 6 meses de mejoras gratis.\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🎁 *TODO EN UNO*\nPrecio normal: *$320.000* → 🔥 *$215.000 antes del próximo sábado* (hasta 21hs)\n*Plus: servidor + redes mensuales*\n\nPack: Web + Google + Sistema + Redes.\nTe ahorrás: $105.000.\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n⏰ *Ojo: El precio rebajado es válido hasta el próximo sábado a las 21 hrs.*\n\n🎯 *Por qué elegirnos:*\nHacemos cosas que te traen clientes de verdad, no solo diseño.\n\n💬 ¿Preguntas? Dale, escribime.",

            "💫 *OFERTAS POR ABRIL NEXTE*\n\n🏢 *Acelerá el crecimiento de tu empresa*\n\nMirá lo que tenemos:\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🌐 *PLAN A: PRESENCIA WEB*\nInversión: *$75.000* → ⚡ *$50.000 antes del próximo sábado* (oferta hasta 21hs)\n\n¿Qué obtenés?\nSitio web completo para mostrar tu negocio profesionalmente.\n\n*Todo incluido:*\n• Desarrollo personalizado\n• Nombre de dominio\n• Espacio en servidor\n• Candado de seguridad\n• Actualizaciones por 12 meses\n• Soporte permanente\n\n*Mantenimiento:* $25.000 trimestrales después del año 1.\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n📍 *PLAN B: DOMINAR GOOGLE*\nInversión: *$75.000* → ⚡ *$50.000 antes del próximo sábado* (oferta hasta 21hs)\n\n¿Qué obtenés?\nAparecer arriba cuando busquen negocios como el tuyo.\n\n*Todo incluido:*\n• Analytics configurado\n• Search Console activo\n• Ficha Google Maps completa\n• SEO técnico aplicado\n• Indexación prioritaria\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n📱 *PLAN C: SOCIAL MEDIA*\nInversión: *$75.000/mes* → ⚡ *$50.000/mes antes del próximo sábado* (oferta hasta 21hs)\n\n¿Qué obtenés?\nGestión integral de tus canales de comunicación.\n\n*Todo incluido:*\n• Contenido multimedia\n• Diseño y branding\n• Grilla de publicaciones\n• Community management\n• Estrategia digital\n• Informes mes a mes\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🤖 *PLAN D: AUTOMATIZACIÓN 360°*\nInversión: *$200.000* → ⚡ *$100.000 antes del próximo sábado* (oferta hasta 21hs)\n*Servidor: $5.000-$10.000/mes*\n\n¿Qué obtenés?\nInfraestructura de software propia + Inteligencia Artificial.\n\n*📊 Software de Gestión:*\n• Control total del negocio\n• Agenda inteligente\n• Base de datos CRM\n• Métricas de negocio\n\n*🤖 Bot de IA:*\n• Entendido del negocio\n• Atención inmediata\n• Cierre de ventas\n• Validación de pagos\n\n*Soporte:* 6 meses de cambios incluidos.\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🎁 *TRANSFORMACIÓN TOTAL*\nInversión: *$320.000* → ⚡ *$215.000 antes del próximo sábado* (oferta hasta 21hs)\n*Extras: servidor + CM*\n\nPaquete full: Web + SEO + IA + Redes.\nAhorrás $105.000 en total.\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n⏰ *Atención: Valores promocionales vigentes hasta el próximo sábado a las 21 hrs.*\n\n🎯 *Nuestro foco:*\nResultados medibles y retorno de inversión.\n\n💬 ¿Te interesa algún plan? Avisame.",

            "🌟 *PROMO ABRIL - VÁLIDA HASTA EL SÁBADO*\n\n🏢 *Todo lo que necesitás en un solo lugar*\n\nNuestras opciones explicadas:\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🌐 *MÓDULO WEB*\nPrecio: *$75.000* → 🔥 *$50.000 hoy* (hasta 21hs)\n\nTu página \"tunegocio punto com punto ar\".\n• Diseño + dominio + hosting + SSL\n• 1 año de cambios y soporte\n• Renovación trimestral económica\n• Ejemplos reales disponibles\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n📍 *MÓDULO GOOGLE*\nPrecio: *$75.000* → 🔥 *$50.000 hoy* (hasta 21hs)\n\nPosicionamiento local fuerte.\n• Analytics + Search Console + Maps\n• SEO técnico avanzado\n• Indexación acelerada\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n📱 *MÓDULO REDES*\nPrecio: *$75.000/mes* → 🔥 *$50.000/mes hoy* (hasta 21hs)\n\nGestión profesional de perfiles.\n• Contenidos + diseños + publicación\n• Respuestas + estrategia + reportes\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🤖 *MÓDULO IA + GESTIÓN*\nPrecio: *$200.000* → 🔥 *$100.000 hoy* (hasta 21hs)\n*Servidor externo: $5k-$10k/mes*\n\nSistema completo para tu empresa.\n• Responde natural + Menús selección\n• Analiza pagos + Agenda turnos\n• Dashboard de control\n• 6 meses ajustes gratis\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🎁 *SUITE EMPRESARIAL (PACK)*\nPrecio: *$320.000* → 🔥 *$215.000 hoy* (hasta 21hs)\n*Servidor + redes aparte*\n\nLlevate todo y ahorrá $105.000.\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n⏰ *Solo válido antes del próximo sábado a las 21 hrs.*\n\n🎯 *Objetivo:* Vender más y mejor.\n\n💬 ¿Dudas? Consultame.",

            "🚀 *ABRIL 2025 - OFERTAS LIMITADAS*\n\n🏢 *Soluciones reales para tu emprendimiento*\n\nElegí lo que te sirva:\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🌐 *DESARROLLO WEB* ($75k → *$50k*)\nTu página completa. Incluye diseño, hosting, dominio, seguridad. Cambios gratis por 1 año. Mantenimiento bajo desde el segundo año. ¡Todo resuelto!\n\n📍 *POSICIONAMIENTO MAPS + SEO* ($75k → *$50k*)\nQue te encuentren fácil. Analytics, Maps optimizado, SEO técnico. Aparecé primero en las búsquedas de tu zona.\n\n📱 *GESTIÓN REDES SOCIALES* ($75k → *$50k/mes*)\nNos ocupamos de todo: Contenido, diseño, publicación, respuestas y reportes mensuales. Tu marca siempre activa.\n\n🤖 *TECNOLOGÍA + IA* ($200k → *$100k*)\nSistema de gestión propio + Bot de WhatsApp que vende por vos. Responde, agenda, valida pagos. 6 meses de cambios gratis. (Costo extra de servidor).\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🎁 *PAQUETE INTEGRAL* ($320k → *$215k*)\nPrecio especial por contratar todo el ecosistema junto. Ahorrás $105.000.\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n⏰ *Recordá: Precios congelados válidos hasta el próximo sábado a las 21 hrs.*\n\n🎯 *Nexte:* Tecnología que hace crecer tu facturación.\n\n💬 Preguntame lo que necesites."
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

        return [msg1, msg2, msg3, msg5];
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
