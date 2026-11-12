const axios = require('axios');

class AITextGenerator {
    constructor() {
        this.apiKey = (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your-api-key')
            ? process.env.OPENAI_API_KEY.trim()
            : '';
        this.backendUrl = process.env.BACKEND_URL || 'http://127.0.0.1:8484';
        this.cachedConfig = null;
        this.lastConfigFetch = 0;

        if (this.apiKey) {
            console.log('🤖 [AI Generator] OpenAI inicializado correctamente (Modo Consultivo NatoH Systems + Nexte)');
        } else {
            console.log('⚠️ [AI Generator] OPENAI_API_KEY no configurada. Se usarán secuencias dinámicas por Dossier NatoH.');
        }

        // Secuencias Dinámicas por Solución NatoH Systems (Fallback Inteligente sin sonar a robot)
        this.serviceFallbacks = {
            software_custom_erp: (lead, city, hook) => [
                hook || `Hola! ¿Cómo estás? Vi a *${lead.name}* en Google Maps en ${city} y la excelente trayectoria que tienen. ¿Hoy están manejando los pedidos, listas de precios y seguimiento de clientes con algún sistema a medida o mayormente por WhatsApp y planillas?`,
                `Te consulto porque en *NatoH Systems* (https://natohsystems.com) desarrollamos *Sistemas de Gestión a Medida (Stock, Pedidos Mayoristas, Cotizadores y CRM)* integrados con *Agentes de IA en WhatsApp* que cotizan y cargan pedidos automáticamente las 24 hs.`,
                `Estamos con la *Promo Otoño 2026* para PyMEs:\n⚙️ *Sistema de Gestión / Pedidos a Medida:* *$350.000* (precio regular $600.000)\n🤖 *Agente IA WhatsApp 24/7:* *$180.000*\nSe abona 50% al iniciar y 50% contra entrega funcionando.`,
                `Podés ver nuestros desarrollos y sistemas en https://natohsystems.com y https://nextemarketing.com.\n\n¿Te sirve si te muestro en 5 minutos una demo de cómo automatizaría la operatoria de *${lead.name}*?`
            ],
            software_turnero: (lead, city, hook) => [
                hook || `Hola! ¿Cómo estás? Vi el perfil de *${lead.name}* en Google Maps en ${city}${lead.rating ? ` (¡muy buenas las ${lead.rating}⭐!)` : ''} y noté que hoy coordinan los turnos de forma manual. ¿Les pasa que pierden bastante tiempo respondiendo por horarios disponibles en WhatsApp?`,
                `En *NatoH Systems* (https://natohsystems.com) implementamos un *Sistema de Turnos Online y Gestión de Clientes/Pacientes* conectado a WhatsApp: tus clientes reservan solos 24/7, reciben recordatorios automáticos y reducís un 40% el ausentismo.`,
                `Por la *Promo Otoño 2026* lo implementamos llave en mano con 45% OFF:\n📅 *Sistema de Turnos & Gestión Online:* *$350.000* (antes $600.000)\n🤖 *Asistente IA WhatsApp 24/7:* *$180.000*\nSe abona en 2 pagos (50% al iniciar y 50% al entregar).`,
                `En https://natohsystems.com podés ver nuestras soluciones de software.\n\n¿Te gustaría que te pase una demo interactiva por acá para que veas cómo quedaría la agenda de *${lead.name}*?`
            ],
            gastronomia_pedidos: (lead, city, hook) => [
                hook || `Hola! ¿Cómo va? Vi a *${lead.name}* en Google Maps en ${city} y noté que ${lead.externalPlatform === 'pedidosya' ? 'hoy el link deriva a una app con comisión' : 'no tienen cargada una Carta Digital interactiva propia para pedidos directos por WhatsApp'}.`,
                `Desde *NatoH Systems* (https://natohsystems.com) armamos tu propia *Carta Digital QR + Sistema de Pedidos y Reservas*: el cliente elige del menú desde el celular, calcula el envío y el pedido entra armado directo a tu WhatsApp con *0% de comisión por venta*.`,
                `Con la *Promo Otoño 2026* te queda todo el sistema propio configurado por *$350.000* (pago único en 2 veces, sin comisiones ni alquileres mensuales). También podemos sumar el *Bot IA de atención 24/7* por *$180.000*.`,
                `¿Te interesa que te mande por acá un link de ejemplo en vivo para que pruebes cómo entran los pedidos al WhatsApp?`
            ],
            ecommerce: (lead, city, hook) => [
                hook || `Hola! ¿Cómo estás? Estuve viendo a *${lead.name}* en Google Maps en ${city} y noté que hoy no cuentan con un catálogo/tienda web propia donde los clientes vean productos y armen su pedido directo a tu WhatsApp.`,
                `En *NatoH Systems & Nexte* (https://natohsystems.com) desarrollamos *Catálogos y Tiendas Online autogestionables* integradas con un *Asistente de IA en WhatsApp* que responde precios, talles y stock las 24 hs sin que tengas que estar pegado al teléfono.`,
                `Con la *Promo Otoño 2026* tenés:\n🛒 *Catálogo / Tienda Web Profesional:* *$250.000* (antes $500.000)\n🤖 *Agente IA de Ventas WhatsApp 24/7:* *$180.000*\nPagando 50% al comenzar y 50% contra entrega.`,
                `Podés chusmear nuestro trabajo en https://natohsystems.com y https://nextemarketing.com.\n\n¿Te mando 2 ejemplos de tiendas que armamos para que veas la velocidad y el diseño?`
            ],
            ia_natoh: (lead, city, hook) => [
                hook || `Hola! ¿Cómo estás? Estuve visitando el perfil de *${lead.name}* en Google Maps en ${city} y vi que tienen muy buena presencia, pero noté que aún no tienen un Agente con Inteligencia Artificial filtrando y respondiendo consultas 24/7 en WhatsApp.`,
                `En *NatoH Systems* (https://natohsystems.com) entrenamos *Agentes de IA en WhatsApp* con toda la info de tu empresa: atiende al instante a cualquier hora, presupuesta, califica al interesado y te deriva o agenda solo a los clientes listos para avanzar.`,
                `Por la *Promo Otoño 2026* la implementación completa del *Agente IA NatoH 24/7* está en *$180.000* (precio regular $350.000), o el *Combo con Sistema CRM a Medida* en *$450.000*, en 2 pagos.`,
                `¿Te gustaría probar una demo en vivo desde tu celular o que coordinemos 5 minutos para mostrarte cómo atiende?`
            ],
            rediseño_web: (lead, city, hook) => [
                hook || `Hola! ¿Cómo estás? Entré al sitio web de *${lead.name}* desde Google Maps y noté un par de detalles técnicos (como la falta de automatización directa a WhatsApp y píxeles de medición) que hoy hacen que varias visitas se vayan sin consultar.`,
                `En *NatoH Systems & Nexte* (https://natohsystems.com) ayudamos a negocios de ${city} modernizando su web para que cargue volando en celulares y sumando nuestro *Agente de IA en WhatsApp 24/7* que capta y responde cada consulta en segundos.`,
                `Estamos con la *Promo Otoño 2026*:\n🌐 *Renovación Web Profesional + Píxeles:* *$250.000* (antes $500.000)\n🤖 *Agente IA WhatsApp 24/7:* *$180.000*\nSe abona 50% al iniciar y 50% al entregar finalizado.`,
                `Podés ver nuestro portfolio en https://natohsystems.com y https://nextemarketing.com.\n\n¿Te parece si te paso sin cargo un mini diagnóstico de lo que vimos en la web de *${lead.name}*?`
            ],
            web_express: (lead, city, hook) => [
                hook || `Hola! ¿Cómo estás? Encontramos a *${lead.name}* en Google Maps en ${city}${lead.rating ? ` con excelentes reseñas (${lead.rating}⭐)` : ''}, pero notamos que ${lead.externalPlatform === 'instagram' ? 'hoy solo tienen cargado Instagram y aún no cuentan con su propio sitio web oficial' : 'figuran sin sitio web propio'}.`,
                `Hoy la mayoría de los clientes que buscan en Google Maps entran a la web para validar el negocio antes de escribir. En *NatoH Systems & Nexte* (https://natohsystems.com) creamos *Sitios Web Profesionales y Sistemas a Medida* listos en 7 días, pensados para convertir visitas en mensajes de WhatsApp.`,
                `Con la *Promo Otoño 2026* tenés 50% OFF:\n🌐 *Sitio Web Profesional Completo:* *$250.000* (antes $500.000)\n🤖 *Opcional Agente IA WhatsApp 24/7:* *$180.000*\nEn 2 pagos (50% al iniciar y 50% contra entrega).`,
                `Podés ver ejemplos reales en https://natohsystems.com y https://nextemarketing.com.\n\n¿Querés que te muestre 2 modelos de cómo podría quedar la web de *${lead.name}*?`
            ]
        };
    }

    async getAiConfig() {
        const now = Date.now();
        if (this.cachedConfig && (now - this.lastConfigFetch < 60000)) {
            return this.cachedConfig;
        }
        try {
            const res = await axios.get(`${this.backendUrl}/api/ai-config`, { timeout: 5000 });
            if (res.data && res.data.success && res.data.config) {
                this.cachedConfig = res.data.config;
                this.lastConfigFetch = now;
                return this.cachedConfig;
            }
        } catch (err) {
            // Silencioso si usa default local
        }
        return {
            enabled: true,
            model: 'gpt-4o-mini',
            temperature: 0.65,
            agencyName: 'NatoH Systems & Nexte Marketing',
            basePrompt: ''
        };
    }

    buildDynamicFallbackSequence(lead) {
        const city = lead.location ? lead.location.split(',')[0].trim() : 'tu zona';
        const targetSvc = lead.dossier?.targetService || (lead.hasWebsite && !lead.webAudit?.isSocialOnly ? 'rediseño_web' : 'web_express');
        const hook = lead.dossier?.consultativeHook || null;

        const builder = this.serviceFallbacks[targetSvc] || this.serviceFallbacks.web_express;
        return builder(lead, city, hook);
    }

    /**
     * Genera una secuencia de 4 mensajes de WhatsApp consultivos y humanos basados en el Dossier del Agente 3
     * @param {Object} lead - Objeto lead con name, category, location, hasWebsite, webAudit, dossier, reviews, etc.
     * @returns {Promise<string[]>} Array de 4 mensajes personalizados
     */
    async generatePersonalizedSequence(lead) {
        const aiConfig = await this.getAiConfig();

        if (!this.apiKey || aiConfig.enabled === false) {
            return this.buildDynamicFallbackSequence(lead);
        }

        const businessName = lead.name || lead.businessName || 'tu negocio';
        const category = lead.category || lead.keyword || 'tu rubro';
        const location = lead.location || lead.address || 'tu zona';
        const isSocialOnly = Boolean(lead.webAudit?.isSocialOnly || ['instagram', 'facebook', 'linktree', 'pedidosya', 'whatsapp_link'].includes(lead.externalPlatform));
        const hasWebsite = Boolean((lead.hasWebsite || (lead.website && lead.website.trim().length > 0)) && !isSocialOnly);

        let webAuditContext = '';
        if (hasWebsite && lead.webAudit && lead.webAudit.auditedAt) {
            const wa = lead.webAudit;
            const insightsList = Array.isArray(wa.insights) && wa.insights.length > 0
                ? wa.insights.join(' | ')
                : 'Sin hallazgos críticos';
            webAuditContext = `\n- AUDITORÍA TÉCNICA DE SU WEB (${lead.website}):
  * Plataforma/CMS: ${wa.cms || 'Estándar'}
  * Tiene botón de WhatsApp en la web: ${wa.hasWhatsAppWidget ? 'SÍ' : 'NO'}
  * Tiene sistema de turnos online: ${wa.hasBookingSystem ? 'SÍ' : 'NO'}
  * Tiene Google Analytics 4 (GA4): ${wa.hasGA4 ? 'SÍ' : 'NO'}
  * Tiene Meta Pixel (Facebook Ads): ${wa.hasMetaPixel ? 'SÍ' : 'NO'}
  * Observaciones técnicas: ${insightsList}`;
        } else if (isSocialOnly) {
            webAuditContext = `\n- ESTADO DIGITAL: NO tiene sitio web propio. En Google Maps puso un enlace a ${lead.externalPlatform || lead.website}.`;
        } else {
            webAuditContext = `\n- ESTADO DIGITAL: NO tiene sitio web en su ficha de Google Maps.`;
        }

        let dossierContext = '';
        if (lead.dossier && lead.dossier.primaryPain) {
            const d = lead.dossier;
            dossierContext = `\n- DOSSIER ESTRATÉGICO (AGENTE 3 - NATOH SYSTEMS):
  * Dolor Principal Detectado: ${d.primaryPain}
  * Puntos de Dolor: ${(d.painPoints || []).join(' | ')}
  * Solución NatoH a Ofrecer: ${d.targetServiceLabel || d.targetService}
  * Gancho Consultivo Base: "${d.consultativeHook || ''}"
  * Propuesta de Valor: ${d.suggestedPitch || ''}
  * Oferta Específica: ${d.suggestedOffer || ''}`;
        }

        const systemPrompt = `Sos un consultor comercial B2B argentino súper humano, empático y directo de "${aiConfig.agencyName || 'NatoH Systems & Nexte'}" (https://natohsystems.com y https://nextemarketing.com).
Tu objetivo es escribir una secuencia de 4 mensajes cortos de WhatsApp para iniciar una conversación genuina con el dueño o encargado de un negocio que encontramos en Google Maps.

REGLAS DE ORO (ESTILO HUMANO NO-ROBOT):
1. Español Rioplatense natural (voseo profesional: "vimos", "notamos", "te escribo", "¿cómo estás?"). Cero frases cliché de telemarketer o traducciones neutras.
2. Sé hiper-específico: mencioná el nombre real del negocio (*${businessName}*), un dato real que vimos en su ficha de Google Maps (ej: su calificación de ${lead.rating || 'buenas'}⭐, que solo tienen Instagram/Linktree, que su web no tiene botón de WhatsApp/turnero, o el dolor típico de su rubro *${category}*).
3. NO ofrezcas una lista interminable de cosas: ofrecé LA SOLUCIÓN EXACTA indicada en el Dossier de NatoH Systems:
   - Si es Distribuidora, Mayorista, Corralón, Logística, Fábrica: ofrecé el *Sistema de Gestión ERP/Pedidos a Medida ($350.000)* + *Agente IA Cotizador en WhatsApp ($180.000)* de NatoH Systems.
   - Si es Clínica, Odontología, Estética, Veterinaria, Taller, Gimnasio, Hotel: ofrecé el *Sistema de Turnos/Reservas Online + Recordatorios por WhatsApp ($350.000)* y el *Agente IA 24/7 ($180.000)*.
   - Si es Gastronomía (Restaurante, Bar, Café): ofrecé la *Carta Digital QR + Sistema de Pedidos directos al WhatsApp sin comisiones ($350.000)*.
   - Si es Comercio / Indumentaria / Mueblería: ofrecé *Catálogo / Tienda Online E-commerce ($250.000)* + *Agente IA de Ventas ($180.000)*.
   - Si NO tiene web (o solo tiene Instagram/Linktree): ofrecé *Sitio Web Profesional de Alta Conversión ($250.000, antes $500.000)* listo en 7 días.
   - Si YA tiene web: ofrecé *Agente de IA 24/7 en WhatsApp ($180.000)* o *Modernización Web / Sistema a Medida ($250.000-$350.000)*.
4. Estructura de los 4 mensajes (se envían seguidos en 2 minutos simulando escritura real en WhatsApp):
   - Mensaje 1 (Gancho Consultivo): Saludo natural, mención concreta de lo que vimos en su ficha de Google Maps o web y una pregunta breve que toque su cuello de botella (máx 40 palabras).
   - Mensaje 2 (Solución NatoH Systems): Contale de forma simple cómo lo resolvemos desde *NatoH Systems* (mencioná https://natohsystems.com) con la solución puntual (máx 45 palabras).
   - Mensaje 3 (Propuesta Promo 2026): Presentá el valor promocional exacto de esa solución (ej: $180.000 Agente IA / $250.000 Web / $350.000 Sistema a Medida o Turnero, abonando 50% al iniciar y 50% contra entrega) (máx 45 palabras).
   - Mensaje 4 (Cierre Suave & Portfolio): Dejale el link de nuestro portfolio (https://natohsystems.com o https://nextemarketing.com) y preguntale sin presión si le gustaría ver una demo de 5 minutos o un ejemplo aplicado a su rubro (máx 35 palabras).

${aiConfig.basePrompt ? `\nINSTRUCCIONES ADICIONALES:\n${aiConfig.basePrompt}\n` : ''}
Respondé ÚNICAMENTE con un JSON válido: {"messages": ["msg1", "msg2", "msg3", "msg4"]}`;

        const userPrompt = `Generá los 4 mensajes para este prospecto:
- Nombre del negocio: ${businessName}
- Rubro: ${category}
- Ubicación: ${location}
- Calificación Maps: ${lead.rating ? `${lead.rating} ⭐ (${lead.reviewCount || 0} reseñas)` : 'Sin datos'}${webAuditContext}${dossierContext}`;

        try {
            const response = await axios.post(
                'https://api.openai.com/v1/chat/completions',
                {
                    model: aiConfig.model || process.env.OPENAI_MODEL || 'gpt-4o-mini',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt }
                    ],
                    response_format: { type: 'json_object' },
                    temperature: typeof aiConfig.temperature === 'number' ? aiConfig.temperature : 0.65,
                    max_tokens: 750
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 15000
                }
            );

            const content = response.data.choices[0].message.content;
            const parsed = JSON.parse(content);

            if (parsed.messages && Array.isArray(parsed.messages) && parsed.messages.length === 4) {
                console.log(`✨ [AI Generator] Secuencia NatoH Systems generada para "${businessName}" (${lead.dossier?.targetService || 'custom'})`);
                return parsed.messages;
            } else {
                throw new Error('Formato de respuesta inválido de OpenAI');
            }
        } catch (error) {
            console.error(`❌ [AI Generator] Error con OpenAI (${error.message}). Usando secuencia dinámica Dossier NatoH.`);
            return this.buildDynamicFallbackSequence(lead);
        }
    }
}

module.exports = AITextGenerator;
