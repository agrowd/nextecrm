/**
 * 🔧 DIAGNOSTIC + RECOVERY: Encontrar leads "contactados" sin mensajes reales
 * 
 * El problema: La sesión muerta puede causar que leads se marquen como 
 * 'contacted' sin que se hayan enviado mensajes reales.
 * 
 * Este script:
 * 1. Muestra TODOS los status existentes en la BD
 * 2. Cruza leads 'contacted' con la tabla de mensajes
 * 3. Identifica leads sin mensajes reales → los restaura a 'pending'
 * 
 * Uso: node recover-false-contacted.js [--fix]
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

    // 1. DIAGNÓSTICO: Mostrar todos los status
    console.log('📊 === DIAGNÓSTICO COMPLETO DE LEADS ===\n');

    const statusAgg = await leadsCollection.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
    ]).toArray();

    console.log('Status breakdown:');
    let totalLeads = 0;
    for (const s of statusAgg) {
        console.log(`   ${s._id || '(null/undefined)'}: ${s.count}`);
        totalLeads += s.count;
    }
    console.log(`   TOTAL: ${totalLeads}\n`);

    // 2. CRUCE: Leads 'contacted' sin mensajes
    console.log('🔍 === BUSCANDO LEADS "CONTACTED" SIN MENSAJES REALES ===\n');

    const contactedLeads = await leadsCollection.find({ status: 'contacted' }).toArray();
    console.log(`Total leads con status 'contacted': ${contactedLeads.length}`);

    let falseContacted = [];
    let realContacted = 0;
    let noPhone = 0;

    for (const lead of contactedLeads) {
        if (!lead.phone) {
            noPhone++;
            continue;
        }

        // Buscar mensajes enviados a este lead
        const messageCount = await messagesCollection.countDocuments({
            $or: [
                { leadId: lead._id.toString() },
                { phone: lead.phone }
            ]
        });

        if (messageCount === 0) {
            falseContacted.push(lead);
        } else {
            realContacted++;
        }
    }

    console.log(`   ✅ Con mensajes reales: ${realContacted}`);
    console.log(`   ❌ SIN mensajes (falsos contactados): ${falseContacted.length}`);
    console.log(`   ⚠️ Sin teléfono: ${noPhone}`);

    if (falseContacted.length > 0) {
        console.log(`\n📋 Primeros 10 falsos contactados:`);
        for (const lead of falseContacted.slice(0, 10)) {
            console.log(`   - ${lead.name} (${lead.phone || 'sin tel'}) [ID: ${lead._id}]`);
        }
    }

    // 3. Buscar otros status sospechosos (check_failed, processing, not_interested sin mensajes)
    console.log('\n🔍 === OTROS STATUS SOSPECHOSOS ===\n');

    const otherStatuses = ['check_failed', 'processing', 'not_interested', 'invalid'];
    for (const status of otherStatuses) {
        const count = await leadsCollection.countDocuments({ status });
        if (count > 0) {
            console.log(`   ${status}: ${count} leads`);
        }
    }

    // 4. RECOVERY
    if (falseContacted.length > 0) {
        if (DRY_RUN) {
            console.log(`\n⚠️ MODO DRY-RUN: No se hacen cambios.`);
            console.log(`   Para restaurar ${falseContacted.length} leads, ejecutar con --fix:`);
            console.log(`   node recover-false-contacted.js --fix`);
        } else {
            console.log(`\n🔄 RESTAURANDO ${falseContacted.length} leads falsos a 'pending'...`);

            const ids = falseContacted.map(l => l._id);
            const result = await leadsCollection.updateMany(
                { _id: { $in: ids } },
                { $set: { status: 'pending', retryCount: 0 } }
            );

            console.log(`✅ Restaurados ${result.modifiedCount} leads a 'pending'`);
        }
    }

    // 5. Estado final
    console.log('\n📊 === ESTADO FINAL ===');
    const finalStatus = await leadsCollection.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
    ]).toArray();

    for (const s of finalStatus) {
        console.log(`   ${s._id || '(null/undefined)'}: ${s.count}`);
    }

    await mongoose.disconnect();
    console.log('\n✅ Listo!');
}

diagnoseAndRecover().catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
});
