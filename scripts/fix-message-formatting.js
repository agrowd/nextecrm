const fs = require('fs');
const path = require('path');

// Archivo principal a corregir (Fuente de Verdad)
const masterFile = path.join(__dirname, '../bot_2/services/advancedTemplateGenerator.js');

if (!fs.existsSync(masterFile)) {
    console.error('❌ No se encuentra el archivo maestro en bot_2');
    process.exit(1);
}

let content = fs.readFileSync(masterFile, 'utf8');

// Análisis:
// Actualmente el archivo tiene: "Texto \\n Texto"
// Esto en memoria es: Texto \n Texto (literal backslash + n)
// Al enviarse a WhatsApp, sale "\n" visible.
// Queremos: "Texto \n Texto" (escape newline)
// Para eso, en el archivo debe decir: Texto \n Texto

console.log('🔍 Analizando archivo...');

// Contar ocurrencias de \\n
const matches = content.match(/\\\\n/g);
console.log(`   Encontrados ${matches ? matches.length : 0} saltos de línea doblemente escapados (\\\\n).`);

if (matches && matches.length > 0) {
    // Reemplazo Global: \\n -> \n
    const newContent = content.replace(/\\\\n/g, '\\n');

    fs.writeFileSync(masterFile, newContent, 'utf8');
    console.log(`✅ ¡Corrección aplicada! Se reemplazaron ${matches.length} casos en bot_2.`);
} else {
    console.log('ℹ️ No se encontraron dobles escapes. El archivo ya podría estar corregido.');
}
