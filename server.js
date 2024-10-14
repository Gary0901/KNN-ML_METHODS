require('dotenv').config(); // 載入.env 檔案，讓我們可以存取環境變數。
const express = require('express');
const connectDB = require('./db');
const Fingerprint = require('./models/Fingerprint');

const { selectFeatures } = require('./public/featureSelection');
const { identifyUser } = require('./public/userIdentification'); 
const { v4 : uuidv4 } = require('uuid');

const app = express();
const port = 3000;

connectDB(); // 連接到MongoDB 資料庫。

app.use(express.json()); // 允許服務器解釋JSON格式的請求體。
app.use(express.static('public')); // 設置靜態文件服務，使public文件夾中的文件可以直接被訪問。

app.get('/',(req,res)=>{
    res.sendFile(path.join(__dirname,'public','index.html'))
})

app.post('/login', async (req, res) => {
    try {
        const { fingerprint, components } = req.body;
        
        // Get all fingerprints from the database
        const allFingerprints = await Fingerprint.find();
        console.log("allFingerprints",allFingerprints);
        
        console.log("Number of fingerprints:", allFingerprints.length);
        console.log("Sample fingerprint components:", allFingerprints[0].components.slice(0, 3));
        
        // Select features
        const selectedFeatures = selectFeatures(allFingerprints,0.2); // 可以進一步降低閾值
        console.log("Selected Features:",selectedFeatures);
        
        // Identify user
        const identificationResult = identifyUser(allFingerprints, { fingerprint, components }, selectedFeatures);
        
        if (identificationResult.isAuthentic) {
            // User identified, check if in database
            const existingFingerprint = await Fingerprint.findOne({ fingerprint });
            
            if (existingFingerprint) {
                res.json({ 
                    message: "User identified and found in database",
                    fingerprint: existingFingerprint.fingerprint,
                    probability: identificationResult.probability
                });
            } else {
                // User identified but not in database, save them
                const newFingerprint = new Fingerprint({
                    fingerprint,
                    components,
                });
                await newFingerprint.save();
                res.json({ 
                    message: "User identified but not found in database. New entry created.",
                    fingerprint: newFingerprint.fingerprint,
                    probability: identificationResult.probability
                });
            }
        } else {
            // User not identified, save as new user
            const newFingerprint = new Fingerprint({
                fingerprint,
                components,
            });
            await newFingerprint.save();
            res.json({ 
                message: "New user created",
                fingerprint: newFingerprint.fingerprint,
                probability: identificationResult.probability
            });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to process login' });
    }
});

app.listen(port,()=>{
    console.log(`Server is running at http://localhost:${port}`);
})

module.exports = app;