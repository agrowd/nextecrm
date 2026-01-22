const path = require('path');
const AdvancedTemplateGenerator = require(path.join(__dirname, 'bot/services/advancedTemplateGenerator'));

const generator = new AdvancedTemplateGenerator();

const leadEjemplo = {
    name: "Federico Odontología",
    phone: "5491112345678",
    businessName: "Federico Odontología", // A veces el nombre es el negocio
    category: "salud", // Para que detecte odontólogo
    hasWebsite: true, // TIENE WEB
    location: "Palermo",
    reviews: 50,
    rating: 4.8
};

async function showExamples() {
    console.log("=== GENERANDO EJEMPLO PARA: Federico Odontología (CON WEB) ===\n");

    // Simular secuencia
    const mensajes = generator.generateSequence(leadEjemplo);

    mensajes.forEach((msg, i) => {
        console.log(`[Mensaje ${i + 1}]:`);
        console.log(msg);
        console.log("-".repeat(40));
    });

    console.log("\n=== EJEMPLO DE RESPUESTA A AUTO-REPLY (VENTA DE BOT) ===");
    console.log(generator.random(generator.respuestasBotAutomatico));
}

showExamples();
