const axios = require('axios');

async function checkDuplicatesDetailed() {
  try {
    console.log('🔍 Verificando duplicados detalladamente...\n');
    
    // Obtener fecha de hoy
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    console.log(`📅 Fecha de hoy: ${today.toISOString()}`);
    
    // Obtener leads creados hoy
    const todayLeadsResponse = await axios.get(`http://localhost:3001/leads?createdAt=${today.toISOString()}&limit=20`);
    const todayLeads = todayLeadsResponse.data.leads;
    
    console.log(`📊 LEADS CREADOS HOY (primeros 20):`);
    todayLeads.forEach((lead, index) => {
      console.log(`${index + 1}. ${lead.name}`);
      console.log(`   Teléfono: ${lead.phone || 'Sin teléfono'}`);
      console.log(`   Dirección: ${lead.address || 'Sin dirección'}`);
      console.log(`   Estado: ${lead.status}`);
      console.log(`   Creado: ${lead.createdAt}`);
      console.log('');
    });
    
    // Verificar leads con nombres similares en toda la BD
    const allLeadsResponse = await axios.get('http://localhost:3001/leads?limit=200');
    const allLeads = allLeadsResponse.data.leads;
    
    console.log('🔍 BUSCANDO DUPLICADOS POR NOMBRE Y TELÉFONO:');
    
    // Buscar leads con nombres similares
    const namePhoneGroups = {};
    allLeads.forEach(lead => {
      const key = `${lead.name.toLowerCase().trim()}|${lead.phone || 'sin-telefono'}`;
      if (!namePhoneGroups[key]) {
        namePhoneGroups[key] = [];
      }
      namePhoneGroups[key].push(lead);
    });
    
    let duplicateCount = 0;
    let totalDuplicates = 0;
    
    Object.keys(namePhoneGroups).forEach(key => {
      if (namePhoneGroups[key].length > 1) {
        const [name, phone] = key.split('|');
        console.log(`⚠️ Duplicado detectado: "${name}" - "${phone}" (${namePhoneGroups[key].length} veces)`);
        namePhoneGroups[key].forEach((lead, index) => {
          console.log(`   ${index + 1}. ${lead.name} - ${lead.phone || 'Sin teléfono'} - ${lead.createdAt}`);
        });
        console.log('');
        duplicateCount++;
        totalDuplicates += namePhoneGroups[key].length - 1; // -1 porque uno es el original
      }
    });
    
    console.log(`📊 RESUMEN:`);
    console.log(`- Total leads en BD: ${allLeads.length}`);
    console.log(`- Leads creados hoy: ${todayLeads.length}`);
    console.log(`- Nombres+teléfonos duplicados encontrados: ${duplicateCount}`);
    console.log(`- Total de duplicados: ${totalDuplicates}`);
    
    // Verificar estadísticas del servidor
    const statsResponse = await axios.get('http://localhost:3001/stats');
    const stats = statsResponse.data.stats;
    
    console.log(`\n📈 ESTADÍSTICAS DEL SERVIDOR:`);
    console.log(`- Total leads: ${stats.total_leads}`);
    console.log(`- Con teléfono: ${stats.leads_with_phone}`);
    console.log(`- Sin teléfono: ${stats.leads_without_phone}`);
    console.log(`- Pendientes: ${stats.pending_leads}`);
    console.log(`- Contactados: ${stats.contacted_leads}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkDuplicatesDetailed(); 