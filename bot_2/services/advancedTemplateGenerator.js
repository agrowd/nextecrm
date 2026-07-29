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
            "Nexte tiene más de 10 años de trayectoria (2015-2026) ayudando a negocios a digitalizarse de verdad.",
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
            "🏢 *SOLUCIONES DIGITALES NEXTE 2026*\n\n🏢 *¿CÓMO PODEMOS IMPULSAR TU NEGOCIO?*\n\nTe lo explico simple, sin palabras raras:\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n⚙️ *OPCIÓN A: SISTEMAS & SOFTWARE A MEDIDA*\nPrecio de lista: *$650.000* → 🔥 *$350.000 en 2 pagos antes del próximo sábado*\n\n¿Qué es?\nSoftware personalizado para tu negocio: gestión de turnos/reservas, control de clientes, agendas médicas o comerciales y fichas digitales.\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🤖 *OPCIÓN B: ASISTENTE VIRTUAL CON IA NATOH (WHATSAPP 24/7)*\nPrecio de lista: *$350.000* → 🔥 *$180.000 antes del próximo sábado*\n\n¿Qué es?\nEmpleado virtual en WhatsApp entrenado con la información exacta de tu empresa. Atiende clientes las 24 horas, toma turnos y valida comprobantes de pago automáticamente.\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🌐 *OPCIÓN C: PÁGINA WEB PROFESIONAL*\nPrecio de lista: *$500.000* → 🔥 *$250.000 en 2 pagos antes del próximo sábado*\n\n¿Qué es?\nTu sitio web institucional hecho a medida con dominio propio (.com / .ar), hosting por 1 año, certificado SSL y diseño para celulares.\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🛒 *OPCIÓN D: TIENDA ONLINE / E-COMMERCE*\nPrecio de lista: *$800.000* → 🔥 *$500.000 antes del próximo sábado*\n\n¿Qué es?\nPlataforma propia con catálogo de productos, carrito de compras, Mercado Pago o transferencia y control de stock.\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n📸 *OPCIÓN E: GENERACIÓN DE CONTENIDO EDITORIAL*\nPrecio de lista: *$250.000/mes* → 🔥 *$140.000/mes antes del próximo sábado*\n\n¿Qué es?\nProducción multimedia, placas gráficas profesionales e identidad visual para tus canales oficiales.\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n📍 *OPCIÓN F: GOOGLE MAPS & SEO LOCAL*\nPrecio de lista: *$300.000* → 🔥 *$150.000 antes del próximo sábado*\n\n¿Qué es?\nOptimización técnica para liderar las búsquedas locales en tu zona cuando busquen tus servicios.\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🎁 *COMBO INTEGRAL NEXTE*\nPrecio de lista: *$1.800.000* → 🔥 *$690.000 antes del próximo sábado*\n*Ahorro gigante de $1.110.000 sobre precio de lista.* Llevate Sistema a medida + IA NatoH + Web + SEO Maps.\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n💬 *¡Escribime y te paso ejemplos de sistemas y sitios web reales que ya diseñamos para que los veas!*"
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
        this.serviciosCompletos = [];

        // MSG 5 / MSG 4: CTAs SUAVES - Con ofrecimiento de portafolio y agendamiento
        this.ctasReunion = [
            "Si te parece, te puedo enviar algunos ejemplos de sistemas y sitios web reales que ya desarrollamos para otros negocios para que veas la calidad y cómo funcionan.\n\nSi querés verlos o agendar una breve charla de 5 minutos sin compromiso, quedo a tu disposición. 😊",
            "¿Te gustaría que te mande algunos ejemplos de plataformas y páginas que armamos para clientes del rubro?\n\nDecime y te los comparto, o coordinamos un llamado rápido cuando gustes.",
            "Podemos enviarte ejemplos reales de proyectos que ya implementamos para que veas cómo trabajan nuestras soluciones.\n\nQuedo a tu disposición si querés agendar una breve conversación o sacarte alguna duda."
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

        // Frases específicas por categoría - PROMO 2026
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
                    "🏥 PROMO SALUD 2026: Web + turnos online + WhatsApp por $150k.",
                    "🎉 Oferta otoño para consultorios: web con sistema de turnos por $150.000.",
                    "💪 Arrancá 2026 digitalizado: web médica + formulario de turnos.",
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
                    "🍕 PROMO GASTRO 2026: Web + carta QR + pedidos online por $150k.",
                    "🎉 Oferta otoño: tu sistema de delivery sin pagar a Rappi/PedidosYa.",
                    "🔥 Arrancá 2026 digital: web + carta + reservas por $150.000.",
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
                    "💅 PROMO BELLEZA 2026: Web + galería + turnos por $150k.",
                    "🎉 Oferta otoño: web estética con portfolio y reservas.",
                    "✨ Arrancá 2026: mostrá tus trabajos + tomá turnos automáticamente.",
                    "🔥 Promo especial: web para salón con fotos y reservas online."
                ]
            }
        };

        this.stats = { generated: 0 };
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

    // Generar 4 mensajes únicos - NUEVA ESTRUCTURA
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

        // MSG 3: PROMOCIONES (Software, IA NatoH, Web, SEO - SIN ADS)
        const propuesta = this.random(this.propuestas);
        const msg3 = this.fill(propuesta, lead);

        // MSG 4: CTA LLAMADA/REUNIÓN Y PORTAFOLIO
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
