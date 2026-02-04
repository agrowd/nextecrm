/**
 * Script to update schedule endTime from 18:00 to 21:00 in MongoDB
 * Run with: node update-end-time.js
 */
require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gmaps-leads';

async function updateEndTime() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Update the config directly
        const result = await mongoose.connection.db.collection('configs').updateOne(
            { key: 'global_bot_settings' },
            { $set: { 'settings.schedule.endTime': '21:00' } }
        );

        if (result.matchedCount > 0) {
            console.log('✅ Successfully updated endTime to 21:00');
            console.log(`   Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`);
        } else {
            console.log('⚠️ No config document found with key "global_bot_settings"');
        }

        // Verify the update
        const config = await mongoose.connection.db.collection('configs').findOne({ key: 'global_bot_settings' });
        if (config && config.settings && config.settings.schedule) {
            console.log(`\n📋 Current schedule config:`);
            console.log(`   startTime: ${config.settings.schedule.startTime}`);
            console.log(`   endTime: ${config.settings.schedule.endTime}`);
            console.log(`   enabled: ${config.settings.schedule.enabled}`);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

updateEndTime();
