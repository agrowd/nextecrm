const websiteAuditor = require('../server/services/websiteAuditor');

async function testAudit() {
    console.log('--- TEST WEBSITE AUDITOR ---');
    const sites = [
        'https://nextemarketing.com',
        'https://elomburestaurante.com.ar',
        'https://wordpress.org'
    ];

    for (const site of sites) {
        console.log(`\n🔍 Auditando ${site}...`);
        const res = await websiteAuditor.audit(site);
        console.log('Resultado:', JSON.stringify(res, null, 2));
    }
}

testAudit();
