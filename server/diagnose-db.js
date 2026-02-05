const mongoose = require('mongoose');
const path = require('path');
const envPath = path.resolve(__dirname, '../bot/.env');
require('dotenv').config({ path: envPath });

// Validator function
function cleanAndFormatArgentinianNumber(raw) {
    if (!raw) return { valid: false, error: 'Empty' };
    let num = raw.replace(/[^0-9]/g, '');

    // Check if it already has double prefix (e.g. 549549...)
    // If it starts with 549 and length is > 13, it might be double prefixed
    // Standard Arg number: 549 (3 chars) + Area (2-4) + Num (6-8). Total 13.
    // If we have 15 or 16 chars, it's likely wrong.

    // Logic from update-validator.js
    if (num.startsWith('549') && num.length === 13) {
        return { valid: true, formatted: num, method: 'valid_perfect' };
    }

    // Try to fix
    let original = num;
    if (num.startsWith('549')) num = num.slice(3);
    else if (num.startsWith('54')) num = num.slice(2);
    if (num.startsWith('0')) num = num.slice(1);

    let code = '', rest = '';
    if (num.startsWith('11')) { code = '11'; rest = num.slice(2); }
    else { code = num.slice(0, 3); rest = num.slice(3); if (code.length < 3 || rest.length < 6) { code = num.slice(0, 4); rest = num.slice(4); } }
    if (rest.startsWith('15')) rest = rest.slice(2);
    const final = `549${code}${rest}`;

    if (final.length < 12 || final.length > 14) {
        return { valid: false, formatted: final, error: 'length_error', isFixable: false };
    }

    // If the FIXED version is different from ORIGINAL, then it was "wrong" (or unoptimized)
    // But we need to compare against input 'raw' stripped of non-digits?
    // If raw was "5491122334455" (valid) -> fix returns "5491122334455". Equal.
    // If raw was "1122334455" -> fix returns "5491122334455". Fixed.

    // The user cares about "Invalid Numbers" that are REJECTED.
    // If our NEW validator accepts it, but the OLD one rejected it, we want to know.
    // We can't know what the old one did easily, but we can verify if the current phone in DB is valid per NEW rules.

    return { valid: true, formatted: final, isFixable: true };
}

const LeadSchema = new mongoose.Schema({}, { strict: false });
const Lead = mongoose.model('Lead', LeadSchema);

async function diagnose() {
    try {
        let uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/gmaps-leads-scraper';
        // if (uri.includes('mongodb://mongo:')) uri = uri.replace('mongodb://mongo:', 'mongodb://localhost:');
        console.log('ℹ️ Running in Docker Mode (keeping mongo: host)');

        console.log('🔍 Connecting to:', uri);
        await mongoose.connect(uri);

        const total = await Lead.countDocuments({});
        console.log(`📊 Total Leads: ${total}\n`);

        // 1. Status Distribution
        const stats = await Lead.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
        console.log('📈 Status Distribution:');
        stats.forEach(s => console.log(`   - ${s._id}: ${s.count}`));
        console.log('');

        // 2. Scan for Fixable Phones in ALL leads
        console.log('🩺 Scanning ALL phones for format issues...');
        const cursor = Lead.find({}).cursor();

        let fixable = 0;
        let trulyInvalid = 0;
        let suspiciouslyLong = 0; // Double prefix candidates
        let anomalies = 0;

        for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
            // Check Phone
            const res = cleanAndFormatArgentinianNumber(doc.phone);

            if (!res.valid) {
                trulyInvalid++;
                if (trulyInvalid <= 5) console.log(`   ❌ TRULY INVALID: ${doc.phone} (Status: ${doc.status})`);
            } else {
                // It is valid per NEW logic.
                // Check if current DB value is different (meaning it's unformatted or has excess chars)
                const currentNumeric = doc.phone.replace(/[^0-9]/g, '');
                if (currentNumeric !== res.formatted) {
                    // This means we CAN improve/fix it.
                    // Is it a "Double Prefix" case?
                    if (currentNumeric.startsWith('549549')) {
                        console.log(`   ⚠️ DOUBLE PREFIX FOUND: ${doc.phone} -> ${res.formatted} (Status: ${doc.status})`);
                        suspiciouslyLong++;
                    }
                    fixable++;
                }
            }

            // Check Anomalies
            // Contacted but 0 messages
            if (doc.status === 'contacted' && (!doc.messagesSent || doc.messagesSent === 0)) {
                anomalies++;
                // console.log(`   ⚠️ GHOST CONTACT: ${doc.phone} (Contacted vs 0 msgs)`);
            }
        }

        console.log('\n🏥 DIAGNOSIS RESULTS:');
        console.log(`   - Leads with Invalid/Unrepairable Numbers: ${trulyInvalid}`);
        console.log(`   - Leads with Fixable Format: ${fixable} (Includes unformatted or bad prefixes)`);
        console.log(`   - Leads with Double Prefix (Definite Bug): ${suspiciouslyLong}`);
        console.log(`   - Ghost Leads (Contacted but 0 msgs): ${anomalies}`);

        if (suspiciouslyLong > 0 || fixable > 0) {
            console.log('\n💡 RECOMMENDATION: Run recovery script modified to update ALL fixable leads, not just failed ones.');
        } else {
            console.log('\n✅ DB looks healthy. No widespread phone format issues detected.');
        }

        await mongoose.disconnect();
    } catch (e) { console.error(e); }
}

diagnose();
