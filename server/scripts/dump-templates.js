const fs = require('fs');
require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://rascapp:Federyco18@neste.kk5zwkb.mongodb.net/gmaps-leads-scraper?appName=Neste';

const TemplateVariantSchema = new mongoose.Schema({
    category: { type: String, required: true, unique: true },
    variants: [{
        content: { type: String, required: true },
        isActive: { type: Boolean, default: true }
    }]
}, { timestamps: true });

const TemplateVariant = mongoose.model('TemplateVariant', TemplateVariantSchema);

async function dump() {
    await mongoose.connect(MONGODB_URI);
    const all = await TemplateVariant.find();
    let out = '';
    for (const doc of all) {
        out += `\n\n=== CATEGORY: ${doc.category} ===\n`;
        for (const v of doc.variants) {
            out += "---\n";
            out += v.content + "\n";
        }
    }
    fs.writeFileSync('dump.txt', out);
    process.exit(0);
}

dump();
