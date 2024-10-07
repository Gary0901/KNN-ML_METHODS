// 定義了一個Mongoose模型，用於在MongoDB數據庫中儲存和管理指紋數據

const mongoose = require('mongoose');

// 定義一個新的Mongoose Schema ，訂藝文檔的結構，默認值，驗證等等。
const FingerprintSchema = new mongoose.Schema({
    fingerprint:String,
    components:[{
        key: String,
        value: mongoose.Schema.Types.Mixed
    }],
    isAuthentic:Boolean,
    createdAt:{
        type:Date,
        default:Date.now
    }
});

module.exports = mongoose.model('Fingerprint',FingerprintSchema);