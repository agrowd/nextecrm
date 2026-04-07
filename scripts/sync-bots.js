const fs = require('fs');
const path = require('path');

const sourceDir = 'bot';
const targetDirs = ['bot_1', 'bot_2', 'bot_3', 'bot_4'];
const basePath = path.join(__dirname, '..');

// Sync index.js and package.json (root of bot)
const rootFilesToSync = ['index.js', 'package.json'];

// Entire services directory to sync (ISSUE-06 Resolve)
const servicesDir = 'services';

for (const targetDir of targetDirs) {
    const targetPath = path.join(basePath, targetDir);
    if (!fs.existsSync(targetPath)) {
        console.log(`Skipping ${targetDir} (not found)`);
        continue;
    }

    console.log(`Syncing ${sourceDir} -> ${targetDir}...`);

    // 1. Sync Root Files
    for (const file of rootFilesToSync) {
        const srcFile = path.join(basePath, sourceDir, file);
        const dstFile = path.join(basePath, targetDir, file);
        if (fs.existsSync(srcFile)) {
            // Check if directory exists
            const dstDir = path.dirname(dstFile);
            if (!fs.existsSync(dstDir)) {
                fs.mkdirSync(dstDir, { recursive: true });
            }
            fs.copyFileSync(srcFile, dstFile);
            console.log(`  Copied ${file}`);
        }
    }

    // 2. Sync Entire Services Directory
    const srcServicesPath = path.join(basePath, sourceDir, servicesDir);
    const dstServicesPath = path.join(basePath, targetDir, servicesDir);

    if (fs.existsSync(srcServicesPath)) {
        if (!fs.existsSync(dstServicesPath)) {
            fs.mkdirSync(dstServicesPath, { recursive: true });
        }
        
        const files = fs.readdirSync(srcServicesPath);
        for (const file of files) {
            const srcFile = path.join(srcServicesPath, file);
            const dstFile = path.join(dstServicesPath, file);
            
            if (fs.lstatSync(srcFile).isFile()) {
                fs.copyFileSync(srcFile, dstFile);
                console.log(`  Copied services/${file}`);
            }
        }
    }
}

console.log('✨ Global Bot Sync Completed.');
