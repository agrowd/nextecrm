// Script de parche final: busca por patron simple y reemplaza el bloque de deteccion
const fs = require('fs');
const path = require('path');

const botFiles = [
    '../bot/index.js',
    '../bot_1/index.js',
    '../bot_2/index.js',
    '../bot_3/index.js',
    '../bot_4/index.js',
].map(f => path.join(__dirname, f));

const NEW_TIME_BLOCK = [
    '          if (i > 0 && msg1SentAt && chatForCheck) {',
    '            const lastMsg = chatForCheck.lastMessage;',
    '            if (lastMsg && !lastMsg.fromMe) {',
    '              const replyTimestamp = lastMsg.timestamp * 1000;',
    '              const secondsToReply = (replyTimestamp - msg1SentAt) / 1000;',
    '              if (replyTimestamp > msg1SentAt && secondsToReply < 10) {',
    '                console.log(\'      Auto-respuesta por TIEMPO: \' + secondsToReply.toFixed(1) + \'s < 10s = automatica\');',
    '                isAutoReply = true;',
    '              }',
    '            }',
    '          }',
    '',
    '          // Combinar con deteccion del whatsappChecker',
    '          if (this.currentlyProcessingLead && this.currentlyProcessingLead.autoReplyDetected) {',
    '            isAutoReply = true;',
    '          }',
];

botFiles.forEach(filePath => {
    if (!fs.existsSync(filePath)) {
        console.log('SKIP (no existe):', path.basename(filePath));
        return;
    }

    let lines = fs.readFileSync(filePath, 'utf8').split('\n');

    // Buscar la linea que contiene 'i === 0' y 'chatForCheck' y 'unreadCount'
    let startLine = -1, endLine = -1;
    for (let idx = 0; idx < lines.length; idx++) {
        const line = lines[idx];
        // Patron de inicio del bloque viejo
        if (startLine === -1 && line.indexOf('i === 0') !== -1 && line.indexOf('chatForCheck') !== -1 && (line.indexOf('unreadCount') !== -1 || line.indexOf('lastMessage') !== -1)) {
            startLine = idx;
        }
        // Patron de fin del bloque: linea con autoReplyDetected y isAutoReply = true
        if (startLine !== -1 && startLine !== idx && line.indexOf('autoReplyDetected') !== -1 && line.indexOf('isAutoReply = true') !== -1) {
            endLine = idx;
            break;
        }
    }

    if (startLine === -1 || endLine === -1) {
        // Ya fue modificado, buscar si ya tiene secondsToReply
        const hasNewCode = lines.some(l => l.indexOf('secondsToReply') !== -1);
        if (hasNewCode) {
            console.log('YA TIENE EL FIX:', path.basename(filePath));
        } else {
            console.log('BLOQUE NO ENCONTRADO en', path.basename(filePath), 'start:', startLine, 'end:', endLine);
        }
        return;
    }

    console.log('Reemplazando lineas', startLine + 1, '-', endLine + 1, 'en', path.basename(filePath));
    lines.splice(startLine, (endLine - startLine + 1), ...NEW_TIME_BLOCK);

    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    console.log('OK:', path.basename(filePath));
});
