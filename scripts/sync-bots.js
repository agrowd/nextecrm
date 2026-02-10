const fs = require('fs');
const path = require('path');

const sourceDir = path.join(__dirname, '../bot_2');
const targetDirs = [
    path.join(__dirname, '../bot_1'),
    path.join(__dirname, '../bot_3'),
    path.join(__dirname, '../bot_4'),
    path.join(__dirname, '../bot') // bot base
];

const filesToSync = [
    'services/advancedTemplateGenerator.js',
    'services/aiTextGenerator.js',
    'package.json'
];

console.log('🤖 INICIANDO SINCRONIZACIÓN DE BOTS DESDE BOT_2...');

targetDirs.forEach(target => {
    if (!fs.existsSync(target)) {
        console.log(`⚠️ Destino no encontrado: ${target} (Saltando)`);
        return;
    }

    console.log(`📂 Sincronizando hacia: ${path.basename(target)}...`);

    filesToSync.forEach(file => {
        const srcPath = path.join(sourceDir, file);
        const destPath = path.join(target, file);

        try {
            if (fs.existsSync(srcPath)) {
                // Ensure dest dir exists
                const destDir = path.dirname(destPath);
                if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

                fs.copyFileSync(srcPath, destPath);
                console.log(`   ✅ Copiado: ${file}`);
            } else {
                console.error(`   ❌ No existe origen: ${file}`);
            }
        } catch (err) {
            console.error(`   ❌ Error copiando ${file}:`, err.message);
        }
    });
});
console.log('✨ ¡Sincronización Completada! Todos los bots son idénticos a bot_2.');
