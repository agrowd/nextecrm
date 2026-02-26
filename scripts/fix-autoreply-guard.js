const fs = require('fs');
const path = require('path');

const OLD_CODE = `          let isAutoReply = false;

          if (i > 0 && msg1SentAt && chatForCheck) {
            const lastMsg = chatForCheck.lastMessage;
            if (lastMsg && !lastMsg.fromMe) {
              const replyTimestamp = lastMsg.timestamp * 1000;
              const secondsToReply = (replyTimestamp - msg1SentAt) / 1000;
              if (replyTimestamp > msg1SentAt && secondsToReply < 10) {
                console.log('      Auto-respuesta por TIEMPO: ' + secondsToReply.toFixed(1) + 's < 10s = automatica');
                isAutoReply = true;
              }
            }
          }

          // Combinar con deteccion del checker en tiempo real
          if (this.currentlyProcessingLead && this.currentlyProcessingLead.autoReplyDetected) {
            isAutoReply = true;
          }`;

const NEW_CODE = `          let isAutoReply = false;

          // Solo detectar auto-reply si el pitch NO fue inyectado aún
          if (!this.currentlyProcessingLead?.botPitchInjected) {
            if (i > 0 && msg1SentAt && chatForCheck) {
              const lastMsg = chatForCheck.lastMessage;
              if (lastMsg && !lastMsg.fromMe) {
                const replyTimestamp = lastMsg.timestamp * 1000;
                const secondsToReply = (replyTimestamp - msg1SentAt) / 1000;
                if (replyTimestamp > msg1SentAt && secondsToReply < 10) {
                  console.log('      Auto-respuesta por TIEMPO: ' + secondsToReply.toFixed(1) + 's < 10s = automatica');
                  isAutoReply = true;
                }
              }
            }

            // Combinar con deteccion del checker en tiempo real
            if (this.currentlyProcessingLead && this.currentlyProcessingLead.autoReplyDetected) {
              isAutoReply = true;
            }
          }`;

const botInstances = ['bot_1', 'bot_2', 'bot_3', 'bot_4'];
const baseDir = path.join(__dirname, '..');

for (const instance of botInstances) {
    const filePath = path.join(baseDir, instance, 'index.js');
    if (!fs.existsSync(filePath)) {
        console.log(`⚠️  No encontrado: ${filePath}`);
        continue;
    }

    let content = fs.readFileSync(filePath, 'utf8');

    if (!content.includes(OLD_CODE)) {
        console.log(`⚠️  ${instance}/index.js: código no encontrado (ya parchado o diferente)`);
        continue;
    }

    content = content.replace(OLD_CODE, NEW_CODE);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ ${instance}/index.js: parche aplicado correctamente`);
}

console.log('\n✅ Listo. Reiniciá los bots para aplicar los cambios.');
