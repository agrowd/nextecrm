const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: false },
  leadName: { type: String, required: false },
  phone: { type: String, required: true },
  messageNumber: { type: Number, required: false, default: 0 }, // 1, 2, 3, etc.
  content: { type: String, required: true },
  variation: { type: String, default: '' }, // variación usada
  type: {
    type: String,
    default: 'text',
    enum: ['oferta_servicio', 'respuesta_automatica', 'mensaje_manual', 'verificacion', 'text', 'image', 'audio', 'video', 'document', 'system', 'chat', 'e2e_notification', 'ptt', 'call_log', 'unknown']
  },
  status: {
    type: String,
    default: 'sent',
    enum: ['sent', 'delivered', 'read', 'failed', 'pending']
  },
  sentAt: { type: Date, default: Date.now },
  deliveredAt: { type: Date, default: null },
  readAt: { type: Date, default: null },
  error: { type: String, default: '' },
  delay: { type: Number, default: 0 }, // delay antes de este mensaje en ms
  typingTime: { type: Number, default: 0 }, // tiempo de escritura simulada
  whatsappMessageId: { type: String, default: '' }, // ID del mensaje en WhatsApp
  botInstance: { type: String, default: 'main' }, // instancia del bot que envió
  instanceId: { type: String, default: '' }, // ID único de la instancia (ej: bot_abc123)
  sentFromNumber: { type: String, default: '' }, // Número de WhatsApp que envió (para multi-bot)
  sessionId: { type: String, default: '' }, // sesión de WhatsApp
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} } // datos adicionales
}, {
  timestamps: true
});

// Índices para optimizar consultas
MessageSchema.index({ leadId: 1, messageNumber: 1 });
MessageSchema.index({ status: 1, sentAt: 1 });
MessageSchema.index({ phone: 1, sentAt: 1 });
MessageSchema.index({ type: 1, sentAt: 1 });
MessageSchema.index({ sentFromNumber: 1, sentAt: -1 }); // 🔑 MULTI-BOT: Filtrar por número que envió
MessageSchema.index({ instanceId: 1, sentAt: -1 }); // 🔑 MULTI-BOT: Filtrar por instancia

// Método estático para obtener estadísticas de mensajes
MessageSchema.statics.getMessageStats = function () {
  return this.aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        sent: { $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] } },
        delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
        read: { $sum: { $cond: [{ $eq: ['$status', 'read'] }, 1, 0] } },
        failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
        today: {
          $sum: {
            $cond: [
              {
                $gte: [
                  '$sentAt',
                  new Date(new Date().setHours(0, 0, 0, 0))
                ]
              },
              1,
              0
            ]
          }
        },
        avgDelay: { $avg: '$delay' },
        avgTypingTime: { $avg: '$typingTime' }
      }
    },
    {
      $project: {
        _id: 0,
        total: 1,
        sent: 1,
        delivered: 1,
        read: 1,
        failed: 1,
        today: 1,
        avgDelay: 1,
        avgTypingTime: 1
      }
    }
  ]);
};

// Método para obtener mensajes por lead
MessageSchema.statics.getMessagesByLead = function (leadId) {
  return this.find({ leadId }).sort({ messageNumber: 1 });
};

// Método para actualizar estado de mensaje
MessageSchema.statics.updateMessageStatus = function (messageId, status, timestamp = new Date()) {
  const update = { status };

  switch (status) {
    case 'delivered':
      update.deliveredAt = timestamp;
      break;
    case 'read':
      update.readAt = timestamp;
      break;
    case 'failed':
      update.error = 'Message failed to deliver';
      break;
  }

  return this.findByIdAndUpdate(messageId, update, { new: true });
};

module.exports = mongoose.model('Message', MessageSchema); 