const axios = require('axios');

const API = 'http://localhost:3001';

async function testHealth() {
  const res = await axios.get(`${API}/health`);
  console.log('✅ /health:', res.data.status === 'OK' ? 'OK' : 'FAIL');
}

async function testLeadsList() {
  const res = await axios.get(`${API}/leads?limit=2`);
  console.log('✅ /leads:', Array.isArray(res.data.leads) ? 'OK' : 'FAIL');
}

async function testMessagesList() {
  const res = await axios.get(`${API}/messages?limit=2`);
  console.log('✅ /messages:', Array.isArray(res.data.messages) ? 'OK' : 'FAIL');
}

async function testStats() {
  const res = await axios.get(`${API}/stats`);
  console.log('✅ /stats:', res.data.success ? 'OK' : 'FAIL');
}

async function testNext() {
  const res = await axios.get(`${API}/next`);
  if (res.data && res.data.lead) {
    console.log('✅ /next: OK (hay lead)');
    return res.data.lead;
  } else {
    console.log('✅ /next: OK (sin leads)');
    return null;
  }
}

async function testIngest() {
  const testLead = {
    name: 'Lead Test API',
    phone: '01112345678',
    address: 'Calle Falsa 123',
    website: '',
    keyword: 'test',
    location: 'test',
    mapsUrl: 'https://maps.google.com/?q=test',
  };
  try {
    const res = await axios.post(`${API}/ingest`, testLead);
    if (res.data && res.data.success) {
      console.log('✅ /ingest: OK');
      console.log('   → Insertados:', res.data.inserted?.length || 0);
      console.log('   → Duplicados:', res.data.duplicates?.length || 0);
      console.log('   → Errores:', res.data.errors?.length || 0);
    } else {
      console.log('❌ /ingest: FAIL', res.data);
    }
  } catch (error) {
    console.log('❌ /ingest: FAIL', error.response?.data || error.message);
  }
}

async function runAll() {
  console.log('--- TEST API GMaps Leads Scraper ---');
  await testHealth();
  await testLeadsList();
  await testMessagesList();
  await testStats();
  await testNext();
  await testIngest();
}

runAll(); 