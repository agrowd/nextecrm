const axios = require('axios');

async function checkLeadsStatus() {
  try {
    console.log('🔍 Verificando estado de los leads...\n');
    
    // 1. Verificar estadísticas generales
    const statsResponse = await axios.get('http://localhost:3001/stats');
    const stats = statsResponse.data.stats;
    
    console.log('📊 ESTADÍSTICAS GENERALES:');
    console.log(`- Total leads: ${stats.total_leads}`);
    console.log(`- Con teléfono: ${stats.leads_with_phone}`);
    console.log(`- Sin teléfono: ${stats.leads_without_phone}`);
    console.log(`- Pendientes: ${stats.pending_leads}`);
    console.log(`- Contactados: ${stats.contacted_leads}`);
    console.log(`- Interesados: ${stats.interested_leads}`);
    console.log(`- No interesados: ${stats.not_interested_leads}\n`);
    
    // 2. Verificar leads pendientes
    const pendingResponse = await axios.get('http://localhost:3001/leads?status=pending&limit=5');
    const pendingLeads = pendingResponse.data.leads;
    
    console.log('⏳ LEADS PENDIENTES (primeros 5):');
    pendingLeads.forEach((lead, index) => {
      console.log(`${index + 1}. ${lead.name}`);
      console.log(`   Teléfono: ${lead.phone || 'Sin teléfono'}`);
      console.log(`   Website: ${lead.hasWebsite ? 'Sí' : 'No'}`);
      console.log(`   Estado: ${lead.status}`);
      console.log('');
    });
    
    // 3. Verificar endpoint /next
    try {
      const nextResponse = await axios.get('http://localhost:3001/next');
      console.log('✅ ENDPOINT /next:');
      console.log(`- Lead obtenido: ${nextResponse.data.lead.name}`);
      console.log(`- Teléfono: ${nextResponse.data.lead.phone}`);
      console.log(`- Estado: ${nextResponse.data.lead.status}`);
    } catch (error) {
      console.log('❌ ENDPOINT /next:');
      console.log(`- Error: ${error.response.data.message}`);
      console.log(`- Cola: ${error.response.data.queue.pending} pendientes, ${error.response.data.queue.total} total`);
    }
    
    // 4. Verificar leads con website vs sin website
    const withWebsiteResponse = await axios.get('http://localhost:3001/leads?hasWebsite=true&limit=3');
    const withoutWebsiteResponse = await axios.get('http://localhost:3001/leads?hasWebsite=false&limit=3');
    
    console.log('\n🌐 LEADS CON WEBSITE (primeros 3):');
    withWebsiteResponse.data.leads.forEach((lead, index) => {
      console.log(`${index + 1}. ${lead.name} - ${lead.phone || 'Sin teléfono'}`);
    });
    
    console.log('\n📱 LEADS SIN WEBSITE (primeros 3):');
    withoutWebsiteResponse.data.leads.forEach((lead, index) => {
      console.log(`${index + 1}. ${lead.name} - ${lead.phone || 'Sin teléfono'}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkLeadsStatus(); 