const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../bot/services/advancedTemplateGenerator.js');
let content = fs.readFileSync(filePath, 'utf8');

// Normalize line endings to LF for easier matching
const normalizedContent = content.replace(/\r\n/g, '\n');

const target = `        this.stats.generated += 4;
        console.log(\`🎯 [ADVANCED] Cat: \${cat} | Generados: \${this.stats.generated}\`);
        console.log(\`📝 Mensajes generados:\`);
        console.log(\`   1️⃣ Saludo: "\${msg1.substring(0, 60)}..."\`);
        console.log(\`   2️⃣ Nexte: "\${msg2.substring(0, 60)}..."\`);
        console.log(\`   3️⃣ Promo: "\${msg3.substring(0, 60)}..."\`);
        console.log(\`   4️⃣ CTA: "\${msg5.substring(0, 60)}..."\`);

        return [msg1, msg2, msg3, msg5];`;

const replacement = `        this.stats.generated += 4;
        console.log(\`🎯 [ADVANCED] Cat: \${cat} | Generados: \${this.stats.generated}\`);
        console.log(\`📝 Mensajes generados:\`);
        console.log(\`   1️⃣ Saludo: "\${msg1.substring(0, 60)}..."\`);
        console.log(\`   2️⃣ Nexte: "\${msg2.substring(0, 60)}..."\`);
        console.log(\`   3️⃣ Promo: "\${msg3.substring(0, 60)}..."\`);
        console.log(\`   4️⃣ CTA: "\${msg5.substring(0, 60)}..."\`);

        const templateMessages = [msg1, msg2, msg3, msg5];
        templateMessages.templateVariantUsed = this.propuestas.indexOf(propuesta);
        return templateMessages;`;

if (normalizedContent.includes(target)) {
    const updatedContent = normalizedContent.replace(target, replacement);
    // Write back with original CRLF line endings if the original file had them
    const hasCrlf = content.includes('\r\n');
    const finalContent = hasCrlf ? updatedContent.replace(/\n/g, '\r\n') : updatedContent;
    fs.writeFileSync(filePath, finalContent, 'utf8');
    console.log('Successfully updated advancedTemplateGenerator.js');
} else {
    console.log('Error: target content not found in advancedTemplateGenerator.js');
}
