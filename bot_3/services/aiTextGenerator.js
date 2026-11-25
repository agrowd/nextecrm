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

        // Secuencias Dinámicas por Solución NatoH Systems (100% idioma dueño de negocio, SEO comercial, Prueba Social Anónima + Nuevas Demos en Vivo y SIN links)
        this.serviceFallbacks = {
            software_custom_erp: (lead, city, hook) => [
                hook || `Hola! ¿Cómo estás? Vi a *${lead.name}* posicionado en Google Maps en ${city}. Te hago una consulta cortita: ¿hoy las cotizaciones, los pedidos y la gestión de ingresos los llevan a mano por WhatsApp y planillas?`,
                `Te pregunto porque en *NatoH Systems* ya implementamos sistemas a medida para empresas de construcción, distribuidoras, asociaciones civiles y comercios: el *Agente IA #1* responde WhatsApp (incluso audios y comprobantes de pago) las 24 hs, y el *Agente IA #2* carga el pedido, actualiza stock y registra cada cobro en tu *CRM con Gestión de Ingresos*.`,
                `Podés activar el plan completo de *Doble Agente IA + CRM, Gestión de Ingresos y Web SEO incluidos* por *$175.000/mes* (o el *Agente IA Respondedor 24/7* por *$115.000/mes*, o el *Sistema a Medida de pago único* en *$350.000* abonando 50% al iniciar y 50% al entregar).`,
                `Armamos una *demo interactiva en vivo* personalizada para *${lead.name}* donde podés mandarle un mensaje o audio desde tu celu y ver cómo responde la IA y cómo impacta la venta y el ingreso en el sistema. ¿Te paso el acceso por acá para que la pruebes 1 minuto?`
            ],
            software_turnero: (lead, city, hook) => [
                hook || `Hola! ¿Cómo estás? Vi a *${lead.name}* en Google Maps en ${city} y te quería consultar: ¿hoy la agenda de turnos, las señas y las consultas de precios por WhatsApp las siguen respondiendo y anotando a mano?`,
                `En *NatoH Systems* ya pusimos en marcha este sistema para consultorios odontológicos, centros de estética y depilación, psicólogos y predios de fútbol: el *Agente IA #1* contesta WhatsApp (texto, audios y fotos de comprobantes de seña) en 10 segundos 24/7, y el *Agente IA #2* bloquea el turno en la agenda sin sobreturnos y registra la seña en tu *Gestión de Ingresos*.`,
                `Tenés el plan completo de *Doble Agente IA + Agenda de Turnos, Gestión de Ingresos, CRM y Web SEO incluidos* por *$175.000/mes* (o solo el *Agente IA Respondedor 24/7* por *$115.000/mes*, o el *Turnero a Medida de pago único* por *$350.000* en 2 pagos).`,
                `Tenemos lista una *demo interactiva en vivo* con el nombre de *${lead.name}* para que pruebes mandarle un mensaje, un audio o una seña desde el celu y veas cómo agenda el turno solo en pantalla. ¿Te paso el acceso por acá para que la veas en 1 minuto?`
            ],
            gastronomia_pedidos: (lead, city, hook) => [
                hook || `Hola! ¿Cómo va? Vi a *${lead.name}* en Google Maps en ${city} y noté que ${lead.externalPlatform === 'pedidosya' ? 'hoy derivan los pedidos a una app pagando comisión por cada venta' : 'todavía no tienen una Carta Digital QR con toma automática de pedidos y gestión de ingresos en WhatsApp'}.`,
                `En *NatoH Systems* desarrollamos sistemas de pedidos y gestión de ingresos que hoy usan locales gastronómicos, predios deportivos y comercios: el *Agente IA #1* atiende WhatsApp (texto, audios y comprobantes de transferencia) 24/7, y el *Agente IA #2* carga el pedido directo en comandas y caja con *0% de comisión*.`,
                `Podés tener tu *Carta QR + Sistema de Pedidos y Gestión de Ingresos de pago único* por *$350.000* (50% al empezar y 50% al entregar) o el plan mensual con *Doble Agente de IA 24/7* desde *$115.000 a $175.000/mes*.`,
                `Armamos una *demo interactiva en vivo* para *${lead.name}* donde podés simular un pedido o mandar un audio desde tu celu y ver cómo entra la comanda y el cobro solos. ¿Te paso el acceso por acá para que la pruebes?`
            ],
            ecommerce: (lead, city, hook) => [
                hook || `Hola! ¿Cómo estás? Estuve viendo a *${lead.name}* en Google Maps en ${city} y te consulto: ¿hoy cuando les escriben o mandan audios por WhatsApp preguntando precios y stock llegan a contestar en el acto o se enfrían ventas?`,
                `En *NatoH Systems* ya implementamos esta solución en comercios, distribuidoras, centros de estética y empresas: el *Agente IA #1* contesta precios, escucha audios y valida comprobantes de pago en WhatsApp 24/7, y el *Agente IA #2* descuenta stock, registra la venta en *Gestión de Ingresos* y hace seguimiento a las 24 hs en el *CRM*.`,
                `Podés arrancar con tu *Catálogo / Página Web SEO de pago único* en *$250.000* (en 2 pagos), sumar el *Agente IA Respondedor 24/7* por *$115.000/mes* o el plan completo con *Doble Agente IA + CRM y Gestión de Ingresos incluido* por *$175.000/mes*.`,
                `Tenemos una *demo interactiva en vivo* personalizada para *${lead.name}* donde podés escribirle al Agente IA desde el celu y ver en pantalla cómo actualiza el stock y la caja solo. ¿Te paso el acceso por acá para que la pruebes?`
            ],
            ia_natoh: (lead, city, hook) => [
                hook || `Hola! ¿Cómo estás? Vi a *${lead.name}* en Google Maps en ${city} y te hago una consulta rápida: ¿les pasa que entran consultas o audios por WhatsApp fuera de horario y después quedan presupuestos abiertos sin seguimiento?`,
                `En *NatoH Systems* ya instalamos esta tecnología en empresas de construcción, consultorios odontológicos y psicológicos, centros de estética y depilación, predios de fútbol y asociaciones civiles: el *Agente IA #1* responde texto y audios y valida comprobantes en 10 segundos 24/7, y el *Agente IA #2* ordena todo en tu *CRM con Gestión de Ingresos* y reactiva presupuestos a las 24 hs.`,
                `El servicio del *Agente IA Respondedor 24/7* es de *$115.000/mes* (instalación + mes 1: $180.000), o el plan completo con *2 Agentes IA + CRM, Turnero, Gestión de Ingresos y Web SEO incluidos* por *$175.000/mes*.`,
                `Armamos una *demo interactiva en vivo* con el nombre de *${lead.name}* para que le hables o le mandes un audio desde tu celu y veas en tiempo real cómo responde y cómo mueve todo en el CRM. ¿Te paso el acceso por acá para probarla?`
            ],
            rediseño_web: (lead, city, hook) => [
                hook || `Hola! ¿Cómo estás? Entré a la web de *${lead.name}* desde Google Maps y vi que hoy quien los busca en Google no tiene un asistente que le responda en segundos ni conecte con una agenda o seguimiento automático en WhatsApp.`,
                `En *NatoH Systems* —donde ya desarrollamos plataformas para odontólogos, centros de estética y depilación, psicólogos, constructoras, predios de fútbol y asociaciones civiles— optimizamos tu *Web con SEO para Google* y sumamos *2 Agentes de IA*: uno que responde texto/audios y valida señas 24/7, y otro que carga turnos, ventas y *Gestión de Ingresos* en tu *CRM*.`,
                `Podés hacer la *Renovación Web Profesional SEO de pago único* por *$250.000* (50% al iniciar y 50% al entregar), o el plan completo de *Web SEO + Doble Agente IA + CRM/Turnero y Gestión de Ingresos incluidos* por *$175.000/mes*.`,
                `Tenemos una *demo interactiva en vivo* personalizada para *${lead.name}* donde podés ver tu web con IA y probar desde el celu cómo agenda y registra ingresos sola. ¿Te paso el acceso por acá para que la chusmees 1 minuto?`
            ],
            web_express: (lead, city, hook) => [
                hook || `Hola! ¿Cómo estás? Te escribo porque vimos a *${lead.name}* en Google Maps en ${city} y notamos que ${lead.externalPlatform === 'instagram' ? 'hoy solo figuran con Instagram y todavía no tienen una Página Web propia posicionada en Google ni atención automática en WhatsApp' : 'aún no cuentan con una Página Web propia posicionada en Google para captar clientes'}.`,
                `En *NatoH Systems* ya desarrollamos webs y sistemas para consultorios odontológicos y psicológicos, estética y depilación, constructoras, predios de fútbol y asociaciones civiles: te armamos tu *Página Web Profesional con SEO en Google* en 7 días, y podemos sumarte *2 Agentes de IA* que responden textos/audios 24/7, validan señas y ordenan turnos o ventas con *Gestión de Ingresos*.`,
                `La *Página Web Profesional SEO* queda en *$250.000 pago único* (50% al empezar y 50% al entregar, sin abono mensual), o podés elegir el plan mensual de *Web + Doble Agente IA + CRM/Turnero y Gestión de Ingresos incluido* desde *$115.000 a $175.000/mes*.`,
                `Armamos una *demo interactiva en vivo* con el nombre de *${lead.name}* para que pruebes desde tu celu cómo atiende el Agente IA y cómo ordena los turnos, clientes e ingresos en vivo. ¿Te paso el acceso por acá sin compromiso?`
            ]
        };
    }

    async checkHealth() {
        return true;
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

        const systemPrompt = `Sos Fede, consultor comercial argentino súper humano, cercano y persuasivo de "*NatoH Systems*".
Tu objetivo es escribir una secuencia de 4 mensajes cortos de WhatsApp de altísima conversión para iniciar una conversación genuina con el dueño o encargado de un negocio que encontramos en Google Maps.

REGLAS DE ORO (IDIOMA DUEÑO DE NEGOCIO, SEO COMERCIAL, PRUEBA SOCIAL ANÓNIMA Y CERO LINKS):
1. PROHIBIDO INCLUIR LINKS O URLs: NUNCA escribas "http://", "https://", "www.", ".com", "natohsystems.com" ni ningún enlace web en ninguno de los 4 mensajes. Solo nombrá a la empresa como *NatoH Systems*.
2. PROHIBIDO MENCIONAR ESTRELLAS (⭐), CALIFICACIONES O RESEÑAS: NUNCA menciones cuántas estrellas tiene el negocio, ni su calificación numérica, ni si tiene "sin reseñas" o "pocas reseñas".
3. PROHIBIDO DAR NOMBRES PROPIOS DE OTROS CLIENTES: Cuando menciones nuestra experiencia, hablá siempre de los rubros con los que ya trabajamos (ej: "consultorios odontológicos", "centros de estética y depilación", "psicólogos", "empresas de construcción", "predios de fútbol", "asociaciones civiles") SIN nombrar nunca la marca ni el nombre propio de ningún cliente.
4. HABLÁ EN EL IDIOMA DEL DUEÑO DEL NEGOCIO + KEYWORDS DE ALTO VALOR COMERCIAL Y SEO: Prohibido usar jerga de programador ("Next.js", "React", "PageSpeed", "ERP", "arquitectura"). Usá términos que venden y posicionan para el dueño: *posicionamiento en Google y Google Maps, atención automática por WhatsApp 24/7, agenda de turnos online sin sobreturnos, validación de señas y comprobantes, gestión de ingresos y caja en vivo, y seguimiento automático de presupuestos en CRM*.
5. Español Rioplatense 100% natural y hablado (usá "vos/tu negocio": "vimos", "noté", "te escribo", "¿cómo estás?", jamás uses "usted/su negocio").
6. LO NUEVO DE NUESTRO SISTEMA Y DEMOS INTERACTIVAS + PRUEBA SOCIAL REAL:
   - En *NatoH Systems* ya desarrollamos y pusimos en marcha sistemas reales para **consultorios odontológicos, centros de estética y depilación definitiva, consultorios de psicología, empresas de construcción, predios de fútbol y complejos deportivos, asociaciones civiles y sistemas de gestión de ingresos y cobranzas** (elegí los 3 o 4 rubros más cercanos al prospecto para generar autoridad inmediata).
   - Nuestro sistema combina **2 Agentes de IA conectados en vivo + el Sistema de Gestión y Web SEO incluidos**:
     * **Agente IA #1 (Atención y Ventas 24/7 en WhatsApp y Web):** responde mensajes de texto en 10 segundos día y noche, **escucha audios de WhatsApp (notas de voz)**, pasa precios reales y **lee fotos de comprobantes de transferencia o seña**.
     * **Agente IA #2 (Gestor Automático y Control de Ingresos):** a medida que el cliente habla, bloquea el horario en la **Agenda de Turnos / Canchas** sin sobreturnos, o descuenta stock y arma el pedido, o mueve al cliente en el **CRM con Gestión de Ingresos y Caja**, haciendo **seguimiento automático a las 24 hs** a los presupuestos abiertos para que no se pierda ninguna venta (con botón de pausa humana cuando el dueño quiere intervenir).
     * Y si todavía no tiene web (o solo usa Instagram), le armamos su **Página Web Profesional posicionada con SEO en Google**.
7. ESTRUCTURA VENDEDORA Y PRECIOS CLAROS EN LOS 4 MENSAJES:
   - Mensaje 1 (Gancho Real + Posicionamiento en Google Maps, máx 36 palabras): Saludo natural ("Hola! ¿Cómo estás?"), mencioná que viste a *${businessName}* en Google Maps en ${location} y hacele una pregunta directa sobre su cuello de botella diario (ej: si hoy las consultas, audios de WhatsApp, señas, turnos/reservas o el seguimiento de presupuestos e ingresos los siguen manejando a mano).
   - Mensaje 2 (Autoridad Anónima + Doble Agente IA con Audios, Señas y Gestión de Ingresos, máx 46 palabras): Contale que en *NatoH Systems* ya implementamos esto en rubros como el suyo (mencioná 3 o 4 entre odontólogos, estética, depilación, psicólogos, construcción, predios de fútbol o asociaciones civiles, sin dar nombres propios): el *Agente IA #1* responde WhatsApp (texto, audios y comprobantes de seña) 24/7, y el *Agente IA #2* bloquea el turno/pedido y registra cada cobro en su *CRM con Gestión de Ingresos*.
   - Mensaje 3 (Inversión Clara y Retorno, máx 44 palabras): Detallale que puede activar el *Agente IA Respondedor 24/7 por $115.000/mes*, el plan completo de *Doble Agente IA + CRM, Turnero, Gestión de Ingresos y Web SEO incluidos por $175.000/mes*, o hacer su *Página Web SEO ($250.000)* o *Sistema a Medida ($350.000)* de pago único (50% al iniciar y 50% al entregar).
   - Mensaje 4 (Cierre Irresistible con Demo Interactiva en Vivo Personalizada, SIN LINK, máx 34 palabras): Contale que armamos una *demo interactiva en vivo personalizada con el nombre de ${businessName}* para que le mande un mensaje, un audio o una seña desde su celu y vea en pantalla cómo responde la IA y cómo carga el turno/venta y el ingreso solo. Preguntale si le pasás el acceso por acá para probarla 1 minuto sin compromiso.

${aiConfig.basePrompt ? `\nINSTRUCCIONES ADICIONALES:\n${aiConfig.basePrompt}\n` : ''}
Respondé ÚNICAMENTE con un JSON válido: {"messages": ["msg1", "msg2", "msg3", "msg4"]}`;

        const userPrompt = `Generá los 4 mensajes para este prospecto (RECORDÁ: CERO LINKS/URLs, CERO MENCIÓN A ESTRELLAS O RESEÑAS, CERO NOMBRES PROPIOS DE OTROS CLIENTES, incluí prueba social anónima de nuestros rubros + funciones de la demo en vivo como audios, comprobantes de seña, seguimiento 24h y gestión de ingresos):
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
