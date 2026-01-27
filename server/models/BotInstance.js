const mongoose = require('mongoose');

const BotInstanceSchema = new mongoose.Schema({
    instanceId: { type: String, required: true, unique: true },
    logoutCount: { type: Number, default: 0 },
    usedPhoneNumbers: [{ type: String }], // Unique WIDs used
    totalMessagesSent: { type: Number, default: 0 },
    lastSeenAt: { type: Date, default: Date.now },
    disconnectionLogs: [{
        reason: String,
        timestamp: { type: Date, default: Date.now }
    }]
}, { timestamps: true });

module.exports = mongoose.model('BotInstance', BotInstanceSchema);
