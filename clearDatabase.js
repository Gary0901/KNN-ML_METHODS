// clearDatabase.js

require('dotenv').config();
const mongoose = require('mongoose');
const Fingerprint = require('./models/Fingerprint');  // 確保路徑正確

async function clearDatabase() {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log('Connected to database');

        await Fingerprint.deleteMany({});
        console.log('All fingerprints have been deleted');

        mongoose.connection.close();
        console.log('Database connection closed');
    } catch (error) {
        console.error('Error clearing database:', error);
    }
}

clearDatabase();