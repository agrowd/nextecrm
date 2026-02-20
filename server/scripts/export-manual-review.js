const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const Lead = require('../models/Lead');

// Conexión a MongoDB
const connectDB = async () => {
    try {
        const mongoUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017/gmaps_scraper';
        await mongoose.connect(mongoUrl);
        console.log('✅ Conectado a MongoDB');
    } catch (error) {
        console.error('❌ Error conectando a MongoDB:', error);
        process.exit(1);
    }
};

const exportManualReviewLeads = async () => {
    await connectDB();

    try {
        console.log('🔍 Buscando leads para revisión manual...');
        const leads = await Lead.find({ status: 'manual_review' }).lean();

        if (leads.length === 0) {
            console.log('✅ No hay leads pendientes de revisión manual.');
            process.exit(0);
        }

        console.log(`📋 Encontrados ${leads.length} leads.`);

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `manual_review_${timestamp}.json`;
        const outputPath = path.join(__dirname, '..', '..', filename); // Guardar en raíz del proyecto

        const dataToExport = leads.map(lead => ({
            name: lead.name,
            phone: lead.phone,
            businessName: lead.businessName || '',
            reason: lead.validationError || 'QuickVerify failed',
            status: lead.status,
            link: `https://wa.me/${lead.phone.replace(/\D/g, '')}`
        }));

        fs.writeFileSync(outputPath, JSON.stringify(dataToExport, null, 2));
        console.log(`💾 Exportado a: ${filename}`);

    } catch (error) {
        console.error('❌ Error exportando leads:', error);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
};

exportManualReviewLeads();
