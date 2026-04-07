const fs = require('fs');
const path = require('path');

const bots = ['bot', 'bot_1', 'bot_2', 'bot_3', 'bot_4'];
const basePath = path.join(__dirname, '..');

for (const bot of bots) {
    const filePath = path.join(basePath, bot, 'services', 'advancedTemplateGenerator.js');
    if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');

        console.log(`Processing ${bot}...`);

        // Replace MARZO -> ABRIL
        const originalContent = content;
        content = content.replace(/MARZO/g, 'ABRIL');
        content = content.replace(/Marzo/g, 'Abril');
        content = content.replace(/marzo/g, 'abril');

        if (originalContent !== content) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`✅ Updated ${filePath}`);
        } else {
            console.log(`ℹ️ No "Marzo" strings found in ${bot}`);
        }
    } else {
        console.log(`❌ File not found: ${filePath}`);
    }
}

console.log('✨ April transition complete.');
