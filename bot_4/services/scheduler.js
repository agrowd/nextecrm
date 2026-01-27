const { DateTime } = require('luxon');

class Scheduler {
    constructor(config = {}) {
        this.updateConfig(config);
    }

    updateConfig(config) {
        this.config = config.schedule || { enabled: false };
        // Defaults if not present
        if (!this.config.timezone) this.config.timezone = 'America/Argentina/Buenos_Aires';
    }

    /**
     * Determines if the bot should be running right now.
     * @returns {Object} { shouldRun: boolean, reason: string }
     */
    shouldRun() {
        if (!this.config.enabled) {
            return { shouldRun: true, reason: 'Scheduler disabled (always run)' };
        }

        const now = DateTime.now().setZone(this.config.timezone);
        const dayOfWeek = now.weekday; // 1=Mon, 7=Sun

        // 1. Check Days
        // Config stores 0=Sun..6=Sat usually, or 1-7. Let's normalize.
        // Luxon: 1=Mon...7=Sun.
        // User input might vary. Let's assume config uses 1=Mon..7=Sun for simplicity match
        // If config.days array includes current weekday
        if (this.config.days && !this.config.days.includes(dayOfWeek)) {
            return { shouldRun: false, reason: 'Today is not a working day' };
        }

        // 2. Check Time Window with Randomness
        // We store randomness as minutes. 
        // Effect: Start time is `start + random_offset`, End time is `end + random_offset`.
        // Actually, randomness usually means "start between 09:00 and 09:15".
        // Efficient way: Calculate effective start/end for TODAY using a seed or just allow it to fluctuate if checked frequently (which might be chaotic).
        // Better approach: "Soft" boundaries. 
        // Let's implement strict checks for now based on exact times in config, ignoring complex per-day randomness persistence for MVP.

        // Parse Start/End
        const [startH, startM] = (this.config.startTime || '09:00').split(':').map(Number);
        const [endH, endM] = (this.config.endTime || '18:00').split(':').map(Number);

        const startTime = now.set({ hour: startH, minute: startM, second: 0 });
        const endTime = now.set({ hour: endH, minute: endM, second: 0 });

        // Apply Randomness (Simulated by checking against a wider marginal window? No, user wants *random start*).
        // If we want random start, we need to store "today's start time" somewhere or allow "drift".
        // Simple V1: Just check if we are inside [Start, End].
        // To add randomness: We can say "If it's 9:02 and start is 9:00, run". 
        // The "randomness" requested was "start at 9:00 but random 5 mins". 
        // Meaning sometimes 9:00, sometimes 9:05.
        // Taking the conservative approach: If we are *past* strict start time, we run. 
        // We can simulate randomness by sleeping in the main loop, but here we just return boolean.

        // Let's implement specific break checks.
        if (this.config.breaks && this.config.breaks.length > 0) {
            for (const brk of this.config.breaks) {
                if (!brk.enabled) continue;
                const [bStartH, bStartM] = brk.start.split(':').map(Number);
                const [bEndH, bEndM] = brk.end.split(':').map(Number);

                const breakStart = now.set({ hour: bStartH, minute: bStartM });
                const breakEnd = now.set({ hour: bEndH, minute: bEndM });

                if (now >= breakStart && now < breakEnd) {
                    return { shouldRun: false, reason: `On break until ${brk.end}` };
                }
            }
        }

        if (now < startTime) return { shouldRun: false, reason: `Before start time (${this.config.startTime})` };
        if (now >= endTime) return { shouldRun: false, reason: `After end time (${this.config.endTime})` };

        return { shouldRun: true, reason: 'Active window' };
    }
}

module.exports = Scheduler;
