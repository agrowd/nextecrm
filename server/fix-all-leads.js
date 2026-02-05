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

        for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
            processed++;
            const result = cleanAndFormatArgentinianNumber(doc.phone);

            if (result.valid) {
                // Check if different
                const currentNumeric = doc.phone.replace(/[^0-9]/g, '');

                // If the formatted result is different from what we have (and what we have isn't just the same with symbols)
                // Actually, if we just compare result.formatted (pure number) with currentNumeric
                // If different, we update.

                if (currentNumeric !== result.formatted) {
                    fixed++;
                    if (fixed <= 5) console.log(`\n✨ FIXING: ${doc.phone} -> ${result.formatted} (Status: ${doc.status})`);

                    bulkOps.push({
                        updateOne: {
                            filter: { _id: doc._id },
                            update: {
                                $set: {
                                    phone: result.formatted,
                                    // Only reset status if it was failed/invalid? 
                                    // User said "todos los que estan mal".
                                    // If status is 'contacted' but number was ugly, we update phone but keep status?
                                    // But if number was wrong, maybe we couldn't contact them properly?
                                    // Safer: Update phone. If status was specific error, reset to pending.
                                    // If status was pending/processing/queued, keep (or reset to pending to be safe).
                                    // If status was contacted/interested, KEEP status (don't spam again).

                                    // Logic:
                                    // If status in [failed, check_failed, no_whatsapp, invalid], set to pending.
                                    // Else, just update phone.
                                    ...(['failed', 'check_failed', 'no_whatsapp', 'paused'].includes(doc.status) || doc.phoneInvalid ? { status: 'pending', phoneInvalid: false, validationError: '' } : {})
                                }
                            }
                        }
                    });
                }
            }

            if (bulkOps.length >= 500) {
                await Lead.bulkWrite(bulkOps);
                bulkOps.length = 0;
                process.stdout.write('.');
            }
        }

        if (bulkOps.length > 0) await Lead.bulkWrite(bulkOps);

        console.log(`\n\n📈 RESULTS:`);
        console.log(`   - Scanned: ${processed}`);
        console.log(`   - Fixed: ${fixed}`);

        await mongoose.disconnect();
        console.log('👋 Done.');
    } catch (e) { console.error(e); }
}

fixAll();
