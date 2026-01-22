const fs = require('fs');
const path = require('path');

class WhatsAppSystemMonitor {
  constructor() {
    this.stats = {
      totalLeads: 0,
      validWhatsApp: 0,
      invalidWhatsApp: 0,
      verificationSessions: 0,
      confirmedSessions: 0,
      timeoutSessions: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
  }

  /**
   * Generar reporte del sistema
   */
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      stats: this.stats,
      efficiency: {
        successRate: this.stats.totalLeads > 0 ? Math.round((this.stats.validWhatsApp / this.stats.totalLeads) * 100) : 0,
        cacheEfficiency: (this.stats.cacheHits + this.stats.cacheMisses) > 0 ? Math.round((this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses)) * 100) : 0,
        sessionConfirmationRate: this.stats.verificationSessions > 0 ? Math.round((this.stats.confirmedSessions / this.stats.verificationSessions) * 100) : 0
      },
      recommendations: this.getRecommendations()
    };

    // Guardar reporte
    const reportPath = path.join(__dirname, 'whatsapp-system-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('\n📊 REPORTE DEL SISTEMA DE WHATSAPP:');
    console.log('=' .repeat(50));
    console.log(`📈 Total de leads procesados: ${report.stats.totalLeads}`);
    console.log(`✅ WhatsApp válidos: ${report.stats.validWhatsApp}`);
    console.log(`❌ WhatsApp inválidos: ${report.stats.invalidWhatsApp}`);
    console.log(`🎯 Sesiones de verificación: ${report.stats.verificationSessions}`);
    console.log(`✅ Sesiones confirmadas: ${report.stats.confirmedSessions}`);
    console.log(`⏰ Sesiones con timeout: ${report.stats.timeoutSessions}`);
    console.log(`🧠 Cache hits: ${report.stats.cacheHits}`);
    console.log(`🔄 Cache misses: ${report.stats.cacheMisses}`);
    console.log('\n📊 EFICIENCIA:');
    console.log(`   Tasa de éxito: ${report.efficiency.successRate}%`);
    console.log(`   Eficiencia del cache: ${report.efficiency.cacheEfficiency}%`);
    console.log(`   Tasa de confirmación: ${report.efficiency.sessionConfirmationRate}%`);
    console.log('\n💡 RECOMENDACIONES:');
    report.recommendations.forEach(rec => {
      console.log(`   • ${rec}`);
    });
    console.log(`\n📄 Reporte guardado en: ${reportPath}`);

    return report;
  }

  /**
   * Generar recomendaciones basadas en estadísticas
   */
  getRecommendations() {
    const recommendations = [];

    if (this.stats.efficiency.successRate < 70) {
      recommendations.push('Considerar mejorar la calidad de los números de teléfono');
    }

    if (this.stats.efficiency.cacheEfficiency < 50) {
      recommendations.push('Optimizar el sistema de cache para reducir verificaciones repetidas');
    }

    if (this.stats.efficiency.sessionConfirmationRate < 30) {
      recommendations.push('Revisar el timeout de sesiones (actualmente 5 minutos)');
    }

    if (this.stats.timeoutSessions > this.stats.confirmedSessions) {
      recommendations.push('Considerar reducir el timeout de sesiones o mejorar los mensajes iniciales');
    }

    if (this.stats.cacheMisses > this.stats.cacheHits) {
      recommendations.push('Ajustar la frecuencia de limpieza del cache');
    }

    if (recommendations.length === 0) {
      recommendations.push('El sistema está funcionando de manera óptima');
    }

    return recommendations;
  }

  /**
   * Actualizar estadísticas
   */
  updateStats(type, count = 1) {
    if (this.stats.hasOwnProperty(type)) {
      this.stats[type] += count;
    }
  }

  /**
   * Simular datos de ejemplo
   */
  simulateData() {
    this.updateStats('totalLeads', 100);
    this.updateStats('validWhatsApp', 75);
    this.updateStats('invalidWhatsApp', 25);
    this.updateStats('verificationSessions', 60);
    this.updateStats('confirmedSessions', 45);
    this.updateStats('timeoutSessions', 15);
    this.updateStats('cacheHits', 30);
    this.updateStats('cacheMisses', 70);
  }
}

// Función principal
function main() {
  const monitor = new WhatsAppSystemMonitor();
  
  // Simular datos para demostración
  monitor.simulateData();
  
  // Generar reporte
  monitor.generateReport();
}

// Ejecutar si se llama directamente
if (require.main === module) {
  main();
}

module.exports = WhatsAppSystemMonitor; 