// Script para aplicar el fix de deteccion de auto-respuesta por tiempo
const fs = require('fs');
const path = require('path');

const files = [
    path.join(__dirname, '../bot/index.js'),
    path.join(__dirname, '../bot_1/index.js'),
    path.join(__dirname, '../bot_2/index.js'),
    path.join(__dirname, '../bot_3/index.js'),
    path.join(__dirname, '../bot_4/index.js'),
];

// OLD: La deteccion por palabras clave (a reemplazar)
const OLD_DETECTION = `          if (i === 0 && chatForCheck && (chatForCheck.unreadCount > 0 || chatForCheck.lastMessage)) {
            const lastMsg = chatForCheck.lastMessage;
            if (lastMsg && !lastMsg.fromMe) {
              const incomingText = (lastMsg.body || '').toLowerCase();`;

// NEW: La deteccion por tiempo
const NEW_DETECTION = `          if (i > 0 && msg1SentAt && chatForCheck) {
            const lastMsg = chatForCheck.lastMessage;
            if (lastMsg && !lastMsg.fromMe) {
              const replyTimestamp = lastMsg.timestamp * 1000;
              const secondsToReply = (replyTimestamp - msg1SentAt) / 1000;
              if (replyTimestamp > msg1SentAt && secondsToReply < 10) {
                console.log('      Auto-respuesta detectada: respondio en ' + secondsToReply.toFixed(1) + 's (< 10s = automatica)');
                isAutoReply = true;
              }`;

// OLD: bloque de keywords a eliminar
const OLD_KEYWORDS_BLOCK = `              const incomingText = (lastMsg.body || '').toLowerCase();
              console.log(\`      \u{1F916} Posible auto-respuesta detectada: "\${incomingText.substring(0, 50)}..."\`);

              // \u23F1\uFE0F Solo considerar si el mensaje es RECIENTE (menos de 5 minutos)
              const msgTimestamp = lastMsg.timestamp * 1000; // Convertir a ms
              const now = Date.now();
              const isRecent = (now - msgTimestamp) < (5 * 60 * 1000);

              if (isRecent) {
                // \u{1F50D} DICCIONARIO DE DETECCI\u00D3N DE BOTS (Expandido)
                const botKeywords = [
                  'horario de atenci', 'gracias por comunicarte', 'para urgencias',
                  'marque una opci', 'marque la opci', 'en breves momentos',
                  'este es un mensaje auto', 'respondere', 'responder\u00E9', 'responderemos',
                  'men\u00FA', 'menu', 'opci\u00F3n', 'opcion', 'guardia', 'casilla',
                  'deje su mensaje', 'momentos un asesor', 'presione', 'digite',
                  'hola', 'buen dia', 'buenas tardes', 'info' // Palabras comunes para triggers simples si es instant\u00E1neo
                ];

                // Si es un mensaje MUY corto y r\u00E1pido, tambi\u00E9n sospechar (ej: "Hola", "Men\u00FA")
                const isShortAndFast = incomingText.length < 10;
                isAutoReply = botKeywords.some(keyword => incomingText.includes(keyword)) || isShortAndFast;
              }
            }
          }`;

// OLD loop variable declaration
const OLD_LOOP = `      for (let i = 0; i < messages.length; i++) {`;
const NEW_LOOP = `      let msg1SentAt = null; // Timestamp de envio del msg1 para detectar auto-replies
      for (let i = 0; i < messages.length; i++) {`;

// OLD auto-reply timer
const OLD_TIMER = `          // \u23F1\uFE0F Auto-reply Timer
          this.lastMessageTimestamps.set(whatsappFormat, Date.now());`;
const NEW_TIMER = `          // Grabar cuando enviamos el primer mensaje
          if (i === 0) msg1SentAt = Date.now();
          this.lastMessageTimestamps.set(whatsappFormat, Date.now());`;

let patchedCount = 0;

files.forEach(filePath => {
    if (!fs.existsSync(filePath)) {
        console.log('SKIP (no existe):', filePath);
        return;
    }
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Patch 1: Agregar msg1SentAt antes del loop
    if (!content.includes('msg1SentAt')) {
        content = content.replace(OLD_LOOP, NEW_LOOP);
        console.log('  PATCH 1 (msg1SentAt) aplicado');
    } else {
        console.log('  PATCH 1 ya existia');
    }

    // Patch 2: Grabar timestamp despues de enviar msg1
    if (!content.includes('if (i === 0) msg1SentAt')) {
        content = content.replace(OLD_TIMER, NEW_TIMER);
        console.log('  PATCH 2 (grabar timestamp) aplicado');
    } else {
        console.log('  PATCH 2 ya existia');
    }

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('ACTUALIZADO:', path.basename(filePath));
        patchedCount++;
    } else {
        console.log('SIN CAMBIOS (puede que keywords block necesite regex):', path.basename(filePath));
    }
});

console.log('\nTotal archivos modificados:', patchedCount);
console.log('NOTA: El bloque de keywords en el if (i === 0) debe revisarse manualmente si no se aplicaron todos los patches.');
