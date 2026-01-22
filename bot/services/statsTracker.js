const fs = require('fs');
const path = require('path');

class StatsTracker {
  constructor() {
    this.stats = {
      // Estadísticas generales
      totalLeads: 0,
      totalMessagesSent: 0,
      totalValidLeads: 0,
      totalInvalidLeads: 0,
      
      // Estadísticas por sesión
      verificationSessions: 0,
      successfulSessions: 0,
      failedSessions: 0,
      timeoutSessions: 0,
      
      // Estadísticas de mensajes
      messagesByType: {
        verification: 0,    // Mensajes 1-2
        sequence: 0,        // Mensajes 3-8
        autoResponse: 0     // Respuestas automáticas
      },
      
      // Estadísticas de respuestas
      humanResponses: 0,
      autoResponses: 0,
      noResponses: 0,
      
      // Estadísticas de cache
      cacheHits: 0,
      cacheMisses: 0,
      
      // Estadísticas de tiempo
      averageResponseTime: 0,
      totalResponseTime: 0,
      responseCount: 0,
      
      // Estadísticas de eficiencia
      successRate: 0,
      messageEfficiency: 0,
      cacheEfficiency: 0,
      
      // Historial detallado
      leadHistory: [],
      messageHistory: [],
      responseHistory: [],
      
      // Timestamps
      sessionStart: Date.now(),
      lastUpdate: Date.now()
    };
    
    this.backupInterval = 5 * 60 * 1000; // 5 minutos
    this.startBackupTimer();
  }

  /**
   * Registrar nuevo lead procesado
   */
  trackLead(lead, status, details = {}) {
    this.stats.totalLeads++;
    
    const leadRecord = {
      id: lead.id,
      name: lead.name,
      phone: lead.phone,
      status: status,
      timestamp: new Date().toISOString(),
      details: details
    };
    
    this.stats.leadHistory.push(leadRecord);
    
    // Actualizar contadores
    if (status === 'valid' || status === 'contacted') {
      this.stats.totalValidLeads++;
    } else if (status === 'invalid' || status === 'not_interested') {
      this.stats.totalInvalidLeads++;
    }
    
    this.updateEfficiencyMetrics();
    this.saveStats();
  }

  /**
   * Registrar mensaje enviado
   */
  trackMessage(messageData) {
    this.stats.totalMessagesSent++;
    
    const messageRecord = {
      leadId: messageData.leadId,
      leadName: messageData.leadName,
      phone: messageData.phone,
      messageNumber: messageData.messageNumber,
      type: messageData.type,
      timestamp: new Date().toISOString(),
      content: messageData.content.substring(0, 100) + '...' // Truncar para ahorrar espacio
    };
    
    this.stats.messageHistory.push(messageRecord);
    
    // Actualizar contadores por tipo
    if (messageData.messageNumber <= 2) {
      this.stats.messagesByType.verification++;
    } else {
      this.stats.messagesByType.sequence++;
    }
    
    this.updateEfficiencyMetrics();
    this.saveStats();
  }

  /**
   * Registrar sesión de verificación
   */
  trackVerificationSession(sessionData) {
    this.stats.verificationSessions++;
    
    const sessionRecord = {
      phoneNumber: sessionData.phoneNumber,
      businessName: sessionData.businessName,
      startTime: new Date().toISOString(),
      status: 'active'
    };
    
    this.saveStats();
  }

  /**
   * Registrar resultado de sesión
   */
  trackSessionResult(phoneNumber, result, responseTime = null) {
    if (result === 'success') {
      this.stats.successfulSessions++;
    } else if (result === 'failed') {
      this.stats.failedSessions++;
    } else if (result === 'timeout') {
      this.stats.timeoutSessions++;
    }
    
    if (responseTime) {
      this.stats.totalResponseTime += responseTime;
      this.stats.responseCount++;
      this.stats.averageResponseTime = this.stats.totalResponseTime / this.stats.responseCount;
    }
    
    this.updateEfficiencyMetrics();
    this.saveStats();
  }

  /**
   * Registrar respuesta del usuario
   */
  trackResponse(phoneNumber, responseType, messageContent, responseTime = null) {
    const responseRecord = {
      phoneNumber: phoneNumber,
      type: responseType,
      content: messageContent.substring(0, 100) + '...',
      timestamp: new Date().toISOString(),
      responseTime: responseTime
    };
    
    this.stats.responseHistory.push(responseRecord);
    
    // Actualizar contadores
    if (responseType === 'human') {
      this.stats.humanResponses++;
    } else if (responseType === 'auto') {
      this.stats.autoResponses++;
    } else if (responseType === 'none') {
      this.stats.noResponses++;
    }
    
    if (responseTime) {
      this.stats.totalResponseTime += responseTime;
      this.stats.responseCount++;
      this.stats.averageResponseTime = this.stats.totalResponseTime / this.stats.responseCount;
    }
    
    this.updateEfficiencyMetrics();
    this.saveStats();
  }

  /**
   * Registrar hit/miss de cache
   */
  trackCache(cacheType) {
    if (cacheType === 'hit') {
      this.stats.cacheHits++;
    } else if (cacheType === 'miss') {
      this.stats.cacheMisses++;
    }
    
    this.updateEfficiencyMetrics();
    this.saveStats();
  }

  /**
   * Actualizar métricas de eficiencia
   */
  updateEfficiencyMetrics() {
    // Tasa de éxito
    if (this.stats.totalLeads > 0) {
      this.stats.successRate = Math.round((this.stats.totalValidLeads / this.stats.totalLeads) * 100);
    }
    
    // Eficiencia de mensajes
    if (this.stats.totalLeads > 0) {
      this.stats.messageEfficiency = Math.round((this.stats.totalMessagesSent / this.stats.totalLeads) * 100);
    }
    
    // Eficiencia de cache
    const totalCacheAttempts = this.stats.cacheHits + this.stats.cacheMisses;
    if (totalCacheAttempts > 0) {
      this.stats.cacheEfficiency = Math.round((this.stats.cacheHits / totalCacheAttempts) * 100);
    }
    
    this.stats.lastUpdate = Date.now();
  }

  /**
   * Generar reporte completo
   */
  generateReport() {
    const sessionDuration = Date.now() - this.stats.sessionStart;
    const hoursRunning = Math.round(sessionDuration / (1000 * 60 * 60) * 100) / 100;
    
    const report = {
      timestamp: new Date().toISOString(),
      sessionDuration: {
        milliseconds: sessionDuration,
        hours: hoursRunning
      },
      summary: {
        totalLeads: this.stats.totalLeads,
        totalValidLeads: this.stats.totalValidLeads,
        totalInvalidLeads: this.stats.totalInvalidLeads,
        totalMessagesSent: this.stats.totalMessagesSent,
        successRate: this.stats.successRate,
        messageEfficiency: this.stats.messageEfficiency
      },
      sessions: {
        total: this.stats.verificationSessions,
        successful: this.stats.successfulSessions,
        failed: this.stats.failedSessions,
        timeout: this.stats.timeoutSessions,
        successRate: this.stats.verificationSessions > 0 ? 
          Math.round((this.stats.successfulSessions / this.stats.verificationSessions) * 100) : 0
      },
      messages: {
        total: this.stats.totalMessagesSent,
        byType: this.stats.messagesByType,
        averagePerLead: this.stats.totalLeads > 0 ? 
          Math.round((this.stats.totalMessagesSent / this.stats.totalLeads) * 100) / 100 : 0
      },
      responses: {
        human: this.stats.humanResponses,
        auto: this.stats.autoResponses,
        none: this.stats.noResponses,
        total: this.stats.humanResponses + this.stats.autoResponses + this.stats.noResponses,
        humanRate: (this.stats.humanResponses + this.stats.autoResponses + this.stats.noResponses) > 0 ?
          Math.round((this.stats.humanResponses / (this.stats.humanResponses + this.stats.autoResponses + this.stats.noResponses)) * 100) : 0
      },
      cache: {
        hits: this.stats.cacheHits,
        misses: this.stats.cacheMisses,
        efficiency: this.stats.cacheEfficiency
      },
      performance: {
        averageResponseTime: Math.round(this.stats.averageResponseTime),
        totalResponseTime: this.stats.totalResponseTime,
        responseCount: this.stats.responseCount
      },
      recommendations: this.generateRecommendations()
    };

    return report;
  }

  /**
   * Generar recomendaciones basadas en estadísticas
   */
  generateRecommendations() {
    const recommendations = [];

    if (this.stats.successRate < 70) {
      recommendations.push('Considerar mejorar la calidad de los números de teléfono');
    }

    if (this.stats.messageEfficiency > 10) {
      recommendations.push('Optimizar el número de mensajes por lead');
    }

    if (this.stats.cacheEfficiency < 50) {
      recommendations.push('Ajustar la estrategia de cache');
    }

    if (this.stats.humanResponses < this.stats.autoResponses) {
      recommendations.push('Revisar la calidad de los mensajes iniciales');
    }

    if (this.stats.timeoutSessions > this.stats.successfulSessions) {
      recommendations.push('Considerar reducir el timeout de sesiones');
    }

    if (recommendations.length === 0) {
      recommendations.push('El sistema está funcionando de manera óptima');
    }

    return recommendations;
  }

  /**
   * Mostrar estadísticas en consola
   */
  displayStats() {
    const report = this.generateReport();
    
    console.log('\n📊 ESTADÍSTICAS DEL BOT');
    console.log('=' .repeat(50));
    console.log(`⏱️  Tiempo de sesión: ${report.sessionDuration.hours} horas`);
    console.log(`📈 Total de leads: ${report.summary.totalLeads}`);
    console.log(`✅ Leads válidos: ${report.summary.totalValidLeads}`);
    console.log(`❌ Leads inválidos: ${report.summary.totalInvalidLeads}`);
    console.log(`📱 Mensajes enviados: ${report.summary.totalMessagesSent}`);
    console.log(`🎯 Tasa de éxito: ${report.summary.successRate}%`);
    console.log(`📊 Eficiencia de mensajes: ${report.summary.messageEfficiency}%`);
    
    console.log('\n📋 SESIONES:');
    console.log(`   Total: ${report.sessions.total}`);
    console.log(`   Exitosas: ${report.sessions.successful}`);
    console.log(`   Fallidas: ${report.sessions.failed}`);
    console.log(`   Timeout: ${report.sessions.timeout}`);
    console.log(`   Tasa de éxito: ${report.sessions.successRate}%`);
    
    console.log('\n💬 MENSAJES:');
    console.log(`   Total: ${report.messages.total}`);
    console.log(`   Verificación (1-2): ${report.messages.byType.verification}`);
    console.log(`   Secuencia (3-8): ${report.messages.byType.sequence}`);
    console.log(`   Promedio por lead: ${report.messages.averagePerLead}`);
    
    console.log('\n👤 RESPUESTAS:');
    console.log(`   Humanas: ${report.responses.human}`);
    console.log(`   Automáticas: ${report.responses.auto}`);
    console.log(`   Sin respuesta: ${report.responses.none}`);
    console.log(`   Tasa humana: ${report.responses.humanRate}%`);
    
    console.log('\n🧠 CACHE:');
    console.log(`   Hits: ${report.cache.hits}`);
    console.log(`   Misses: ${report.cache.misses}`);
    console.log(`   Eficiencia: ${report.cache.efficiency}%`);
    
    console.log('\n⚡ RENDIMIENTO:');
    console.log(`   Tiempo promedio de respuesta: ${report.performance.averageResponseTime}ms`);
    console.log(`   Total de respuestas: ${report.performance.responseCount}`);
    
    console.log('\n💡 RECOMENDACIONES:');
    report.recommendations.forEach(rec => {
      console.log(`   • ${rec}`);
    });
  }

  /**
   * Guardar estadísticas en archivo
   */
  saveStats() {
    try {
      const statsPath = path.join(__dirname, '../stats', 'bot-stats.json');
      
      // Crear directorio si no existe
      const statsDir = path.dirname(statsPath);
      if (!fs.existsSync(statsDir)) {
        fs.mkdirSync(statsDir, { recursive: true });
      }
      
      fs.writeFileSync(statsPath, JSON.stringify(this.stats, null, 2));
    } catch (error) {
      console.error('Error guardando estadísticas:', error.message);
    }
  }

  /**
   * Cargar estadísticas desde archivo
   */
  loadStats() {
    try {
      const statsPath = path.join(__dirname, '../stats', 'bot-stats.json');
      if (fs.existsSync(statsPath)) {
        const data = fs.readFileSync(statsPath, 'utf8');
        this.stats = JSON.parse(data);
        console.log('📊 Estadísticas cargadas desde archivo');
      }
    } catch (error) {
      console.error('Error cargando estadísticas:', error.message);
    }
  }

  /**
   * Iniciar timer de backup
   */
  startBackupTimer() {
    setInterval(() => {
      this.saveStats();
    }, this.backupInterval);
  }

  /**
   * Resetear estadísticas
   */
  resetStats() {
    this.stats = {
      totalLeads: 0,
      totalMessagesSent: 0,
      totalValidLeads: 0,
      totalInvalidLeads: 0,
      verificationSessions: 0,
      successfulSessions: 0,
      failedSessions: 0,
      timeoutSessions: 0,
      messagesByType: {
        verification: 0,
        sequence: 0,
        autoResponse: 0
      },
      humanResponses: 0,
      autoResponses: 0,
      noResponses: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageResponseTime: 0,
      totalResponseTime: 0,
      responseCount: 0,
      successRate: 0,
      messageEfficiency: 0,
      cacheEfficiency: 0,
      leadHistory: [],
      messageHistory: [],
      responseHistory: [],
      sessionStart: Date.now(),
      lastUpdate: Date.now()
    };
    
    this.saveStats();
    console.log('🔄 Estadísticas reseteadas');
  }
}

module.exports = StatsTracker; 