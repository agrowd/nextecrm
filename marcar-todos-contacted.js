const axios = require('axios');

async function marcarTodosContacted() {
  try {
    console.log('🔄 Marcando todos los leads como "contacted"...');
    
    const response = await axios.put('http://localhost:3001/leads/mark-all-contacted');
    
    if (response.data.success) {
      console.log(`✅ ${response.data.modifiedCount} leads marcados como "contacted"`);
      console.log('📊 Estadísticas actualizadas:', response.data.stats);
    } else {
      console.log('❌ Error:', response.data.message);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

marcarTodosContacted(); 