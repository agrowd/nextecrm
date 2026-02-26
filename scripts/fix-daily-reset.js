const fs = require('fs');
const path = require('path');

// ============================================================
// FIX 1: Daily reset in runtime (rateLimiter.js)
// ============================================================
const OLD_RATE = `    async canSendNow() {
        // Asegurar que stats están cargados
        await this.ensureInitialized();

        // Usar hora de Argentina (UTC-3) en lugar de UTC del servidor
        const hour = this.getArgentinaHour();
        const day = this.getArgentinaDay();`;

const NEW_RATE = `    async canSendNow() {
        // Asegurar que stats están cargados
        await this.ensureInitialized();

        // 🔄 Verificar cambio de día EN RUNTIME (fix: antes solo se chequeaba al arrancar)
        const today = this.getArgentinaDate();
        if (this.stats.date !== today) {
            console.log(\`📅 Nuevo día detectado en runtime (\${this.stats.date} → \${today}) - Reseteando stats\`);
            const yesterdayLeads = this.stats.leadsProcessed;
            const yesterdayLimit = this.stats.currentDayLimit;
            this.resetDailyStats();
            this.adjustDailyLimit();
            await this.saveStats();
            console.log(\`📅 Ayer: \${yesterdayLeads}/\${yesterdayLimit} leads | Hoy: 0/\${this.stats.currentDayLimit}\`);
        }

        // Usar hora de Argentina (UTC-3) en lugar de UTC del servidor
        const hour = this.getArgentinaHour();
        const day = this.getArgentinaDay();`;

const botInstances = ['bot_1', 'bot_2', 'bot_3', 'bot_4'];
const baseDir = path.join(__dirname, '..');

console.log('=== FIX 1: Daily Reset en Runtime (rateLimiter.js) ===\n');

for (const instance of botInstances) {
    const filePath = path.join(baseDir, instance, 'services', 'rateLimiter.js');
    if (!fs.existsSync(filePath)) {
        console.log(`⚠️  No encontrado: ${filePath}`);
        continue;
    }

    let content = fs.readFileSync(filePath, 'utf8');

    if (content.includes('Nuevo día detectado en runtime')) {
        console.log(`✅ ${instance}/services/rateLimiter.js: ya parchado`);
        continue;
    }

    if (!content.includes(OLD_RATE)) {
        console.log(`⚠️  ${instance}/services/rateLimiter.js: código no encontrado (versión diferente)`);
        continue;
    }

    content = content.replace(OLD_RATE, NEW_RATE);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ ${instance}/services/rateLimiter.js: FIX daily reset aplicado`);
}

console.log('\n✅ Todos los fixes aplicados. Reiniciá los bots para que tomen efecto.');
