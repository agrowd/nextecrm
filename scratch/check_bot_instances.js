const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../server/.env') });

const BotInstance = require('../server/models/BotInstance');

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/gmaps-leads-scraper';
  console.log('Connecting to', uri);
  await mongoose.connect(uri);
  
  const bots = await BotInstance.find({});
  console.log('Bot Instances:');
  console.log(JSON.stringify(bots, null, 2));
  
  await mongoose.disconnect();
}

main().catch(console.error);
