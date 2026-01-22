const fs = require('fs');
const path = require('path');

// REEMPLAZA ESTA CONTRASEÑA CON LA REAL DE MONGODB ATLAS
const DB_PASSWORD = 'TU_CONTRASEÑA_REAL_AQUI';

const envContent = `MONGODB_URI=mongodb+srv://federicomartinromero8:${DB_PASSWORD}@gmaps.9wu7eyd.mongodb.net/?retryWrites=true&w=majority&appName=GMaps
WG_PEERS_DIR=./wg/peers
SLACK_WEBHOOK_URL=`;

// Crear en la raíz
fs.writeFileSync('.env', envContent);
console.log('✅ Archivo .env creado en la raíz');

// Crear en server/
fs.writeFileSync('server/.env', envContent);
console.log('✅ Archivo .env creado en server/');

console.log('🎉 Archivos .env creados correctamente');
console.log('⚠️  IMPORTANTE: Reemplaza TU_CONTRASEÑA_REAL_AQUI con la contraseña real de MongoDB Atlas'); 