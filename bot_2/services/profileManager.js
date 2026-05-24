const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class ProfileManager {
    /**
     * Busca archivos de bloqueo de Chrome recursivamente en un directorio
     * @param {string} dir - Directorio donde buscar
     * @param {string[]} lockNames - Nombres de archivos de bloqueo
     * @returns {string[]} - Rutas completas de archivos encontrados
     */
    static findLocksRecursive(dir, lockNames) {
        const found = [];
        try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    // No entrar en node_modules ni .git
                    if (entry.name === 'node_modules' || entry.name === '.git') continue;
                    found.push(...ProfileManager.findLocksRecursive(fullPath, lockNames));
                } else if (lockNames.includes(entry.name)) {
                    found.push(fullPath);
                }
            }
        } catch (err) {
            // Ignorar errores de permisos
        }
        return found;
    }

    /**
     * Mata procesos zombie de Chromium que quedaron de ejecuciones anteriores para esta instancia
     * @param {string} instanceId - ID de la instancia del bot
     */
    static killZombieChrome(instanceId) {
        try {
            // Solo en Linux (Docker)
            if (process.platform !== 'linux') return;

            if (!instanceId) {
                console.warn('⚠️ No instanceId provided to killZombieChrome, skipping targeted kill to avoid killing other bots.');
                return;
            }

            const targetKey = `browser-${instanceId}`;
            const result = execSync(`pgrep -f "${targetKey}" || true`, { encoding: 'utf8' }).trim();
            if (result) {
                const pids = result.split('\n').filter(p => p.trim());
                console.log(`🧹 Encontrados ${pids.length} procesos Chrome zombie para ${instanceId}. Matando...`);
                try {
                    execSync(`pkill -9 -f "${targetKey}" || true`, { encoding: 'utf8' });
                    console.log(`✅ Procesos Chrome zombie de ${instanceId} eliminados.`);
                } catch (e) {
                    // pkill puede dar exit code 1 si no hay procesos, ignorar
                }
            } else {
                console.log(`✅ No hay procesos Chrome zombie para ${instanceId}.`);
            }
        } catch (err) {
            console.warn('⚠️ Error verificando procesos zombie:', err.message);
        }
    }

    /**
     * Limpia TODOS los archivos de bloqueo de Chrome en el directorio del bot
     * Busca recursivamente en TODAS las carpetas posibles:
     *  - sessions/browser-<id>/
     *  - sessions/session-<id>/
     *  - sessions/.wwebjs_auth/
     *  - .wwebjs_auth/
     * 
     * @param {string} sessionsDir - Directorio base de sesiones
     * @param {string} instanceId - ID de la instancia del bot
     */
    static cleanProfileLocks(sessionsDir, instanceId) {
        if (!sessionsDir || !instanceId) {
            console.warn('⚠️ ProfileManager: sessionsDir o instanceId no proporcionados.');
            return;
        }

        const lockNames = ['SingletonLock', 'SingletonCookie', 'SingletonSocket'];

        // Buscar en el directorio de sessions Y en el directorio padre del bot
        const botDir = path.dirname(sessionsDir); // /app/bot_2
        const searchDirs = [sessionsDir, botDir];

        let totalCleaned = 0;

        for (const searchDir of searchDirs) {
            if (!fs.existsSync(searchDir)) continue;

            console.log(`🔍 Buscando archivos de bloqueo en: ${searchDir}`);
            const lockFiles = ProfileManager.findLocksRecursive(searchDir, lockNames);

            for (const lockFile of lockFiles) {
                try {
                    fs.unlinkSync(lockFile);
                    console.log(`🗑️ Eliminado bloqueo: ${lockFile}`);
                    totalCleaned++;
                } catch (err) {
                    console.warn(`⚠️ No se pudo borrar ${lockFile}: ${err.message}`);
                }
            }
        }

        // También matar procesos zombie de Chrome específicos de esta instancia
        ProfileManager.killZombieChrome(instanceId);

        if (totalCleaned > 0) {
            console.log(`✅ Limpieza completada: ${totalCleaned} archivos de bloqueo eliminados.`);
        } else {
            console.log('✅ Sin archivos de bloqueo encontrados.');
        }
    }
}

module.exports = ProfileManager;
