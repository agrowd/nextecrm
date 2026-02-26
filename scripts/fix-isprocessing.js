// Fix: agregar isProcessing = false antes del return en el bloque del lead atascado
const fs = require('fs');
const path = require('path');

// Esta funcion se aplica a todos los bots (bot, bot_1, bot_2, bot_3, bot_4)
const botFiles = ['bot', 'bot_1', 'bot_2', 'bot_3', 'bot_4'].map(b =>
    path.join(__dirname, '..', b, 'index.js')
);

let totalFixed = 0;

botFiles.forEach(filePath => {
    if (!fs.existsSync(filePath)) { console.log('SKIP:', path.basename(path.dirname(filePath))); return; }

    const lines = fs.readFileSync(filePath, 'utf8').split('\n');

    // Buscar el bloque: consecutiveAttempts >= 3 con el return sin isProcessing = false
    // El patron: linea con setTimeout + !this.isProcessing + processNextLead + }, DELAY) después
    //            linea con return  ← agregar isProcessing=false ANTES de esto

    let fixed = false;

    for (let i = 0; i < lines.length - 5; i++) {
        if (lines[i].indexOf('consecutiveAttempts >= 3') !== -1 || lines[i].indexOf('consecutiveAttempts >= 3') !== -1) {
            // Buscar el return cerca (dentro de las proximas 20 lineas)
            for (let j = i; j < Math.min(i + 20, lines.length); j++) {
                const l = lines[j].trim();
                // encontrar: }, NNNN); seguido de return;
                // El patron del setTimeout con el return al final antes del cierre del if
                if (l === 'return;' && j > i) {
                    // Verificar que la linea anterior sea el cierre del setTimeout: }, N);
                    const prev = lines[j - 1].trim();
                    if (prev === '}, 15000);' || prev === '}, 10000);' || prev.match(/^\}, \d+\);$/)) {
                        // Verificar que ya no tiene isProcessing = false antes del return
                        const hasFix = lines[j].indexOf('isProcessing = false') !== -1 ||
                            (j > 0 && lines[j - 1].indexOf('isProcessing = false') !== -1) ||
                            (j > 1 && lines[j - 2].indexOf('isProcessing = false') !== -1);

                        if (!hasFix) {
                            // Obtener la indentacion actual
                            const indent = lines[j].match(/^(\s*)/)[1];
                            lines.splice(j, 0, indent + 'this.isProcessing = false; // FIX: liberar flag antes del return del stuck lead');
                            fixed = true;
                            totalFixed++;
                            console.log('FIX aplicado en linea ' + (j + 1) + ' de ' + path.basename(path.dirname(filePath)) + '/index.js');
                            break;
                        } else {
                            console.log('YA TIENE FIX en ' + path.basename(path.dirname(filePath)) + '/index.js');
                            break;
                        }
                    }
                }
            }
            if (fixed) break;
        }
    }

    if (fixed) {
        fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
        console.log('GUARDADO:', filePath.split('\\').slice(-2).join('/'));
    } else if (totalFixed === 0) {
        console.log('PATRON NO ENCONTRADO en', path.basename(path.dirname(filePath)) + '/index.js');
    }
});

console.log('\nTotal fixes aplicados:', totalFixed);
