const { MongoClient } = require('mongodb');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function testMongo() {
    const uri = process.env.MONGODB_URI;
    console.log('Testing connection to:', uri.replace(/:([^:@]+)@/, ':****@'));
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
    try {
        await client.connect();
        console.log('✅ Connected successfully to server');
        const db = client.db('gmaps-leads-scraper');
        const collections = await db.listCollections().toArray();
        console.log('Collections:', collections.map(c => c.name));
    } catch (err) {
        console.error('❌ Connection error:', err);
    } finally {
        await client.close();
    }
}
testMongo();
