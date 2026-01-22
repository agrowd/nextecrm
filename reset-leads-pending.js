const axios = require('axios');

async function resetLeadsToPending() {
  try {
    console.log('🔄 Reseteando todos los leads a "pending"...');
    
    const response = await axios.post('http://localhost:3001/leads/reset-status');
    
    if (response.data.success) {
      console.log(`✅ ${response.data.message}`);
      console.log('📊 Estadísticas actualizadas:', response.data.stats);
    } else {
      console.log('❌ Error:', response.data.message);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

resetLeadsToPending(); 