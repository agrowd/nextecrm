// Script de parche: reemplaza el bloque de keywords por la deteccion por tiempo
const fs = require('fs');
const path = require('path');

const botFiles = [
    '../bot/index.js',
    '../bot_1/index.js',
    '../bot_2/index.js',
    '../bot_3/index.js',
    '../bot_4/index.js',
].map(f => path.join(__dirname, f));

const NEW_TIME_BLOCK = `
          if (i > 0 && msg1SentAt && chatForCheck) {
            const lastMsg = chatForCheck.lastMessage;
            if (lastMsg && !lastMsg.fromMe) {
              const replyTimestamp = lastMsg.timestamp * 1000;
              const secondsToReply = (replyTimestamp - msg1SentAt) / 1000;
              if (replyTimestamp > msg1SentAt && secondsToReply < 10) {
                console.log('      Auto-respuesta por TIEMPO detectada: respondio en ' + secondsToReply.toFixed(1) + 's (< 10s = automatica)');
                isAutoReply = true;
              }
            }
          }

          // Combinar con deteccion en tiempo real (si whatsappChecker lo detecto)
          if (this.currentlyProcessingLead && this.currentlyProcessingLead.autoReplyDetected) {
            isAutoReply = true;
          }
`.trimStart();

botFiles.forEach(filePath => {
    if (!fs.existsSync(filePath)) {
        console.log('SKIP:', filePath);
        return;
    }

    let lines = fs.readFileSync(filePath, 'utf8').split('\n');

    // Buscar el bloque: la primera linea tiene `if (i === 0 && chatForCheck`
    // y termina en `if (this.currentlyProcessingLead && this.currentlyProcessingLead.autoReplyDetected)`
    let startLine = -1, endLine = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('if (i === 0') && lines[i].includes('chatForCheck') && lines[i].includes('unreadCount')) {
            startLine = i;
        }
        if (startLine >= 0 && lines[i].includes('autoReplyDetected') && lines[i].includes('isAutoReply = true')) {
            endLine = i;
            break;
        }
    }

    if (startLine === -1 || endLine === -1) {
        console.log('BLOQUE NO ENCONTRADO en', path.basename(filePath), '(startLine:', startLine, 'endLine:', endLine, ')');
        return;
    }

    console.log(`REEMPLAZANDO lineas ${startLine + 1}-${endLine + 1} en ${path.basename(filePath)}`);

    const newLines = NEW_TIME_BLOCK.split('\n');
    lines.splice(startLine, (endLine - startLine + 1), ...newLines);

    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    console.log('OK:', path.basename(filePath));
});

console.log('\nListo. Verificar con: findstr /C:"secondsToReply" bot\\index.js');
