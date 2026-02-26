// Parche por numeros de linea exactos - busca y reemplaza el bloque de deteccion por keywords
const fs = require('fs');
const path = require('path');

const botFiles = [
    '../bot/index.js',
    '../bot_1/index.js',
    '../bot_2/index.js',
    '../bot_3/index.js',
    '../bot_4/index.js',
].map(f => path.join(__dirname, f));

const NEW_BLOCK = [
    '          if (i > 0 && msg1SentAt && chatForCheck) {',
    '            const lastMsg = chatForCheck.lastMessage;',
    '            if (lastMsg && !lastMsg.fromMe) {',
    '              const replyTimestamp = lastMsg.timestamp * 1000;',
    '              const secondsToReply = (replyTimestamp - msg1SentAt) / 1000;',
    '              if (replyTimestamp > msg1SentAt && secondsToReply < 10) {',
    "                console.log('      Auto-respuesta por TIEMPO: ' + secondsToReply.toFixed(1) + 's < 10s = automatica');",
    '                isAutoReply = true;',
    '              }',
    '            }',
    '          }',
    '',
    '          // Combinar con deteccion del checker en tiempo real',
    '          if (this.currentlyProcessingLead && this.currentlyProcessingLead.autoReplyDetected) {',
    '            isAutoReply = true;',
    '          }',
];

botFiles.forEach(filePath => {
    if (!fs.existsSync(filePath)) { console.log('SKIP:', path.basename(filePath)); return; }

    // Check if already patched
    const content = fs.readFileSync(filePath, 'utf8');
    if (content.indexOf('secondsToReply') !== -1) {
        console.log('YA TIENE EL FIX:', path.basename(filePath));
        return;
    }

    const lines = content.split('\n');

    // Find start line: contains 'i === 0' somewhere in the range 1260-1310 
    let startIdx = -1;
    for (let i = 1260; i < Math.min(1320, lines.length); i++) {
        const l = lines[i];
        // Use charCode comparison to avoid encoding issues 
        if (l.indexOf('i === 0') !== -1 && l.indexOf('chatForCheck') !== -1) {
            startIdx = i;
            break;
        }
    }

    if (startIdx === -1) {
        console.log('NO SE ENCONTRO EL PATRON en', path.basename(filePath));
        return;
    }

    // Find end line: should be the line with 'autoReplyDetected' and 'isAutoReply = true' after startIdx
    let endIdx = -1;
    for (let i = startIdx; i < Math.min(startIdx + 40, lines.length); i++) {
        const l = lines[i];
        if (l.indexOf('autoReplyDetected') !== -1 && l.indexOf('isAutoReply = true') !== -1) {
            endIdx = i;
            break;
        }
    }

    if (endIdx === -1) {
        console.log('NO SE ENCONTRO EL FIN EN', path.basename(filePath));
        return;
    }

    console.log('Reemplazando lineas', startIdx + 1, '-', endIdx + 1, 'en', path.basename(filePath));
    lines.splice(startIdx, endIdx - startIdx + 1, ...NEW_BLOCK);

    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    console.log('OK:', path.basename(filePath));
});
