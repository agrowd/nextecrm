const fs = require('fs');
const path = require('path');

const bots = ['bot', 'bot_1', 'bot_2', 'bot_3', 'bot_4'];
const basePath = path.join(__dirname, '..');

for (const bot of bots) {
    const filePath = path.join(basePath, bot, 'services', 'advancedTemplateGenerator.js');
    if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');

        // Replace FEBRERO -> MARZO
        content = content.replace(/FEBRERO/g, 'MARZO');
        content = content.replace(/Febrero/g, 'Marzo');
        content = content.replace(/febrero/g, 'marzo');

        // Replace ANIVERSARIO -> MARZO
        content = content.replace(/ANIVERSARIO/g, 'MARZO');
        content = content.replace(/Aniversario/g, 'Marzo');
        content = content.replace(/aniversario/g, 'marzo');

        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated ${filePath}`);
    } else {
        console.log(`File not found: ${filePath}`);
    }
}
