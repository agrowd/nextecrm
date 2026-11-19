const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now, expires: 86400 }, // Auto-purge logs older than 24h (TTL index) to protect MongoDB Atlas 512MB quota
  level: { type: String, enum: ['info', 'warn', 'error', 'success', 'system'], default: 'info' },
  component: { type: String, enum: ['scraper', 'backend', 'bot', 'crm', 'server'], required: true },
  instanceId: { type: String, default: 'server' },
  message: { type: String, required: true },
  details: { type: mongoose.Schema.Types.Mixed, default: null },
  leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', default: null },
  userId: { type: String, default: 'system' }
});

module.exports = mongoose.model('Log', logSchema); 