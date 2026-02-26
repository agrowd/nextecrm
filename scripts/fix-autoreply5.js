// Parche FINAL: usa indices exactos confirmados
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

    const content = fs.readFileSync(filePath, 'utf8');

    if (content.indexOf('secondsToReply') !== -1) {
        console.log('YA TIENE EL FIX:', path.basename(filePath));
        return;
    }

    const lines = content.split('\n');

    // Find start: line containing both 'i === 0' and 'chatForCheck'
    let startIdx = -1;
    for (let i = 1270; i < 1320 && i < lines.length; i++) {
        if (lines[i].indexOf('i === 0') !== -1 && lines[i].indexOf('chatForCheck') !== -1) {
            startIdx = i;
            break;
        }
    }

    if (startIdx === -1) {
        console.log('NO ENCONTRADO:', path.basename(filePath));
        return;
    }

    // Find end: the last line of the combined if block. Search for the closing '}' of 
    // the 'if (this.currentlyProcessingLead && autoReplyDetected)' block after startIdx
    // The pattern: line containing 'isAutoReply = true' followed by line with just '          }'
    let endIdx = -1;
    for (let i = startIdx + 1; i < startIdx + 50 && i < lines.length; i++) {
        if (lines[i].indexOf('isAutoReply = true') !== -1) {
            // The block ends one line later (closing brace)
            if (i + 1 < lines.length && lines[i + 1].trim() === '}') {
                endIdx = i + 1;
            } else {
                endIdx = i;
            }
            break;
        }
    }

    if (endIdx === -1) {
        console.log('FIN NO ENCONTRADO:', path.basename(filePath));
        return;
    }

    console.log('Reemplazando indices', startIdx, '-', endIdx, 'en', path.basename(filePath));
    lines.splice(startIdx, endIdx - startIdx + 1, ...NEW_BLOCK);

    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    console.log('OK:', path.basename(filePath));
});

console.log('Verificar: node -e "const fs=require(\'fs\'); console.log(fs.readFileSync(\'bot/index.js\',\'utf8\').indexOf(\'secondsToReply\'));"');
