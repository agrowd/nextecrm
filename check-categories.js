const mongoose = require('mongoose');
const Lead = require('./server/models/Lead');

async function checkCategories() {
  try {
    await mongoose.connect('mongodb://localhost:27017/gmaps-leads-scraper');
    console.log('✅ Conectado a MongoDB');
    
    // Obtener categorías/keywords
    const categories = await Lead.aggregate([
      { $group: { _id: '$keyword', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    console.log('\n📊 CATEGORÍAS Y RUBROS BUSCADOS:');
    console.log('='.repeat(50));
    categories.forEach(cat => {
      console.log(`${cat._id || 'Sin categoría'}: ${cat.count} leads`);
    });
    
    // Obtener ubicaciones
    const locations = await Lead.aggregate([
      { $group: { _id: '$location', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    console.log('\n📍 UBICACIONES BUSCADAS:');
    console.log('='.repeat(50));
    locations.forEach(loc => {
      console.log(`${loc._id || 'Sin ubicación'}: ${loc.count} leads`);
    });
    
    // Obtener total de leads
    const totalLeads = await Lead.countDocuments();
    console.log(`\n📈 TOTAL DE LEADS: ${totalLeads}`);
    
    await mongoose.connection.close();
    console.log('\n✅ Consulta completada');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkCategories(); 