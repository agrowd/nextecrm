const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://rascapp:Federyco18@neste.kk5zwkb.mongodb.net/gmaps-leads-scraper?appName=Neste';

async function run() {
  try {
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected!');

    // Define schema
    const messageSchema = new mongoose.Schema({}, { strict: false });
    const Message = mongoose.model('Message', messageSchema, 'messages');

    // Get messages from June 10, 2026
    const startOfToday = new Date('2026-06-10T00:00:00Z');
    console.log(`\n--- ALL MESSAGES FROM ${startOfToday.toISOString().split('T')[0]} ---`);
    const messages = await Message.find({ timestamp: { $gte: startOfToday } }).sort({ timestamp: 1 });
    
    if (messages.length === 0) {
      console.log('No messages found for today!');
    } else {
      messages.forEach(msg => {
        console.log(`[${msg.timestamp ? new Date(msg.timestamp).toISOString() : 'N/A'}] [Lead: ${msg.leadName || 'N/A'}] [To: ${msg.phone}] [FromMe: ${msg.fromMe}] [Instance: ${msg.instanceId}] Body: ${msg.content ? msg.content.substring(0, 60) : 'N/A'}...`);
      });
    }

    // Let's get the absolute last 5 messages overall
    console.log(`\n--- ABSOLUTE LATEST 10 MESSAGES OVERALL ---`);
    const latestMessages = await Message.find({}).sort({ timestamp: -1 }).limit(10);
    latestMessages.reverse().forEach(msg => {
      console.log(`[${msg.timestamp ? new Date(msg.timestamp).toISOString() : 'N/A'}] [Lead: ${msg.leadName || 'N/A'}] [To: ${msg.phone}] [FromMe: ${msg.fromMe}] [Instance: ${msg.instanceId}] Body: ${msg.content ? msg.content.substring(0, 60) : 'N/A'}...`);
    });

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB.');
  } catch (error) {
    console.error('Error running script:', error);
  }
}

run();
