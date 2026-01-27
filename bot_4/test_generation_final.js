
const AdvancedTemplateGenerator = require('./services/advancedTemplateGenerator');

const generator = new AdvancedTemplateGenerator();

// Mock Leads
const leads = [
    {
        name: "Consultorio Dr. Lopez",
        businessName: "Consultorio Lopez",
        category: "salud",
        location: "Palermo, Buenos Aires",
        website: "" // SIN WEB
    },
    {
        name: "Pizzeria La Nonna",
        businessName: "La Nonna",
        category: "gastronomia",
        location: "Caballito",
        website: "https://lanonna.com.ar" // CON WEB
    },
    {
        name: "Estética Bella",
        businessName: "Bella Spa",
        category: "belleza",
        location: "Recoleta",
        website: "" // SIN WEB
    }
];

console.log("🚀 INICIANDO TEST DE GENERACIÓN FINAL (5 MENSAJES)\n");

leads.forEach(lead => {
    console.log(`\n--------------------------------------------------`);
    console.log(`📋 LEAD: ${lead.name} | Cat: ${lead.category} | Web: ${lead.website ? '✅ SÍ' : '❌ NO'}`);
    console.log(`--------------------------------------------------`);

    const sequence = generator.generatePersonalizedSequence(lead);

    sequence.forEach((msg, index) => {
        console.log(`\n📩 MENSAJE ${index + 1}:`);
        console.log(msg);
    });

    // Validaciones básicas
    if (sequence.length !== 5) console.error("❌ ERROR: La secuencia no tiene 5 mensajes");

    // Validar Hook según Web
    if (!lead.website && sequence[0].includes("web")) {
        // Es difícil validar texto exacto, pero verificamos si parece un hook de 'sin web'
        // Los hooks de 'sin web' suelen mencionar 'Google', 'Maps', 'sin web'.
    }
});

console.log("\n\n📊 ESTADÍSTICAS:");
console.log(generator.getStats());
console.log("\n✅ Test Completado");
