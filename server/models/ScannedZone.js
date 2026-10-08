const mongoose = require('mongoose');

const ScannedZoneSchema = new mongoose.Schema({
  zoneId: { type: String, required: true, trim: true }, // ej: 'caba_palermo', 'cordoba_nueva_cordoba'
  zoneName: { type: String, required: true, trim: true }, // ej: 'CABA - Palermo'
  city: { type: String, required: true, trim: true }, // ej: 'CABA', 'GBA Norte', 'Córdoba'
  keyword: { type: String, required: true, trim: true }, // ej: 'odontologia', 'veterinarias'
  keywordLabel: { type: String, default: '', trim: true }, // ej: 'Clínicas Odontológicas'
  center: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  radiusKm: { type: Number, default: 2.0 },
  zoom: { type: Number, default: 15 },
  status: { type: String, enum: ['pending', 'in_progress', 'completed'], default: 'completed' },
  scannedAt: { type: Date, default: Date.now },
  totalLeadsFound: { type: Number, default: 0 },
  validLeadsIngested: { type: Number, default: 0 },
  discardedLeads: { type: Number, default: 0 },
  notes: { type: String, default: '' },
  source: { type: String, default: 'extension' }
}, {
  timestamps: true
});

// Índice compuesto para no repetir el mismo rubro en la misma zona
ScannedZoneSchema.index({ zoneId: 1, keyword: 1 }, { unique: true });
ScannedZoneSchema.index({ scannedAt: -1 });
ScannedZoneSchema.index({ city: 1 });

module.exports = mongoose.model('ScannedZone', ScannedZoneSchema);
