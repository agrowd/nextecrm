const fs = require('fs');
const path = require('path');

class ProfileManager {
    /**
     * Limpia archivos de bloqueo de Chrome que impiden el inicio después de un cierre incorrecto
     * @param {string} sessionsDir - Directorio base de sesiones
     * @param {string} instanceId - ID de la instancia del bot
     */
    static cleanProfileLocks(sessionsDir, instanceId) {
        if (!sessionsDir || !instanceId) {
            console.warn('⚠️ ProfileManager: sessionsDir o instanceId no proporcionados. Saltando limpieza.');
            return;
        }

        const profilePath = path.join(sessionsDir, 'browser-' + instanceId);

        // Verificar si existe el directorio del perfil
        if (!fs.existsSync(profilePath)) {
            console.log(`ℹ️ Perfil nuevo o no existente en: ${profilePath}`);
            return;
        }

        console.log(`🧹 Verificando archivos de bloqueo en: ${profilePath}`);

        const locks = [
            'SingletonLock',
            'SingletonCookie',
            'SingletonSocket'
        ];

        let cleaned = 0;

        locks.forEach(lockName => {
            const lockFile = path.join(profilePath, lockName);
            try {
                if (fs.existsSync(lockFile)) {
                    // Intentar borrar (unlink es asíncrono, unlinkSync es síncrono - usamos sync para asegurar limpieza antes de inicio)
                    fs.unlinkSync(lockFile);
                    console.log(`🗑️ Eliminado bloqueo: ${lockName}`);
                    cleaned++;
                }
            } catch (err) {
                console.warn(`⚠️ Error al borrar ${lockName}: ${err.message}`);
            }
        });

        if (cleaned > 0) {
            console.log(`✅ Limpieza de perfil completada (${cleaned} archivos eliminados).`);
        } else {
            console.log('✅ Perfil limpio, sin archivos de bloqueo.');
        }
    }
}

module.exports = ProfileManager;
