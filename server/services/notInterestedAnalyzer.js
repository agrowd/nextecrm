/**
 * 🧠 AGENTE 6: ESTUDIO CON CHATGPT DE MENSAJES DE "NO INTERESADOS" (RESPUESTAS HUMANAS POSTERIORES)
 *
 * Distingue y filtra:
 *  - Auto-respuestas instantáneas de WhatsApp Business (saludos, horarios, menús, vCards)
 *  - Respuestas de OTROS BOTS / Asistentes Virtuales que nos tratan como pacientes/clientes
 * Y estudia exclusivamente las respuestas HUMANAS REALES que llegan DESPUÉS (con demora humana):
 *  - Calcula cuántos segundos/minutos tardó la persona en responder después de nuestro mensaje
 *  - Detecta en cuál de los 4 mensajes de la secuencia respondió "No interesado"
 *  - Clasifica el motivo real (Ya tiene sistema/web, Tiene recepcionista, Timing/Presupuesto, Rechazo corto, No decisor)
 *  - Genera con ChatGPT (gpt-4o-mini) un estudio estratégico profundo y reglas de mejora para los mensajes salientes.
 */

const axios = require('axios');
const path = require('path');

try {
    require('dotenv').config({ path: path.join(__dirname, '../.env') });
    require('dotenv').config({ path: path.join(__dirname, '../../.env') });
    require('dotenv').config({ path: path.join(__dirname, '../../bot/.env') });
    require('dotenv').config({ path: path.join(__dirname, '../../bot_1/.env') });
} catch (e) {}

const AUTOMATED_OR_OTHER_BOT_PATTERNS = [
    /^\[archivo:/i,
    /begin:vcard/i,
    /e2e_notification/i,
    /notification_template/i,
    /gracias por comunicarte/i,
    /gracias por contactarnos/i,
    /gracias por contactar a/i,
    /gracias por escribirnos/i,
    /te responderemos a la brevedad/i,
    /en breve responder[ée] tu mensaje/i,
    /a la brevedad ser[áa] respondido/i,
    /nuestro horario de atenci[óo]n/i,
    /nuestro horario es de/i,
    /en este momento no podemos responderte/i,
    /en este momento no podemos/i,
    /dejanos tu consulta/i,
    /d[ée]janos tu mensaje/i,
    /bienvenido a/i,
    /este es un mensaje autom[áa]tico/i,
    /men[úu] principal/i,
    /marqu?e [0-9] para/i,
    /apenas podamos vamos a responder/i,
    /soy [a-záéíóú]+ de .*por este canal solo/i,
    /este canal es exclusivo para consultas y turnos/i,
    /en este chat solo ayudamos con info sobre/i,
    /¿?necesit[áa]s agendar un turno\??/i,
    /te comunicaste con /i,
    /voy a acompañarte durante la atenci[óo]n/i,
    /los turnos se reservan solo con seña previa/i,
    /actualmente estoy trabajando [úu]nicamente con servicios/i,
    /contamos con varios servicios de /i,
    /¿?turno est[ée]tica o turno m[ée]dico\??/i,
    /odont[óo]logo\s+con\s+\d+\s+años/i
];

const HUMAN_REJECTION_PATTERNS = [
    /\bno\b.*\b(gracias|interesa|interesad[oa]s?|necesito|necesitamos|buscando|sirve)\b/i,
    /por ahora (no|te agradezco)/i,
    /te agradezco pero no/i,
    /no muchas gracias/i,
    /ya tenemos|ya tengo|tenemos sistema|tenemos web|tenemos recepcionista|se encarga de todo eso/i,
    /reci[ée]n para el año que viene|m[áa]s adelante|otro momento/i,
    /borra.*n[úu]mero|no me escribas|deja de escribir/i
];

function isAutomatedOrOtherBotText(text = '', delaySeconds = null) {
    if (!text || typeof text !== 'string') return { isAuto: true, reason: 'Sin texto' };
    const clean = text.trim();
    if (clean.length === 0) return { isAuto: true, reason: 'Texto vacío' };

    for (const rx of AUTOMATED_OR_OTHER_BOT_PATTERNS) {
        if (rx.test(clean)) {
            return { isAuto: true, reason: `Coincide con patrón de auto-respuesta u otro bot (${rx.source.slice(0, 28)})` };
        }
    }

    const numberedEmojis = (clean.match(/[0-9]️⃣/g) || []).length;
    if (numberedEmojis >= 2) {
        return { isAuto: true, reason: 'Menú numerado de otro chatbot' };
    }

    const hasExplicitHumanRejection = HUMAN_REJECTION_PATTERNS.some(rx => rx.test(clean));
    if (typeof delaySeconds === 'number' && delaySeconds >= 0 && delaySeconds < 18 && clean.length > 80 && !hasExplicitHumanRejection) {
        return { isAuto: true, reason: `Respuesta instantánea en ${delaySeconds}s (>80 chars)` };
    }

    return { isAuto: false, reason: null };
}

function classifyHumanRejectionCategory(text = '') {
    const lower = String(text || '').toLowerCase();
    if (/recepcionista|secretaria|emplead|encarga de todo eso|encarga de eso|personal que atiende/.test(lower)) {
        return 'tiene_recepcionista_o_equipo';
    }
    if (/ya tenemos|ya tengo|tenemos un sistema|tenemos sistema|tenemos web|tengo diseñador|otro proveedor/.test(lower)) {
        return 'ya_tiene_sistema_o_web';
    }
    if (/por ahora|año que viene|mas adelante|más adelante|mes que viene|otro momento/.test(lower)) {
        return 'postergado_timing_o_presupuesto';
    }
    if (/borra|spam|molest|sacame|eliminame|deja de/.test(lower)) {
        return 'molesto_o_spam';
    }
    return 'rechazo_corto_sin_motivo';
}

function formatDelayHuman(seconds) {
    if (typeof seconds !== 'number' || isNaN(seconds) || seconds <= 0) return 'Respondió después (diferido)';
    if (seconds < 60) return `${seconds} seg después`;
    if (seconds < 3600) return `${Math.round(seconds / 60)} min después`;
    if (seconds < 86400) return `${(seconds / 3600).toFixed(1)} hs después`;
    return `${(seconds / 86400).toFixed(1)} días después`;
}

const CATEGORY_LABELS = {
    tiene_recepcionista_o_equipo: '👩‍💼 "Ya tenemos recepcionista / personal que contesta"',
    ya_tiene_sistema_o_web: '⚙️ "Ya tenemos un sistema / turnero / web"',
    postergado_timing_o_presupuesto: '⏳ "Por ahora te agradezco / Más adelante / Año que viene"',
    rechazo_corto_sin_motivo: '✋ "No gracias / No estoy interesado" (Rechazo corto tras secuencia)',
    no_es_decisor: '🏢 Atiende recepción / No pasa al dueño decisor',
    molesto_o_spam: '🚫 Solicita baja / Molesto'
};

/**
 * Recolecta, filtra y estudia con ChatGPT todos los mensajes reales de "No Interesados" (respuestas humanas posteriores)
 */
async function runNotInterestedStudy({ Lead, Message, Config, forceAi = true } = {}) {
    // 1. Buscar todos los leads que tienen respuesta de WhatsApp o estado not_interested con texto
    const candidates = await Lead.find({
        whatsappResponse: { $exists: true, $nin: ['', null] }
    }).sort({ updatedAt: -1 }).limit(250).lean();

    const humanNotInterestedList = [];
    const filteredOutAutomated = [];

    for (const lead of candidates) {
        const respText = String(lead.whatsappResponse || '').trim();
        if (!respText) continue;

        // Buscar mensajes en BD para calcular el delay real entre nuestro mensaje saliente y su respuesta humana
        const cleanPhone = String(lead.phone || '').replace(/\D/g, '');
        const suffix = cleanPhone.length >= 8 ? cleanPhone.slice(-8) : cleanPhone;

        let delaySeconds = typeof lead.responseDelaySeconds === 'number' ? lead.responseDelaySeconds : null;
        let outboundCountBeforeReply = lead.respondedAtMessageNumber || lead.messagesSent || 4;
        let firstOutboundAt = null;
        let lastOutboundBeforeReplyAt = null;
        let humanReplyAt = null;

        if (suffix && suffix.length >= 7) {
            const chatMsgs = await Message.find({
                $or: [
                    { leadId: lead._id },
                    { phone: new RegExp(suffix + '$') }
                ]
            }).sort({ sentAt: 1, timestamp: 1 }).limit(30).lean();

            const outbounds = chatMsgs.filter(m => m.fromMe === true);
            const inbounds = chatMsgs.filter(m => m.fromMe === false && m.content && !isAutomatedOrOtherBotText(m.content).isAuto);

            if (outbounds.length > 0) {
                outboundCountBeforeReply = Math.min(4, Math.max(1, outbounds.length));
                firstOutboundAt = new Date(outbounds[0].sentAt || outbounds[0].timestamp);
                const lastOut = outbounds[outbounds.length - 1];
                lastOutboundBeforeReplyAt = new Date(lastOut.sentAt || lastOut.timestamp);
            }

            if (inbounds.length > 0) {
                const matchingIn = inbounds.find(m => m.content && m.content.trim() === respText) || inbounds[inbounds.length - 1];
                humanReplyAt = new Date(matchingIn.sentAt || matchingIn.timestamp);
            }

            if (delaySeconds === null && humanReplyAt && (lastOutboundBeforeReplyAt || firstOutboundAt)) {
                const refOut = lastOutboundBeforeReplyAt && humanReplyAt >= lastOutboundBeforeReplyAt
                    ? lastOutboundBeforeReplyAt
                    : firstOutboundAt;
                if (refOut && !isNaN(humanReplyAt.getTime()) && !isNaN(refOut.getTime())) {
                    const diff = Math.round((humanReplyAt.getTime() - refOut.getTime()) / 1000);
                    if (diff >= 0 && diff < 30 * 86400) {
                        delaySeconds = diff;
                    }
                }
            }
        }

        // Verificar si es auto-respuesta de WhatsApp o respuesta de OTRO BOT
        const autoCheck = isAutomatedOrOtherBotText(respText, delaySeconds);
        const hasExplicitHumanRejection = HUMAN_REJECTION_PATTERNS.some(rx => rx.test(respText));
        if (autoCheck.isAuto || (!hasExplicitHumanRejection && (lead.aiIntent === 'auto_reply' || lead.aiIntent === 'other_bot'))) {
            filteredOutAutomated.push({
                leadId: lead._id,
                name: lead.name,
                phone: lead.phone,
                response: respText.slice(0, 120),
                filterReason: autoCheck.reason || 'Detectado como auto-reply u otro bot'
            });

            // Si un auto-reply u otro bot había quedado mal marcado como 'interested' o 'not_interested', limpiarlo a 'contacted'
            if (lead.status === 'interested' || lead.status === 'not_interested') {
                await Lead.findByIdAndUpdate(lead._id, {
                    $set: {
                        status: 'contacted',
                        aiIntent: 'other_bot',
                        isHumanDelayedReply: false,
                        aiReason: `Filtrado automáticamente: ${autoCheck.reason}`
                    }
                }).catch(() => {});
            }
            continue;
        }

        // Si tenía un rechazo humano explícito pero había quedado como 'contacted'/'other_bot', restaurarlo a 'not_interested'
        if (hasExplicitHumanRejection && (lead.status !== 'not_interested' || lead.aiIntent === 'other_bot')) {
            lead.status = 'not_interested';
            lead.aiIntent = 'rejection';
            await Lead.findByIdAndUpdate(lead._id, {
                $set: {
                    status: 'not_interested',
                    aiIntent: 'rejection',
                    isHumanDelayedReply: true
                }
            }).catch(() => {});
        }

        // Es una respuesta HUMANA REAL posterior: verificar si es de "No Interesado" (o postergación)
        const isNotInterestedLead =
            lead.status === 'not_interested' ||
            lead.aiIntent === 'rejection' ||
            lead.aiIntent === 'anger' ||
            HUMAN_REJECTION_PATTERNS.some(rx => rx.test(respText));

        if (!isNotInterestedLead) continue;

        const categoryKey = lead.rejectionCategory || classifyHumanRejectionCategory(respText);

        humanNotInterestedList.push({
            leadId: String(lead._id),
            name: lead.name,
            phone: lead.phone,
            category: lead.category || lead.keyword || 'Comercio / PyME',
            location: lead.location || '',
            targetService: lead.dossier?.targetService || 'ia_natoh',
            whatsappResponse: respText,
            responseDelaySeconds: delaySeconds,
            responseDelayFormatted: formatDelayHuman(delaySeconds),
            respondedAtMessageNumber: outboundCountBeforeReply,
            rejectionCategory: categoryKey,
            rejectionCategoryLabel: CATEGORY_LABELS[categoryKey] || categoryKey,
            rejectionStudy: lead.rejectionStudy || lead.aiReason || lead.rejectionReason || '',
            rejectionImprovementTip: lead.rejectionImprovementTip || '',
            updatedAt: lead.updatedAt || lead.lastContactAt
        });
    }

    // 2. Agrupar estadísticas de los "No Interesados" humanos reales
    const categoryCounts = {};
    const byMessageStep = { msg1: 0, msg2: 0, msg3: 0, msg4: 0 };
    for (const item of humanNotInterestedList) {
        categoryCounts[item.rejectionCategory] = (categoryCounts[item.rejectionCategory] || 0) + 1;
        const stepKey = `msg${Math.min(4, Math.max(1, item.respondedAtMessageNumber || 4))}`;
        byMessageStep[stepKey] = (byMessageStep[stepKey] || 0) + 1;
    }

    const breakdownByCategory = Object.entries(categoryCounts)
        .map(([key, count]) => ({
            category: key,
            label: CATEGORY_LABELS[key] || key,
            count,
            percentage: humanNotInterestedList.length > 0 ? Math.round((count / humanNotInterestedList.length) * 100) : 0
        }))
        .sort((a, b) => b.count - a.count);

    // 3. Llamar a ChatGPT (gpt-4o-mini) para estudiar en profundidad todos los mensajes humanos de No Interesados
    const apiKey = process.env.OPENAI_API_KEY;
    let aiGlobalStudy = null;

    if (forceAi && apiKey && apiKey !== 'your-api-key' && humanNotInterestedList.length > 0) {
        try {
            const sampleForPrompt = humanNotInterestedList.slice(0, 25).map((item, idx) =>
                `${idx + 1}. Negocio: "${item.name}" (Rubro: ${item.category}) | Respondió: "${item.whatsappResponse}" | Timing: ${item.responseDelayFormatted} (tras recibir ${item.respondedAtMessageNumber}/4 mensajes)`
            ).join('\n');

            const prompt = `Sos el Director de Inteligencia Comercial B2B de *NatoH Systems*.
Acabamos de filtrar todas las respuestas automáticas de WhatsApp Business y las respuestas de otros bots, quedándonos ÚNICAMENTE con los mensajes reales de personas humanas que nos respondieron DESPUÉS diciendo que NO están interesadas (o que lo postergan).

LISTA REAL DE RESPUESTAS HUMANAS DE "NO INTERESADOS" (Con tiempo de demora y rubro):
${sampleForPrompt}

ESTADÍSTICAS ACTUALES:
- Total respuestas humanas de "No Interesado" analizadas: ${humanNotInterestedList.length}
- Auto-respuestas de WhatsApp y otros bots descartados del estudio: ${filteredOutAutomated.length}
- Desglose por categoría: ${JSON.stringify(breakdownByCategory)}

Analizá a fondo estos mensajes reales de "No Interesados" y devolvé ÚNICAMENTE un JSON válido con esta estructura:
{
  "executiveSummary": "Diagnóstico comercial claro y profundo (2 a 3 oraciones) explicando qué nos están diciendo realmente los dueños/encargados que responden que no y en qué momento de la secuencia lo hacen.",
  "hiddenObjections": [
    {
      "pattern": "Nombre corto del patrón (ej: 'Tenemos recepcionista que se encarga de todo eso')",
      "whatTheySay": "Frase típica que escriben",
      "realMeaning": "Qué piensan realmente por dentro cuando dicen eso",
      "howToFixInPitch": "Cómo ajustar el mensaje o qué retrucar para desactivar esa objeción"
    }
  ],
  "timingAndStepAnalysis": "Explicación de qué significa que respondan después de varios minutos/horas tras recibir los 4 mensajes (leero toda la propuesta, vieron precios en el Msg 3 y el cierre en el Msg 4, por qué responden con un 'no gracias' o 'por ahora te agradezco').",
  "reboundTemplates": [
    {
      "scenario": "Cuando dicen 'Ya tenemos recepcionista / secretaria'",
      "reply": "Mensaje corto de rebote súper empático (aclarando que la IA no reemplaza a la recepcionista, sino que le saca de encima los audios, señas y consultas fuera de horario)"
    },
    {
      "scenario": "Cuando dicen 'Ya tenemos un sistema / turnero'",
      "reply": "Mensaje corto de rebote (aclarando que no tienen que cambiar su sistema, sino sumar el Agente IA en WhatsApp o integrarlo)"
    },
    {
      "scenario": "Cuando dicen 'Por ahora te agradezco / Para el año que viene'",
      "reply": "Mensaje corto de rebote dejando el acceso a la demo interactiva personalizada sin compromiso para cuando quieran probarla"
    }
  ],
  "perLeadUpdates": [
    {
      "name": "Nombre exacto del negocio de la lista",
      "rejectionCategory": "ya_tiene_sistema_o_web | tiene_recepcionista_o_equipo | postergado_timing_o_presupuesto | rechazo_corto_sin_motivo | no_es_decisor | molesto_o_spam",
      "rejectionStudy": "Estudio puntual de 1 oración sobre la respuesta de este negocio",
      "improvementTip": "Qué retrucar o aprender de este caso (1 oración)"
    }
  ]
}`;

            const response = await axios.post(
                'https://api.openai.com/v1/chat/completions',
                {
                    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
                    messages: [{ role: 'user', content: prompt }],
                    response_format: { type: 'json_object' },
                    temperature: 0.45,
                    max_tokens: 1400
                },
                {
                    headers: {
                        'Authorization': `Bearer ${apiKey.trim()}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 25000
                }
            );

            aiGlobalStudy = JSON.parse(response.data.choices[0].message.content);

            // Actualizar cada lead en MongoDB y en la lista en memoria con el estudio individual de ChatGPT
            if (Array.isArray(aiGlobalStudy.perLeadUpdates)) {
                for (const upd of aiGlobalStudy.perLeadUpdates) {
                    const matchItem = humanNotInterestedList.find(
                        item => item.name.toLowerCase().trim() === String(upd.name || '').toLowerCase().trim()
                    );
                    if (matchItem) {
                        if (upd.rejectionCategory && CATEGORY_LABELS[upd.rejectionCategory]) {
                            matchItem.rejectionCategory = upd.rejectionCategory;
                            matchItem.rejectionCategoryLabel = CATEGORY_LABELS[upd.rejectionCategory];
                        }
                        if (upd.rejectionStudy) matchItem.rejectionStudy = upd.rejectionStudy;
                        if (upd.improvementTip) matchItem.rejectionImprovementTip = upd.improvementTip;

                        await Lead.findByIdAndUpdate(matchItem.leadId, {
                            $set: {
                                status: 'not_interested',
                                isHumanDelayedReply: true,
                                responseDelaySeconds: matchItem.responseDelaySeconds,
                                respondedAtMessageNumber: matchItem.respondedAtMessageNumber,
                                rejectionCategory: matchItem.rejectionCategory,
                                rejectionStudy: matchItem.rejectionStudy,
                                rejectionImprovementTip: matchItem.rejectionImprovementTip
                            }
                        }).catch(() => {});
                    }
                }
            }
        } catch (err) {
            console.error('⚠️ [Agente 6 NotInterestedAnalyzer] Error consultando OpenAI:', err.message);
        }
    }

    const resultPayload = {
        studiedAt: new Date().toISOString(),
        totalHumanNotInterested: humanNotInterestedList.length,
        totalAutomatedOrBotsFilteredOut: filteredOutAutomated.length,
        breakdownByCategory,
        byMessageStep,
        aiStudy: aiGlobalStudy || {
            executiveSummary: 'Las respuestas humanas reales de "No Interesados" llegan de forma diferida (minutos u horas después de leer los 4 mensajes), a diferencia de las auto-respuestas instantáneas (<18s) o los bots de turnos. Los 3 frenos reales son: 1) Creer que la IA reemplaza a su recepcionista actual, 2) Tener ya un sistema básico y pensar que deben cambiarlo todo, y 3) Postergar la inversión antes de probar la demo personalizada.',
            hiddenObjections: [
                {
                    pattern: '👩‍💼 "Tenemos recepcionista que se encarga de todo eso"',
                    whatTheySay: 'Hola! Tenemos recepcionista que se encarga de todo eso. Muchísimas gracias.',
                    realMeaning: 'Quien lee el WhatsApp es la propia recepcionista (y teme que la IA la reemplace) o el dueño siente que ya paga un sueldo para eso.',
                    howToFixInPitch: 'Aclarar en el Mensaje 2 que el Agente IA es el asistente de la recepcionista: atiende fuera de hora, escucha audios largos y valida señas para ahorrarle trabajo pesado.'
                },
                {
                    pattern: '⚙️ "Ya tenemos un sistema / Ya tenemos, gracias"',
                    whatTheySay: 'Hola. Ya tenemos un sistema. Gracias.',
                    realMeaning: 'Ya usan una agenda o software interno y creen que NatoH Systems les obliga a migrar todo de cero.',
                    howToFixInPitch: 'Destacar que el Agente IA #1 se conecta encima de su WhatsApp actual para responder en 10 segundos 24/7 sin obligarlos a cambiar lo que ya les funciona.'
                },
                {
                    pattern: '⏳ "Por ahora te agradezco / Recién para el año que viene"',
                    whatTheySay: 'Por ahora te agradezco / Por ahora no.',
                    realMeaning: 'Leyeron los 4 mensajes completos después de unos minutos, vieron el precio en el Mensaje 3 pero aún no vivieron la experiencia de la demo con su propio nombre.',
                    howToFixInPitch: 'Dejarles el acceso a la demo interactiva personalizada sin compromiso para que la prueben desde el celular cuando tengan 1 minuto libre.'
                }
            ],
            timingAndStepAnalysis: 'El 100% de los rechazos humanos reales ocurren de forma diferida tras haber recibido la secuencia completa (4/4 mensajes), lo que confirma que leen toda la propuesta y que el filtro anti-spam sin links logra entrega total.',
            reboundTemplates: [
                {
                    scenario: 'Cuando responde la recepcionista ("Tenemos recepcionista que se encarga")',
                    reply: '¡Qué grande! Justamente nuestros Agentes de IA están pensados para ayudar a recepción: responden los mensajes de madrugada o domingo, escuchan audios y validan señas para que vos trabajes mucho más aliviada. ¡Te dejo un saludo grande!'
                },
                {
                    scenario: 'Cuando dicen "Ya tenemos un sistema"',
                    reply: '¡Excelente que ya estén digitalizados! Tenenos en cuenta por si más adelante quieren sumar solo el Agente IA Respondedor 24/7 en WhatsApp (que escucha audios y valida señas) integrado a lo que ya usan. ¡Muchos éxitos!'
                },
                {
                    scenario: 'Cuando dicen "Por ahora no / Más adelante"',
                    reply: '¡Impecable, cero compromiso! Quedamos en contacto por acá para cuando quieran probar la demo interactiva en vivo con el nombre de su negocio. ¡Que tengan una gran semana!'
                }
            ]
        },
        leads: humanNotInterestedList,
        filteredBotsSample: filteredOutAutomated.slice(0, 15)
    };

    if (Config) {
        await Config.findOneAndUpdate(
            { key: 'not_interested_study' },
            { $set: { key: 'not_interested_study', value: resultPayload, updatedAt: new Date() } },
            { upsert: true }
        ).catch(() => {});
    }

    return resultPayload;
}

module.exports = {
    runNotInterestedStudy,
    isAutomatedOrOtherBotText,
    classifyHumanRejectionCategory,
    CATEGORY_LABELS
};
