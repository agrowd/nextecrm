/**
 * 🤝 AGENTE 5: CLOSER COPILOT (ASISTENTE DE CIERRE EN VIVO - NATOH SYSTEMS)
 * 
 * Analiza el historial de conversación de WhatsApp de un lead junto con su
 * Dossier Estratégico (Agente 3) y su Auditoría Web (Agente 2) para asistir
 * al operador humano en tiempo real:
 * - Detecta la etapa del embudo y la objeción o pregunta del cliente
 * - Redacta una respuesta sugerida lista para enviar con 1 clic (con links a natohsystems.com / nextemarketing.com)
 * - Sugiere el siguiente paso comercial concreto
 */

const axios = require('axios');

const NATOH_PRICING_REFERENCE = `
PLANES Y PRECIOS OFICIALES NATOH SYSTEMS (https://natohsystems.com) - IDIOMA DUEÑO DE NEGOCIO + SEO COMERCIAL:
1. ⭐ PLAN RECOMENDADO (MENSUAL): Doble Agente de IA + Sistema CRM / Turnero / Pedidos, Gestión de Ingresos y Página Web SEO Incluidos -> $175.000 / mes (Armado completo + Mes 1: $350.000 en 2 pagos).
   - Incluye: Agente IA #1 (responde WhatsApp y Web en <15s las 24 hs, escucha audios de voz y valida fotos de comprobantes de seña/transferencia) + Agente IA #2 (bloquea turnos o canchas en la agenda sin sobreturnos, descuenta stock, registra cobros en Gestión de Ingresos y reactiva presupuestos abiertos a las 24 hs) + el Sistema completo + Página Web posicionada con SEO en Google.
2. 🤖 PLAN AGENTE IA RESPONDEDOR 24/7 (MENSUAL): $115.000 / mes (Instalación y entrenamiento + Mes 1: $180.000).
   - Incluye: El Agente de IA entrenado con tus precios, catálogo y disponibilidad respondiendo texto, audios y comprobantes 24/7 en WhatsApp y en tu Web.
3. 🌐 PÁGINA WEB PROFESIONAL CON SEO EN GOOGLE (PAGO ÚNICO SIN ABONO MENSUAL): $250.000 pago único (50% al iniciar y 50% al entregar lista en 5 a 7 días).
4. ⚙️ SISTEMA DE GESTIÓN DE INGRESOS / STOCK / PEDIDOS / TURNERO A MEDIDA (PAGO ÚNICO): $350.000 pago único (50% al iniciar y 50% contra entrega funcionando).

EXPERIENCIA REAL COMPROBADA (PRUEBA SOCIAL ANÓNIMA — NUNCA DAR NOMBRES PROPIOS DE CLIENTES):
- Ya desarrollamos y pusimos en producción sistemas para: **Consultorios Odontológicos, Centros de Estética y Depilación Definitiva, Consultorios de Psicología, Empresas de Construcción, Predios de Fútbol y Complejos Deportivos, Asociaciones Civiles y Sistemas de Gestión de Ingresos y Caja**.

LINKS DE DEMOS INTERACTIVAS EN VIVO (PERSONALIZABLES CON &negocio=Nombre):
- Sala general de Demos: https://natohsystems.com/demos
- Odontología / Psicología / Salud (Turnero + Señas + Gestión de Ingresos + CRM): https://natohsystems.com/demos?rubro=odontologia
- Estética / Depilación Definitiva / Peluquería (Turnero por Gabinete + Señas + Gestión de Ingresos): https://natohsystems.com/demos?rubro=estetica
- Predios de Fútbol / Complejos Deportivos / Talleres (Grilla de Canchas/Boxes + Validación de Señas + Ingresos): https://natohsystems.com/demos?rubro=taller
- Mayoristas / Distribuidoras / Corralones (Stock en vivo + Pedidos + Gestión de Ingresos + CRM): https://natohsystems.com/demos?rubro=mayorista
- Gastronomía / Restaurantes (Carta QR + Comandas + Caja $0 comisión): https://natohsystems.com/demos?rubro=gastronomia
- Tiendas / Comercios (Catálogo + Stock + Gestión de Ingresos + CRM): https://natohsystems.com/demos?rubro=ecommerce
- Inmobiliarias / Concesionarias (Agenda visitas + CRM): https://natohsystems.com/demos?rubro=inmobiliaria
- Construcción / Asociaciones Civiles / Empresas / Servicios (Tablero Kanban CRM + Seguimiento 24h + Gestión de Ingresos): https://natohsystems.com/demos?rubro=crm
`;

function buildPersonalizedDemoUrl(lead) {
    const cat = `${lead?.category || ''} ${lead?.keyword || ''} ${lead?.name || ''}`.toLowerCase();
    let rubroKey = 'odontologia';
    if (/estetic|depil|cosmetolog|peluquer|barber|spa/.test(cat)) rubroKey = 'estetica';
    else if (/odont|dent|clinic|medic|salud|kinesi|psicol|terap|veterin/.test(cat)) rubroKey = 'odontologia';
    else if (/taller|lubricent|mecan|cancha|futbol|padel|predio|deport|gimnasio/.test(cat)) rubroKey = 'taller';
    else if (/mayor|distrib|corralon|ferreter|fabric|logist/.test(cat)) rubroKey = 'mayorista';
    else if (/restaur|bar|cafe|pizz|hamburg|gastro|panad|helad/.test(cat)) rubroKey = 'gastronomia';
    else if (/ropa|indument|zapater|muebler|tienda|comercio|optica/.test(cat)) rubroKey = 'ecommerce';
    else if (/inmobiliar|propiedad|concesionar|auto/.test(cat)) rubroKey = 'inmobiliaria';
    else if (/construct|obra|arquitect|asociacion|fundacion|club|mutual|estudio|contab|abogad|empres|consult/.test(cat)) rubroKey = 'crm';
    const negocioParam = lead?.name ? `&negocio=${encodeURIComponent(lead.name)}` : '';
    return `https://natohsystems.com/demos?rubro=${rubroKey}${negocioParam}`;
}

class CloserCopilot {
    buildHeuristicSuggestion(lead, messages = []) {
        const lastInbound = [...messages].reverse().find(m => !m.fromMe && m.direction !== 'outbound');
        const text = (lastInbound?.content || lastInbound?.body || '').toLowerCase();
        const name = lead?.name || 'el cliente';
        const targetLabel = lead?.dossier?.targetServiceLabel || 'Sistema a Medida / Web Profesional + IA';
        const targetOffer = lead?.dossier?.suggestedOffer || 'Sistema a Medida $350.000, Web Profesional $250.000 o Agente IA $180.000 en 2 pagos';

        if (!lastInbound) {
            return {
                stage: 'esperando_respuesta',
                stageLabel: '⏳ Esperando respuesta del prospecto',
                detectedObjection: 'Aún no respondió a la secuencia inicial',
                coachingTip: 'Si pasaron más de 48 hs y leyó los mensajes, enviá un seguimiento corto ofreciendo mostrarle un ejemplo puntual de NatoH Systems sin compromiso.',
                suggestedReply: `Hola! ¿Cómo estás? Te escribía cortito por si llegaste a ver la propuesta de *NatoH Systems* (https://natohsystems.com) para *${name}*. Si te sirve, te paso por acá un ejemplo rápido de cómo funciona nuestro ${targetLabel} sin ningún compromiso. ¿Te parece?`,
                confidence: 0.80
            };
        }

        if (/precio|cuanto|costo|valor|presupuesto|sale|tarifa|planes/.test(text)) {
            return {
                stage: 'consulta_precio',
                stageLabel: '💰 Consulta de Precio / Inversión',
                detectedObjection: 'Quiere conocer valores claros y modalidad de pago',
                coachingTip: 'Anclá el valor mostrando el ahorro de la promo, mencioná los 2 pagos (50% y 50%) y cerrá ofreciendo una llamada de 5 minutos o demo.',
                suggestedReply: `¡Gracias por responder! Te detallo: para *${name}* recomendamos nuestro *${targetLabel}*. Con la promo vigente te queda en: ${targetOffer}. Se abona 50% para iniciar y el otro 50% recién cuando te lo entregamos funcionando (podés ver nuestros desarrollos en https://natohsystems.com). ¿Te queda bien que te llame 5 minutitos hoy o mañana para mostrarte una demo?`,
                confidence: 0.92
            };
        }

        if (/^(si|sí|dale|bueno|ok|claro|pasame|mandame|de una)\b|como funciona|info|mas informacion|contame|explica|ver|ejemplo|demo|muestra|web|sistema/i.test(text)) {
            const demoUrl = buildPersonalizedDemoUrl(lead);

            return {
                stage: 'interes_demo',
                stageLabel: '🔥 Interés Activo / Pide Ver la Demo en Vivo',
                detectedObjection: 'Aceptó probar la demo interactiva personalizada para ver cómo atienden los 2 Agentes IA y cómo impactan turnos, ventas e ingresos',
                coachingTip: 'Enviale el link personalizado con el nombre de su negocio a la Sala de Demos Interactiva indicando que puede probar texto, audios de voz, comprobantes de seña y seguimiento a las 24 hs.',
                suggestedReply: `¡Genial! Mirá, te armé este acceso directo personalizado con el nombre de *${name}* para que lo pruebes vos mismo desde el celu sin instalar nada:\n👉 ${demoUrl}\n\nAhí podés escribirle al *Agente IA #1*, mandarle un *audio de voz* o una *foto de comprobante de seña*, y ver en vivo cómo el *Agente IA #2* bloquea el turno/pedido, registra el cobro en *Gestión de Ingresos* y hace seguimiento a las 24 hs (como ya implementamos en odontólogos, estética, depilación, psicólogos, constructoras, predios de fútbol y asociaciones civiles). ¡Probalo 1 minuto y decime qué te parece!`,
                confidence: 0.96
            };
        }

        if (/caro|no tengo plata|mas adelante|ahora no|despues|mes que viene|presupuesto ajustado/.test(text)) {
            return {
                stage: 'objecion_presupuesto',
                stageLabel: '🛡️ Objeción de Presupuesto / Timing',
                detectedObjection: 'Siente que la inversión inicial es alta o quiere postergarlo',
                coachingTip: 'Ofrecé arrancar por el módulo más accesible (ej. Agente IA $180.000 o Web en 2 pagos de $125.000) para congelar el descuento de la promo.',
                suggestedReply: `Te entiendo perfectamente. Si querés, para que no tengas que hacer toda la inversión junta ahora, podemos arrancar por la primera etapa congelando el valor promocional y dividirlo en 2 pagos (son solo $90.000 para empezar con el Agente IA o $125.000 para la Web/Sistema). ¿Te sirve si lo armamos así para que ya te empiece a generar clientes?`,
                confidence: 0.88
            };
        }

        if (/recepcionista|secretaria|emplead|encarga de todo eso|encarga de eso/.test(text)) {
            const demoUrl = buildPersonalizedDemoUrl(lead);
            return {
                stage: 'rechazo_recepcionista',
                stageLabel: '👩‍💼 Objeción: "Ya tenemos recepcionista"',
                detectedObjection: 'Teme que la IA reemplace a recepción o cree que ya tiene cubierto el puesto humano',
                coachingTip: 'Aclarale con empatía que los Agentes de IA son el mejor aliado de recepción: atienden fuera de hora, escuchan audios largos y validan señas para sacarle trabajo pesado.',
                suggestedReply: `¡Buenísimo que tengan equipo! Justamente nuestros Agentes de IA no reemplazan a recepción, sino que la ayudan: responden fuera de horario o fin de semana, escuchan audios y validan señas para dejarle todo filtrado y anotado en *${name}*. Te dejo la demo personalizada por si quieren chusmear cómo trabaja junto al equipo:\n👉 ${demoUrl}`,
                confidence: 0.94
            };
        }

        if (/ya tenemos|ya tengo|tenemos un sistema|tenemos sistema|tenemos web/.test(text)) {
            const demoUrl = buildPersonalizedDemoUrl(lead);
            return {
                stage: 'rechazo_ya_tiene_sistema',
                stageLabel: '⚙️ Objeción: "Ya tenemos un sistema / web"',
                detectedObjection: 'Cree que para usar NatoH Systems tiene que descartar o cambiar el sistema que ya usa',
                coachingTip: 'Explicá que puede sumar solo el Agente IA Respondedor 24/7 en WhatsApp ($115.000/mes) encima de su operación actual sin cambiar su sistema.',
                suggestedReply: `¡Excelente que ya estén digitalizados! Tenenos en cuenta porque también podemos sumar únicamente el *Agente IA Respondedor 24/7* en el WhatsApp de *${name}* (que escucha audios, pasa info y valida señas en segundos) sin cambiar el sistema que ya usan. Te dejo nuestra demo en vivo por si les sirve a futuro:\n👉 ${demoUrl}`,
                confidence: 0.93
            };
        }

        if (/no me interesa|no gracias|no estoy interesad|te agradezco pero no|por ahora no|por ahora te agradezco|baja|no quiero/.test(text)) {
            const demoUrl = buildPersonalizedDemoUrl(lead);
            return {
                stage: 'rechazo_cortes',
                stageLabel: '🧊 No Interesado / Postergado (Respuesta Humana Posterior)',
                detectedObjection: 'Leyó la secuencia después y declinó o postergó cortésmente antes de probar la demo personalizada',
                coachingTip: 'Despedite con total amabilidad y dejale el link a la demo interactiva personalizada con el nombre de su negocio sin ningún compromiso.',
                suggestedReply: `¡Impecable, muchas gracias por tomarte el tiempo de responderme! Te dejo sin ningún compromiso el acceso a la demo interactiva personalizada que habíamos armado con el nombre de *${name}* por si algún día quieren probarla desde el celu:\n👉 ${demoUrl}\n¡Muchos éxitos!`,
                confidence: 0.91
            };
        }

        return {
            stage: 'conversacion_abierta',
            stageLabel: '💬 Conversación Abierta',
            detectedObjection: 'Mensaje general del cliente que requiere seguimiento consultivo',
            coachingTip: 'Respondé su consulta de forma directa y llevalo hacia una breve llamada de 5 minutos o envío de demo de NatoH Systems.',
            suggestedReply: `¡Hola! Qué bueno saludarte. Con respecto a lo que me comentás, para *${name}* lo ideal es implementar nuestro *${targetLabel}* que entregamos listo para usar en 7 días (podés ver ejemplos en https://natohsystems.com). ¿Tenés 5 minutos hoy a la tarde para que te comente por llamada cómo lo adaptamos a tu negocio?`,
            confidence: 0.84
        };
    }

    async generateSuggestion(lead, messages = []) {
        const heuristic = this.buildHeuristicSuggestion(lead, messages);
        const apiKey = process.env.OPENAI_API_KEY;

        if (!apiKey || apiKey === 'your-api-key' || apiKey.trim() === '') {
            return heuristic;
        }

        try {
            const recentTranscript = messages.slice(-10).map(m => {
                const role = (m.fromMe || m.direction === 'outbound') ? 'Agencia (NatoH/Nexte)' : `Cliente (${lead?.name || 'Prospecto'})`;
                return `${role}: ${m.content || m.body || ''}`;
            }).join('\n');

            const dossierInfo = lead?.dossier?.primaryPain
                ? `Dolor detectado: ${lead.dossier.primaryPain}. Solución recomendada: ${lead.dossier.targetServiceLabel}. Oferta sugerida: ${lead.dossier.suggestedOffer}.`
                : 'Sin dossier previo.';

            const prompt = `Sos el "Closer Copilot" (Agente 5) de NatoH Systems (https://natohsystems.com) & Nexte Marketing (https://nextemarketing.com).
Tu misión es ayudar al vendedor humano a cerrar la venta por WhatsApp con el dueño del negocio "${lead?.name || 'Prospecto'}" (Rubro: ${lead?.category || lead?.keyword || 'Comercio'}, Zona: ${lead?.location || 'Argentina'}).

CONTEXTO DEL PROSPECTO:
- ${dossierInfo}
- Sitio web actual: ${lead?.website || 'No tiene web'} (Plataforma externa: ${lead?.externalPlatform || 'Ninguna'})
- Score B2B: ${lead?.leadScore || 50}/100

${NATOH_PRICING_REFERENCE}

HISTORIAL RECIENTE DEL CHAT DE WHATSAPP:
${recentTranscript || '(Sin mensajes aún)'}

Analizá el último mensaje del cliente y devolvé ÚNICAMENTE un JSON válido con:
{
  "stage": "consulta_precio | interes_demo | objecion_presupuesto | listo_para_cerrar | conversacion_abierta | esperando_respuesta",
  "stageLabel": "Etiqueta corta con emoji del estado actual de la negociación",
  "detectedObjection": "Qué está preguntando, dudando o necesitando el cliente en este momento (1 oración)",
  "coachingTip": "Consejo táctico de 1 oración para el vendedor humano",
  "suggestedReply": "Mensaje de WhatsApp exacto listo para copiar y enviar al cliente (español argentino natural, cálido, máximo 55 palabras, resolviendo su duda, mencionando https://natohsystems.com si pide ver trabajos y proponiendo llamada de 5 min o cierre)"
}`;

            const response = await axios.post(
                'https://api.openai.com/v1/chat/completions',
                {
                    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
                    messages: [{ role: 'user', content: prompt }],
                    response_format: { type: 'json_object' },
                    temperature: 0.55,
                    max_tokens: 450
                },
                {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 12000
                }
            );

            const parsed = JSON.parse(response.data.choices[0].message.content);
            return {
                stage: parsed.stage || heuristic.stage,
                stageLabel: parsed.stageLabel || heuristic.stageLabel,
                detectedObjection: parsed.detectedObjection || heuristic.detectedObjection,
                coachingTip: parsed.coachingTip || heuristic.coachingTip,
                suggestedReply: parsed.suggestedReply || heuristic.suggestedReply,
                confidence: 0.95
            };
        } catch (error) {
            console.warn('⚠️ [Agente 5 Copilot] Usando sugerencia heurística:', error.message);
            return heuristic;
        }
    }
}

module.exports = {
    closerCopilot: new CloserCopilot()
};
