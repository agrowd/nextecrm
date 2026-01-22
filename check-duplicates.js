const axios = require('axios');

async function checkDuplicates() {
  try {
    console.log('🔍 Verificando duplicados de hoy...\n');
    
    // Obtener fecha de hoy
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    console.log(`📅 Fecha de hoy: ${today.toISOString()}`);
    
    // Obtener leads creados hoy
    const todayLeadsResponse = await axios.get(`http://localhost:3001/leads?createdAt=${today.toISOString()}&limit=10`);
    const todayLeads = todayLeadsResponse.data.leads;
    
    console.log(`📊 LEADS CREADOS HOY (primeros 10):`);
    todayLeads.forEach((lead, index) => {
      console.log(`${index + 1}. ${lead.name}`);
      console.log(`   Teléfono: ${lead.phone || 'Sin teléfono'}`);
      console.log(`   Dirección: ${lead.address || 'Sin dirección'}`);
      console.log(`   Estado: ${lead.status}`);
      console.log(`   Creado: ${lead.createdAt}`);
      console.log('');
    });
    
    // Verificar si hay leads con nombres similares
    const allLeadsResponse = await axios.get('http://localhost:3001/leads?limit=100');
    const allLeads = allLeadsResponse.data.leads;
    
    console.log('🔍 BUSCANDO POSIBLES DUPLICADOS:');
    
    // Buscar leads con nombres similares
    const nameGroups = {};
    allLeads.forEach(lead => {
      const cleanName = lead.name.toLowerCase().trim();
      if (!nameGroups[cleanName]) {
        nameGroups[cleanName] = [];
      }
      nameGroups[cleanName].push(lead);
    });
    
    let duplicateCount = 0;
    Object.keys(nameGroups).forEach(name => {
      if (nameGroups[name].length > 1) {
        console.log(`⚠️ Nombre duplicado: "${name}" (${nameGroups[name].length} veces)`);
        nameGroups[name].forEach((lead, index) => {
          console.log(`   ${index + 1}. ${lead.name} - ${lead.phone || 'Sin teléfono'} - ${lead.createdAt}`);
        });
        console.log('');
        duplicateCount++;
      }
    });
    
    console.log(`📊 RESUMEN:`);
    console.log(`- Total leads en BD: ${allLeads.length}`);
    console.log(`- Leads creados hoy: ${todayLeads.length}`);
    console.log(`- Nombres duplicados encontrados: ${duplicateCount}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkDuplicates(); 