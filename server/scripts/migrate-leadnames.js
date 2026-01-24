/**
 * 🔄 MIGRACIÓN: Poblar leadName en mensajes existentes
 * 
 * Este script busca todos los mensajes que no tienen leadName
 * y los actualiza buscando el Lead asociado por teléfono.
 * 
 * Es SEGURO correrlo múltiples veces (idempotente).
 * No modifica mensajes que ya tienen leadName.
 * 
 * USO:
 *   node server/scripts/migrate-leadnames.js
 * 
 * O desde el VPS:
 *   docker exec -it rascafull-server-1 node scripts/migrate-leadnames.js
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Modelos
const Message = require('../models/Message');
const Lead = require('../models/Lead');

// Configuración
const BATCH_SIZE = 100; // Procesar de a 100 para no sobrecargar
const DRY_RUN = process.argv.includes('--dry-run'); // Solo simular sin guardar

async function main() {
    console.log('🔄 ═══════════════════════════════════════════════════════');
    console.log('   MIGRACIÓN: Poblar leadName en mensajes existentes');
    console.log('═══════════════════════════════════════════════════════════');

    if (DRY_RUN) {
        console.log('⚠️  MODO DRY-RUN: No se guardarán cambios\n');
    }

    // Conectar a MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/gmaps-leads-scraper';
    console.log(`📡 Conectando a: ${mongoUri.replace(/:([^:@]+)@/, ':****@')}`);

    try {
        await mongoose.connect(mongoUri);
        console.log('✅ Conectado a MongoDB\n');
    } catch (err) {
        console.error('❌ Error conectando a MongoDB:', err.message);
        process.exit(1);
    }

    // Estadísticas
    const stats = {
        totalMessages: 0,
        needsMigration: 0,
        updated: 0,
        noLeadFound: 0,
        errors: 0
    };

    // 1. Contar mensajes totales
    stats.totalMessages = await Message.countDocuments();
    console.log(`📊 Total de mensajes en DB: ${stats.totalMessages}`);

    // 2. Buscar mensajes sin leadName (o con leadName vacío)
    const messagesToMigrate = await Message.find({
        $or: [
            { leadName: { $exists: false } },
            { leadName: null },
            { leadName: '' }
        ]
    }).select('_id phone leadName');

    stats.needsMigration = messagesToMigrate.length;
    console.log(`🔍 Mensajes sin leadName: ${stats.needsMigration}\n`);

    if (stats.needsMigration === 0) {
        console.log('✅ No hay mensajes que migrar. ¡Todo está al día!');
        await mongoose.disconnect();
        return;
    }

    // 3. Construir cache de leads por teléfono (para evitar queries repetidas)
    console.log('📦 Construyendo cache de leads...');
    const allLeads = await Lead.find({}).select('name phone');

    // Crear mapa de teléfono -> nombre (con múltiples formatos de teléfono)
    const phoneToName = new Map();
    for (const lead of allLeads) {
        if (!lead.phone || !lead.name) continue;

        const cleanPhone = lead.phone.replace(/\D/g, '');

        // Guardar con múltiples variantes para hacer match
        phoneToName.set(cleanPhone, lead.name);
        phoneToName.set(cleanPhone.slice(-10), lead.name); // Últimos 10 dígitos
        phoneToName.set(cleanPhone.slice(-8), lead.name);  // Últimos 8 dígitos

        // Sin prefijo de país (549, 54, etc.)
        if (cleanPhone.startsWith('549')) {
            phoneToName.set(cleanPhone.slice(3), lead.name);
        } else if (cleanPhone.startsWith('54')) {
            phoneToName.set(cleanPhone.slice(2), lead.name);
        }
    }
    console.log(`✅ Cache construido: ${allLeads.length} leads indexados\n`);

    // 4. Procesar en batches
    console.log('🚀 Iniciando migración...\n');

    for (let i = 0; i < messagesToMigrate.length; i += BATCH_SIZE) {
        const batch = messagesToMigrate.slice(i, i + BATCH_SIZE);
        const bulkOps = [];

        for (const msg of batch) {
            try {
                const cleanPhone = (msg.phone || '').replace(/\D/g, '');

                // Intentar encontrar el nombre en el cache
                let leadName = phoneToName.get(cleanPhone) ||
                    phoneToName.get(cleanPhone.slice(-10)) ||
                    phoneToName.get(cleanPhone.slice(-8));

                if (leadName) {
                    if (!DRY_RUN) {
                        bulkOps.push({
                            updateOne: {
                                filter: { _id: msg._id },
                                update: { $set: { leadName: leadName } }
                            }
                        });
                    }
                    stats.updated++;
                } else {
                    stats.noLeadFound++;
                }
            } catch (err) {
                stats.errors++;
                console.error(`❌ Error procesando mensaje ${msg._id}:`, err.message);
            }
        }

        // Ejecutar batch update
        if (bulkOps.length > 0 && !DRY_RUN) {
            await Message.bulkWrite(bulkOps);
        }

        // Progreso
        const progress = Math.min(i + BATCH_SIZE, messagesToMigrate.length);
        const percent = Math.round((progress / messagesToMigrate.length) * 100);
        process.stdout.write(`\r📈 Progreso: ${progress}/${messagesToMigrate.length} (${percent}%)`);
    }

    console.log('\n');

    // 5. Resumen final
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 RESUMEN DE MIGRACIÓN');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`   Total mensajes:      ${stats.totalMessages}`);
    console.log(`   Necesitaban migrar:  ${stats.needsMigration}`);
    console.log(`   ✅ Actualizados:     ${stats.updated}`);
    console.log(`   ⚠️  Sin lead:         ${stats.noLeadFound}`);
    console.log(`   ❌ Errores:          ${stats.errors}`);
    console.log('═══════════════════════════════════════════════════════════');

    if (DRY_RUN) {
        console.log('\n⚠️  MODO DRY-RUN: No se guardaron cambios.');
        console.log('   Para aplicar, correr sin --dry-run');
    } else {
        console.log('\n✅ Migración completada exitosamente.');
    }

    await mongoose.disconnect();
    console.log('📡 Desconectado de MongoDB');
}

// Ejecutar
main().catch(err => {
    console.error('❌ Error fatal:', err);
    process.exit(1);
});
