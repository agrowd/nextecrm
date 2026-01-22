const fs = require('fs');
const path = require('path');

class StatsViewer {
  constructor() {
    this.statsPath = path.join(__dirname, 'bot/stats/bot-stats.json');
  }

  /**
   * Cargar estadísticas desde archivo
   */
  loadStats() {
    try {
      if (fs.existsSync(this.statsPath)) {
        const data = fs.readFileSync(this.statsPath, 'utf8');
        return JSON.parse(data);
      } else {
        console.log('❌ No se encontró archivo de estadísticas');
        return null;
      }
    } catch (error) {
      console.error('Error cargando estadísticas:', error.message);
      return null;
    }
  }

  /**
   * Mostrar estadísticas en tiempo real
   */
  displayLiveStats() {
    console.log('📊 MONITOREO DE ESTADÍSTICAS EN TIEMPO REAL');
    console.log('=' .repeat(60));
    console.log('Presiona Ctrl+C para salir\n');

    // Mostrar estadísticas iniciales
    this.showStats();

    // Actualizar cada 30 segundos
    setInterval(() => {
      console.clear();
      console.log('📊 MONITOREO DE ESTADÍSTICAS EN TIEMPO REAL');
      console.log('=' .repeat(60));
      console.log(`🕐 Última actualización: ${new Date().toLocaleTimeString()}`);
      console.log('Presiona Ctrl+C para salir\n');
      this.showStats();
    }, 30000);
  }

  /**
   * Mostrar estadísticas
   */
  showStats() {
    const stats = this.loadStats();
    if (!stats) return;

    const sessionDuration = Date.now() - stats.sessionStart;
    const hoursRunning = Math.round(sessionDuration / (1000 * 60 * 60) * 100) / 100;

    // Calcular métricas
    const successRate = stats.totalLeads > 0 ? Math.round((stats.totalValidLeads / stats.totalLeads) * 100) : 0;
    const messageEfficiency = stats.totalLeads > 0 ? Math.round((stats.totalMessagesSent / stats.totalLeads) * 100) / 100 : 0;
    const cacheEfficiency = (stats.cacheHits + stats.cacheMisses) > 0 ? Math.round((stats.cacheHits / (stats.cacheHits + stats.cacheMisses)) * 100) : 0;

    console.log(`⏱️  Tiempo de sesión: ${hoursRunning} horas`);
    console.log(`📈 Total de leads: ${stats.totalLeads}`);
    console.log(`✅ Leads válidos: ${stats.totalValidLeads}`);
    console.log(`❌ Leads inválidos: ${stats.totalInvalidLeads}`);
    console.log(`📱 Mensajes enviados: ${stats.totalMessagesSent}`);
    console.log(`🎯 Tasa de éxito: ${successRate}%`);
    console.log(`📊 Promedio mensajes/lead: ${messageEfficiency}`);
    
    console.log('\n📋 SESIONES:');
    console.log(`   Total: ${stats.verificationSessions}`);
    console.log(`   Exitosas: ${stats.successfulSessions}`);
    console.log(`   Fallidas: ${stats.failedSessions}`);
    console.log(`   Timeout: ${stats.timeoutSessions}`);
    
    console.log('\n💬 MENSAJES:');
    console.log(`   Verificación (1-2): ${stats.messagesByType.verification}`);
    console.log(`   Secuencia (3-8): ${stats.messagesByType.sequence}`);
    console.log(`   Respuestas automáticas: ${stats.messagesByType.autoResponse}`);
    
    console.log('\n👤 RESPUESTAS:');
    console.log(`   Humanas: ${stats.humanResponses}`);
    console.log(`   Automáticas: ${stats.autoResponses}`);
    console.log(`   Sin respuesta: ${stats.noResponses}`);
    
    console.log('\n🧠 CACHE:');
    console.log(`   Hits: ${stats.cacheHits}`);
    console.log(`   Misses: ${stats.cacheMisses}`);
    console.log(`   Eficiencia: ${cacheEfficiency}%`);
    
    console.log('\n⚡ RENDIMIENTO:');
    console.log(`   Tiempo promedio de respuesta: ${Math.round(stats.averageResponseTime)}ms`);
    console.log(`   Total de respuestas: ${stats.responseCount}`);
    
    // Mostrar últimos leads procesados
    if (stats.leadHistory && stats.leadHistory.length > 0) {
      console.log('\n📝 ÚLTIMOS LEADS PROCESADOS:');
      const recentLeads = stats.leadHistory.slice(-5).reverse();
      recentLeads.forEach(lead => {
        const time = new Date(lead.timestamp).toLocaleTimeString();
        const status = lead.status === 'valid' ? '✅' : lead.status === 'invalid' ? '❌' : '⚠️';
        console.log(`   ${status} ${lead.name} (${lead.phone}) - ${lead.status} - ${time}`);
      });
    }

    // Mostrar recomendaciones
    console.log('\n💡 RECOMENDACIONES:');
    if (successRate < 70) {
      console.log('   • Considerar mejorar la calidad de los números de teléfono');
    }
    if (messageEfficiency > 10) {
      console.log('   • Optimizar el número de mensajes por lead');
    }
    if (cacheEfficiency < 50) {
      console.log('   • Ajustar la estrategia de cache');
    }
    if (stats.humanResponses < stats.autoResponses) {
      console.log('   • Revisar la calidad de los mensajes iniciales');
    }
    if (stats.timeoutSessions > stats.successfulSessions) {
      console.log('   • Considerar reducir el timeout de sesiones');
    }
    if (successRate >= 70 && messageEfficiency <= 10 && cacheEfficiency >= 50) {
      console.log('   • El sistema está funcionando de manera óptima');
    }
  }

  /**
   * Generar reporte detallado
   */
  generateDetailedReport() {
    const stats = this.loadStats();
    if (!stats) return;

    const report = {
      timestamp: new Date().toISOString(),
      sessionDuration: {
        milliseconds: Date.now() - stats.sessionStart,
        hours: Math.round((Date.now() - stats.sessionStart) / (1000 * 60 * 60) * 100) / 100
      },
      summary: {
        totalLeads: stats.totalLeads,
        totalValidLeads: stats.totalValidLeads,
        totalInvalidLeads: stats.totalInvalidLeads,
        totalMessagesSent: stats.totalMessagesSent,
        successRate: stats.totalLeads > 0 ? Math.round((stats.totalValidLeads / stats.totalLeads) * 100) : 0,
        messageEfficiency: stats.totalLeads > 0 ? Math.round((stats.totalMessagesSent / stats.totalLeads) * 100) / 100 : 0
      },
      sessions: {
        total: stats.verificationSessions,
        successful: stats.successfulSessions,
        failed: stats.failedSessions,
        timeout: stats.timeoutSessions,
        successRate: stats.verificationSessions > 0 ? Math.round((stats.successfulSessions / stats.verificationSessions) * 100) : 0
      },
      messages: {
        total: stats.totalMessagesSent,
        byType: stats.messagesByType,
        averagePerLead: stats.totalLeads > 0 ? Math.round((stats.totalMessagesSent / stats.totalLeads) * 100) / 100 : 0
      },
      responses: {
        human: stats.humanResponses,
        auto: stats.autoResponses,
        none: stats.noResponses,
        total: stats.humanResponses + stats.autoResponses + stats.noResponses,
        humanRate: (stats.humanResponses + stats.autoResponses + stats.noResponses) > 0 ?
          Math.round((stats.humanResponses / (stats.humanResponses + stats.autoResponses + stats.noResponses)) * 100) : 0
      },
      cache: {
        hits: stats.cacheHits,
        misses: stats.cacheMisses,
        efficiency: (stats.cacheHits + stats.cacheMisses) > 0 ? Math.round((stats.cacheHits / (stats.cacheHits + stats.cacheMisses)) * 100) : 0
      },
      performance: {
        averageResponseTime: Math.round(stats.averageResponseTime),
        totalResponseTime: stats.totalResponseTime,
        responseCount: stats.responseCount
      },
      leadHistory: stats.leadHistory || [],
      messageHistory: stats.messageHistory || [],
      responseHistory: stats.responseHistory || []
    };

    // Guardar reporte
    const reportPath = path.join(__dirname, 'detailed-stats-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`📄 Reporte detallado guardado en: ${reportPath}`);
    return report;
  }

  /**
   * Resetear estadísticas
   */
  resetStats() {
    try {
      if (fs.existsSync(this.statsPath)) {
        fs.unlinkSync(this.statsPath);
        console.log('🔄 Estadísticas reseteadas');
      } else {
        console.log('❌ No se encontró archivo de estadísticas para resetear');
      }
    } catch (error) {
      console.error('Error reseteando estadísticas:', error.message);
    }
  }
}

// Función principal
function main() {
  const viewer = new StatsViewer();
  
  const command = process.argv[2];
  
  switch (command) {
    case 'live':
      console.log('📊 Iniciando monitoreo en tiempo real...');
      viewer.displayLiveStats();
      break;
      
    case 'report':
      console.log('📄 Generando reporte detallado...');
      viewer.generateDetailedReport();
      break;
      
    case 'reset':
      console.log('🔄 Reseteando estadísticas...');
      viewer.resetStats();
      break;
      
    default:
      console.log('📊 Mostrando estadísticas actuales...');
      viewer.showStats();
      console.log('\n💡 Comandos disponibles:');
      console.log('   node show-stats.js live    - Monitoreo en tiempo real');
      console.log('   node show-stats.js report  - Generar reporte detallado');
      console.log('   node show-stats.js reset   - Resetear estadísticas');
      break;
  }
}

// Manejo de señales
process.on('SIGINT', () => {
  console.log('\n🛑 Monitoreo detenido');
  process.exit(0);
});

// Ejecutar si se llama directamente
if (require.main === module) {
  main();
}

module.exports = StatsViewer; 