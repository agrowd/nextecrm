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

const OpenAI = require('openai');

const NATOH_PRICING_REFERENCE = `
TARIFARIO PROMO OTOÑO 2026 (NatoH Systems https://natohsystems.com & Nexte Marketing https://nextemarketing.com):
1. ⚙️ Sistema a Medida (ERP, Stock, Pedidos Mayoristas, Turnero Online o Carta QR Gastronómica): $350.000 ARS (antes $600.000)
2. 🤖 Agente de IA Conversacional 24/7 en WhatsApp: $180.000 ARS (antes $350.000)
3. 🌐 Sitio Web Corporativo / Catálogo E-Commerce: $250.000 ARS (antes $500.000)
4. 📍 Posicionamiento SEO Local en Google Maps: $150.000 ARS (antes $350.000)
5. 🎁 Combo Integral Completo (Web/Sistema + Agente IA + SEO Maps): $690.000 ARS
Forma de pago: 50% de anticipo al iniciar el desarrollo y 50% contra entrega funcionando (en 7 a 10 días hábiles).
`;

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

        if (/como funciona|info|mas informacion|contame|explica|ver|ejemplo|demo|muestra|web|sistema/.test(text)) {
            return {
                stage: 'interes_demo',
                stageLabel: '🔥 Interés Activo / Pide Demo o Info',
                detectedObjection: 'Quiere ver algo tangible aplicado a su rubro antes de decidir',
                coachingTip: 'Compartí el link de NatoH Systems (natohsystems.com), explicá el beneficio en 2 líneas y proponé llamada breve.',
                suggestedReply: `¡Buenísimo! Básicamente desarrollamos la solución llave en mano adaptada a *${name}* para que automatices las consultas y gestión desde el celular. Acá podés ver nuestros sistemas y trabajos recientes: https://natohsystems.com y https://nextemarketing.com. ¿Preferís que te mande un video corto por acá o hacemos una llamada rápida de 5 minutos y te muestro en pantalla?`,
                confidence: 0.92
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

        if (/no me interesa|no gracias|ya tenemos|baja|no quiero/.test(text)) {
            return {
                stage: 'rechazo_cortes',
                stageLabel: '🧊 Desinterés / Ya tiene proveedor',
                detectedObjection: 'Indica que ya cuenta con el servicio o no lo busca ahora',
                coachingTip: 'Dejá la puerta abierta con amabilidad y el link de natohsystems.com para que agende el contacto.',
                suggestedReply: `¡Impecable, muchas gracias por avisarme! Te dejo nuestro contacto agendado y nuestra web https://natohsystems.com por si más adelante necesitan desarrollar algún sistema a medida o automatizar WhatsApp con IA. ¡Muchos éxitos con *${name}*!`,
                confidence: 0.90
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
            const openai = new OpenAI({ apiKey });

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

            const response = await openai.chat.completions.create({
                model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }],
                response_format: { type: 'json_object' },
                temperature: 0.55,
                max_tokens: 450
            });

            const parsed = JSON.parse(response.choices[0].message.content);
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
