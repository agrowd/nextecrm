const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function testConn() {
    try {
        const uri = process.env.MONGODB_URI;
        console.log('Connecting to:', uri.replace(/:([^:@]+)@/, ':****@'));
        await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
        console.log('✅ Connected!');
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('Collections:', collections.map(c => c.name));
        await mongoose.disconnect();
    } catch (err) {
        console.error('❌ Connection failed:', err);
        process.exit(1);
    }
}
testConn();
