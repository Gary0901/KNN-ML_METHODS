const mongoose = require('mongoose');

const connectDB = async() =>{
    try{
        await mongoose.connect('mongodb+srv://gary50132:NvHvn8TGSroRRC9o@cluster0-forknn-method.g2inm.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0-forKNN-method',{
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('MongoDB connected successfully'); 
    } catch (err) {
        console.error('Falied to connect to MongoDB',err);
        process.exit(1);
    }
};

module.exports = connectDB;