const axios = require('axios');

/**
 * Warmup Manager (Protocolo de Calentamiento Automatizado)
 * Envía mensajes conversacionales aleatorios entre los bots de la flota para elevar el trust-score de WhatsApp.
 * Utiliza un protocolo de 3 pasos (iniciador -> respuesta -> cierre) para evitar loops infinitos de mensajes.
 */
class WarmupManager {
    constructor(bot) {
        this.bot = bot;
        this.warmupNumbers = [];
        this.activeNumbers = [];
        
        // Mensajes para iniciar la conversación (Paso 1)
        this.initiators = [
            "Hola! Cómo va?",
            "Todo bien por ahí?",
            "Qué andás haciendo?",
            "Buen día! Cómo viene la jornada?",
            "Hola! Todo tranquilo?",
            "Buenas! Todo bien?",
            "Hola, ¿me escuchás bien?",
            "Uf, ando a mil hoy"
        ];
        
        // Respuestas al iniciador (Paso 2)
        this.responses = [
            "Hola! Todo bien por acá, ¿vos?",
            "Hola! Sí, todo tranquilo. Trabajando un rato.",
            "Qué hacés! Todo tranquilo, por suerte.",
            "Hola! Buen día. Todo bien, preparándome.",
            "Buenas! Sí, todo en orden. ¿Y allá?",
            "Todo bien! ¿En qué andás?",
            "Hola! Sí, se escucha perfecto."
        ];

        // Mensajes de cierre (Paso 3)
        this.closers = [
            "Buenísimo, coordinamos para más tarde entonces",
            "Dale, te hablo en un rato",
            "Perfecto, nos vemos luego",
            "Totalmente de acuerdo",
            "Jajaja de una",
            "Abrazo grande!",
            "Dale, coordinamos después.",
            "Joya, hablamos más tarde.",
            "Excelente, éxitos hoy!",
            "Un abrazo grande!"
        ];
        
        this.timer = null;
    }

    getArgentinaHour() {
        const now = new Date();
        const argentinaTime = new Date(now.getTime() - (3 * 60 * 60 * 1000));
        return argentinaTime.getUTCHours();
    }

    /**
     * Iniciar el ciclo de calentamiento periódico
     */
    async start() {
        this.bot.log("[WARMUP] Inicializando Warm-up Manager...");
        
        // Cargar números iniciales
        await this.loadWarmupNumbers();

        // Primer ping después de 5-10 minutos
        const initialDelay = 300000 + Math.random() * 300000;
        
        const scheduleNextWarmup = () => {
            // Intervalo aleatorio entre 60 y 150 minutos (1 a 2.5 horas)
            const intervalTime = (60 + Math.random() * 90) * 60 * 1000;
            
            this.timer = setTimeout(async () => {
                const hour = this.getArgentinaHour();
                if (hour >= 9 && hour < 21) {
                    await this.triggerWarmupPing();
                } else {
                    this.bot.log(`[WARMUP] Fuera de horario laboral en Argentina (Hora actual: ${hour} hs). Postergando calentamiento.`);
                }
                scheduleNextWarmup();
            }, intervalTime);
        };

        setTimeout(async () => {
            const hour = this.getArgentinaHour();
            if (hour >= 9 && hour < 21) {
                await this.triggerWarmupPing();
            }
            scheduleNextWarmup();
        }, initialDelay);

        this.bot.log("[WARMUP] Protocolo de calentamiento programado con intervalos dinámicos de 1 a 2.5 horas.");
    }

    /**
     * Cargar la lista estática de números de la flota desde el servidor
     */
    async loadWarmupNumbers() {
        try {
            const res = await axios.get(`${this.bot.backendUrl}/bot/warmup-numbers`);
            if (res.data && res.data.success) {
                this.warmupNumbers = res.data.numbers || [];
                this.activeNumbers = res.data.activeNumbers || [];
                // Normalizar números (quitar caracteres especiales)
                this.warmupNumbers = this.warmupNumbers.map(num => num.replace(/\D/g, ''));
                this.activeNumbers = this.activeNumbers.map(num => num.replace(/\D/g, ''));
                this.bot.log(`[WARMUP] Cargados ${this.warmupNumbers.length} números totales y ${this.activeNumbers.length} activos.`);
            }
        } catch (e) {
            this.bot.log(`[WARMUP] Error al cargar números de la flota: ${e.message}`, 'warn');
        }
    }

    /**
     * Enviar un mensaje de calentamiento a otro bot al azar
     */
    async triggerWarmupPing() {
        if (!this.bot.isReady || !this.bot.client) return;

        await this.loadWarmupNumbers();
        
        const myNumber = this.bot.connectedNumber;
        if (!myNumber) {
            this.bot.log("[WARMUP] Mi número no está listo aún. Saltando warm-up.");
            return;
        }

        // Filtrar mi propio número de los activos conectados
        const targets = this.activeNumbers.filter(num => num !== myNumber);
        
        if (targets.length === 0) {
            this.bot.log("[WARMUP] No hay otros bots activos/conectados en este momento para calentar.");
            return;
        }

        // Elegir target y mensaje iniciador aleatorio (Paso 1)
        const targetNum = targets[Math.floor(Math.random() * targets.length)];
        const msg = this.initiators[Math.floor(Math.random() * this.initiators.length)];

        try {
            this.bot.log(`[WARMUP] Iniciando conversación de calentamiento con bot activo +${targetNum}: "${msg}"`);
            const chat = await this.bot.client.getChatById(`${targetNum}@c.us`);
            await chat.sendMessage(msg);
        } catch (e) {
            this.bot.log(`[WARMUP] Error al enviar warm-up a +${targetNum}: ${e.message}`, 'warn');
        }
    }

    /**
     * Analizar si un mensaje entrante es de otro bot de calentamiento
     * para auto-responder de forma inteligente en base al protocolo de 3 pasos.
     */
    async handleIncomingMessage(msg) {
        if (!this.bot.isReady) return false;

        const sender = msg.from.split('@')[0];
        const isWarmupSender = this.warmupNumbers.includes(sender);

        if (isWarmupSender && !msg.fromMe) {
            const body = (msg.body || '').trim();
            this.bot.log(`[WARMUP] Mensaje de calentamiento recibido de bot partner +${sender}: "${body}"`);

            // Paso 1: Es un mensaje iniciador (initiators) -> Responder con un mensaje de "responses" (Paso 2)
            const isInitiator = this.initiators.some(m => m.toLowerCase() === body.toLowerCase());
            if (isInitiator) {
                const replyDelay = 6000 + Math.random() * 12000;
                const replyMsg = this.responses[Math.floor(Math.random() * this.responses.length)];

                setTimeout(async () => {
                    try {
                        this.bot.log(`[WARMUP] Enviando respuesta a iniciador +${sender}: "${replyMsg}"`);
                        const chat = await this.bot.client.getChatById(msg.from);
                        await chat.sendMessage(replyMsg);
                    } catch (e) {
                        this.bot.log(`[WARMUP] Error respondiendo a iniciador +${sender}: ${e.message}`, 'warn');
                    }
                }, replyDelay);
                return true; // Consumido por warm-up
            }

            // Paso 2: Es una respuesta (responses) -> Responder con un mensaje de cierre "closers" (Paso 3)
            const isResponse = this.responses.some(m => m.toLowerCase() === body.toLowerCase());
            if (isResponse) {
                const replyDelay = 6000 + Math.random() * 12000;
                const replyMsg = this.closers[Math.floor(Math.random() * this.closers.length)];

                setTimeout(async () => {
                    try {
                        this.bot.log(`[WARMUP] Enviando mensaje de cierre a +${sender}: "${replyMsg}"`);
                        const chat = await this.bot.client.getChatById(msg.from);
                        await chat.sendMessage(replyMsg);
                    } catch (e) {
                        this.bot.log(`[WARMUP] Error enviando cierre a +${sender}: ${e.message}`, 'warn');
                    }
                }, replyDelay);
                return true; // Consumido por warm-up
            }

            // Paso 3: Es un mensaje de cierre (closers) -> Terminar ciclo de conversación (No responder)
            const isCloser = this.closers.some(m => m.toLowerCase() === body.toLowerCase());
            if (isCloser) {
                this.bot.log(`[WARMUP] Recibido cierre de +${sender}. Conversación de calentamiento finalizada exitosamente.`);
                return true; // Consumido por warm-up
            }

            // Fallback: Si no coincide con ninguno pero es un número de bot activo, no respondemos para evitar loop
            this.bot.log(`[WARMUP] El mensaje de +${sender} no coincide con el protocolo. No se responde para evitar loops infinitos.`);
            return true; // Consumido por warm-up
        }

        return false; // No es warm-up, procesar normal
    }
}

module.exports = WarmupManager;
