const mongoose = require('mongoose');

const TemplateVariantSchema = new mongoose.Schema({
    category: { type: String, required: true, unique: true }, // e.g., 'saludos', 'introsNegocio', 'hooksNoWeb', etc.
    variants: [{
        content: { type: String, required: true },
        isActive: { type: Boolean, default: true }
    }]
}, { timestamps: true });

module.exports = mongoose.model('TemplateVariant', TemplateVariantSchema);
