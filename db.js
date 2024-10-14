const mongoose = require('mongoose');

const connectDB = async() =>{
    try{
        await mongoose.connect(process.env.MONGODB_URI,{
            useUnifiedTopology: true,
        });
        console.log('MongoDB connected successfully'); 
    } catch (err) {
        console.error('Falied to connect to MongoDB',err);
        process.exit(1);
    }
};

module.exports = connectDB;