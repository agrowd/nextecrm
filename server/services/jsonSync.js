const fs = require('fs').promises;
const path = require('path');

class JsonSyncService {
  constructor() {
    this.jsonPath = path.join(__dirname, '../data/leads.json');
    this.data = null;
  }

  async loadData() {
    try {
      const content = await fs.readFile(this.jsonPath, 'utf8');
      this.data = JSON.parse(content);
    } catch (error) {
      this.data = {
        leads: [],
        messages: [],
        stats: {
          total_leads: 0,
          leads_with_phone: 0,
          leads_without_phone: 0,
          messages_sent: 0,
          messages_delivered: 0,
          messages_read: 0,
          last_updated: null
        },
        metadata: {
          created_at: new Date().toISOString(),
          version: "1.0.0"
        }
      };
      await this.saveData();
    }
  }

  async saveData() {
    try {
      const dir = path.dirname(this.jsonPath);
      await fs.mkdir(dir, { recursive: true });
      
      this.data.stats.last_updated = new Date().toISOString();
      await fs.writeFile(this.jsonPath, JSON.stringify(this.data, null, 2));
    } catch (error) {
      console.error('❌ Error guardando JSON:', error);
    }
  }

  async syncLeadFromDB(lead) {
    if (!this.data) await this.loadData();
    
    const existingIndex = this.data.leads.findIndex(l => l._id === lead._id.toString());
    const leadData = {
      _id: lead._id.toString(),
      name: lead.name,
      phone: lead.phone,
      address: lead.address,
      website: lead.website,
      hasWebsite: lead.hasWebsite,
      status: lead.status,
      keyword: lead.keyword,
      mapsUrl: lead.mapsUrl,
      location: lead.location,
      createdAt: lead.createdAt,
      updatedAt: lead.updatedAt
    };

    if (existingIndex >= 0) {
      this.data.leads[existingIndex] = leadData;
    } else {
      this.data.leads.push(leadData);
    }

    await this.updateStats();
    await this.saveData();
  }

  async addMessage(messageData) {
    if (!this.data) await this.loadData();
    
    const message = {
      id: messageData.id || Date.now().toString(),
      leadId: messageData.leadId,
      leadName: messageData.leadName,
      phone: messageData.phone,
      messageNumber: messageData.messageNumber,
      content: messageData.content,
      status: messageData.status,
      sentAt: messageData.sentAt,
      deliveredAt: messageData.deliveredAt,
      readAt: messageData.readAt,
      error: messageData.error
    };

    this.data.messages.push(message);
    await this.updateStats();
    await this.saveData();
  }

  async updateMessageStatus(messageId, status, timestamp = new Date()) {
    if (!this.data) await this.loadData();
    
    const message = this.data.messages.find(m => m.id === messageId);
    if (message) {
      message.status = status;
      
      switch (status) {
        case 'delivered':
          message.deliveredAt = timestamp;
          break;
        case 'read':
          message.readAt = timestamp;
          break;
        case 'failed':
          message.error = 'Message failed to deliver';
          break;
      }
      
      await this.updateStats();
      await this.saveData();
    }
  }

  async updateStats() {
    if (!this.data) return;
    
    const leads = this.data.leads;
    const messages = this.data.messages;
    
    this.data.stats = {
      total_leads: leads.length,
      leads_with_phone: leads.filter(l => l.phone && l.phone.trim()).length,
      leads_without_phone: leads.filter(l => !l.phone || !l.phone.trim()).length,
      messages_sent: messages.filter(m => m.status === 'sent').length,
      messages_delivered: messages.filter(m => m.status === 'delivered').length,
      messages_read: messages.filter(m => m.status === 'read').length,
      last_updated: new Date().toISOString()
    };
  }

  async getStats() {
    if (!this.data) await this.loadData();
    return this.data.stats;
  }

  async getLeads() {
    if (!this.data) await this.loadData();
    return this.data.leads;
  }

  async getMessages() {
    if (!this.data) await this.loadData();
    return this.data.messages;
  }
}

module.exports = new JsonSyncService(); 