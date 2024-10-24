require('dotenv').config(); // 載入.env 檔案，讓我們可以存取環境變數。
const express = require('express');
const connectDB = require('./db');
const Fingerprint = require('./models/Fingerprint');

const { selectFeatures } = require('./public/featureSelection');
const { identifyUser } = require('./public/userIdentification'); 
const { v4 : uuidv4 } = require('uuid');
const path = require('path');

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
        
        // 確保組件資料被正確格式化
        const formattedComponents = components.map(comp=>({
            key:comp.key,
            value:comp.value
        }))

        // Get all fingerprints from the database
        const allFingerprints = await Fingerprint.find();
        console.log(`Total fingerprints in database: ${allFingerprints.length}`);

        /* const existingFingerprint = allFingerprints.find(fp=>fp.fingerprint === fingerprint);
        if (existingFingerprint) {
            console.log(`Found existing fingerprint: ${fingerprint}`);
        } else {
            console.log(`No existing fingerprint found for: ${fingerprint}`)
        } */
        
        // Select features
        const selectedFeatures = allFingerprints.length > 0 ? selectFeatures(allFingerprints,0.1,0.7,7):[]; // 可以進一步降低閾值
        console.log("Selected Features:",selectedFeatures);
        
        // 用戶識別
        const result = identifyUser(allFingerprints, { fingerprint, components }, selectedFeatures, 5);

        console.log("Identification result:", result);

        if (result.isSameUser) {
            // 使用 _id 查找用戶
            const matchedFingerprint = await Fingerprint.findById(result.predictedUserId);
            
            // 更新該用戶的最新指紋資訊
            matchedFingerprint.components = components;
            matchedFingerprint.fingerprint = fingerprint;
            await matchedFingerprint.save();

            res.json({
                message: "Identified as existing user in database",
                userId: matchedFingerprint._id,
                confidence: result.confidence,
                nearestDistance: result.nearestDistance,
                threshold: result.threshold,
                debug: {  // 添加除錯資訊
                    nearestNeighbors: result.nearestNeighbors,
                    selectedFeatures: selectedFeatures
                }
            });
        } else {
            // 創建新用戶記錄
            const newFingerprint = new Fingerprint({
                fingerprint,
                components
            });
            await newFingerprint.save();
            
            res.json({
                message: "New user created",
                userId: newFingerprint._id,
                confidence: result.confidence,
                nearestDistance: result.nearestDistance,
                threshold: result.threshold
            });
        }
    } catch (err) {
        console.error('Error in /login:', err);
        res.status(500).json({ error: 'Failed to process login' });
    }
});

app.listen(port,()=>{
    console.log(`Server is running at http://localhost:${port}`);
})

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something went wrong!');
  });

module.exports = app;