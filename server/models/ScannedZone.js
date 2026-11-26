const mongoose = require('mongoose');

const ScannedZoneSchema = new mongoose.Schema({
  zoneId: { type: String, required: true, trim: true, lowercase: true }, // ej: 'caba_palermo_soho', 'cba_nueva_cordoba'
  zoneName: { type: String, required: true, trim: true }, // ej: 'Palermo Soho (CABA)'
  city: { type: String, default: 'custom', trim: true }, // ej: 'caba', 'cordoba', 'neuquen', 'custom'
  province: { type: String, default: '', trim: true }, // ej: 'CABA', 'Buenos Aires (GBA Sur)', 'Córdoba', 'Neuquén'
  keyword: { type: String, required: true, trim: true, lowercase: true }, // ej: 'odontologia', 'distribuidoras'
  keywordLabel: { type: String, default: '', trim: true }, // ej: 'Consultorios y Clínicas Odontológicas'
  searchQuery: { type: String, default: '', trim: true }, // ej: 'odontología en Palermo'
  googleMapsUrl: { type: String, default: '', trim: true },
  center: {
    lat: { type: Number, default: null },
    lng: { type: Number, default: null }
  },
  radiusKm: { type: Number, default: 2.0 },
  zoom: { type: Number, default: 15 },
  status: { type: String, enum: ['pending', 'in_progress', 'completed'], default: 'completed' },
  scannedAt: { type: Date, default: Date.now },
  lastScannedAt: { type: Date, default: Date.now },
  scanCount: { type: Number, default: 1 },
  scrapeDirection: { type: String, enum: ['bottom-up', 'top-down'], default: 'bottom-up' },
  totalLeadsFound: { type: Number, default: 0 },
  validLeadsIngested: { type: Number, default: 0 },
  discardedLeads: { type: Number, default: 0 },
  duplicatesSkipped: { type: Number, default: 0 },
  notes: { type: String, default: '' },
  source: { type: String, default: 'extension' } // 'extension_auto' | 'extension_manual' | 'crm_manual' | 'ingest_auto'
}, {
  timestamps: true
});

// Índice compuesto para no repetir el mismo rubro en la misma zona
ScannedZoneSchema.index({ zoneId: 1, keyword: 1 }, { unique: true });
ScannedZoneSchema.index({ lastScannedAt: -1 });
ScannedZoneSchema.index({ scannedAt: -1 });
ScannedZoneSchema.index({ city: 1 });

module.exports = mongoose.model('ScannedZone', ScannedZoneSchema);
