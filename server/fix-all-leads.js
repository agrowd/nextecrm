const mongoose = require('mongoose');
const path = require('path');
const envPath = path.resolve(__dirname, '.env');
console.log('Loading .env from:', envPath);
require('dotenv').config({ path: envPath });

function cleanAndFormatArgentinianNumber(raw) {
    if (!raw) return { valid: false, error: 'Empty' };
    let num = raw.replace(/[^0-9]/g, '');

    // Already perfect check
    if (num.startsWith('549') && num.length === 13) {
        return { valid: true, formatted: num, method: 'kept_existing_valid' };
    }

    // Fix logic
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

async function fixAll() {
    try {
        let uri = process.env.MONGODB_URI;
        if (!uri) {
            console.warn('⚠️ MONGODB_URI not found in .env, falling back to local docker default');
            uri = 'mongodb://mongo:27017/gmaps-leads-scraper';
        }
        console.log('ℹ️ URI:', uri.includes('@') ? '*** HIDDEN ATLAS CREDENTIALS ***' : uri);

        console.log('🔍 Connecting to:', uri);
        await mongoose.connect(uri);

        console.log('🩺 Scanning ALL leads for optimizations...');
        // Query ALL leads (filter empty phones)
        const cursor = Lead.find({ phone: { $ne: '' } }).cursor();

        let processed = 0, fixed = 0;
        const bulkOps = [];

        process.stdout.write('Processing: ');

        // Initialize local cache for this run
        const seenCache = new Set();

        for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
            processed++;
            const result = cleanAndFormatArgentinianNumber(doc.phone);

            if (result.valid) {
                const currentNumeric = doc.phone.replace(/[^0-9]/g, '');

                if (currentNumeric !== result.formatted) {

                    // 1. LOCAL CACHE CHECK within this run
                    const uniqueKey = `${doc.name}_${result.formatted}`;
                    if (seenCache.has(uniqueKey)) {
                        fixed++;
                        console.log(`\n🗑️ [In-Memory] DUPLICATE: "${doc.name}" -> ${result.formatted}. Deleting.`);
                        bulkOps.push({ deleteOne: { filter: { _id: doc._id } } });
                        // Don't add to seenCache again
                    } else {
                        // 2. DB CHECK
                        const distinctDupe = await Lead.findOne({
                            name: doc.name,
                            phone: result.formatted,
                            _id: { $ne: doc._id }
                        });

                        if (distinctDupe) {
                            fixed++;
                            console.log(`\n🗑️ [DB] DUPLICATE FOUND: "${doc.name}". Deleting old entry.`);
                            bulkOps.push({ deleteOne: { filter: { _id: doc._id } } });
                        } else {
                            // 3. Mark for UPDATE
                            fixed++;
                            if (fixed <= 50) console.log(`\n✨ FIXING: ${doc.phone} -> ${result.formatted}`);

                            bulkOps.push({
                                updateOne: {
                                    filter: { _id: doc._id },
                                    update: {
                                        $set: {
                                            phone: result.formatted,
                                            ...(['failed', 'check_failed', 'no_whatsapp', 'paused', 'contacted'].includes(doc.status) || doc.phoneInvalid ? { status: 'pending', phoneInvalid: false, validationError: '' } : {})
                                        }
                                    }
                                }
                            });
                            // Add to cache so next one (if any) gets deleted
                            seenCache.add(uniqueKey);
                        }
                    }
                }
            }

            if (bulkOps.length >= 500) {
                try {
                    await Lead.bulkWrite(bulkOps, { ordered: false });
                } catch (e) {
                    if (e.code === 11000) {
                        console.log('   ⚠️ Batch had duplicates (E11000). Ignored safely.');
                    } else {
                        console.error('   ❌ Batch Error:', e.message);
                    }
                }
                bulkOps.length = 0;
                process.stdout.write('.');
            }
        }

        if (bulkOps.length > 0) {
            try {
                await Lead.bulkWrite(bulkOps, { ordered: false });
            } catch (e) {
                if (e.code === 11000) console.log('   ⚠️ Final Batch had duplicates (E11000). Ignored.');
                else console.error('   ❌ Final Batch Error:', e.message);
            }
        }

        console.log(`\n\n📈 RESULTS:`);
        console.log(`   - Scanned: ${processed}`);
        console.log(`   - Fixed: ${fixed}`);

        await mongoose.disconnect();
        console.log('👋 Done.');
    } catch (e) { console.error(e); }
}

fixAll();
