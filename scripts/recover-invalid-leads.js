const mongoose = require('mongoose');
const path = require('path');
// Ajustar path del .env usando path relativo seguro
const envPath = path.resolve(__dirname, '../bot/.env');
console.log('Loading .env from:', envPath);
require('dotenv').config({ path: envPath });

// ... rest of script ...
// I will rewrite the file to be safe about paths and assume running from 'server' context or root if deps exist
function cleanAndFormatArgentinianNumber(raw) {
    if (!raw) return { valid: false, error: 'Empty' };
    let num = raw.replace(/[^0-9]/g, '');
    if (num.startsWith('549') && num.length === 13) return { valid: true, formatted: num, method: 'kept_existing_valid' };
    if (num.startsWith('549')) num = num.slice(3);
    else if (num.startsWith('54')) num = num.slice(2);
    if (num.startsWith('0')) num = num.slice(1);
    let code = '', rest = '';
    if (num.startsWith('11')) { code = '11'; rest = num.slice(2); }
    else { code = num.slice(0, 3); rest = num.slice(3); if (code.length < 3 || rest.length < 6) { code = num.slice(0, 4); rest = num.slice(4); } }
    if (rest.startsWith('15')) rest = rest.slice(2);
    const final = `549${code}${rest}`;
    if (final.length < 12 || final.length > 14) return { valid: false, formatted: final, error: 'length_error' };
    return { valid: true, formatted: final, method: 'repaired' };
}

const LeadSchema = new mongoose.Schema({}, { strict: false });
const Lead = mongoose.model('Lead', LeadSchema);

async function recoverLeads() {
    try {
        console.log('🔍 Connecting to MongoDB:', process.env.MONGODB_URI || 'Undefined URI');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected.');

        const query = {
            $or: [
                { status: { $in: ['failed', 'check_failed', 'no_whatsapp', 'paused'] } },
                { phoneInvalid: true },
                { validationError: { $ne: '' } }
            ]
        };

        const totalLeads = await Lead.countDocuments(query);
        console.log(`📊 Found ${totalLeads} potentially invalid leads.`);

        if (totalLeads === 0) {
            console.log('👋 No leads to recover.');
            await mongoose.disconnect();
            return;
        }

        const cursor = Lead.find(query).cursor();
        let processed = 0, recovered = 0, stillInvalid = 0;
        const bulkOps = [];

        for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
            processed++;
            const result = cleanAndFormatArgentinianNumber(doc.phone);
            if (result.valid) {
                recovered++;
                if (recovered <= 5) console.log(`✨ RECOVERED: ${doc.phone} -> ${result.formatted}`);
                bulkOps.push({ updateOne: { filter: { _id: doc._id }, update: { $set: { phone: result.formatted, status: 'pending', phoneInvalid: false, validationError: '', params: { recovered: true } } } } });
            } else {
                stillInvalid++;
            }
            if (bulkOps.length >= 500) { await Lead.bulkWrite(bulkOps); bulkOps.length = 0; process.stdout.write('.'); }
        }
        if (bulkOps.length > 0) await Lead.bulkWrite(bulkOps);

        console.log(`\n\n📈 RESULTS: Scanned: ${processed}, Recovered: ${recovered}, Still Invalid: ${stillInvalid}`);
        await mongoose.disconnect();
    } catch (e) {
        console.error('CRASH:', e);
    }
}
recoverLeads();
