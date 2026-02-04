const fs = require('fs').promises;
const path = require('path');

/**
 * Rate Limiter Inteligente
 * 
 * Objetivo: 200 leads/día = 800 mensajes totales/día
 * Ritmo: 12-15 mensajes/hora (comportamiento humano)
 * Estrategia: Escalado gradual para evitar bans
 */
class IntelligentRateLimiter {
    constructor(instanceId = 'global') {
        this.instanceId = instanceId;
        this._initialized = false;

        // Límites ajustables
        this.limits = {
            daily: {
                leads: 200,          // 200 contactos/día
                messages: 800,       // 200 × 4 mensajes
                current: 0           // Contador actual
            },
            hourly: {
                messagesMin: 12,     // Mínimo por hora
                messagesMax: 15,     // Máximo por hora
                current: 0
            },
            scaling: {
                startLeads: 50,      // Empezar con 50 leads/día
                increment: 25,       // Aumentar 25 leads cada día
                targetLeads: 200     // Objetivo final
            }
        };

        this.statsFile = path.join(__dirname, `../stats/daily-limits-${this.instanceId}.json`);
        this.stats = {
            date: this.getArgentinaDate(),
            leadsProcessed: 0,
            messagesSent: 0,
            messagesPerHour: {},
            currentDayLimit: 50,  // Empezar conservador
            banned: false,
            suspiciousActivity: [],
            scalingPhase: 1       // Fase actual de escalado
        };

        // Horarios permitidos (distribución humana)
        const startHour = parseInt(process.env.BUSINESS_HOURS_START || '9');
        const endHour = parseInt(process.env.BUSINESS_HOURS_END || '21');

        this.businessHours = {
            weekday: {
                start: startHour,
                end: endHour,
                peakHours: [10, 11, 15, 16, 17],
                lowHours: [9, 13, 14, 20],
                lunchBreak: [12, 13]
            },
            weekend: {
                start: startHour, // Usar misma config que la semana para testing
                end: endHour,     // Usar misma config
                peakHours: [11, 16],
                lowHours: [10, 18],
                lunchBreak: [13]
            }
        };

        // Inicializar stats de forma asíncrona
        this._initPromise = this.loadStats();
    }

    /**
     * Obtener fecha en zona horaria Argentina (UTC-3)
     */
    getArgentinaDate() {
        const now = new Date();
        // Argentina es UTC-3, restar 3 horas y obtener la fecha
        const argentinaTime = new Date(now.getTime() - (3 * 60 * 60 * 1000));
        return argentinaTime.toISOString().split('T')[0];
    }

    /**
     * Obtener hora actual en zona horaria Argentina (UTC-3)
     */
    getArgentinaHour() {
        const now = new Date();
        // Argentina es UTC-3
        const argentinaTime = new Date(now.getTime() - (3 * 60 * 60 * 1000));
        return argentinaTime.getUTCHours();
    }

    /**
     * Obtener día de la semana en Argentina (0=Dom, 6=Sab)
     */
    getArgentinaDay() {
        const now = new Date();
        const argentinaTime = new Date(now.getTime() - (3 * 60 * 60 * 1000));
        return argentinaTime.getUTCDay();
    }

    /**
     * Asegurar que stats están cargados antes de usarlos
     */
    async ensureInitialized() {
        if (!this._initialized) {
            await this._initPromise;
            this._initialized = true;
        }
    }

    async loadStats() {
        try {
            const statsDir = path.dirname(this.statsFile);
            await fs.mkdir(statsDir, { recursive: true });

            const today = this.getArgentinaDate();
            const data = await fs.readFile(this.statsFile, 'utf8');
            const stats = JSON.parse(data);

            console.log(`📊 [RateLimiter] Cargando stats: fecha archivo=${stats.date}, fecha hoy ARG=${today}`);
            console.log(`📊 [RateLimiter] Stats archivo: ${stats.leadsProcessed}/${stats.currentDayLimit} leads`);

            // Resetear si es un nuevo día (hora Argentina)
            if (stats.date !== today) {
                console.log('📅 Nuevo día (hora Argentina) - Reseteando estadísticas');
                // Guardar leadsProcessed del día anterior para logging
                const yesterdayLeads = stats.leadsProcessed;
                const yesterdayLimit = stats.currentDayLimit;

                this.stats = stats; // Cargar primero para que adjustDailyLimit funcione
                this.resetDailyStats();
                this.adjustDailyLimit(); // Incrementar límite si escalamos

                console.log(`📅 Ayer: ${yesterdayLeads}/${yesterdayLimit} leads | Hoy: 0/${this.stats.currentDayLimit}`);
            } else {
                this.stats = stats;
                console.log(`📊 [RateLimiter] Mismo día, continuando: ${this.stats.leadsProcessed}/${this.stats.currentDayLimit} leads`);
            }

            await this.saveStats(); // Guardar después de cualquier cambio
        } catch (error) {
            console.log(`📊 [RateLimiter] Archivo no existe, creando nuevo con fecha ${this.getArgentinaDate()}`);
            await this.saveStats();
        }
    }

    async saveStats() {
        try {
            await fs.writeFile(this.statsFile, JSON.stringify(this.stats, null, 2));
        } catch (error) {
            console.error('Error guardando stats:', error.message);
        }
    }

    resetDailyStats() {
        const previousLimit = this.stats.currentDayLimit || 50;
        const previousPhase = this.stats.scalingPhase || 1;

        this.stats = {
            date: this.getArgentinaDate(),
            leadsProcessed: 0,
            messagesSent: 0,
            messagesPerHour: {},
            currentDayLimit: previousLimit, // Mantener límite del día anterior
            banned: false,
            suspiciousActivity: [],
            scalingPhase: previousPhase
        };

        console.log(`🔄 [RateLimiter] Stats reseteados: 0/${previousLimit} leads para ${this.stats.date}`);
    }

    /**
     * Ajustar límite diario (escalado gradual)
     */
    adjustDailyLimit() {
        const { startLeads, increment, targetLeads } = this.limits.scaling;

        // Si ayer completamos el objetivo, incrementar
        if (this.stats.leadsProcessed >= this.stats.currentDayLimit * 0.9) {
            const newLimit = Math.min(
                this.stats.currentDayLimit + increment,
                targetLeads
            );

            if (newLimit > this.stats.currentDayLimit) {
                console.log(`📈 Escalando límite: ${this.stats.currentDayLimit} → ${newLimit} leads/día`);
                this.stats.currentDayLimit = newLimit;
                this.stats.scalingPhase++;
            }
        } else {
            console.log(`⚠️ No alcanzamos objetivo ayer (${this.stats.leadsProcessed}/${this.stats.currentDayLimit}). Manteniendo límite.`);
        }
    }

    /**
     * Verificar si podemos enviar mensajes ahora
     */
    async canSendNow() {
        // Asegurar que stats están cargados
        await this.ensureInitialized();

        // Usar hora de Argentina (UTC-3) en lugar de UTC del servidor
        const hour = this.getArgentinaHour();
        const day = this.getArgentinaDay();

        // 1. Verificar horario laboral
        const schedule = (day === 0 || day === 6) ?
            this.businessHours.weekend : this.businessHours.weekday;

        if (hour < schedule.start || hour >= schedule.end) {
            return {
                allowed: false,
                reason: 'outside_business_hours',
                message: `Fuera de horario (${schedule.start}:00 - ${schedule.end}:00)`,
                nextAvailable: this.getNextBusinessHour()
            };
        }

        // 2. Verificar pausa de almuerzo (DESHABILITADO para testing)
        // Para re-habilitar en producción, descomentar este bloque
        /*
        if (schedule.lunchBreak.includes(hour)) {
            // 50% probabilidad de pausar durante almuerzo
            if (Math.random() < 0.5) {
                return {
                    allowed: false,
                    reason: 'lunch_break',
                    message: 'Pausa de almuerzo (comportamiento humano)',
                    nextAvailable: new Date(now.getTime() + 1800000) // 30 min
                };
            }
        }
        */

        // 3. Verificar límite diario de LEADS
        if (this.stats.leadsProcessed >= this.stats.currentDayLimit) {
            return {
                allowed: false,
                reason: 'daily_limit_reached',
                message: `Límite diario alcanzado: ${this.stats.leadsProcessed}/${this.stats.currentDayLimit} leads`,
                used: this.stats.leadsProcessed,
                limit: this.stats.currentDayLimit
            };
        }

        // 4. Límite por hora DESHABILITADO - Solo límite diario activo
        // const hourKey = `${hour}:00`;
        // const hourlyCount = this.stats.messagesPerHour[hourKey] || 0;
        // const hourlyLimit = this.getHourlyLimit(hour, schedule);
        // Ahora no hay pausa horaria - el bot trabaja hasta completar el límite diario

        // 5. Verificar si estamos baneados
        if (this.stats.banned) {
            return {
                allowed: false,
                reason: 'account_banned',
                message: '⛔ Sistema pausado - Posible ban detectado',
                action: 'Revisar manualmente el estado de WhatsApp'
            };
        }

        // 6. Verificar actividad sospechosa reciente
        const recentSuspicious = this.stats.suspiciousActivity.filter(s => {
            const time = new Date(s.timestamp);
            return (now - time) < 3600000; // Última hora
        });

        if (recentSuspicious.length >= 3) {
            return {
                allowed: false,
                reason: 'suspicious_activity',
                message: '⚠️ Actividad sospechosa detectada - Pausando envíos',
                suspicious: recentSuspicious
            };
        }

        // ✅ TODO OK - Podemos enviar
        return {
            allowed: true,
            remaining: {
                dailyLeads: this.stats.currentDayLimit - this.stats.leadsProcessed,
                dailyMessages: (this.stats.currentDayLimit * 4) - this.stats.messagesSent,
                hourlyMessages: 999 // Sin límite horario en testing
            },
            currentPhase: {
                phase: this.stats.scalingPhase,
                dailyLimit: this.stats.currentDayLimit,
                progress: `${this.stats.leadsProcessed}/${this.stats.currentDayLimit}`
            }
        };
    }

    /**
     * Obtener límite por hora según momento del día
     */
    getHourlyLimit(hour, schedule) {
        // En horas pico: 15 mensajes/hora (más activo)
        if (schedule.peakHours.includes(hour)) {
            return this.limits.hourly.messagesMax;
        }

        // En horas bajas: 12 mensajes/hora (menos activo)
        if (schedule.lowHours.includes(hour)) {
            return this.limits.hourly.messagesMin;
        }

        // Hora normal: 13-14 mensajes/hora
        return Math.floor((this.limits.hourly.messagesMin + this.limits.hourly.messagesMax) / 2);
    }

    /**
     * Registrar lead procesado (4 mensajes enviados)
     */
    async recordLead(leadId, messagesSent = 4, success = true) {
        const now = new Date();
        const hour = now.getHours();
        const hourKey = `${hour}:00`;

        if (success) {
            this.stats.leadsProcessed++;
            this.stats.messagesSent += messagesSent;
            this.stats.messagesPerHour[hourKey] = (this.stats.messagesPerHour[hourKey] || 0) + messagesSent;

            console.log(`✅ Lead registrado: Total ${this.stats.leadsProcessed}/${this.stats.currentDayLimit} leads (${this.stats.messagesSent} mensajes)`);
        }

        await this.saveStats();
    }

    /**
     * Reportar actividad sospechosa
     */
    async reportSuspicious(type, details) {
        this.stats.suspiciousActivity.push({
            type,
            details,
            timestamp: new Date().toISOString()
        });

        console.log(`⚠️ Actividad sospechosa: ${type}`, details);

        // Si hay muchas actividades sospechosas, pausar
        if (this.stats.suspiciousActivity.length >= 5) {
            this.stats.banned = true;
            console.log('⛔ SISTEMA PAUSADO - Demasiada actividad sospechosa');
        }

        await this.saveStats();
    }

    /**
     * Calcular delay inteligente entre leads
     * Objetivo: 12-15 mensajes/hora = 1 lead (4 msg) cada 16-20 minutos
     */
    getSmartDelay() {
        const hour = new Date().getHours();
        const day = new Date().getDay();
        const schedule = (day === 0 || day === 6) ?
            this.businessHours.weekend : this.businessHours.weekday;

        let baseDelay;

        // En horas pico: más rápido (15 msg/hora = 1 lead cada 16 min)
        if (schedule.peakHours.includes(hour)) {
            baseDelay = 16 * 60 * 1000; // 16 minutos
        }
        // En horas bajas: más lento (12 msg/hora = 1 lead cada 20 min)
        else if (schedule.lowHours.includes(hour)) {
            baseDelay = 20 * 60 * 1000; // 20 minutos
        }
        // Hora normal: (13.5 msg/hora = 1 lead cada 17.7 min)
        else {
            baseDelay = 18 * 60 * 1000; // 18 minutos
        }

        // Agregar variación gaussiana ±20%
        return this.randomGaussian(baseDelay, baseDelay * 0.2);
    }

    /**
     * Delay entre mensajes dentro de un lead
     * Más corto que entre leads
     */
    getMessageDelay() {
        // Entre 15-30 segundos por mensaje (comportamiento humano escribiendo)
        return this.randomGaussian(22500, 7500); // 22.5s ± 7.5s
    }

    /**
     * Generar número aleatorio con distribución gaussiana
     */
    randomGaussian(mean, stdDev) {
        let u = 0, v = 0;
        while (u === 0) u = Math.random();
        while (v === 0) v = Math.random();
        const num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
        return Math.max(5000, mean + num * stdDev); // Mínimo 5 segundos
    }

    getNextBusinessHour() {
        const now = new Date();
        const hour = now.getHours();
        const day = now.getDay();

        const schedule = (day === 0 || day === 6) ?
            this.businessHours.weekend : this.businessHours.weekday;

        // Si es hoy pero temprano (ej: es 4am y abrimos 9am)
        if (hour < schedule.start) {
            const next = new Date(now);
            next.setHours(schedule.start, 0, 0, 0);
            return next;
        }

        // Si ya pasó hoy, programar para mañana
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Verificar horario de mañana
        const nextDay = tomorrow.getDay();
        const nextSchedule = (nextDay === 0 || nextDay === 6) ?
            this.businessHours.weekend : this.businessHours.weekday;

        tomorrow.setHours(nextSchedule.start, 0, 0, 0);
        return tomorrow;
    }

    /**
     * Obtener estadísticas actuales
     */
    getStats() {
        const leadsRemaining = this.stats.currentDayLimit - this.stats.leadsProcessed;
        const messagesRemaining = (this.stats.currentDayLimit * 4) - this.stats.messagesSent;

        return {
            ...this.stats,
            remaining: {
                leads: leadsRemaining,
                messages: messagesRemaining,
                percentage: ((leadsRemaining / this.stats.currentDayLimit) * 100).toFixed(1) + '%'
            },
            scaling: {
                currentLimit: this.stats.currentDayLimit,
                targetLimit: this.limits.scaling.targetLeads,
                phase: this.stats.scalingPhase,
                progress: `${this.stats.currentDayLimit}/${this.limits.scaling.targetLeads} leads`
            },
            estimatedCompletion: this.getEstimatedCompletion()
        };
    }

    /**
     * Estimar hora de completar leads del día
     */
    getEstimatedCompletion() {
        const leadsRemaining = this.stats.currentDayLimit - this.stats.leadsProcessed;
        if (leadsRemaining <= 0) return 'Completado';

        // 1 lead cada ~18 minutos promedio
        const minutesRemaining = leadsRemaining * 18;
        const hoursRemaining = Math.floor(minutesRemaining / 60);
        const minsRemaining = minutesRemaining % 60;

        const completionTime = new Date();
        completionTime.setMinutes(completionTime.getMinutes() + minutesRemaining);

        return {
            remaining: `${hoursRemaining}h ${minsRemaining}m`,
            estimatedTime: completionTime.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
        };
    }

    /**
     * Forzar pausa manual
     */
    async pause() {
        this.stats.banned = true;
        await this.saveStats();
        console.log('⏸️ Sistema pausado manualmente');
    }

    /**
     * Reanudar sistema
     */
    async resume() {
        this.stats.banned = false;
        this.stats.suspiciousActivity = [];
        await this.saveStats();
        console.log('▶️ Sistema reanudado');
    }

    /**
     * Resetear límites manualmente
     */
    async resetLimits() {
        this.resetDailyStats();
        this.stats.currentDayLimit = this.limits.scaling.startLeads;
        this.stats.scalingPhase = 1;
        await this.saveStats();
        console.log('🔄 Límites reseteados a valores iniciales');
    }
}

module.exports = IntelligentRateLimiter;
