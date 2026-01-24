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

        // PROPUESTAS DE VALOR - PROMO INICIO 2025 (Variantes anti-spam, mismos precios)
        this.propuestas = [
            "🎉 PROMOS 2025:\n• Web: $20.000 + dominio $14.000 (2 meses free)\n• Medición Full: $75.000\n• CM: $75.000/mes (Pack trimestral)",
            "🚀 Oportunidad Enero:\n• Sitio Web: $20.000 iniciales + dominio\n• Setup Analytics: $75.000 fijo\n• Manejo Redes: $75.000 mensuales x3",
            "💥 PACK INICIO:\n• Tu Web: $20k + dominio (Hosting gratis 2 meses)\n• Datos y Métricas: $75k único pago\n• Community Manager: $75k por mes",
            "🎯 Oferta Especial:\n• Diseño Web: $20.000 + costo dominio\n• Auditoría Medición: $75.000\n• Gestión Redes: $75.000 mensual (promo 3 meses)",
            "⚡ PLAN 2025:\n• Web completa: $20k + $14k dominio\n• Pack Medición: $75k final\n• CM y Contenido: $75k al mes x3",
            "🔥 Promo Digital:\n• Desarrollo Web: $20.000 (luego $20k/mes)\n• Configuración GA4: $75.000\n• Redes Sociales: $75.000/mes x 3 meses",
            "✨ Propuesta Enero:\n• Web Pro: $20k + dominio $14k\n• Kit Medición: $75k\n• CM Completo: $75k mensual",
            "🎁 Beneficio 2025:\n• Web: $20.000 (2 meses bonificados)\n• Analytics + GTM: $75.000\n• Community Pack: $75.000 mensual",
            "💪 Arrancá con todo:\n• Web: $20k base + dominio\n• Medición: $75k setup\n• CM: $75k/mes (ahorro real)",
            "🌟 Promo Año Nuevo:\n• Web nueva: $20.000 + dominio\n• Medición total: $75.000\n• Redes: $75.000 por mes",
            "🚀 Pack Aceleración:\n• Web: $20k + dominio\n• Métricas: $75k\n• CM: $75k mensual (3 meses)",
            "🎉 Oferta Limitada:\n• Web: $20.000 + $14.000 (dominio)\n• Medición Avanzada: $75.000\n• Community: $75.000/mes x3",
            "💥 Tu negocio online:\n• Web: $20k inicio (hosting free 2 meses)\n• Analytics: $75k\n• Redes: $75k mensual",
            "⭐ Promo Exclusiva:\n• Sitio: $20.000 + dominio\n• Setup Datos: $75.000\n• Social Media: $75.000/mes x3",
            "🔥 Digital 2025:\n• Web: $20k + dominio\n• Medición: $75k\n• CM: $75k mensual (plan trimestral)",
            "✨ Pack Crecimiento:\n• Web: $20.000 (+ $14k dominio)\n• Auditoría: $75.000\n• Gestión RRSS: $75.000/mes",
            "🎯 Objetivo Venta:\n• Web: $20k + dominio\n• Tracking: $75k\n• Contenido Redes: $75k mes",
            "💪 Plan Despegue:\n• Web: $20.000 base\n• Config Medición: $75.000\n• Community: $75.000 mensual",
            "🌟 Solución Total:\n• Web: $20k + dominio\n• Analytics: $75k\n• CM: $75k por mes (x3)",
            "🎁 Promo Lanzamiento:\n• Web: $20.000 + dominio\n• Medición: $75.000\n• Redes: $75.000 mensual",
            "⚡ Pack Enero:\n• Web: $20k + dominio\n• Métricas: $75k\n• CM: $75k/mes",
            "🚀 Impulso Digital:\n• Web: $20.000 + dominio\n• Setup GA4: $75.000\n• Social: $75.000/mes x3",
            "🎉 Promo Verano:\n• Web: $20k + dominio\n• Medición: $75k\n• CM: $75k mensual",
            "💥 Todo en uno:\n• Web: $20.000 + dominio\n• Datos: $75.000\n• Redes: $75.000/mes",
            "⭐ Pack Pyme:\n• Web: $20k (2 meses free)\n• Medición: $75k\n• CM: $75k mensual",
            "🔥 Oferta Web+Redes:\n• Web: $20k + dominio\n• Analytics: $75k\n• CM: $75k/mes x3",
            "✨ Año Nuevo:\n• Web: $20.000 + dominio\n• Medición: $75.000\n• CM: $75.000 mes",
            "🎯 Plan Acción:\n• Web: $20k + dominio\n• Tracking: $75k\n• CM: $75k mensual",
            "💪 Promo Full:\n• Web: $20.000 + dominio\n• Medición: $75.000\n• Redes: $75.000/mes",
            "🌟 Pack Digital:\n• Web: $20k + dominio\n• Analytics: $75k\n• CM: $75k mensual"
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
