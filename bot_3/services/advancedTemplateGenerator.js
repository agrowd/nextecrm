const axios = require('axios');

class AdvancedTemplateGenerator {
    constructor() {
        this.backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';

        // ============ CATEGORY DETECTION KEYWORDS ============
        this.categoryKeywords = {
            salud: [
                'doctor', 'médico', 'medico', 'clínica', 'clinica', 'hospital', 'dentista', 'odontólogo', 'odontologo',
                'odontología', 'odontologia', 'kinesiólogo', 'kinesiologia', 'kinesiologo', 'fisioterapia', 'fisioterapeuta',
                'psicólogo', 'psicologo', 'psicología', 'nutricionista', 'veterinario', 'veterinaria', 'farmacia',
                'laboratorio', 'traumatólogo', 'dermatólogo', 'dermatologo', 'pediatra', 'ginecólogo', 'oftalmólogo',
                'consultorio', 'salud', 'medicina', 'sanatorio', 'óptica', 'optica'
            ],
            gastronomia: [
                'restaurant', 'restaurante', 'bar', 'café', 'cafe', 'cafetería', 'cafeteria', 'pizzería', 'pizzeria',
                'parrilla', 'sushi', 'delivery', 'comida', 'cocina', 'catering', 'heladería', 'heladeria',
                'pastelería', 'pasteleria', 'panadería', 'panaderia', 'food', 'burger', 'hamburguesería', 'hamburgueseria',
                'cervecería', 'cerveceria', 'bodegón', 'bodegon', 'resto', 'trattoria', 'empanadas'
            ],
            belleza_fitness: [
                'gym', 'gimnasio', 'crossfit', 'pilates', 'yoga', 'fitness', 'entrenamiento', 'personal trainer',
                'peluquería', 'peluqueria', 'barbería', 'barberia', 'barber', 'spa', 'estética', 'estetica',
                'manicura', 'depilación', 'depilacion', 'maquillaje', 'beauty', 'salón', 'salon', 'uñas', 'cejas',
                'pestañas', 'masajes', 'cosmetología', 'cosmetologia', 'box', 'natación', 'centro de estética'
            ],
            comercio: [
                'tienda', 'shop', 'store', 'venta', 'comercio', 'local', 'boutique', 'ropa', 'indumentaria',
                'calzado', 'zapatos', 'accesorios', 'joyería', 'joyeria', 'relojería', 'librería', 'libreria',
                'juguetería', 'jugueteria', 'ferretería', 'ferreteria', 'bazar', 'mueblería', 'muebles',
                'colchonería', 'electrodomésticos', 'cotillón', 'distribuidora', 'mayorista', 'minorista'
            ],
            servicios: [
                'abogado', 'abogados', 'estudio jurídico', 'estudio contable', 'contador', 'inmobiliaria', 'propiedades',
                'seguros', 'productor de seguros', 'taller', 'mecánico', 'mecanico', 'chapa y pintura', 'gomería',
                'electricista', 'plomero', 'cerrajería', 'cerrajeria', 'mudanzas', 'limpieza', 'fumigación',
                'arquitecto', 'constructora', 'imprenta', 'diseño', 'gestoría', 'concesionaria'
            ]
        };

        // ============ MENSAJE 1: COMPONENTES MODULARES (ANTI-SPAM) ============

        // 1. Saludos iniciales (30 variantes)
        this.saludos = [
            "¡Hola! Te escribe Juan Cruz de Nexte Marketing.",
            "¡Buen día! Soy Juan Cruz de Nexte Marketing.",
            "¡Buenas tardes! Te saluda Juan Cruz de Nexte Marketing.",
            "¡Hola! ¿Cómo estás? Soy Juan Cruz de Nexte Marketing.",
            "¡Qué tal! Te habla Juan Cruz de Nexte Marketing.",
            "¡Hola! Juan Cruz de Nexte Marketing por acá.",
            "¡Buenas! Te escribe Juan Cruz desde Nexte Marketing.",
            "¡Hola! Te contacta Juan Cruz de Nexte Marketing.",
            "¡Buen día! Juan Cruz de Nexte Marketing saludando.",
            "¡Buenas tardes! Soy Juan Cruz de Nexte Marketing.",
            "¡Hola! Soy Juan Cruz de Nexte Marketing, te robo un segundito.",
            "¡Qué tal! Soy Juan Cruz de Nexte Marketing.",
            "¡Hola! Un gusto saludarte, soy Juan Cruz de Nexte Marketing.",
            "¡Hola! Te escribe Juan Cruz de Nexte.",
            "¡Buen día! Soy Juan Cruz de la agencia Nexte Marketing.",
            "¡Buenas! Soy Juan Cruz de Nexte Marketing.",
            "¡Hola! Juan Cruz de Nexte por acá.",
            "¡Qué tal! Te saluda Juan Cruz de Nexte Marketing.",
            "¡Hola! Te contacto desde Nexte Marketing, soy Juan Cruz.",
            "¡Buen día! Te escribe Juan Cruz de Nexte Marketing.",
            "¡Hola! Soy Juan Cruz, director en Nexte Marketing.",
            "¡Buenas tardes! Juan Cruz de Nexte Marketing por acá.",
            "¡Hola! Un saludo, soy Juan Cruz de Nexte Marketing.",
            "¡Qué tal! Soy Juan Cruz del equipo de Nexte Marketing.",
            "¡Hola! Te escribe Juan Cruz de Nexte Marketing.",
            "¡Buen día! Soy Juan Cruz de Nexte Marketing.",
            "¡Hola! Por acá Juan Cruz de Nexte Marketing.",
            "¡Buenas! Te saluda Juan Cruz de Nexte Marketing.",
            "¡Hola! Soy Juan Cruz de Nexte.",
            "¡Qué tal! Juan Cruz de Nexte Marketing por acá."
        ];

        // 2. Reconocimiento del Negocio y Datos Scrapeados (Maps / Reviews / Ubicación)
        this.introsConRating = [
            "Vi su ficha de *{negocio}* en Google Maps y me llamó mucho la atención su excelente calificación de {rating} estrellas con más de {reviewCount} opiniones.",
            "Estaba buscando negocios destacados en {ubicacion} y me encontré con *{negocio}*, con {rating} puntos en Google Maps y muy buenas reseñas de sus clientes.",
            "Me crucé con *{negocio}* en Maps y noté que tienen una sólida reputación de {rating} estrellas con {reviewCount} opiniones en la zona.",
            "Vi su perfil de *{negocio}* en Google Maps con {rating} estrellas y se nota el gran trabajo que hacen en {ubicacion}.",
            "Estuve revisando perfiles de {rubro} en {ubicacion} y vi que *{negocio}* tiene {rating} estrellas y muy buenos comentarios en Maps."
        ];

        this.introsSinRating = [
            "Vi su perfil comercial de *{negocio}* en Google Maps buscando negocios en {ubicacion}.",
            "Estaba buscando opciones destacadas de {rubro} en {ubicacion} y me llamó la atención la ficha de *{negocio}*.",
            "Me crucé con *{negocio}* en Google Maps y me pareció muy interesante lo que ofrecen en {ubicacion}.",
            "Encontré la ficha de *{negocio}* en internet y quise escribirles directo.",
            "Estuve viendo negocios de su rubro en la zona de {ubicacion} y vi el perfil de *{negocio}* en Maps."
        ];

        // 3. Observaciones Técnicas Web (Scraper / Web Audit)
        this.observacionesSinWeb = [
            "Noté en su perfil de Maps que aún no tienen una página web oficial cargada para que la gente vea sus servicios y consulte directo.",
            "Vi que en Maps todavía no tienen un sitio web vinculado para canalizar las búsquedas que reciben en Google.",
            "Noté que no tienen una web propia agregada en su ficha de Maps para presentar sus especialidades y precios."
        ];

        this.observacionesConWebSinWA = [
            "Estuve viendo su web ({website}) y noté que no cuentan con un botón flotante de WhatsApp directo para captar consultas al instante.",
            "Entré a su sitio ({website}) y vi que les falta una integración de WhatsApp visible para que los visitantes les escriban en 1 clic.",
            "Revisé su página web ({website}) y noté que no tienen botón de WhatsApp directo para no perder clientes que navegan desde el celular."
        ];

        this.observacionesConWebGeneral = [
            "Estuve navegando su web ({website}) y veo que tienen una base muy interesante para captar más consultas.",
            "Vi que ya cuentan con presencia online en su web ({website}) y se le pueden sumar herramientas clave de automatización.",
            "Revisé su sitio web ({website}) y noté varias oportunidades para multiplicar las conversiones de quienes entran."
        ];

        this.observacionesGenerales = [
            "Veo que tienen una muy buena base en la zona para captar muchas más consultas directas.",
            "Noté que tienen un gran potencial para automatizar la atención y conseguir más clientes desde internet.",
            "Veo una oportunidad clara para optimizar sus canales digitales y facilitar que la gente los contacte rápido."
        ];

        // ============ MENSAJE 2: PRESENTACIÓN Y VALOR POR CATEGORÍA ============

        this.presentacionesPorCategoria = {
            salud: [
                "En Nexte llevamos más de 10 años desarrollando software a medida, sistemas de turnos médicos online y asistentes inteligentes de WhatsApp para consultorios y clínicas. Ayudamos a reducir un 40% el ausentismo de pacientes con confirmaciones automáticas y liberamos a recepción de responder las mismas consultas todo el día.",
                "En Nexte nos especializamos en digitalizar centros de salud y consultorios. Implementamos agendas online, recordatorios automáticos de turnos por WhatsApp y fichas de pacientes para que no pierdan tiempo con llamadas ni mensajes manuales.",
                "En Nexte ayudamos a profesionales de la salud a ordenar su atención. Con nuestro asistente virtual de WhatsApp y sistema de turnos, los pacientes pueden agendar 24/7 y recibir recordatorios automáticos sin sobrecargar al personal.",
                "Desde Nexte Marketing trabajamos con clínicas y consultorios creando sistemas de agendamiento inteligente y asistentes de WhatsApp con IA que responden preguntas frecuentes, dan indicaciones de turnos y validan órdenes en automático."
            ],
            gastronomia: [
                "En Nexte llevamos más de 10 años desarrollando cartas digitales interactivas con QR, sistemas de pedidos directos a WhatsApp y posicionamiento en Google Maps para locales gastronómicos. El objetivo es que aumenten sus pedidos directos ahorrando las altas comisiones de apps como PedidosYa o Rappi.",
                "En Nexte ayudamos a restaurantes, bares y cafeterías a automatizar su atención. Creamos menúes digitales QR, asistentes de WhatsApp que toman pedidos en automático 24/7 y optimizamos su ficha de Maps para que sean la primera opción en la zona.",
                "Desde Nexte creamos soluciones gastronómicas a medida: catálogo online, bot de toma de pedidos por WhatsApp que calcula totales y reservas de mesas automáticas para no perder clientes en horas pico.",
                "En Nexte nos enfocamos en que tu local gastronómico facture más: carta digital sin comisiones, bot inteligente en WhatsApp para delivery y campañas locales en Maps para llenar mesas todos los días."
            ],
            belleza_fitness: [
                "En Nexte llevamos más de 10 años creando software de gestión de socios/turnos y asistentes virtuales de WhatsApp con IA para gimnasios, centros de estética y salones. Ayudamos a automatizar la respuesta de precios, planes y turnos las 24hs, incluso cuando el local está cerrado.",
                "En Nexte ayudamos a centros de estética y fitness a no perder ventas por demoras en responder. Nuestro asistente de WhatsApp con IA atiende al instante, explica tratamientos o planes, agenda citas y valida comprobantes de pago automáticamente.",
                "Desde Nexte implementamos sistemas de turnos online y bots inteligentes de WhatsApp que desahogan la recepción de tu gimnasio o estética, enviando recordatorios automáticos para que no falten a las sesiones.",
                "En Nexte nos especializamos en hacer crecer negocios de belleza y bienestar: web profesional de alta conversión, asistente de WhatsApp 24/7 para consultas de precios y control de turnos en automático."
            ],
            comercio: [
                "En Nexte llevamos más de 10 años diseñando tiendas online (E-Commerce) a medida, catálogos interactivos y asistentes de WhatsApp con IA para comercios. Permitimos que tu negocio venda las 24 horas con Mercado Pago y responda consultas de stock, talles y envíos en segundos.",
                "En Nexte ayudamos a comercios y marcas a profesionalizar sus ventas digitales. Creamos tiendas e-commerce rápidas y bots de WhatsApp que responden preguntas frecuentes y mandan links de compra en automático.",
                "Desde Nexte desarrollamos plataformas de venta online y sistemas de stock integrados, para que no dependas solo del local a la calle y puedas vender en todo el país sin esfuerzo operativo.",
                "En Nexte nos enfocamos en aumentar las ventas de tu comercio: tienda online profesional con pagos integrados y asistente de WhatsApp para atender clientes que escriben fuera de horario."
            ],
            servicios: [
                "En Nexte llevamos más de 10 años creando páginas web de alta conversión, posicionamiento #1 en Google Maps (SEO Local) y asistentes de WhatsApp con IA para empresas de servicios y profesionales. Te ayudamos a liderar las búsquedas en tu zona y captar clientes que ya buscan tus servicios.",
                "En Nexte ayudamos a estudios, inmobiliarias, talleres y empresas de servicios a captar prospectos calificados todos los días, con webs profesionales y cotizadores automáticos por WhatsApp.",
                "Desde Nexte implementamos sistemas de gestión a medida y optimización en Google Maps para que tu negocio aparezca primero cuando los vecinos busquen tus servicios en {ubicacion}.",
                "En Nexte combinamos tecnología y estrategia comercial: sitios web rápidos, posicionamiento en Maps y asistentes de WhatsApp que filtran y califican consultas de clientes en tiempo real."
            ],
            general: [
                "En Nexte Marketing tenemos más de 10 años de trayectoria (2015-2026) ayudando a negocios a crecer con tecnología: desarrollo de software a medida, asistentes de WhatsApp con Inteligencia Artificial (NatoH 24/7) y páginas web de alta conversión.",
                "En Nexte no hacemos soluciones genéricas. Desarrollamos herramientas digitales a medida de cada negocio: sistemas de gestión, asistentes virtuales en WhatsApp para desahogar la atención y presencia web profesional.",
                "Desde Nexte ayudamos a empresas a automatizar procesos, mejorar su reputación online y captar clientes de forma predecible con sistemas propios y asistentes inteligentes de WhatsApp 24/7.",
                "En Nexte combinamos desarrollo de software, automatizaciones con IA y marketing digital para que tu negocio ahorre horas de trabajo manual y multiplique sus contactos diarios."
            ]
        };

        // ============ MENSAJE 3: PROPUESTAS COMERCIALES ADAPTADAS POR RUBRO ============

        this.propuestasPorCategoria = {
            salud: [
                `🏥 *SOLUCIONES DIGITALES NEXTE PARA SALUD & CONSULTORIOS*

Te comparto nuestras soluciones más elegidas con precios en promo por esta semana:

⚙️ *SISTEMA DE GESTIÓN & TURNOS MÉDICOS ONLINE*
Precio de lista: $650.000 → 🔥 *Promo: $350.000* (en 2 pagos).
(Gestión de agendas, turnos online, fichas digitales de pacientes y recordatorios automáticos).

🤖 *ASISTENTE VIRTUAL IA NATOH (WHATSAPP 24/7)*
Precio de lista: $350.000 → 🔥 *Promo: $180.000*.
(Atiende consultas 24/7, responde indicaciones de tratamientos, agenda citas y valida turnos).

🌐 *PÁGINA WEB INSTITUCIONAL MÉDICA*
Precio de lista: $500.000 → 🔥 *Promo: $250.000* (en 2 pagos).
(Web profesional con staff médico, especialidades, dominio, hosting y SSL incluido).

📍 *OPTIMIZACIÓN GOOGLE MAPS & REPUTACIÓN LOCAL*
Precio de lista: $300.000 → 🔥 *Promo: $150.000*.
(Para liderar las búsquedas de consultorios y clínicas en tu zona).

🎁 *COMBO SALUD INTEGRAL*
Precio de lista: $1.800.000 → 🔥 *Promo Final: $690.000* (Ahorro de $1.110.000).
(Incluye Sistema de Turnos + Asistente IA WhatsApp + Web Médica + Optimización Google Maps).`
            ],
            gastronomia: [
                `🍕 *SOLUCIONES DIGITALES NEXTE PARA GASTRONOMÍA*

Te comparto nuestras opciones para aumentar pedidos directos y ahorrar comisiones:

🍕 *SISTEMA DE PEDIDOS & CARTA DIGITAL QR*
Precio de lista: $650.000 → 🔥 *Promo: $350.000* (en 2 pagos).
(Tu propio sistema de delivery sin comisiones a terceros, menú digital interactivo QR y reservas).

🤖 *ASISTENTE VIRTUAL IA NATOH (PEDIDOS WHATSAPP 24/7)*
Precio de lista: $350.000 → 🔥 *Promo: $180.000*.
(Envía la carta, toma pedidos automáticos, calcula montos y responde horarios al instante).

🌐 *SITIO WEB GASTRONÓMICO PROFESIONAL*
Precio de lista: $500.000 → 🔥 *Promo: $250.000* (en 2 pagos).
(Web institucional con fotos de platos, ubicación, botón de pedidos y reservas).

📍 *GOOGLE MAPS SEO LOCAL (APARECER 1ROS EN LA ZONA)*
Precio de lista: $300.000 → 🔥 *Promo: $150.000*.
(Para atraer a quienes buscan dónde comer o pedir delivery cerca en Maps).

🎁 *COMBO GASTRO INTEGRAL*
Precio de lista: $1.800.000 → 🔥 *Promo Final: $690.000* (Ahorro de $1.110.000).
(Incluye Sistema de Pedidos QR + Asistente IA WhatsApp + Web + Google Maps SEO).`
            ],
            belleza_fitness: [
                `💅 *SOLUCIONES DIGITALES NEXTE PARA ESTÉTICA & FITNESS*

Te paso las herramientas clave para automatizar turnos y captar más clientes:

🤖 *ASISTENTE VIRTUAL IA NATOH (WHATSAPP 24/7)*
Precio de lista: $350.000 → 🔥 *Promo: $180.000*.
(Informa precios y servicios, toma turnos las 24hs y valida comprobantes de seña/pago).

⚙️ *SOFTWARE DE GESTIÓN, SOCIOS & TURNERO ONLINE*
Precio de lista: $650.000 → 🔥 *Promo: $350.000* (en 2 pagos).
(Control de membresías/cuotas, agenda de turnos por profesional y ficha de clientes).

🌐 *PÁGINA WEB PROFESIONAL / LANDING DE TURNOS*
Precio de lista: $500.000 → 🔥 *Promo: $250.000* (en 2 pagos).
(Muestra tus servicios, galería de resultados antes/después y botón de reserva).

📸 *CONTENIDO MULTIMEDIA & PLACAS EDITORIALES*
Precio de lista: $250.000/mes → 🔥 *Promo: $140.000/mes*.
(Diseño gráfico profesional y contenido visual para tus redes y estados).

🎁 *COMBO ESTÉTICA / FITNESS INTEGRAL*
Precio de lista: $1.800.000 → 🔥 *Promo Final: $690.000* (Ahorro de $1.110.000).
(Incluye Software de Turnos + Asistente IA WhatsApp + Web Profesional + Maps).`
            ],
            comercio: [
                `🛒 *SOLUCIONES DIGITALES NEXTE PARA COMERCIO & INDUMENTARIA*

Te comparto nuestras propuestas para vender online de forma automatizada:

🛒 *TIENDA ONLINE / E-COMMERCE PROFESIONAL*
Precio de lista: $800.000 → 🔥 *Promo: $500.000* (en 2 pagos).
(Catálogo completo de productos, carrito de compras, Mercado Pago, envíos y control de stock).

🤖 *ASISTENTE VIRTUAL IA NATOH (WHATSAPP 24/7)*
Precio de lista: $350.000 → 🔥 *Promo: $180.000*.
(Responde preguntas frecuentes de stock, talles, precios y envía links de pago al instante).

⚙️ *SISTEMA DE GESTIÓN, STOCK & FACTURACIÓN*
Precio de lista: $650.000 → 🔥 *Promo: $350.000* (en 2 pagos).
(Control de inventario, ventas y clientes en un software a medida).

📍 *POSICIONAMIENTO GOOGLE MAPS & SEO LOCAL*
Precio de lista: $300.000 → 🔥 *Promo: $150.000*.
(Para que tu local aparezca primero cuando busquen tus productos en la zona).

🎁 *COMBO COMERCIO DIGITAL*
Precio de lista: $1.800.000 → 🔥 *Promo Final: $690.000* (Ahorro de $1.110.000).
(Incluye Tienda E-Commerce + Asistente IA WhatsApp + Software + Google Maps).`
            ],
            servicios: [
                `🏢 *SOLUCIONES DIGITALES NEXTE PARA SERVICIOS & EMPRESAS*

Te comparto las opciones más efectivas para captar clientes calificados:

🌐 *PÁGINA WEB PROFESIONAL DE ALTA CONVERSIÓN*
Precio de lista: $500.000 → 🔥 *Promo: $250.000* (en 2 pagos).
(Diseño moderno para celulares, dominio, hosting, SSL y botón de contacto optimizado).

📍 *POSICIONAMIENTO GOOGLE MAPS & SEO LOCAL*
Precio de lista: $300.000 → 🔥 *Promo: $150.000*.
(Para liderar las búsquedas en tu zona cuando la gente busque tus servicios en Google).

🤖 *ASISTENTE VIRTUAL IA NATOH (WHATSAPP 24/7)*
Precio de lista: $350.000 → 🔥 *Promo: $180.000*.
(Filtra consultas de clientes, cotiza servicios y agenda reuniones las 24 horas).

⚙️ *SISTEMA DE GESTIÓN & CRM A MEDIDA*
Precio de lista: $650.000 → 🔥 *Promo: $350.000* (en 2 pagos).
(Seguimiento de presupuestos, base de datos de clientes y control operativo).

🎁 *COMBO SERVICIOS PROFESIONAL*
Precio de lista: $1.800.000 → 🔥 *Promo Final: $690.000* (Ahorro de $1.110.000).
(Incluye Web Profesional + Posicionamiento Google Maps + Asistente IA + CRM).`
            ],
            general: [
                `🏢 *SOLUCIONES DIGITALES NEXTE 2026*

Te comparto nuestras principales herramientas con precios promocionales:

⚙️ *SOFTWARE A MEDIDA & SISTEMAS DE GESTIÓN*
Precio de lista: $650.000 → 🔥 *Promo: $350.000* (en 2 pagos).
(Gestión de turnos/reservas, control de clientes, agendas y fichas digitales).

🤖 *ASISTENTE VIRTUAL IA NATOH (WHATSAPP 24/7)*
Precio de lista: $350.000 → 🔥 *Promo: $180.000*.
(Atiende clientes 24/7, responde dudas, toma pedidos/turnos y valida pagos).

🌐 *PÁGINA WEB PROFESIONAL o E-COMMERCE*
Web Profesional *$250.000* (o Tienda Online *$500.000*). Incluye dominio, hosting y SSL.

📸 *CONTENIDO MULTIMEDIA & PLACAS GRÁFICAS*
Precio de lista: $250.000/mes → 🔥 *Promo: $140.000/mes*.

📍 *OPTIMIZACIÓN GOOGLE MAPS & SEO LOCAL*
Precio de lista: $300.000 → 🔥 *Promo: $150.000*.

🎁 *COMBO INTEGRAL NEXTE*
Precio de lista: $1.800.000 → 🔥 *Promo Final: $690.000* (Ahorro de $1.110.000).`
            ]
        };

        // ============ MENSAJE 4: LLAMADOS A LA ACCIÓN (CTA) POR CATEGORÍA ============

        this.ctasPorCategoria = {
            salud: [
                "Nos adaptamos 100% a la escala y flujo de pacientes de *{negocio}*. ¿Querés que te pase 2 o 3 ejemplos de sistemas de turnos y webs médicas reales que armamos para que veas cómo funciona? ¡Quedo a tu disposición!",
                "Si te interesa ver cómo se ve el turnero online y cómo responde el bot de WhatsApp para consultorios, avisame y te paso algunos ejemplos reales. ¡Saludos y que tengas excelente semana!",
                "Podemos coordinar una breve llamada o te paso demos interactivas de sistemas de salud para que los pruebes desde tu celular. ¿Te gustaría verlos? ¡Saludos!"
            ],
            gastronomia: [
                "Nos adaptamos al ritmo y volumen de *{negocio}*. ¿Querés que te mande una demo interactiva de carta digital QR y bot de pedidos por WhatsApp para que lo pruebes desde tu celu? ¡Quedo a disposición!",
                "Si te interesa ver cómo funciona el sistema de delivery propio sin pagar comisiones, avisame y te paso un par de ejemplos reales de locales gastronómicos. ¡Saludos!",
                "Podemos armarte una demo personalizada sin compromiso para que veas cómo recibirías los pedidos en WhatsApp. ¿Te gustaría chusmearla? ¡Saludos y buenas ventas!"
            ],
            belleza_fitness: [
                "Nos adaptamos 100% a la dinámica de *{negocio}*. ¿Querés que te muestre cómo responde el asistente de WhatsApp para consultas de precios y turnos en otros centros? ¡Quedo a tu disposición!",
                "Si te gustaría ver ejemplos de páginas web y turneros automáticos que desarrollamos para estética y fitness, avisame y te paso los links. ¡Saludos!",
                "Podemos coordinar una breve charla o te mando demos directas a tu WhatsApp para que veas cómo funciona. ¿Te gustaría verlas? ¡Saludos!"
            ],
            comercio: [
                "Nos adaptamos 100% a los productos y catálogo de *{negocio}*. ¿Querés que te pase links de tiendas online y catálogos interactivos que desarrollamos para que veas el diseño y la velocidad de compra? ¡Quedo a disposición!",
                "Si te interesa explorar cómo funcionaría tu tienda e-commerce con Mercado Pago y el bot de WhatsApp, avisame y te muestro un par de ejemplos reales. ¡Saludos!",
                "Podemos coordinar para mostrarte una tienda demo funcionando en vivo con carrito y pagos. ¿Te gustaría verla? ¡Saludos y buenas ventas!"
            ],
            servicios: [
                "Nos adaptamos 100% a los servicios de *{negocio}*. ¿Querés que te comparta algunos ejemplos de webs profesionales y cómo posicionamos en Google Maps a otros negocios de la zona? ¡Quedo a tu disposición!",
                "Si te gustaría ver casos reales de captación de clientes y cómo funciona el asistente de WhatsApp para cotizaciones, avisame y te paso la info. ¡Saludos!",
                "Podemos charlar 5 minutos por teléfono o te paso ejemplos directos para que veas la calidad de nuestros desarrollos. ¿Te gustaría verlos? ¡Saludos!"
            ],
            general: [
                "En Nexte nos adaptamos 100% a lo que necesite *{negocio}*. ¿Querés que te comparta algunos ejemplos de sistemas y sitios web reales que ya diseñamos para que los veas? ¡Quedo a disposición!",
                "Si alguna de las opciones te interesa o querés ver cómo funcionaría en tu negocio, avisame y te paso ejemplos reales o coordinamos una breve charla. ¡Saludos!",
                "Cualquier consulta estoy a disposición. Si querés te muestro demos reales de sistemas funcionando para que evalúes si te sirve. ¡Que tengas excelente día!"
            ]
        };

        this.stats = { generated: 0 };
    }

    /**
     * Detectar categoría del lead basada en keywords y nombre
     */
    detectCategory(lead) {
        const text = `${lead.name || ''} ${lead.category || ''} ${lead.keyword || ''} ${lead.businessName || ''}`.toLowerCase();
        for (const [cat, keys] of Object.entries(this.categoryKeywords)) {
            if (keys.some(k => text.includes(k))) return cat;
        }
        return 'general';
    }

    random(arr) {
        if (!arr || arr.length === 0) return '';
        return arr[Math.floor(Math.random() * arr.length)];
    }

    extractCleanName(lead) {
        let name = lead.name || lead.businessName || 'su negocio';
        // Limpiar sufijos típicos de Maps como "| Fitness", "- Lanús", "(Sucursal 2)"
        name = name.split('|')[0].split(' - ')[0].replace(/\(.*?\)/g, '').trim();
        return name || 'su negocio';
    }

    extractLocation(lead) {
        if (lead.location && lead.location.trim().length > 2) return lead.location.trim();
        if (lead.city && lead.city.trim().length > 2) return lead.city.trim();
        if (lead.address) {
            const parts = lead.address.split(',');
            if (parts.length > 1) return parts[parts.length - 2].trim();
        }
        return 'la zona';
    }

    extractRubroName(cat) {
        const map = {
            salud: 'salud y atención médica',
            gastronomia: 'gastronomía',
            belleza_fitness: 'estética y fitness',
            comercio: 'comercio',
            servicios: 'servicios profesionales'
        };
        return map[cat] || 'su rubro';
    }

    fill(text, lead, cat) {
        const cleanName = this.extractCleanName(lead);
        const ubicacion = this.extractLocation(lead);
        const rubro = this.extractRubroName(cat);
        const rating = lead.rating ? lead.rating.toString() : '4.8';
        const reviewCount = lead.reviewCount || lead.reviewsCount || 'varias';
        const website = lead.website ? lead.website.replace(/^https?:\/\//, '').replace(/\/$/, '') : 'su sitio';

        return text
            .replace(/{negocio}/g, cleanName)
            .replace(/{ubicacion}/g, ubicacion)
            .replace(/{rubro}/g, rubro)
            .replace(/{rating}/g, rating)
            .replace(/{reviewCount}/g, reviewCount)
            .replace(/{website}/g, website);
    }

    /**
     * Generar secuencia de 4 mensajes hiper-personalizada por rubro con datos scrapeados
     */
    generatePersonalizedSequence(lead) {
        const cat = this.detectCategory(lead);

        // 1. CONSTRUCCIÓN MENSAJE 1 (Saludo + Reconocimiento Scrapeado + Detalle Web/Técnico)
        const saludo = this.random(this.saludos);
        
        let introMaps = '';
        if (lead.rating && lead.rating >= 4.0) {
            introMaps = this.random(this.introsConRating);
        } else {
            introMaps = this.random(this.introsSinRating);
        }

        let observacionWeb = '';
        if (!lead.website || lead.hasWebsite === false) {
            observacionWeb = this.random(this.observacionesSinWeb);
        } else if (lead.webAudit && lead.webAudit.hasWhatsAppWidget === false) {
            observacionWeb = this.random(this.observacionesConWebSinWA);
        } else if (lead.website) {
            observacionWeb = this.random(this.observacionesConWebGeneral);
        } else {
            observacionWeb = this.random(this.observacionesGenerales);
        }

        const rawMsg1 = `${saludo} ${introMaps} ${observacionWeb}`;
        const msg1 = this.fill(rawMsg1, lead, cat);

        // 2. CONSTRUCCIÓN MENSAJE 2 (Presentación + Dolor específico de la categoría)
        const presList = this.presentacionesPorCategoria[cat] || this.presentacionesPorCategoria.general;
        const rawMsg2 = this.random(presList);
        const msg2 = this.fill(rawMsg2, lead, cat);

        // 3. CONSTRUCCIÓN MENSAJE 3 (Propuesta Comercial adaptada a la categoría con precios)
        const propList = this.propuestasPorCategoria[cat] || this.propuestasPorCategoria.general;
        const rawMsg3 = this.random(propList);
        const msg3 = this.fill(rawMsg3, lead, cat);

        // 4. CONSTRUCCIÓN MENSAJE 4 (Llamado a la acción específico por categoría)
        const ctaList = this.ctasPorCategoria[cat] || this.ctasPorCategoria.general;
        const rawMsg4 = this.random(ctaList);
        const msg4 = this.fill(rawMsg4, lead, cat);

        this.stats.generated += 4;
        console.log(`🎯 [ADVANCED] Categoría detectada: '${cat}' para '${lead.name}'`);
        console.log(`📝 Mensajes generados:`);
        console.log(`   1️⃣ Msg 1 (Personalizado): "${msg1.substring(0, 70)}..."`);
        console.log(`   2️⃣ Msg 2 (Dolor ${cat}): "${msg2.substring(0, 70)}..."`);
        console.log(`   3️⃣ Msg 3 (Propuesta ${cat}): "${msg3.substring(0, 70)}..."`);
        console.log(`   4️⃣ Msg 4 (CTA): "${msg4.substring(0, 70)}..."`);

        const templateMessages = [msg1, msg2, msg3, msg4];
        templateMessages.templateVariantUsed = (propList.indexOf(rawMsg3) >= 0 ? propList.indexOf(rawMsg3) : 0);
        return templateMessages;
    }
}

module.exports = AdvancedTemplateGenerator;
