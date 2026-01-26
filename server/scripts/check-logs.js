const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Log = require('../models/Log');

async function checkErrors() {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/gmaps-leads-scraper';
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB');

        console.log('\n❌ RECENT ERROR LOGS (Last 50):');
        const errors = await Log.find({ level: 'error' })
            .sort({ timestamp: -1 })
            .limit(50)
            .lean();

        if (errors.length === 0) {
            console.log('No recent error logs found.');
        } else {
            errors.forEach(err => {
                console.log(`[${err.timestamp.toISOString()}] [${err.component}] [${err.instanceId || 'N/A'}]: ${err.message}`);
                if (err.details) console.log(`   Details: ${JSON.stringify(err.details)}`);
            });
        }

        console.log('\n⚠️ RECENT WARNING LOGS (Last 20):');
        const warnings = await Log.find({ level: 'warn' })
            .sort({ timestamp: -1 })
            .limit(20)
            .lean();

        if (warnings.length === 0) {
            console.log('No recent warning logs found.');
        } else {
            warnings.forEach(w => {
                console.log(`[${w.timestamp.toISOString()}] [${w.component}]: ${w.message}`);
            });
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkErrors();
