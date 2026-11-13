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

        // Secuencias Dinámicas por Solución NatoH Systems (Fallback Inteligente sin sonar a robot y SIN links para evitar Spam)
        this.serviceFallbacks = {
            software_custom_erp: (lead, city, hook) => [
                hook || `Hola! ¿Cómo estás? Vi a *${lead.name}* en Google Maps ahí en ${city} y el movimiento que tienen. Te hago una consulta cortita: ¿hoy los pedidos, listas de precios y stock los manejan con algún sistema propio o mayormente por WhatsApp y Excel?`,
                `Te pregunto porque en *NatoH Systems* desarrollamos *Sistemas de Gestión a Medida (Stock, Pedidos Mayoristas, Cotizadores y CRM)* conectados a *Agentes de IA en WhatsApp* que cotizan y cargan pedidos solos las 24 hs.`,
                `Estamos con una promo para PyMEs donde armamos el *Sistema de Gestión / Pedidos a Medida* en *$350.000* (o el *Agente IA WhatsApp 24/7* en *$180.000*), abonando 50% al iniciar y 50% contra entrega funcionando.`,
                `Si te sirve para ordenar tiempos en *${lead.name}*, avisame por acá y te paso una demo rápida o un par de ejemplos reales para que chusmees sin compromiso.`
            ],
            software_turnero: (lead, city, hook) => [
                hook || `Hola! ¿Cómo estás? Vi el perfil de *${lead.name}* en Google Maps en ${city}${lead.rating ? ` (¡muy buenas las ${lead.rating}⭐!)` : ''} y noté que hoy coordinan los turnos manualmente. ¿No les saca bastante tiempo estar respondiendo horarios disponibles por WhatsApp todo el día?`,
                `Te escribo porque en *NatoH Systems* armamos un *Sistema de Turnos Online y Gestión de Pacientes/Clientes* conectado a WhatsApp: reservan solos 24/7, les llega recordatorio automático y bajás un 40% las ausencias.`,
                `Con la promo actual te queda todo el *Sistema de Turnos Online* configurado por *$350.000* (o sumando el *Asistente IA en WhatsApp 24/7* por *$180.000*), pagando 50% al arrancar y 50% al entregarlo funcionando.`,
                `¿Te gustaría que te pase por acá un ejemplo interactivo para que veas cómo quedaría la agenda de *${lead.name}*?`
            ],
            gastronomia_pedidos: (lead, city, hook) => [
                hook || `Hola! ¿Cómo va? Vi a *${lead.name}* en Google Maps en ${city} y noté que ${lead.externalPlatform === 'pedidosya' ? 'hoy derivan los pedidos a una app con comisión' : 'no tienen cargada una Carta Digital interactiva propia para tomar pedidos directos'}.`,
                `En *NatoH Systems* armamos tu propia *Carta Digital QR + Sistema de Pedidos y Reservas*: el cliente elige del menú en el celu, calcula el envío y el pedido te entra armado directo al WhatsApp con *0% de comisión*.`,
                `Con la promo actual te queda todo el sistema propio listo por *$350.000* (pago único en 2 veces, sin comisiones por venta ni alquiler mensual).`,
                `Si te interesa, decime y te paso por acá una demo en vivo para que pruebes cómo entran los pedidos al WhatsApp.`
            ],
            ecommerce: (lead, city, hook) => [
                hook || `Hola! ¿Cómo estás? Estuve viendo a *${lead.name}* en Google Maps en ${city} y noté que hoy no tienen cargado un catálogo o tienda web propia donde los clientes vean todo y armen el pedido directo al WhatsApp.`,
                `En *NatoH Systems* desarrollamos *Catálogos y Tiendas Online autogestionables* integradas con un *Asistente de IA en WhatsApp* que responde precios, talles y stock las 24 hs sin que tengas que estar pegado al teléfono.`,
                `Hoy tenemos el *Catálogo / Tienda Web Profesional* en *$250.000* y el *Agente IA de Ventas 24/7* en *$180.000*, abonando 50% al iniciar y 50% contra entrega.`,
                `¿Querés que te pase por acá 2 ejemplos de tiendas que armamos para que veas cómo funcionan?`
            ],
            ia_natoh: (lead, city, hook) => [
                hook || `Hola! ¿Cómo estás? Estuve viendo el perfil de *${lead.name}* en Google Maps en ${city} y el caudal de consultas que manejan. ¿Hoy llegan a responder rápido todos los mensajes de WhatsApp fuera de horario o los fines de semana?`,
                `Te consulto porque en *NatoH Systems* entrenamos *Agentes de IA para WhatsApp* con toda la info de tu negocio: responde en segundos 24/7, asesora, presupuesta y te agenda solo a los clientes listos para avanzar.`,
                `Con la promo actual la implementación completa del *Agente IA 24/7* queda en *$180.000* (o el combo con *Sistema CRM a Medida* en *$450.000*), en 2 pagos.`,
                `¿Te gustaría que te muestre por acá cómo responde en vivo en un negocio como el tuyo?`
            ],
            rediseño_web: (lead, city, hook) => [
                hook || `Hola! ¿Cómo estás? Entré a la web de *${lead.name}* desde Google Maps y vi un par de detalles técnicos (sobre todo en celular y en la conexión rápida a WhatsApp) que hoy hacen que varias visitas se vayan sin escribirte.`,
                `En *NatoH Systems* nos dedicamos a desarrollar *Páginas Web de alta velocidad y Sistemas con IA en WhatsApp* para que cada persona que te busque en Google termine hablándote directo al celular.`,
                `Con la promo actual hacemos la *Renovación Web Profesional* por *$250.000* (o sumando el *Agente IA en WhatsApp 24/7* por *$180.000*), abonando 50% al empezar y 50% al entregar.`,
                `¿Te parece si te comento rápido qué 2 cositas vimos para mejorar en la web de *${lead.name}* y te muestro un ejemplo?`
            ],
            web_express: (lead, city, hook) => [
                hook || `Hola! ¿Cómo estás? Te escribo porque vimos a *${lead.name}* en Google Maps ahí en ${city}${lead.rating ? ` con re buenas reseñas (${lead.rating}⭐)` : ''}, pero notamos que ${lead.externalPlatform === 'instagram' ? 'solo tienen cargado el Instagram y todavía no cuentan con su propia página web' : 'figuran sin página web propia'}.`,
                `Hoy la mayoría de la gente que busca en Google Maps entra a ver la web antes de consultar. En *NatoH Systems* armamos *Páginas Web Profesionales y Sistemas de Turnos/Pedidos* listos en 7 días, diseñados para que cada visita te escriba directo al WhatsApp.`,
                `Estamos con una promo de 50% OFF donde el *Sitio Web Profesional Completo* queda en *$250.000* (abonando 50% al iniciar y 50% recién contra entrega conforme).`,
                `Si te interesa chusmear, avisame por acá y te paso 2 ejemplos reales de tu rubro para que veas cómo quedan.`
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

        const systemPrompt = `Sos Fede, consultor comercial B2B argentino súper humano, cercano y directo de "*NatoH Systems*".
Tu objetivo es escribir una secuencia de 4 mensajes cortos de WhatsApp para iniciar una conversación genuina con el dueño o encargado de un negocio que encontramos en Google Maps.

REGLAS DE ORO ANTI-SPAM Y ESTILO HUMANO (OBLIGATORIAS):
1. PROHIBIDO INCLUIR LINKS O URLs: NUNCA escribas "http://", "https://", "www.", ".com", "natohsystems.com" ni ningún enlace web en ninguno de los 4 mensajes. Enviar links en frío hace que WhatsApp lo marque como spam. Solo nombrá a la empresa como *NatoH Systems*.
2. Español Rioplatense 100% natural y hablado (usá "vos/ustedes" cercano: "vimos", "noté", "te escribo", "¿cómo estás?", "tu negocio", NUNCA uses el "usted" formal como "potenciar su negocio" ni "¿han considerado?"). Escribí como una persona real mandando WhatsApp desde el teléfono.
3. Sé hiper-específico con el negocio: mencioná el nombre real (*${businessName}*), su zona (${location}) y un dato puntual real que vimos en Google Maps (ej: sus ${lead.rating || 'buenas'}⭐, que hoy solo tienen Instagram/Linktree sin web propia, que su web no tiene turnero/botón de WhatsApp, o el cuello de botella real de su rubro *${category}*).
4. Ofrecé UNA SOLUCIÓN CLARA según el Dossier de NatoH Systems:
   - Si es Distribuidora, Mayorista, Corralón, Logística, Fábrica: ofrecé el *Sistema de Gestión ERP/Pedidos a Medida ($350.000)* + *Agente IA Cotizador en WhatsApp ($180.000)*.
   - Si es Clínica, Odontología, Estética, Veterinaria, Taller, Gimnasio, Hotel: ofrecé el *Sistema de Turnos/Reservas Online con recordatorios por WhatsApp ($350.000)* y el *Agente IA 24/7 ($180.000)*.
   - Si es Gastronomía (Restaurante, Bar, Café): ofrecé la *Carta Digital QR + Sistema de Pedidos directos al WhatsApp sin comisiones ($350.000)*.
   - Si es Comercio / Indumentaria / Mueblería: ofrecé *Catálogo / Tienda Online E-commerce ($250.000)* + *Agente IA de Ventas ($180.000)*.
   - Si NO tiene web (o solo tiene Instagram/Linktree): ofrecé *Sitio Web Profesional de Alta Conversión ($250.000, promo 50% OFF)* listo en 7 días.
   - Si YA tiene web: ofrecé *Agente de IA 24/7 en WhatsApp ($180.000)* o *Renovación Web / Sistema a Medida ($250.000-$350.000)*.
5. Estructura de los 4 mensajes (cortos, ágiles, sin bloques largos):
   - Mensaje 1 (Gancho Real): Saludo natural ("Hola! ¿Cómo estás?"), comentale qué vimos en la ficha de Google Maps de *${businessName}* en ${location} y hacele una pregunta simple sobre cómo manejan eso hoy (máx 38 palabras).
   - Mensaje 2 (Solución NatoH Systems): Contale de forma conversacional cómo lo resolvemos en *NatoH Systems* con esa solución puntual para ahorrarles tiempo o captar más clientes (máx 40 palabras, SIN links).
   - Mensaje 3 (Propuesta Accesible): Comentale que estamos con una promo donde queda en $180.000 (Agente IA), $250.000 (Web/Tienda) o $350.000 (Sistema a Medida/Turnero), abonando 50% al iniciar y 50% recién contra entrega funcionando (máx 38 palabras).
   - Mensaje 4 (Cierre pidiendo permiso, SIN LINK): Preguntale con buena onda si le gustaría que le pases por acá un ejemplo real aplicado a su rubro o una demo rápida para que vea cómo funciona, sin compromiso (máx 30 palabras, CERO URLs).

${aiConfig.basePrompt ? `\nINSTRUCCIONES ADICIONALES:\n${aiConfig.basePrompt}\n` : ''}
Respondé ÚNICAMENTE con un JSON válido: {"messages": ["msg1", "msg2", "msg3", "msg4"]}`;

        const userPrompt = `Generá los 4 mensajes para este prospecto (RECORDÁ: CERO LINKS/URLs, tono argentino natural de vos):
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
                // Sanitizador Anti-Spam: eliminar cualquier URL o dominio que la IA haya podido incluir
                const cleanMessages = parsed.messages.map(m =>
                    String(m || '')
                        .replace(/\(?\s*https?:\/\/[^\s)]+\s*\)?/gi, '')
                        .replace(/\b(?:www\.)?(?:natohsystems|nextemarketing)\.com(?:\.ar)?\b/gi, '*NatoH Systems*')
                        .replace(/\s{2,}/g, ' ')
                        .replace(/\s+([.,!?])/g, '$1')
                        .trim()
                );
                console.log(`✨ [AI Generator] Secuencia NatoH Systems (Sin Links Anti-Spam) generada para "${businessName}" (${lead.dossier?.targetService || 'custom'})`);
                return cleanMessages;
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
