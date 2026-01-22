/**
 * Human Behavior Simulator
 * Simula patrones de actividad humana realistas para evitar detección
 */
class HumanBehaviorSimulator {
    constructor() {
        // Patrones de comportamiento natural
        this.patterns = {
            typing: {
                wpm: { min: 35, max: 65 }, // Palabras por minuto (ajustado a español)
                mistakes: 0.03, // 3% de "errores" que se corrigen
                pauses: [
                    { probability: 0.12, duration: [2000, 6000] }, // Pausas para pensar
                    { probability: 0.06, duration: [6000, 20000] } // Distracciones ocasionales
                ]
            },
            reading: {
                wpm: 220, // Palabras por minuto para leer
                comprehension: 0.85
            },
            activity: {
                breaks: {
                    short: { probability: 0.20, duration: [300000, 900000] }, // 5-15 min cada ~5 leads
                    long: { probability: 0.08, duration: [1800000, 3600000] }, // 30-60 min (café, baño)
                    lunch: { duration: [2700000, 4500000] } // 45-75 min almuerzo
                },
                mouseMovement: {
                    steps: { min: 8, max: 20 },
                    speed: { min: 100, max: 600 }
                }
            }
        };

        this.sessionStats = {
            leadsProcessed: 0,
            lastBreak: null,
            sessionStart: Date.now()
        };
    }

    /**
     * Calcular tiempo de escritura realista
     */
    getTypingTime(text) {
        const words = text.split(' ').length;
        const wpm = this.randomBetween(
            this.patterns.typing.wpm.min,
            this.patterns.typing.wpm.max
        );

        // Tiempo base de escritura
        const baseTime = (words / wpm) * 60 * 1000;
        let totalTime = baseTime;

        // Agregar pausas naturales
        for (const pause of this.patterns.typing.pauses) {
            if (Math.random() < pause.probability) {
                totalTime += this.randomBetween(pause.duration[0], pause.duration[1]);
            }
        }

        // Simular correcciones (borrar y reescribir)
        if (Math.random() < this.patterns.typing.mistakes) {
            totalTime += this.randomBetween(1500, 4000);
        }

        return Math.round(totalTime);
    }

    /**
     * Calcular tiempo de lectura realista antes de responder
     */
    getReadingTime(text) {
        const words = text.split(' ').length;
        const readingTime = (words / this.patterns.reading.wpm) * 60 * 1000;

        // Agregar variación natural ±30%
        return Math.round(readingTime * (1 + (Math.random() * 0.6 - 0.3)));
    }

    /**
     * Decidir si tomar un descanso
     */
    shouldTakeBreak() {
        this.sessionStats.leadsProcessed++;
        const sessionTime = Date.now() - this.sessionStats.sessionStart;
        const timeSinceLastBreak = this.sessionStats.lastBreak ?
            Date.now() - this.sessionStats.lastBreak : sessionTime;

        // Hora del día (probabilidad de almorzar)
        const hour = new Date().getHours();
        if (hour === 12 || hour === 13) {
            if (Math.random() < 0.35) { // 35% de tomar almuerzo extendido
                return {
                    type: 'lunch',
                    duration: this.randomBetween(...this.patterns.activity.breaks.lunch.duration),
                    reason: 'Pausa de almuerzo'
                };
            }
        }

        // Fatig factor: más leads procesados = más probabilidad de descanso
        const fatigueFactor = this.sessionStats.leadsProcessed / 30; // Cada 30 leads aumenta probabilidad

        // Descanso corto (café, baño, etc.)
        if (Math.random() < this.patterns.activity.breaks.short.probability * (1 + fatigueFactor)) {
            if (timeSinceLastBreak > 1800000) { // Mínimo 30 min desde último descanso
                this.sessionStats.lastBreak = Date.now();
                return {
                    type: 'short',
                    duration: this.randomBetween(...this.patterns.activity.breaks.short.duration),
                    reason: this.getBreakReason('short')
                };
            }
        }

        // Descanso largo (menos frecuente)
        if (Math.random() < this.patterns.activity.breaks.long.probability) {
            if (timeSinceLastBreak > 3600000) { // Mínimo 1 hora desde último descanso
                this.sessionStats.lastBreak = Date.now();
                return {
                    type: 'long',
                    duration: this.randomBetween(...this.patterns.activity.breaks.long.duration),
                    reason: this.getBreakReason('long')
                };
            }
        }

        return null;
    }

    getBreakReason(type) {
        const reasons = {
            short: ['Café rápido', 'Revisar email', 'Llamada rápida', 'Estiramiento'],
            long: ['Reunión', 'Almuerzo extendido', 'Gestión administrativa', 'Pausa mental']
        };
        const list = reasons[type];
        return list[Math.floor(Math.random() * list.length)];
    }

    /**
     * Simular movimiento del mouse (reduce detección)
     */
    async simulateMouseMovement(page) {
        if (!page) return; // Si no hay página, skip

        try {
            const moves = this.randomBetween(this.patterns.activity.mouseMovement.steps.min,
                this.patterns.activity.mouseMovement.steps.max);

            for (let i = 0; i < moves; i++) {
                const x = this.randomBetween(100, 1800);
                const y = this.randomBetween(100, 900);
                const steps = this.randomBetween(10, 30);

                await page.mouse.move(x, y, { steps });
                await this.sleep(this.randomBetween(
                    this.patterns.activity.mouseMovement.speed.min,
                    this.patterns.activity.mouseMovement.speed.max
                ));
            }
        } catch (error) {
            // Si falla, continuar silenciosamente
        }
    }

    /**
     * Simular scroll humano
     */
    async humanScroll(page, distance) {
        if (!page) return;

        try {
            const scrolls = this.randomBetween(4, 8);
            const scrollPerStep = distance / scrolls;

            for (let i = 0; i < scrolls; i++) {
                await page.evaluate((scroll) => {
                    window.scrollBy({ top: scroll, behavior: 'smooth' });
                }, scrollPerStep);

                await this.sleep(this.randomBetween(400, 1000));

                // A veces scrollear de vuelta un poco (efecto humano)
                if (Math.random() < 0.25) {
                    await page.evaluate(() => {
                        window.scrollBy({ top: -80, behavior: 'smooth' });
                    });
                    await this.sleep(this.randomBetween(300, 600));
                }
            }
        } catch (error) {
            // Continuar si falla
        }
    }

    /**
     * Generar click con delay humano
     */
    async humanClick(element, page) {
        if (!page || !element) return;

        try {
            // Mover mouse al elemento
            const box = await element.boundingBox();
            if (box) {
                const x = box.x + box.width / 2 + this.randomBetween(-5, 5);
                const y = box.y + box.height / 2 + this.randomBetween(-5, 5);

                await page.mouse.move(x, y, { steps: this.randomBetween(5, 15) });
                await this.sleep(this.randomBetween(100, 300));

                await element.click();
            }
        } catch (error) {
            // Si falla, intentar click directo
            try {
                await element.click();
            } catch (e) {
                // Falló definitivamente
            }
        }
    }

    /**
     * Pausa aleatoria entre acciones
     */
    async randomPause(min = 500, max = 2000) {
        await this.sleep(this.randomBetween(min, max));
    }

    /**
     * Obtener estadísticas de la sesión
     */
    getSessionStats() {
        const sessionDuration = Date.now() - this.sessionStats.sessionStart;

        return {
            leadsProcessed: this.sessionStats.leadsProcessed,
            sessionDuration: Math.round(sessionDuration / 1000 / 60), // minutos
            lastBreak: this.sessionStats.lastBreak ?
                new Date(this.sessionStats.lastBreak).toLocaleTimeString('es-AR') : 'Ninguno',
            averageTimePerLead: this.sessionStats.leadsProcessed > 0 ?
                Math.round(sessionDuration / this.sessionStats.leadsProcessed / 1000 / 60) : 0
        };
    }

    /**
     * Reset de estadísticas de sesión
     */
    resetSession() {
        this.sessionStats = {
            leadsProcessed: 0,
            lastBreak: null,
            sessionStart: Date.now()
        };
    }

    // Helpers
    randomBetween(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = HumanBehaviorSimulator;
