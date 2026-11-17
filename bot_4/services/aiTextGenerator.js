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

        // Secuencias Dinámicas por Solución NatoH Systems (100% idioma dueño de negocio, Doble Agente IA + CRM/Turnero/Pedidos y SIN links)
        this.serviceFallbacks = {
            software_custom_erp: (lead, city, hook) => [
                hook || `Hola! ¿Cómo estás? Vi a *${lead.name}* en Google Maps ahí en ${city} y el movimiento que tienen. Te hago una consulta cortita: ¿hoy las consultas de precios, los pedidos y el seguimiento de clientes los llevan a mano por WhatsApp y planillas?`,
                `Te pregunto porque en *NatoH Systems* instalamos *2 Agentes de IA + tu propio Sistema CRM y de Pedidos*: un Agente IA responde precios y dudas en WhatsApp las 24 hs, y el segundo Agente IA carga cada pedido y hace seguimiento automático en el sistema sin que anotes nada a mano.`,
                `Tenés el servicio mensual de *Doble Agente IA + CRM/Sistema incluido* por *$175.000/mes* (o el *Agente IA Respondedor 24/7* solo por *$115.000/mes*, y si preferís el *Sistema a Medida de pago único* queda en *$350.000* en 2 pagos).`,
                `Si te sirve para ahorrar horas en *${lead.name}*, avisame por acá y te paso una muestra rápida de 2 minutos para que veas cómo responde y cómo ordena todo solo.`
            ],
            software_turnero: (lead, city, hook) => [
                hook || `Hola! ¿Cómo estás? Vi a *${lead.name}* en Google Maps ahí en ${city} y te quería hacer una consulta cortita: ¿hoy los turnos y las dudas de precios por WhatsApp los siguen contestando y anotando todos a mano?`,
                `Te escribo porque en *NatoH Systems* te instalamos *2 Agentes de IA + Agenda de Turnos y CRM incluido*: el primer Agente IA responde consultas en WhatsApp en 10 segundos las 24 hs, y el segundo Agente IA anota el turno solo en el sistema y manda recordatorios para que nadie falte.`,
                `El plan completo con los *2 Agentes de IA + Turnero/CRM y Web incluidos* queda en *$175.000/mes* (o solo el *Agente IA que responde 24/7* por *$115.000/mes*, o el *Turnero de pago único* por *$350.000* en 2 veces).`,
                `¿Te gustaría que te muestre por acá en 2 minutos un ejemplo de cómo atiende al paciente y le agenda el turno solo?`
            ],
            gastronomia_pedidos: (lead, city, hook) => [
                hook || `Hola! ¿Cómo va? Vi a *${lead.name}* en Google Maps en ${city} y noté que ${lead.externalPlatform === 'pedidosya' ? 'hoy derivan los pedidos a una app que les cobra comisión' : 'no tienen una Carta Digital con recepción automática de pedidos en WhatsApp'}.`,
                `En *NatoH Systems* te armamos tu propia *Carta Digital QR + Agentes de IA en WhatsApp*: un Agente IA responde consultas y toma el pedido 24/7, y el segundo lo carga directo en tu pantalla de comandas y clientes con *0% de comisión*.`,
                `Podés tener el *Sistema de Pedidos QR de pago único* por *$350.000* (mitad al empezar y mitad al entregar) o sumar el servicio mensual con los *Agentes de IA 24/7* desde *$115.000/mes*.`,
                `Si te interesa, decime y te paso por acá una muestra en vivo para que pruebes desde el celu cómo entran los pedidos listos.`
            ],
            ecommerce: (lead, city, hook) => [
                hook || `Hola! ¿Cómo estás? Estuve viendo a *${lead.name}* en Google Maps en ${city} y te quería consultar: ¿hoy cuando les escriben por WhatsApp preguntando precios, talles o stock llegan a contestar rápido o se les acumulan los chats?`,
                `En *NatoH Systems* te armamos tu *Catálogo Web + 2 Agentes de IA*: el primer Agente IA contesta precios y muestra productos en WhatsApp las 24 hs, y el segundo Agente IA guarda al cliente en tu *CRM de Ventas* y le hace seguimiento si pidió precio y todavía no compró.`,
                `Podés arrancar con tu *Catálogo / Página Web de pago único* en *$250.000* (en 2 pagos), sumar el *Agente IA Respondedor 24/7* por *$115.000/mes* o el plan completo con *Doble Agente IA + CRM incluido* por *$175.000/mes*.`,
                `¿Querés que te pase por acá un ejemplo rápido aplicado a tu rubro para que veas cómo atiende y ordena los pedidos?`
            ],
            ia_natoh: (lead, city, hook) => [
                hook || `Hola! ¿Cómo estás? Vi a *${lead.name}* en Google Maps en ${city} y te hago una consulta rápida: ¿les pasa que entran consultas por WhatsApp fuera de horario o mientras están ocupados y después quedan presupuestos sin seguimiento?`,
                `En *NatoH Systems* instalamos *2 Empleados con IA para tu negocio*: un *Agente IA Vendedor* que contesta WhatsApp y tu Web en 10 segundos las 24 hs, y un *Agente IA Gestor* que carga cada cliente en un *CRM o Turnero que te incluimos* y persigue a los presupuestos abiertos para que cierres más ventas.`,
                `El servicio mensual del *Agente IA que responde 24/7* es de *$115.000/mes* (instalación + mes 1: $180.000), o los *2 Agentes IA + el CRM/Turnero incluido* por *$175.000/mes*.`,
                `¿Te gustaría que te pase por acá una muestra rápida para que veas cómo contesta en WhatsApp y cómo te deja todo anotado en el CRM?`
            ],
            rediseño_web: (lead, city, hook) => [
                hook || `Hola! ¿Cómo estás? Entré a la página web de *${lead.name}* desde Google Maps y vi que hoy quien entra no tiene un asistente que le responda en el acto ni conecte directo con un sistema de seguimiento en WhatsApp.`,
                `En *NatoH Systems* renovamos tu *Página Web* y le sumamos *2 Agentes de IA*: uno que responde consultas en tu Web y WhatsApp en 10 segundos las 24 hs, y otro que carga a cada interesado en tu propio *CRM o Agenda de Turnos* haciendo seguimiento automático.`,
                `Podés hacer solo la *Renovación Web de pago único* por *$250.000* (50% al iniciar y 50% al entregar), o el plan mensual completo de *Web + Doble Agente IA + CRM/Turnero incluido* por *$175.000/mes*.`,
                `¿Te parece si te muestro por acá un ejemplo rápido de cómo quedaría funcionando en *${lead.name}*?`
            ],
            web_express: (lead, city, hook) => [
                hook || `Hola! ¿Cómo estás? Te escribo porque vimos a *${lead.name}* en Google Maps ahí en ${city} y notamos que ${lead.externalPlatform === 'instagram' ? 'hoy solo tienen cargado el Instagram y todavía no cuentan con su propia página web ni atención automática en WhatsApp' : 'figuran sin página web propia para mostrar lo que hacen'}.`,
                `En *NatoH Systems* te armamos tu *Página Web Profesional* lista en 7 días, y además podemos sumarte nuestros *Agentes de IA en WhatsApp* (uno que contesta precios y dudas 24/7 y otro que te anota los clientes, turnos o pedidos en un *CRM propio* sin usar planillas).`,
                `La *Página Web Profesional* queda en *$250.000 pago único* (50% al empezar y 50% al entregar, sin abono mensual), o podés elegir el plan mensual de *Web + Agentes de IA + CRM/Turnero incluido* desde *$115.000 a $175.000/mes*.`,
                `Si te interesa chusmear sin compromiso, avisame por acá y te paso 2 ejemplos reales de tu rubro para que veas cómo funcionan.`
            ]
        };
    }

    isForbiddenHookOrPain(text) {
        if (!text || typeof text !== 'string') return false;
        return /reseña|estrella|calificaci[oó]n|puntaje|⭐|★|https?:\/\/|natohsystems\.com|nextemarketing\.com/i.test(text);
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
        const rawHook = lead.dossier?.consultativeHook || null;
        const hook = (rawHook && !this.isForbiddenHookOrPain(rawHook)) ? rawHook : null;

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
            const cleanPains = (d.painPoints || []).filter(p => !this.isForbiddenHookOrPain(p));
            const cleanHook = (d.consultativeHook && !this.isForbiddenHookOrPain(d.consultativeHook)) ? d.consultativeHook : '';
            const cleanPrimaryPain = !this.isForbiddenHookOrPain(d.primaryPain) ? d.primaryPain : 'Oportunidad de digitalización y automatización de atención y ventas';
            dossierContext = `\n- DOSSIER ESTRATÉGICO (AGENTE 3 - NATOH SYSTEMS):
  * Dolor Principal Detectado: ${cleanPrimaryPain}
  * Puntos de Dolor: ${cleanPains.join(' | ') || 'Optimización operativa y comercial'}
  * Solución NatoH a Ofrecer: ${d.targetServiceLabel || d.targetService}
  ${cleanHook ? `* Gancho Consultivo Base: "${cleanHook}"\n  ` : ''}* Propuesta de Valor: ${d.suggestedPitch || ''}
  * Oferta Específica: ${d.suggestedOffer || ''}`;
        }

        const systemPrompt = `Sos Fede, consultor comercial argentino súper humano, cercano y directo de "*NatoH Systems*".
Tu objetivo es escribir una secuencia de 4 mensajes cortos de WhatsApp para iniciar una conversación genuina con el dueño o encargado de un negocio que encontramos en Google Maps.

REGLAS DE ORO (IDIOMA DUEÑO DE NEGOCIO, ANTI-SPAM Y CERO TECNICISMOS):
1. PROHIBIDO INCLUIR LINKS O URLs: NUNCA escribas "http://", "https://", "www.", ".com", "natohsystems.com" ni ningún enlace web en ninguno de los 4 mensajes. Solo nombrá a la empresa como *NatoH Systems*.
2. PROHIBIDO MENCIONAR ESTRELLAS (⭐), CALIFICACIONES O RESEÑAS: NUNCA menciones cuántas estrellas tiene el negocio, ni su calificación numérica, ni si tiene "sin reseñas" o "pocas reseñas".
3. HABLÁ EN EL IDIOMA DEL DUEÑO DEL NEGOCIO (CERO PALABRAS DE PROGRAMADOR): Prohibido usar palabras técnicas como "Next.js", "React", "PageSpeed", "ERP", "arquitectura digital", "leads" o "conversión". Hablá de cosas reales que le duelen todos los días: contestar mensajes de WhatsApp fuera de horario, pasar precios, anotar turnos sin que la gente falte, hacer seguimiento a presupuestos que quedaron colgados, o no perder pedidos por tardar en responder.
4. Español Rioplatense 100% natural y hablado (usá "vos/tu negocio": "vimos", "noté", "te escribo", "¿cómo estás?", jamás uses "usted/su negocio").
5. EXPLICÁ NUESTRA PROPUESTA ESTRELLA SEGÚN SU RUBRO (2 Agentes de IA + Sistema CRM / Turnero / Pedidos incluido + Página Web):
   - En *NatoH Systems* instalamos **2 Agentes de IA + el Sistema que su negocio necesita incluido**:
     * **Agente IA #1 (El que atiende y vende 24/7):** responde consultas de WhatsApp y de la Web en 10 segundos día y noche con la info real del negocio (precios, catálogo, horarios, dudas).
     * **Agente IA #2 (El que ordena todo en el sistema):** carga automáticamente cada cliente en el **CRM de Ventas** (haciendo seguimiento a los que pidieron presupuesto y no compraron), o agenda y recuerda turnos en la **Agenda de Turnos** (si es clínica/odontología/estética/taller), o anota pedidos y descuenta stock en el **Sistema de Pedidos** (si es mayorista/distribuidora/comercio/gastronomía).
     * Y si todavía no tiene página web propia (o solo tiene Instagram), le armamos su **Página Web Profesional**.
6. ESTRUCTURA Y PRECIOS CLAROS EN LOS 4 MENSAJES:
   - Mensaje 1 (Gancho Real en su idioma, máx 36 palabras): Saludo natural ("Hola! ¿Cómo estás?"), mencioná que viste a *${businessName}* en Google Maps en ${location} y hacele una pregunta simple sobre su día a día (ej: si hoy contestan todas las consultas y anotan turnos/pedidos/presupuestos a mano por WhatsApp o si cuentan con página web/sistema).
   - Mensaje 2 (La Solución de los 2 Agentes IA + Sistema incluido, máx 42 palabras): Contale en criollo que en *NatoH Systems* le instalamos un *Agente de IA que responde WhatsApp 24/7 en segundos* + un *segundo Agente de IA que carga todo solo en el CRM, Turnero o Sistema de Pedidos* que ya le incluimos (o su Página Web si no tiene).
   - Mensaje 3 (Valores Claros Mensuales y Pago Único, máx 42 palabras): Contale que puede sumar el *Agente IA Respondedor 24/7 por $115.000/mes*, el plan completo de *Doble Agente IA + CRM/Turnero y Web incluidos por $175.000/mes*, o hacer su *Página Web ($250.000)* o *Sistema a Medida ($350.000)* de pago único (50% al iniciar y 50% al entregar).
   - Mensaje 4 (Cierre pidiendo permiso, SIN LINK, máx 28 palabras): Preguntale con buena onda si le gustaría que le pases por acá un ejemplo real de su rubro para que vea en 2 minutos cómo atiende el Agente y cómo carga todo solo en el sistema.

${aiConfig.basePrompt ? `\nINSTRUCCIONES ADICIONALES:\n${aiConfig.basePrompt}\n` : ''}
Respondé ÚNICAMENTE con un JSON válido: {"messages": ["msg1", "msg2", "msg3", "msg4"]}`;

        const userPrompt = `Generá los 4 mensajes para este prospecto (RECORDÁ: CERO LINKS/URLs, CERO MENCIÓN A ESTRELLAS O RESEÑAS, tono argentino natural de vos):
- Nombre del negocio: ${businessName}
- Rubro: ${category}
- Ubicación: ${location}${webAuditContext}${dossierContext}`;

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
                const fallbackSeq = this.buildDynamicFallbackSequence(lead);
                // Sanitizador Anti-Spam y Anti-Reseñas/Estrellas: eliminar URLs y reemplazar cualquier mensaje que mencione estrellas o reseñas
                const cleanMessages = parsed.messages.map((m, idx) => {
                    let text = String(m || '')
                        .replace(/\(?\s*https?:\/\/[^\s)]+\s*\)?/gi, '')
                        .replace(/\b(?:www\.)?(?:natohsystems|nextemarketing)\.com(?:\.ar)?\b/gi, '*NatoH Systems*')
                        .replace(/\s{2,}/g, ' ')
                        .replace(/\s+([.,!?])/g, '$1')
                        .trim();
                    if (/reseña|estrella|calificaci[oó]n|⭐|★/i.test(text)) {
                        return fallbackSeq[idx] || text;
                    }
                    return text;
                });
                console.log(`✨ [AI Generator] Secuencia NatoH Systems (Sin Links / Sin Estrellas) generada para "${businessName}" (${lead.dossier?.targetService || 'custom'})`);
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
