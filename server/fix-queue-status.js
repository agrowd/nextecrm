const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../bot/.env') });

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/gmaps-leads-scraper';

const LeadSchema = new mongoose.Schema({}, { strict: false });
const MessageSchema = new mongoose.Schema({}, { strict: false });

const Lead = mongoose.model('Lead', LeadSchema);
const Message = mongoose.model('Message', MessageSchema);

async function fixQueueStatus() {
    try {
        console.log(`🔌 Conectando a MongoDB: ${mongoUri}...`);
        await mongoose.connect(mongoUri);
        console.log('✅ Conexión establecida.\n');

        console.log('📊 --- ESTADO INICIAL DE LEADS ---');
        const initialStats = await Lead.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
        initialStats.forEach(s => console.log(`   • ${s._id || 'null'}: ${s.count}`));

        // 1. Obtener todos los teléfonos / leadIds que tienen mensajes enviados registrados
        console.log('\n🔍 Analizando historial de mensajes enviados...');
        const sentMessages = await Message.find({ type: { $ne: 'inbound' } }).select('leadId phone').lean();
        const sentLeadIds = new Set();
        const sentPhones = new Set();

        sentMessages.forEach(m => {
            if (m.leadId) sentLeadIds.add(m.leadId.toString());
            if (m.phone) {
                const clean = m.phone.replace(/\D/g, '');
                if (clean) sentPhones.add(clean);
            }
        });

        console.log(`💬 Encontrados ${sentMessages.length} mensajes en total (${sentLeadIds.size} leads por ID, ${sentPhones.size} por teléfono).`);

        // 2. Corregir leads que TIENEN mensajes pero figuran como 'pending', 'queued' o 'processing'
        console.log('\n🛠️ Corrigiendo leads con mensajes enviados a status "contacted"...');
        const leadsWithMessages = await Lead.find({
            status: { $in: ['pending', 'queued', 'processing'] }
        }).lean();

        let updatedContactedCount = 0;
        for (const lead of leadsWithMessages) {
            const leadIdStr = lead._id.toString();
            const cleanPhone = (lead.phone || '').replace(/\D/g, '');

            if (sentLeadIds.has(leadIdStr) || (cleanPhone && sentPhones.has(cleanPhone))) {
                await Lead.updateOne({ _id: lead._id }, { $set: { status: 'contacted', lastContactAt: new Date() } });
                updatedContactedCount++;
            }
        }
        console.log(`✅ ${updatedContactedCount} leads fueron actualizados a "contacted" (ya se les había enviado mensaje).`);

        // 3. Resetear leads trabados en 'queued' o 'processing' sin mensajes a 'pending'
        console.log('\n🧹 Desbloqueando leads en "queued" o "processing" sin mensajes hacia "pending"...');
        const resetResult = await Lead.updateMany(
            {
                status: { $in: ['queued', 'processing'] },
                _id: { $nin: Array.from(sentLeadIds) }
            },
            {
                $set: {
                    status: 'pending',
                    assignedToInstance: '',
                    contactedByInstance: ''
                }
            }
        );
        console.log(`✅ ${resetResult.modifiedCount} leads reseteados a "pending".`);

        console.log('\n📊 --- ESTADO FINAL DE LEADS CORREGIDO ---');
        const finalStats = await Lead.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
        finalStats.forEach(s => console.log(`   • ${s._id || 'null'}: ${s.count}`));

        console.log('\n✨ Diagnóstico y limpieza completada exitosamente.');

    } catch (error) {
        console.error('❌ Error en script de corrección:', error.message);
    } finally {
        await mongoose.disconnect();
    }
}

fixQueueStatus();
