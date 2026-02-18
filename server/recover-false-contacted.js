/**
 * 🔧 FAST RECOVERY: Restaurar leads atrapados en 'processing' y verificar 'contacted'
 * 
 * Diagnóstico encontró:
 * - 1295 leads en 'processing' (atrapados cuando la sesión murió)
 * - 1492 en 'not_interested' (posiblemente mal clasificados)
 * - 1882 en 'contacted' (algunos posiblemente sin mensajes reales)
 * 
 * Uso: 
 *   node recover-false-contacted.js          # Solo diagnóstico
 *   node recover-false-contacted.js --fix    # Aplicar fix
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
const DRY_RUN = !process.argv.includes('--fix');

async function diagnoseAndRecover() {
    console.log('🔌 Conectando a MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Conectado.\n');

    const db = mongoose.connection.db;
    const leadsCollection = db.collection('leads');
    const messagesCollection = db.collection('messages');

    // 1. DIAGNÓSTICO RÁPIDO
    console.log('📊 === DIAGNÓSTICO COMPLETO ===\n');

    const statusAgg = await leadsCollection.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
    ]).toArray();

    for (const s of statusAgg) {
        console.log(`   ${s._id || '(null)'}: ${s.count}`);
    }

    // 2. FIX INMEDIATO: Leads en 'processing' → 'pending'
    // Estos SEGURO quedaron trabados por la sesión muerta
    const processingCount = await leadsCollection.countDocuments({ status: 'processing' });
    console.log(`\n🔥 === LEADS ATRAPADOS EN 'PROCESSING': ${processingCount} ===`);

    if (processingCount > 0) {
        if (DRY_RUN) {
            console.log(`   ⚠️ DRY-RUN: Se restaurarían ${processingCount} leads de 'processing' → 'pending'`);
        } else {
            const result = await leadsCollection.updateMany(
                { status: 'processing' },
                { $set: { status: 'pending', retryCount: 0 } }
            );
            console.log(`   ✅ Restaurados ${result.modifiedCount} leads de 'processing' → 'pending'`);
        }
    }

    // 3. VERIFICACIÓN RÁPIDA: Leads 'contacted' sin mensajes (usando aggregation, no uno por uno)
    console.log(`\n🔍 === VERIFICANDO LEADS 'CONTACTED' SIN MENSAJES ===`);

    // Obtener todos los phones/leadIds que tienen mensajes (RÁPIDO con distinct)
    const phonesWithMessages = await messagesCollection.distinct('phone');
    const leadIdsWithMessages = await messagesCollection.distinct('leadId');

    const phonesSet = new Set(phonesWithMessages.filter(Boolean));
    const leadIdsSet = new Set(leadIdsWithMessages.filter(Boolean));

    console.log(`   📱 Phones con mensajes en BD: ${phonesSet.size}`);
    console.log(`   🆔 LeadIDs con mensajes en BD: ${leadIdsSet.size}`);

    // Obtener todos los contacted
    const contactedLeads = await leadsCollection.find(
        { status: 'contacted' },
        { projection: { _id: 1, name: 1, phone: 1 } }
    ).toArray();

    let falseContacted = [];
    let realContacted = 0;

    for (const lead of contactedLeads) {
        const hasMsg = phonesSet.has(lead.phone) || leadIdsSet.has(lead._id.toString());
        if (hasMsg) {
            realContacted++;
        } else {
            falseContacted.push(lead);
        }
    }

    console.log(`\n   ✅ Con mensajes reales: ${realContacted}`);
    console.log(`   ❌ SIN mensajes (falsos contactados): ${falseContacted.length}`);

    if (falseContacted.length > 0) {
        console.log(`\n   Primeros 10 falsos contactados:`);
        for (const lead of falseContacted.slice(0, 10)) {
            console.log(`     - ${lead.name} (${lead.phone || 'sin tel'})`);
        }

        if (DRY_RUN) {
            console.log(`\n   ⚠️ DRY-RUN: Se restaurarían ${falseContacted.length} leads de 'contacted' → 'pending'`);
        } else {
            const ids = falseContacted.map(l => l._id);
            const result = await leadsCollection.updateMany(
                { _id: { $in: ids } },
                { $set: { status: 'pending', retryCount: 0 } }
            );
            console.log(`\n   ✅ Restaurados ${result.modifiedCount} leads de 'contacted' → 'pending'`);
        }
    }

    // 4. Estado final
    console.log('\n📊 === ESTADO FINAL ===');
    const finalStatus = await leadsCollection.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
    ]).toArray();

    for (const s of finalStatus) {
        console.log(`   ${s._id || '(null)'}: ${s.count}`);
    }

    if (DRY_RUN) {
        console.log('\n⚠️ MODO DRY-RUN: No se hicieron cambios.');
        console.log('   Para aplicar los fixes, ejecutar con --fix:');
        console.log('   node recover-false-contacted.js --fix');
    }

    await mongoose.disconnect();
    console.log('\n✅ Listo!');
}

diagnoseAndRecover().catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
});
