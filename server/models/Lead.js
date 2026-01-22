const mongoose = require('mongoose');

const LeadSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, default: '', trim: true },
  address: { type: String, default: '', trim: true },
  website: { type: String, default: '', trim: true },
  hasWebsite: { type: Boolean, default: false },
  mapsUrl: { type: String, default: '', trim: true },
  lat: { type: Number, default: null },
  lng: { type: Number, default: null },
  category: { type: String, default: '', trim: true },
  rating: { type: Number, default: null },
  reviewCount: { type: Number, default: null },
  keyword: { type: String, default: '', trim: true },
  location: { type: String, default: '', trim: true },
  ip: { type: String, default: '', trim: true },
  ua: { type: String, default: '', trim: true },
  status: { type: String, default: 'pending', enum: ['pending', 'queued', 'contacted', 'interested', 'not_interested', 'completed'] },
  lastContactAt: { type: Date, default: null },
  nextActionAt: { type: Date, default: null },
  // Nuevos campos para tracking
  phoneValidated: { type: Boolean, default: false },
  whatsappRegistered: { type: Boolean, default: false },
  validationError: { type: String, default: '' },
  messagesSent: { type: Number, default: 0 },
  messagesDelivered: { type: Number, default: 0 },
  messagesRead: { type: Number, default: 0 },
  lastMessageAt: { type: Date, default: null },
  totalMessageTime: { type: Number, default: 0 }, // tiempo total en segundos
  averageDelay: { type: Number, default: 0 }, // delay promedio entre mensajes
  messageVariations: { type: [String], default: [] }, // variaciones usadas
  source: { type: String, default: 'extension' }, // extension, manual, api
  processedBy: { type: String, default: '' }, // bot, manual, etc
  notes: { type: String, default: '' },
  whatsappResponse: { type: String, default: '' }, // respuesta recibida de WhatsApp
  // Campos adicionales para categorización
  websiteValid: { type: Boolean, default: false },
  phoneBounced: { type: Boolean, default: false },
  phoneInvalid: { type: Boolean, default: false },
  inQueue: { type: Boolean, default: false },
  queuePosition: { type: Number, default: null },
  lastScrapedAt: { type: Date, default: null },
  scrapedCount: { type: Number, default: 0 }, // veces que se ha scraped
  duplicateOf: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', default: null }, // si es duplicado de otro
  isDuplicate: { type: Boolean, default: false },
  originalLead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', default: null }, // lead original si es duplicado
  // 🔑 MULTI-BOT: Tracking de asignación y contacto
  assignedToInstance: { type: String, default: '' }, // instancia asignada para contactar
  contactedByNumber: { type: String, default: '' }, // número de WhatsApp que lo contactó
  contactedByInstance: { type: String, default: '' } // instanceId del bot que lo contactó
}, {
  timestamps: true,
  strict: false // Permite campos adicionales
});

// Índices para optimizar consultas
LeadSchema.index({ name: 1, phone: 1 }, { unique: true });
LeadSchema.index({ hasWebsite: 1, status: 1 });
LeadSchema.index({ status: 1, createdAt: 1 });

// Método estático para obtener el siguiente lead disponible
// Método estático para obtener el siguiente lead disponible (ATÓMICO para evitar duplicados)
LeadSchema.statics.getNextLead = function (instanceId) {
  // Solo tomar leads que NO estén asignados o que estén pendientes
  return this.findOneAndUpdate(
    {
      status: 'pending', // Solo tomar pending, NO queued (para evitar robar leads en proceso)
      $or: [
        { assignedToInstance: { $exists: false } },
        { assignedToInstance: '' },
        { assignedToInstance: null }
      ]
    },
    {
      status: 'queued',
      nextActionAt: new Date(),
      assignedToInstance: instanceId, // 🔒 LOCK: Asignado exclusivamente a este bot
      lastContactAt: new Date()
    },
    {
      sort: { createdAt: 1 },
      new: true
    }
  );
};

// Método estático para obtener estadísticas
LeadSchema.statics.getStats = function () {
  return this.aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        withoutWebsite: {
          $sum: { $cond: [{ $eq: ['$hasWebsite', false] }, 1, 0] }
        },
        withWebsite: {
          $sum: { $cond: [{ $eq: ['$hasWebsite', true] }, 1, 0] }
        },
        byStatus: {
          $push: {
            status: '$status',
            count: 1
          }
        },
        today: {
          $sum: {
            $cond: [
              {
                $gte: [
                  '$createdAt',
                  new Date(new Date().setHours(0, 0, 0, 0))
                ]
              },
              1,
              0
            ]
          }
        }
      }
    },
    {
      $project: {
        _id: 0,
        total: 1,
        withoutWebsite: 1,
        withWebsite: 1,
        today: 1,
        byStatus: 1
      }
    }
  ]);
};

// Método para limpiar leads duplicados
LeadSchema.statics.cleanDuplicates = function () {
  return this.aggregate([
    {
      $group: {
        _id: { name: '$name', phone: '$phone' },
        docs: { $push: '$$ROOT' },
        count: { $sum: 1 }
      }
    },
    {
      $match: {
        count: { $gt: 1 }
      }
    }
  ]);
};

module.exports = mongoose.model('Lead', LeadSchema); 