/**
 * 🔧 RECOVERY SCRIPT: Restaurar leads quemados por SESSION_DEAD
 * 
 * El bug: Cuando Chromium se muere, el bot seguía sacando leads de la cola.
 * Cada lead fallido incrementaba retryCount. Después de 3 pasadas,
 * los leads quedaban permanentemente como 'failed'.
 * 
 * Este script restaura los leads que fueron marcados como 'failed' 
 * por errores de SESSION_DEAD (detached Frame, Target closed, etc.)
 * 
 * Uso: node recover-session-dead-leads.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

async function recoverLeads() {
    console.log('🔌 Conectando a MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Conectado.');

    const db = mongoose.connection.db;
    const leadsCollection = db.collection('leads');

    // 1. Buscar leads que fueron marcados como 'failed' por SESSION_DEAD
    // Estos tienen notes que contienen "SESSION_DEAD" o "detached Frame"
    const sessionDeadQuery = {
        status: 'failed',
        $or: [
            { notes: { $regex: 'SESSION_DEAD', $options: 'i' } },
            { notes: { $regex: 'detached Frame', $options: 'i' } },
            { notes: { $regex: 'Target closed', $options: 'i' } },
            { notes: { $regex: 'Session Closed', $options: 'i' } }
        ]
    };

    const burnedLeads = await leadsCollection.find(sessionDeadQuery).toArray();
    console.log(`\n🔍 Encontrados ${burnedLeads.length} leads quemados por SESSION_DEAD`);

    if (burnedLeads.length === 0) {
        // También buscar leads failed con retryCount >= 3 que NO tienen mensajes enviados
        // (Si nunca les enviamos nada, fueron quemados por el loop)
        console.log('\n🔍 Buscando leads failed con retryCount alto pero sin mensajes enviados...');

        const messagesCollection = db.collection('messages');
        const failedLeads = await leadsCollection.find({
            status: 'failed',
            retryCount: { $gte: 3 }
        }).toArray();

        console.log(`   Encontrados ${failedLeads.length} leads failed con retryCount >= 3`);

        let recoverable = 0;
        for (const lead of failedLeads) {
            const hasMessages = await messagesCollection.findOne({
                $or: [
                    { leadId: lead._id.toString() },
                    { phone: lead.phone }
                ]
            });

            if (!hasMessages && lead.phone) {
                recoverable++;
            }
        }

        console.log(`   De estos, ${recoverable} NO tienen mensajes enviados (quemados por SESSION_DEAD)`);

        if (recoverable > 0) {
            console.log('\n🔄 Restaurando leads quemados sin mensajes...');

            let restored = 0;
            for (const lead of failedLeads) {
                const hasMessages = await messagesCollection.findOne({
                    $or: [
                        { leadId: lead._id.toString() },
                        { phone: lead.phone }
                    ]
                });

                if (!hasMessages && lead.phone) {
                    await leadsCollection.updateOne(
                        { _id: lead._id },
                        {
                            $set: { status: 'pending', retryCount: 0 },
                            $unset: { notes: '' }
                        }
                    );
                    restored++;
                }
            }

            console.log(`✅ Restaurados ${restored} leads a 'pending'`);
        }
    } else {
        // Restaurar los leads identificados por SESSION_DEAD en notes
        console.log('\n🔄 Restaurando leads quemados por SESSION_DEAD...');

        const result = await leadsCollection.updateMany(
            sessionDeadQuery,
            {
                $set: { status: 'pending', retryCount: 0 },
                $unset: { notes: '' }
            }
        );

        console.log(`✅ Restaurados ${result.modifiedCount} leads a 'pending'`);
    }

    // 2. También resetear retryCount en leads que están pending pero tienen retryCount alto
    // (fueron devueltos a la cola pero con retryCount inflado)
    const inflatedRetry = await leadsCollection.updateMany(
        {
            status: 'pending',
            retryCount: { $gte: 1 }
        },
        {
            $set: { retryCount: 0 }
        }
    );

    console.log(`\n🔧 Reseteados ${inflatedRetry.modifiedCount} leads con retryCount inflado`);

    // 3. Mostrar estado final
    const pending = await leadsCollection.countDocuments({ status: 'pending' });
    const contacted = await leadsCollection.countDocuments({ status: 'contacted' });
    const failed = await leadsCollection.countDocuments({ status: 'failed' });
    const discarded = await leadsCollection.countDocuments({ status: 'discarded' });
    const total = await leadsCollection.countDocuments();

    console.log('\n📊 ESTADO FINAL:');
    console.log(`   Pending:    ${pending}`);
    console.log(`   Contacted:  ${contacted}`);
    console.log(`   Failed:     ${failed}`);
    console.log(`   Discarded:  ${discarded}`);
    console.log(`   Total:      ${total}`);

    await mongoose.disconnect();
    console.log('\n✅ Listo! Los leads fueron restaurados.');
}

recoverLeads().catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
});
