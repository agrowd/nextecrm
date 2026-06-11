/**
 * Smart Template Generator - Sistema de Mensajes Inteligentes Sin IA
 * Genera mensajes personalizados usando plantillas dinámicas y lógica de negocio
 * 
 * Ventajas:
 * - Sin costos de API
 * - Sin rate limits
 * - Ultra rápido
 * - Mensajes variados y personalizados
 * - Detección automática de categoría de negocio
 */

class SmartTemplateGenerator {
    constructor() {
        // Diccionario de categorías con palabras clave
        this.categoryKeywords = {
            salud: ['doctor', 'médico', 'clínica', 'hospital', 'dentista', 'odontólogo', 'kinesiólogo', 'kinesiología', 'fisioterapia', 'psicólogo', 'nutricionista', 'veterinario', 'farmacia', 'laboratorio', 'traumatólogo', 'dermatólogo', 'pediatra', 'ginecólogo', 'oftalmólogo', 'consultorio'],
            gastronomia: ['restaurant', 'restaurante', 'bar', 'café', 'cafetería', 'pizzería', 'parrilla', 'sushi', 'delivery', 'comida', 'cocina', 'catering', 'heladería', 'pastelería', 'panadería', 'food', 'burger', 'hamburguesería'],
            belleza: ['peluquería', 'barbería', 'spa', 'estética', 'manicura', 'depilación', 'maquillaje', 'beauty', 'salón', 'uñas', 'cejas', 'pestañas', 'masajes', 'cosmetología'],
            fitness: ['gym', 'gimnasio', 'crossfit', 'pilates', 'yoga', 'fitness', 'entrenamiento', 'personal trainer', 'deportes', 'natación'],
            comercio: ['tienda', 'shop', 'store', 'venta', 'comercio', 'local', 'boutique', 'ropa', 'calzado', 'accesorios', 'joyería', 'relojería', 'óptica', 'librería', 'juguetería', 'ferretería', 'bazar'],
            servicios: ['abogado', 'contador', 'estudio', 'consultora', 'inmobiliaria', 'seguros', 'automotriz', 'taller', 'mecánico', 'electricista', 'plomero', 'cerrajería', 'mudanza', 'limpieza', 'fumigación'],
            educacion: ['escuela', 'colegio', 'universidad', 'instituto', 'academia', 'curso', 'clases', 'idiomas', 'inglés', 'capacitación', 'jardín', 'maternal'],
            tecnologia: ['software', 'sistemas', 'informática', 'computación', 'reparación', 'celulares', 'electrónica', 'tech', 'digital', 'desarrollo', 'programación']
        };

        // Plantillas por categoría (4 mensajes cada una)
        this.templates = {
            salud: {
                mensaje1: [
                    "¡Hola {nombre}! Vi {negocio} en Google Maps. Hoy en día, 8 de cada 10 pacientes buscan turnos online antes de llamar. ¿Tienen sistema de reservas web?",
                    "¡Buen día {nombre}! Encontré {negocio} buscando profesionales en {ubicacion}. ¿Sabías que los consultorios con web propia captan 3x más pacientes nuevos?",
                    "¡Hola! Soy Juan Cruz de Nexte Marketing. Vi que {negocio} tiene buenas reseñas pero noté que no tienen página web. ¿Pensaron en tener una?",
                    "¡Hola {nombre}! Vi {negocio} en Maps. Los pacientes hoy googlean antes de elegir profesional. Una web profesional marca la diferencia."
                ],
                mensaje2: [
                    "Desde 2015 ayudamos a profesionales de salud a digitalizar sus consultorios. Manejamos desde la web hasta recordatorios automáticos de turnos.",
                    "En Nexte trabajamos con +50 consultorios médicos en Argentina. Sabemos lo que necesitan: web, turnos online y WhatsApp automatizado.",
                    "Nos especializamos en salud digital. Hacemos webs para consultorios con sistema de turnos integrado y recordatorios por WhatsApp.",
                    "Llevamos más de 10 años digitalizando consultorios. Entendemos que necesitan soluciones simples que ahorren tiempo y capten pacientes."
                ],
                mensaje3: [
                    "Nuestra promo actual: Web profesional + dominio + hosting + SEO básico por $150.000. Incluye formulario de turnos y WhatsApp integrado.",
                    "Tenemos un Pack Salud: página web adaptada a celulares + turnos online + botón de WhatsApp. Todo llave en mano por $150.000.",
                    "Ofrecemos: Web médica profesional con sección de especialidades, equipo, turnos y mapa. Precio promocional: $150.000 todo incluido.",
                    "Promo consultorio digital: Web + dominio .com.ar + hosting 1 año + SEO para aparecer en Google. $150.000 pago único."
                ],
                mensaje4: [
                    "¿Te interesa que te cuente más? Podemos hacer una videollamada de 10 min para mostrarte ejemplos de otros consultorios.",
                    "Si querés, te mando el link de una web que hicimos para un consultorio similar. ¿Te parece?",
                    "¿Charlamos 5 minutos? Te cuento cómo trabaja el sistema de turnos automático y cómo le ahorra tiempo a otros profesionales.",
                    "Cualquier duda estoy disponible. Si querés, te paso nuestro portfolio de webs de salud para que veas ejemplos reales."
                ]
            },
            gastronomia: {
                mensaje1: [
                    "¡Hola {nombre}! Vi {negocio} en Google Maps. ¿Tienen carta digital con QR? Hoy es casi obligatorio y mejora mucho la experiencia del cliente.",
                    "¡Buen día! Encontré {negocio} en {ubicacion}. Los restaurantes con web propia y carta digital facturan hasta 30% más por delivery propio.",
                    "¡Hola! Soy Juan Cruz de Nexte. Vi que {negocio} tiene excelentes reseñas. ¿Ya tienen sistema de pedidos online propio?",
                    "¡Hola {nombre}! Vi {negocio} en Maps. Con una web con carta y pedidos, ahorrás las comisiones de las apps de delivery."
                ],
                mensaje2: [
                    "En Nexte ayudamos a restaurantes a tener presencia digital profesional. Web con carta, pedidos online y conexión a WhatsApp.",
                    "Trabajamos con +30 gastronómicos en CABA y GBA. Sabemos que necesitan: carta digital, pedidos fáciles y gestión de reservas.",
                    "Nos especializamos en gastronomía digital. Hacemos webs con carta QR, sistema de pedidos y botón de reservas por WhatsApp.",
                    "Desde 2015 digitalizamos restaurantes. Entendemos que necesitan soluciones que generen ventas sin perder tiempo."
                ],
                mensaje3: [
                    "Promo Gastro: Web con carta digital + sistema de pedidos + QR para mesas. Todo por $150.000. Sin comisiones por pedido.",
                    "Pack Restaurante: Página web + carta QR + formulario de reservas + botón WhatsApp. Precio único: $150.000.",
                    "Ofrecemos: Web gastronómica con fotos del menú, sistema de delivery propio y mapa de ubicación. $150.000 todo incluido.",
                    "Promo delivery propio: Web + carta digital + pedidos online sin comisiones + hosting 1 año. $150.000 pago único."
                ],
                mensaje4: [
                    "¿Te interesa ver ejemplos? Te puedo mandar el link de un restaurante similar que hicimos. ¿Dale?",
                    "Si querés, agendamos una llamada rápida de 10 min para mostrarte cómo funciona el sistema de pedidos.",
                    "¿Charlamos? Te cuento cómo otros restaurantes dejaron de pagar comisiones a Rappi/PedidosYa con web propia.",
                    "Cualquier consulta, escribime. Te paso ejemplos de cartas digitales que hicimos para que veas la calidad."
                ]
            },
            belleza: {
                mensaje1: [
                    "¡Hola {nombre}! Vi {negocio} en Google Maps. ¿Tienen sistema de turnos online? El 70% de los clientes prefieren reservar por web o WhatsApp.",
                    "¡Buen día! Encontré {negocio} en {ubicacion}. Los salones con web propia y turnos online tienen 40% menos cancelaciones.",
                    "¡Hola! Soy Juan Cruz de Nexte. Vi que {negocio} tiene muy buenas reseñas. ¿Ya tienen una web para mostrar trabajos y tomar turnos?",
                    "¡Hola {nombre}! Vi {negocio} en Maps. Una web con galería de trabajos y turnos online hace la diferencia en este rubro."
                ],
                mensaje2: [
                    "En Nexte ayudamos a salones de belleza a profesionalizar su presencia digital. Web con galería, turnos y WhatsApp integrado.",
                    "Trabajamos con peluquerías, spas y centros de estética. Sabemos que necesitan: mostrar trabajos, gestionar turnos y fidelizar clientes.",
                    "Nos especializamos en belleza y estética. Hacemos webs con portfolio de trabajos, precios y sistema de reservas.",
                    "Desde 2015 digitalizamos salones. Entendemos que necesitan soluciones lindas visualmente y prácticas para el día a día."
                ],
                mensaje3: [
                    "Promo Belleza: Web con galería de trabajos + turnos online + lista de servicios y precios. Todo por $150.000.",
                    "Pack Salón: Página web profesional + formulario de turnos + WhatsApp + galería Instagram integrada. $150.000.",
                    "Ofrecemos: Web estética con fotos de trabajos, equipo, servicios con precios y mapa. $150.000 todo incluido.",
                    "Promo digital: Web + dominio + hosting 1 año + SEO para aparecer en Google cuando busquen en tu zona. $150.000."
                ],
                mensaje4: [
                    "¿Te interesa ver ejemplos? Te mando el link de un salón similar que hicimos. ¿Te parece?",
                    "Si querés, hacemos una videollamada de 10 min para mostrarte cómo queda el sistema de turnos.",
                    "¿Charlamos? Te cuento cómo otros salones redujeron cancelaciones con recordatorios automáticos por WhatsApp.",
                    "Cualquier duda estoy disponible. Te paso nuestro portfolio de webs de estética para que veas estilos."
                ]
            },
            // Plantilla genérica para cualquier categoría
            general: {
                mensaje1: [
                    "¡Hola {nombre}! Vi {negocio} en Google Maps. Noté que no tienen página web. Hoy en día, 8 de cada 10 clientes buscan online antes de comprar.",
                    "¡Buen día! Encontré {negocio} buscando negocios en {ubicacion}. ¿Sabías que los negocios con web propia captan 3x más clientes nuevos?",
                    "¡Hola! Soy Juan Cruz de Nexte Marketing. Vi que {negocio} tiene buenas reseñas pero sin web profesional. ¿Pensaron en tener una?",
                    "¡Hola {nombre}! Vi {negocio} en Maps. Una web profesional te posiciona diferente frente a la competencia."
                ],
                mensaje2: [
                    "Desde 2015 ayudamos a negocios a tener presencia digital profesional. Web, redes, publicidad y automatizaciones.",
                    "En Nexte trabajamos con +200 negocios en Argentina. Sabemos lo que necesitan: web, visibilidad en Google y WhatsApp automatizado.",
                    "Nos especializamos en digitalización de negocios. Hacemos desde webs hasta campañas de Google y Meta Ads.",
                    "Llevamos más de 10 años ayudando a negocios a vender más online. Entendemos que necesitan soluciones simples y efectivas."
                ],
                mensaje3: [
                    "Promo actual: Web profesional + dominio + hosting + SEO básico por $150.000. Todo adaptado a celular y listo para vender.",
                    "Pack Digital: Página web + formulario de contacto + WhatsApp integrado + mapa. Precio único: $150.000.",
                    "Ofrecemos: Web profesional con diseño premium, adaptada a celular, con formularios y mapa. $150.000 todo incluido.",
                    "Promo web: Sitio completo + dominio .com.ar + hosting 1 año + SEO para aparecer en Google. $150.000 pago único."
                ],
                mensaje4: [
                    "¿Te interesa que te cuente más? Te puedo mandar ejemplos de webs similares que hicimos. ¿Dale?",
                    "Si querés, agendamos una videollamada de 10 min para mostrarte opciones y responder preguntas.",
                    "¿Charlamos 5 minutos? Te cuento cómo trabajan otros negocios de tu rubro con presencia digital.",
                    "Cualquier consulta estoy disponible. Te paso nuestro portfolio para que veas la calidad de trabajo."
                ]
            }
        };

        // Saludos variados
        this.greetings = ['¡Hola', '¡Buen día', '¡Buenas tardes', 'Hola', 'Buen día'];

        // Conectores variados
        this.connectors = ['Por cierto,', 'Además,', 'Te cuento que', 'También', 'A propósito,'];

        // Cache para evitar repetición
        this.usedTemplates = new Map();

        // Stats
        this.stats = {
            messagesGenerated: 0,
            categoriesDetected: new Map()
        };
    }

    /**
     * Detectar categoría del negocio basado en nombre y keywords
     */
    detectCategory(lead) {
        const searchText = `${lead.name} ${lead.businessName || ''} ${lead.keyword || ''} ${lead.category || ''}`.toLowerCase();

        for (const [category, keywords] of Object.entries(this.categoryKeywords)) {
            for (const keyword of keywords) {
                if (searchText.includes(keyword.toLowerCase())) {
                    this.stats.categoriesDetected.set(category, (this.stats.categoriesDetected.get(category) || 0) + 1);
                    return category;
                }
            }
        }

        return 'general';
    }

    /**
     * Extraer nombre del contacto del lead
     */
    extractContactName(lead) {
        const fullName = lead.name || lead.businessName || 'amigo/a';

        // Intentar extraer nombre personal si está en formato "Negocio - Nombre Apellido"
        if (fullName.includes(' - ')) {
            const parts = fullName.split(' - ');
            const possibleName = parts[parts.length - 1];
            // Verificar si parece un nombre (no tiene palabras de negocio)
            const businessWords = ['srl', 'sa', 'ltda', 'inc', 'spa', 'studio', 'center', 'centre'];
            if (!businessWords.some(w => possibleName.toLowerCase().includes(w))) {
                return possibleName.split(' ')[0]; // Solo primer nombre
            }
        }

        // Si es un nombre personal simple
        const firstName = fullName.split(' ')[0];
        if (firstName.length > 2 && firstName.length < 15 && !/[0-9]/.test(firstName)) {
            return firstName;
        }

        return 'amigo/a';
    }

    /**
     * Reemplazar variables en plantilla
     */
    fillTemplate(template, lead) {
        const nombre = this.extractContactName(lead);
        const negocio = lead.businessName || lead.name || 'tu negocio';
        const ubicacion = lead.location || lead.address || 'tu zona';

        return template
            .replace(/{nombre}/g, nombre)
            .replace(/{negocio}/g, negocio)
            .replace(/{ubicacion}/g, ubicacion)
            .replace(/{rating}/g, lead.rating || '4.5')
            .replace(/{reviews}/g, lead.reviewCount || '10');
    }

    /**
     * Seleccionar plantilla sin repetir
     */
    selectTemplate(templates, leadId, messageNumber) {
        const cacheKey = `${leadId}_msg${messageNumber}`;
        const usedIndices = this.usedTemplates.get(cacheKey) || [];

        // Encontrar índice no usado
        let availableIndices = templates.map((_, i) => i).filter(i => !usedIndices.includes(i));

        // Si todos fueron usados, resetear
        if (availableIndices.length === 0) {
            availableIndices = templates.map((_, i) => i);
            this.usedTemplates.set(cacheKey, []);
        }

        // Seleccionar aleatorio
        const selectedIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];

        // Guardar en cache
        usedIndices.push(selectedIndex);
        this.usedTemplates.set(cacheKey, usedIndices);

        return templates[selectedIndex];
    }

    /**
     * Generar secuencia completa de 4 mensajes
     */
    generatePersonalizedSequence(lead) {
        const category = this.detectCategory(lead);
        const templates = this.templates[category] || this.templates.general;
        const leadId = lead.id || lead.phone || Math.random().toString();

        console.log(`🎯 [TEMPLATE] Categoría detectada: ${category} para ${lead.name}`);

        const messages = [];

        // Generar cada mensaje
        for (let i = 1; i <= 4; i++) {
            const templateKey = `mensaje${i}`;
            const templateOptions = templates[templateKey];
            const selectedTemplate = this.selectTemplate(templateOptions, leadId, i);
            const filledMessage = this.fillTemplate(selectedTemplate, lead);

            messages.push(filledMessage);
        }

        this.stats.messagesGenerated += 4;

        console.log(`✅ [TEMPLATE] Secuencia generada: 4 mensajes para ${lead.name}`);
        console.log(`📊 Total mensajes generados: ${this.stats.messagesGenerated}`);

        return messages;
    }

    /**
     * Generar mensaje individual
     */
    generateMessage(lead, messageNumber) {
        const category = this.detectCategory(lead);
        const templates = this.templates[category] || this.templates.general;
        const leadId = lead.id || lead.phone || Math.random().toString();

        const templateKey = `mensaje${messageNumber}`;
        const templateOptions = templates[templateKey];

        if (!templateOptions) {
            console.warn(`⚠️ No hay plantilla para mensaje ${messageNumber}`);
            return null;
        }

        const selectedTemplate = this.selectTemplate(templateOptions, leadId, messageNumber);
        const filledMessage = this.fillTemplate(selectedTemplate, lead);

        this.stats.messagesGenerated++;

        return filledMessage;
    }

    /**
     * Agregar plantillas personalizadas
     */
    addTemplates(category, templates) {
        if (!this.templates[category]) {
            this.templates[category] = {};
        }

        for (const [key, value] of Object.entries(templates)) {
            if (Array.isArray(value)) {
                this.templates[category][key] = value;
            }
        }

        console.log(`✅ Plantillas agregadas para categoría: ${category}`);
    }

    /**
     * Agregar keywords para categoría
     */
    addCategoryKeywords(category, keywords) {
        if (!this.categoryKeywords[category]) {
            this.categoryKeywords[category] = [];
        }

        this.categoryKeywords[category].push(...keywords);
        console.log(`✅ Keywords agregadas para categoría: ${category}`);
    }

    /**
     * Obtener estadísticas
     */
    getStats() {
        return {
            messagesGenerated: this.stats.messagesGenerated,
            categoriesDetected: Object.fromEntries(this.stats.categoriesDetected),
            templatesAvailable: Object.keys(this.templates).length,
            categoriesAvailable: Object.keys(this.categoryKeywords).length
        };
    }

    /**
     * Health check (siempre true porque no usa API externa)
     */
    async checkHealth() {
        return true;
    }
}

module.exports = SmartTemplateGenerator;
