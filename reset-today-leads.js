const axios = require('axios');

async function resetTodayLeads() {
  try {
    console.log('🔄 Reseteando leads scrapeados hoy...');
    
    // Obtener fecha de hoy (inicio del día)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    console.log(`📅 Fecha de hoy: ${today.toISOString()}`);
    
    // Hacer PUT request para resetear leads de hoy
    const response = await axios.put('http://localhost:3001/leads/reset-today', {
      date: today.toISOString()
    });
    
    if (response.data.success) {
      console.log(`✅ ${response.data.modifiedCount} leads reseteados a "pending"`);
      console.log('📊 Estadísticas actualizadas:', response.data.stats);
    } else {
      console.log('❌ Error:', response.data.message);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

resetTodayLeads(); 