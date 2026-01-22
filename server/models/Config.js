const mongoose = require('mongoose');

const ConfigSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true }, // e.g., 'global_bot_settings'
    settings: {
        delays: {
            min: { type: Number, default: 45 },
            max: { type: Number, default: 90 }
        },
        humanBehavior: {
            typingSpeed: { type: Number, default: 1 }, // multiplier
            readingSpeed: { type: Number, default: 1 }
        },
        ai: {
            model: { type: String, default: 'gemini-1.5-flash' },
            systemPrompt: { type: String, default: '' },
            enabled: { type: Boolean, default: true }
        },
        sequences: {
            maxMessagesPerDay: { type: Number, default: 200 },
            coolOffPeriod: { type: Number, default: 15 } // minutes
        }
    }
}, { timestamps: true });

module.exports = mongoose.model('Config', ConfigSchema);
