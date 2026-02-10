/**
 * 🔥 RECOVERY SCRIPT: Leads quemados por Bot 2 (Detached Frame Error)
 * 
 * Fecha del incidente: 2026-02-10 entre 21:33:00 y 21:38:30 UTC
 * Causa: Chrome de bot_2 crasheó (detached Frame), quickVerify retornó
 * valid=false para TODOS los leads, marcándolos como not_interested.
 *
 * Este script resetea esos leads a 'pending' para que puedan ser reintentados.
 * 
 * USO: node recover-burned-bot2.js [--dry-run] [--execute]
 *   --dry-run  (default) Solo muestra qué leads se recuperarían
 *   --execute  Ejecuta la recuperación real
 */

const mongoose = require('mongoose');
const path = require('path');

// Cargar .env
const envPathRoot = path.resolve(__dirname, '../.env');
require('dotenv').config({ path: envPathRoot });

// Schema flexible
const LeadSchema = new mongoose.Schema({}, { strict: false });
const Lead = mongoose.model('LeadRecovery', LeadSchema, 'leads');

// Teléfonos extraídos del log del incidente (bot_2 detached frame, 2026-02-10)
const BURNED_PHONES = [
    '5491137947945',   // Psicóloga Nadia Rosenzvaig
    '5491147836645',   // CONSULTORIOS BELGRANO
    '5491120358779',   // Centro Psicológico Plaza
    '5491152632769',   // Consultorios MIB
    '5491133494435',   // Centro. De Salud Mental Y Acción Social Nro. 1
    '5491148229565',   // Medynac
    '5491168727555',   // NDA Nutrición en Acción
    '5491149358861',   // Andrea Cohen - Licenciada en Nutrición
    '5491136407095',   // Nutrixión
    '5493364635411',   // Lic. Agustina Búscolo
    '5491167259395',   // Carla Iamartino | Licenciada en Nutrición
    '5491152190775',   // Nutrishop - Recoleta
    '5491158905825',   // Javier Rodriguez Centro de Nutrición
    '5491147875941',   // Lic. Alicia Crocco
    '5491159927689',   // Nutrimenttum
    '5491147804805',   // FISICALZONE - BELGRANO
    '5491147881275',   // Alicia Farías
    '5491145442869',   // Dr. Coen Becor
    '5491149827555',   // Depi4ever - Sucursal Almagro
    '5491130658859',   // Armoa salón de belleza
    '5491145012379',   // Estética DB
    '5491145018365',   // Gold Sun
    '5491169412305',   // Luz de Mi Vida Depilación
    '5491149811481',   // Vannlook
    '5491148628169',   // Centro de Estetica Marisa Dury
    '5491164455831',   // Carrie Medicina Estética
    '5491145030201',   // Las Cukas Beauty Studio
    '5491170781635',   // Mel Propiedades - Suc. Palermo
    '5491147750999',   // Lepore Palermo
    '5491148991855',   // Veglienzone Gestión Inmobiliaria
    '5491135328441',   // Rivas Inmuebles - Sucursal Palermo
    '5491160513499',   // RE/MAX Vanguard
    '5491150226375',   // Solución-Inmobiliaria
    '5491152778899',   // REMAX Legado
    '5491143134411',   // Kantai Inmobiliaria
    '5491123226729',   // Milhouse Propiedades
    '54934609305939',  // Clinica Dental Dr Moreno
    '54934926861365',  // Dr. Javier Sánchez Palencia
    '54934647697401',  // Centro de estética E.B.
    '5491170283701',   // Zona Brackets
    '5491144117775',   // Odontologo Urgencia 24 horas
    '5491144205221',   // Oasis centro de belleza
    '5491167993185',   // YP spa Quilmes
    '5491136817185',   // Musya studio de estética
    '5491153855341',   // VIVE Estudio de Belleza
    '5491142540919',   // Foot Institute
    '5491156698679',   // Dermatología Koll
    '5491128961671',   // So Chic!
    '5491165298341',   // Carolina Muñoz Estética & Spa
    '5491165606699',   // Donna Stetics
];

const isDryRun = !process.argv.includes('--execute');

async function recoverBurnedLeads() {
    try {
        console.log('═══════════════════════════════════════════════════');
        console.log('🔥 RECOVERY: Leads quemados por Bot 2 (Detached Frame)');
        console.log('═══════════════════════════════════════════════════');
        console.log(`📋 Total teléfonos a recuperar: ${BURNED_PHONES.length}`);
        console.log(`🔧 Modo: ${isDryRun ? '🔍 DRY RUN (solo muestra)' : '⚡ EJECUCIÓN REAL'}`);
        console.log('');

        const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/gmaps-leads-scraper';
        console.log(`🔗 Conectando a MongoDB...`);
        await mongoose.connect(uri);
        console.log(`✅ Conectado.`);

        // Buscar leads que coincidan con los teléfonos quemados
        const query = {
            phone: { $in: BURNED_PHONES },
            status: { $in: ['not_interested', 'no_whatsapp', 'failed', 'check_failed'] }
        };

        const burnedLeads = await Lead.find(query).lean();
        console.log(`\n📊 Encontrados: ${burnedLeads.length} leads con estado inválido de ${BURNED_PHONES.length} teléfonos`);

        if (burnedLeads.length === 0) {
            console.log('\n⚠️  No se encontraron leads para recuperar.');
            console.log('   Posibles razones:');
            console.log('   - Los teléfonos no están en la BD con ese formato exacto');
            console.log('   - Ya fueron recuperados manualmente');

            // Intentar búsqueda más amplia
            const allMatches = await Lead.find({ phone: { $in: BURNED_PHONES } }).lean();
            console.log(`\n🔍 Búsqueda amplia (cualquier status): ${allMatches.length} leads encontrados`);
            allMatches.forEach(l => {
                console.log(`   📌 ${l.phone} | Status: ${l.status} | ${l.name || 'Sin nombre'}`);
            });
        } else {
            console.log('\n📋 Leads a recuperar:');
            console.log('─────────────────────────────────────────────────');
            burnedLeads.forEach((l, i) => {
                console.log(`   ${(i + 1).toString().padStart(2)}. ${l.phone} | ${l.status} → pending | ${l.name || 'Sin nombre'}`);
            });
            console.log('─────────────────────────────────────────────────');

            if (!isDryRun) {
                console.log('\n⚡ Ejecutando recuperación...');

                const result = await Lead.updateMany(
                    query,
                    {
                        $set: {
                            status: 'pending',
                            assignedToInstance: '',
                            phoneInvalid: false,
                            phoneBounced: false,
                            whatsappRegistered: false,
                            validationError: '',
                            processedBy: '',
                            notes: 'RECOVERED: Bot2 detached frame burn 2026-02-10'
                        }
                    }
                );

                console.log(`\n✅ RECUPERADOS: ${result.modifiedCount} leads reseteados a 'pending'`);
                console.log('   Ahora serán reintentados en el próximo ciclo del bot.');
            } else {
                console.log('\n🔍 DRY RUN completado. Ejecutá con --execute para aplicar:');
                console.log('   node recover-burned-bot2.js --execute');
            }
        }

        await mongoose.disconnect();
        console.log('\n🔌 Desconectado de MongoDB.');
    } catch (e) {
        console.error('❌ ERROR:', e);
        process.exit(1);
    }
}

recoverBurnedLeads();
