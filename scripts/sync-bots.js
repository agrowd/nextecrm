const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const sourceFolder = path.join(rootDir, 'bot');
const targetFolders = ['bot_1', 'bot_2', 'bot_3', 'bot_4'];

console.log('🔄 [DEVOPS SYNC] Sincronizando código desde bot/ hacia la flota de bots...');

const filesToSync = [
    'index.js',
    'services/advancedTemplateGenerator.js',
    'services/aiTextGenerator.js',
    'services/responseAnalyzer.js',
    'services/phoneValidator.js',
    'services/whatsappChecker.js'
];

targetFolders.forEach(target => {
    const targetPath = path.join(rootDir, target);
    if (!fs.existsSync(targetPath)) return;

    filesToSync.forEach(relFile => {
        const srcFile = path.join(sourceFolder, relFile);
        const destFile = path.join(targetPath, relFile);
        if (fs.existsSync(srcFile)) {
            const destDir = path.dirname(destFile);
            if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
            fs.copyFileSync(srcFile, destFile);
        }
    });
    console.log(`   ✅ Sincronizado: bot/ -> ${target}/`);
});

console.log('✨ [DEVOPS SYNC] Flota de bots sincronizada correctamente.');
