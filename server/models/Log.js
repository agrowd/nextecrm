const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  level: { type: String, enum: ['info', 'warn', 'error', 'success', 'system'], default: 'info' },
  component: { type: String, enum: ['scraper', 'backend', 'bot', 'crm', 'server'], required: true },
  instanceId: { type: String, default: 'server' },
  message: { type: String, required: true },
  details: { type: mongoose.Schema.Types.Mixed, default: null },
  leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', default: null },
  userId: { type: String, default: 'system' }
});

// Índices para consultas eficientes
logSchema.index({ timestamp: -1 });
logSchema.index({ component: 1, timestamp: -1 });
logSchema.index({ level: 1, timestamp: -1 });

module.exports = mongoose.model('Log', logSchema); 