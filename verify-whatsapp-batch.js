const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

class WhatsAppBatchVerifier {
  constructor() {
    this.client = null;
    this.isReady = false;
    this.results = [];
    this.verifiedNumbers = [];
    this.failedNumbers = [];
  }

  async init() {
    console.log('🔍 Iniciando verificador de WhatsApp...');
    
    this.client = new Client({
      authStrategy: new LocalAuth({
        clientId: 'whatsapp-verifier'
      }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu'
        ]
      }
    });

    this.client.on('qr', (qr) => {
      console.log('📱 Escanea este código QR con WhatsApp:');
      qrcode.generate(qr, { small: true });
    });

    this.client.on('ready', () => {
      console.log('✅ WhatsApp Verifier listo!');
      this.isReady = true;
    });

    this.client.on('auth_failure', (msg) => {
      console.error('❌ Error de autenticación:', msg);
    });

    try {
      await this.client.initialize();
    } catch (error) {
      console.error('❌ Error inicializando WhatsApp:', error);
    }
  }

  async verifyNumber(phoneNumber) {
    try {
      console.log(`🔍 Verificando: ${phoneNumber}`);
      
      // Verificar registro
      const isRegistered = await this.client.isRegisteredUser(phoneNumber);
      
      if (!isRegistered) {
        return {
          phoneNumber,
          valid: false,
          method: 'not_registered',
          timestamp: new Date().toISOString()
        };
      }

      // Verificar chat existente
      const chat = await this.client.getChatById(phoneNumber);
      const hasConversation = chat ? (await chat.fetchMessages({ limit: 1 })).length > 0 : false;

      // Intentar envío de mensaje de prueba
      let testResult = { success: false, error: null };
      try {
        const testMessage = "Hola! Este es un mensaje de verificación automática. Disculpa la molestia.";
        const message = await this.client.sendMessage(phoneNumber, testMessage);
        testResult = { success: true, messageId: message.id._serialized };
      } catch (error) {
        testResult = { success: false, error: error.message };
      }

      const result = {
        phoneNumber,
        valid: testResult.success,
        method: testResult.success ? 'test_message' : 'test_failed',
        isRegistered,
        hasConversation,
        testResult,
        timestamp: new Date().toISOString()
      };

      // Categorizar resultado
      if (result.valid) {
        this.verifiedNumbers.push(result);
      } else {
        this.failedNumbers.push(result);
      }

      this.results.push(result);
      
      // Delay entre verificaciones
      await this.sleep(2000);
      
      return result;

    } catch (error) {
      const result = {
        phoneNumber,
        valid: false,
        method: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      };
      
      this.failedNumbers.push(result);
      this.results.push(result);
      
      return result;
    }
  }

  async verifyBatch(phoneNumbers) {
    console.log(`📋 Iniciando verificación de ${phoneNumbers.length} números...`);
    
    for (let i = 0; i < phoneNumbers.length; i++) {
      const phoneNumber = phoneNumbers[i];
      console.log(`\n[${i + 1}/${phoneNumbers.length}] Verificando: ${phoneNumber}`);
      
      const result = await this.verifyNumber(phoneNumber);
      
      console.log(`   Resultado: ${result.valid ? '✅ Válido' : '❌ Inválido'} (${result.method})`);
      
      // Mostrar progreso cada 10 números
      if ((i + 1) % 10 === 0) {
        console.log(`\n📊 Progreso: ${i + 1}/${phoneNumbers.length} (${Math.round((i + 1) / phoneNumbers.length * 100)}%)`);
        console.log(`   ✅ Válidos: ${this.verifiedNumbers.length}`);
        console.log(`   ❌ Inválidos: ${this.failedNumbers.length}`);
      }
    }
  }

  generateReport() {
    const report = {
      summary: {
        total: this.results.length,
        valid: this.verifiedNumbers.length,
        invalid: this.failedNumbers.length,
        successRate: Math.round((this.verifiedNumbers.length / this.results.length) * 100)
      },
      validNumbers: this.verifiedNumbers.map(r => r.phoneNumber),
      invalidNumbers: this.failedNumbers.map(r => r.phoneNumber),
      detailedResults: this.results,
      generatedAt: new Date().toISOString()
    };

    // Guardar reporte en archivo
    const reportPath = path.join(__dirname, 'whatsapp-verification-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log('\n📊 REPORTE DE VERIFICACIÓN:');
    console.log(`   Total verificados: ${report.summary.total}`);
    console.log(`   ✅ Válidos: ${report.summary.valid}`);
    console.log(`   ❌ Inválidos: ${report.summary.invalid}`);
    console.log(`   📈 Tasa de éxito: ${report.summary.successRate}%`);
    console.log(`\n📄 Reporte guardado en: ${reportPath}`);
    
    return report;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async stop() {
    if (this.client) {
      await this.client.destroy();
    }
    process.exit(0);
  }
}

// Ejemplo de uso
async function main() {
  const verifier = new WhatsAppBatchVerifier();
  await verifier.init();

  // Ejemplo de números a verificar (reemplazar con tus números)
  const phoneNumbers = [
    '5491112345678@c.us',
    '5491187654321@c.us',
    // Agregar más números aquí
  ];

  if (phoneNumbers.length === 0) {
    console.log('⚠️ No hay números para verificar. Agrega números al array phoneNumbers.');
    return;
  }

  try {
    await verifier.verifyBatch(phoneNumbers);
    verifier.generateReport();
  } catch (error) {
    console.error('❌ Error durante la verificación:', error);
  } finally {
    await verifier.stop();
  }
}

// Manejo de señales
process.on('SIGINT', () => {
  console.log('\n🛑 Verificación interrumpida por el usuario');
  process.exit(0);
});

// Ejecutar si se llama directamente
if (require.main === module) {
  main();
}

module.exports = WhatsAppBatchVerifier; 