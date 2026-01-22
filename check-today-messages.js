const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function checkTodayMessages() {
  try {
    console.log('📊 Verificando mensajes enviados hoy...\n');
    
    // Obtener estadísticas de mensajes
    const response = await axios.get(`${BASE_URL}/messages/stats`);
    
    if (response.data.success) {
      const stats = response.data.stats;
      
      console.log('📈 ESTADÍSTICAS DE MENSAJES:');
      console.log('==============================');
      console.log(`📅 Hoy: ${stats.today || 0} mensajes`);
      console.log(`📅 Ayer: ${stats.yesterday || 0} mensajes`);
      console.log(`📅 Esta semana: ${stats.thisWeek || 0} mensajes`);
      console.log(`📅 Este mes: ${stats.thisMonth || 0} mensajes`);
      console.log(`📅 Total: ${stats.total || 0} mensajes`);
      
      // Obtener TODOS los mensajes de hoy (sin límite)
      const today = new Date().toISOString().split('T')[0];
      const messagesResponse = await axios.get(`${BASE_URL}/messages?date=${today}&limit=1000`);
      
      if (messagesResponse.data.success && messagesResponse.data.messages.length > 0) {
        console.log('\n📋 RESUMEN DE MENSAJES HOY:');
        console.log('==============================');
        
        const messages = messagesResponse.data.messages;
        const uniqueLeads = new Set();
        const leadCounts = {};
        
        messages.forEach((msg) => {
          uniqueLeads.add(msg.phone);
          if (!leadCounts[msg.phone]) {
            leadCounts[msg.phone] = {
              name: msg.leadName || 'Sin nombre',
              count: 0
            };
          }
          leadCounts[msg.phone].count++;
        });
        
        console.log(`\n📊 ESTADÍSTICAS DETALLADAS:`);
        console.log(`Total mensajes hoy: ${messages.length}`);
        console.log(`Negocios únicos contactados: ${uniqueLeads.size}`);
        console.log(`Promedio mensajes por negocio: ${(messages.length / uniqueLeads.size).toFixed(1)}`);
        
        console.log(`\n📋 NEGOCIOS CONTACTADOS HOY:`);
        console.log('==============================');
        
        // Ordenar por cantidad de mensajes
        const sortedLeads = Object.entries(leadCounts)
          .sort(([,a], [,b]) => b.count - a.count);
        
        sortedLeads.forEach(([phone, data], index) => {
          console.log(`${index + 1}. ${data.name} (${phone}) - ${data.count} mensajes`);
        });
        
        // Mostrar algunos ejemplos de mensajes
        console.log(`\n📝 EJEMPLOS DE MENSAJES (primeros 10):`);
        console.log('==============================');
        messages.slice(0, 10).forEach((msg, index) => {
          const time = new Date(msg.createdAt).toLocaleTimeString('es-AR');
          console.log(`${index + 1}. ${time} - ${msg.leadName || 'Sin nombre'} (${msg.phone})`);
        });
        
        if (messages.length > 10) {
          console.log(`... y ${messages.length - 10} mensajes más`);
        }
        
      } else {
        console.log('\n❌ No se encontraron mensajes para hoy');
      }
      
    } else {
      console.log('❌ Error obteniendo estadísticas');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Asegúrate de que el servidor esté ejecutándose en http://localhost:3001');
    }
  }
}

checkTodayMessages(); 