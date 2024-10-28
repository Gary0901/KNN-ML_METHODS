const _= require('lodash'); //添加這行來引入 lodash
const { createSearchIndex } = require('../models/Fingerprint');

function identifyUser(knownFingerprints, newFingerprint, selectedFeatures){
    if(knownFingerprints.length === 0 || selectedFeatures.length === 0) {
        console.log("No known fingerprints of selected features.Treating as new user");
        return {
            isSameUser : false,
            predictedUserId : null, // 使用 _id
            distance: Infinity,
            featureDistances : {} // 添加特徵距離物件
        };
    }

    try {
        // 計算指紋與所有已知指紋的距離
        const distances = knownFingerprints.map(known=>{
            const {distance,featureDistances} = calculateDistance(known, newFingerprint, selectedFeatures);
            return { 
                userId: known._id, // 儲存 _id 
                distance : distance,
                fingerprint: known.fingerprint, // 保留fingerprint 以便除錯
                featureDistances: featureDistances // 保存每個特徵的距離
            };
        });

        // 按距離排序並選擇最近的匹配
        distances.sort((a,b) => a.distance - b.distance);
        const nearestMatch = distances[0];

        // 設定閾值 (這個閾值需要根據實際數據調整)
        const threshold = 0.2;

        // 判斷是否為同一用戶。
        const isSameUser = nearestMatch.distance < threshold;

        console.log("Feature distances for nearest match:",nearestMatch.featureDistances);

        console.log("Distance analysis:",{
            nearestDistance : nearestMatch.distance,
            threshold : threshold,
            allDistances : distances
        });

        return {
            isSameUser : isSameUser,
            predictedUserId : isSameUser ? nearestMatch.userId : null,
            distance : nearestMatch.distance,
            featureDistances : nearestMatch.featureDistances, // 返回特徵距離物件
            matches:distances // 返回所有距離供分析
        }
    } catch (error) {
        console.error("Error in user identification:",error);
        return {
            isSameUser: false,
            predictedUserId: null,
            distance: Infinity,
            featureDistances: {},
            error: error.message
        }
    }
        
}

function calculateDistance(fp1, fp2, selectedFeatures) {
    /* console.log("Calculating distance between", selectedFeatures); */

    const featureDistances = {};

    
    const totalDistance = selectedFeatures.reduce((sum, feature) => {
        const comp1 = fp1.components.find(c => c.key === feature);
        const comp2 = fp2.components.find(c => c.key === feature);

        if(!comp1 || !comp2) {
            console.log(`Warning: Feature ${feature} not found in one of the fingerprints`);
            featureDistances[feature] = 1;
            return sum + 1;
        }

        try {
            let featureDistance;

            switch (feature) {
                // 螢幕相關
                case 'screenResolution':
                case 'availableScreenResolution':
                    const str1 = String(comp1.value);
                    const str2 = String(comp2.value);
                    if (str1.includes('x') && str2.includes('x')) {
                        const [width1, height1] = str1.split('x').map(Number);
                        const [width2, height2] = str2.split('x').map(Number);
                        const widthDiff = Math.abs(width1 - width2) / Math.max(width1, width2);
                        const heightDiff = Math.abs(height1 - height2) / Math.max(height1, height2);
                        featureDistance = (widthDiff + heightDiff) / 2;
                    } else {
                        featureDistance = str1 === str2 ? 0 : 1;
                    }
                    break;

                // 語言相關
                case 'language':
                case 'languages':
                    const langs1 = Array.isArray(comp1.value) ? comp1.value : [comp1.value];
                    const langs2 = Array.isArray(comp2.value) ? comp2.value : [comp2.value];
                    const langIntersection = langs1.filter(l => langs2.includes(l));
                    featureDistance = 1 - (langIntersection.length / Math.max(langs1.length, langs2.length));
                    break;

                // 插件相關
                case 'plugins':
                    const getPluginList = (value) => {
                        if (Array.isArray(value)) return value;
                        if (typeof value === 'string') return value.split(',');
                        if (typeof value === 'object' && value !== null) return Object.values(value);
                        return [];
                    };

                    const plugins1 = new Set(getPluginList(comp1.value));
                    const plugins2 = new Set(getPluginList(comp2.value));
                    const intersection = new Set([...plugins1].filter(x => plugins2.has(x)));
                    const union = new Set([...plugins1, ...plugins2]);
                    featureDistance = 1 - (intersection.size / union.size);
                    break;

                // 渲染相關
                case 'webgl':
                case 'webglVendor':
                case 'webglRenderer':
                    if (typeof comp1.value === 'object' && typeof comp2.value === 'object') {
                        featureDistance = JSON.stringify(comp1.value) === JSON.stringify(comp2.value) ? 0 : 1;
                    } else {
                        featureDistance = comp1.value === comp2.value ? 0 : 1;
                    }
                    break;
                
                case 'canvas':
                    featureDistance = compareCanvasData(comp1.value, comp2.value);

                    // 如果差異不是很大，考慮將其視為相同
                    if(featureDistance < 0.15){
                        featureDistance = 0;
                    }

                    console.log('Canvas comparison details:', {
                        distance: featureDistance,
                        threshold: 0.15
                    });
                    break;

                // 硬體相關
                case 'touchSupport':
                    if (typeof comp1.value === 'object' && typeof comp2.value === 'object') {
                        const touch1 = comp1.value.maxTouchPoints || 0;
                        const touch2 = comp2.value.maxTouchPoints || 0;
                        featureDistance = touch1 === touch2 ? 0 : 0.5;
                    } else {
                        featureDistance = comp1.value === comp2.value ? 0 : 1;
                    }
                    break;

                case 'hardwareConcurrency':
                case 'deviceMemory':
                    const value1 = Number(comp1.value) || 0;
                    const value2 = Number(comp2.value) || 0;
                    featureDistance = Math.abs(value1 - value2) / Math.max(value1, value2, 1);
                    break;

                // 字體相關
                case 'fonts':
                    const getFontList = (value) => {
                        if (Array.isArray(value)) return value;
                        if (typeof value === 'string') return value.split(',');
                        if (typeof value === 'object' && value !== null) return Object.values(value);
                        return [];
                    };

                    const fonts1 = new Set(getFontList(comp1.value));
                    const fonts2 = new Set(getFontList(comp2.value));
                    const fontIntersection = new Set([...fonts1].filter(x => fonts2.has(x)));
                    const fontUnion = new Set([...fonts1, ...fonts2]);
                    featureDistance = 1 - (fontIntersection.size / fontUnion.size);
                    break;

                // 時區相關
                case 'timezone':
                case 'timezoneOffset':
                    featureDistance = comp1.value === comp2.value ? 0 : 1;
                    break;

                // 瀏覽器/系統功能
                case 'sessionStorage':
                case 'localStorage':
                case 'indexedDb':
                case 'addBehavior':
                case 'openDatabase':
                    featureDistance = comp1.value === comp2.value ? 0 : 1;
                    break;

                // 用戶代理相關
                case 'userAgent':
                case 'platform':
                case 'vendor':
                    featureDistance = 1 - stringSimilarity(String(comp1.value), String(comp2.value));
                    break;

                // 預設比較邏輯
                default:
                    if (typeof comp1.value === 'string' && typeof comp2.value === 'string') {
                        featureDistance = 1 - stringSimilarity(comp1.value, comp2.value);
                    } else if (typeof comp1.value === 'number' && typeof comp2.value === 'number') {
                        featureDistance = Math.abs(comp1.value - comp2.value) / Math.max(Math.abs(comp1.value), Math.abs(comp2.value), 1);
                    } else if (typeof comp1.value === 'object' && typeof comp2.value === 'object') {
                        featureDistance = JSON.stringify(comp1.value) === JSON.stringify(comp2.value) ? 0 : 1;
                    } else {
                        featureDistance = comp1.value === comp2.value ? 0 : 1;
                    }
                    break;
            }
            // 在計算完距離後，儲存每個特徵的距離
            featureDistances[feature] = featureDistance;

            //可以選擇是否要印出詳細的比較資訊
            console.log(`Feature ${feature} comparison:`,{
                distance:featureDistance
            });

            return sum + featureDistance;

        } catch (error) {
            console.error(`Error comparing feature ${feature}:`, error);
            featureDistances[feature] = 1;
            return sum + 1;
        }
    }, 0) 

    return {
        distance:totalDistance / selectedFeatures.length,
        featureDistances : featureDistances
    }
}

// 字符串相似度函數 (可使用更複雜的算法，如 Levenshtein distance)
function stringSimilarity(str1,str2) {
    const len = Math.max(str1.length, str2.length);
    if (len === 0) return 1;
    return (len - levenshteinDistance(str1, str2)) / len 
}

function levenshteinDistance(a,b) {
    if(a.length === 0) return b.length;
    if(b.length === 0) return a.length;

    const matrix = [];
    for(let i = 0 ; i<= b.length ;i++){
        matrix[i] = [i];
    }

    for (let j = 0 ; j<=a.length ;j++) {
        matrix[0][j] = [j];
    }

    for (let i=1;i<= b.length ;i++) {
        for (let j=1;j<=a.length ;j++){
            if(b.charAt(i-1) === a.charAt(j-1)){
                matrix[i][j] = matrix[i-1][j-1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i-1][j-1] + 1, // 插入
                    matrix[i][j-1] + 1, //刪除
                    matrix[i-1][j] + 1 // 替換
                )
            }
        }
    }

    return matrix[b.length][a.length];
}

function compareCanvasData(canvas1,canvas2) {
    if(!Array.isArray(canvas1) || !Array.isArray(canvas2)){
        return 1; // 如果格式不對，返回最大距離
    }
    try {
        // 比較 winding 設置
        const windingDistance = canvas1[0] === canvas2[0] ? 0 : 0.3; // winding 不同給予較小的懲罰

        // 比較canvas fp data 
        let dataDistance = 0;
        if(canvas1[1]&& canvas2[1]){
            // 只比較 base64 數據的一部分，不需要完全相同
            const data1 = canvas1[1].slice(0, 1000); // 取前1000個字符
            const data2 = canvas2[1].slice(0, 1000);
            dataDistance = 1 - stringSimilarity(data1, data2);
        } else {
            dataDistance = 1;
        }

        // 綜合計算距離，給予不同權重
        const totalDistance = (windingDistance * 0.3) + (dataDistance * 0.7);
        return totalDistance;
    } catch(error) {
        console.error('Error comparing canvas data:', error);
        return 1;
    }
}

module.exports = {identifyUser};

/*
    未來可以改進的部分 : 
    1. 距離計算 : 距離計算基於特徵值是否完全相同。對於某些類型的特徵太過嚴格。考慮使用更靈活的距離度量，如Jaccard距離或餘弦相似度。
    2. 效率 : 使用更高效的數據結構，如k-d tree來加速最近鄰搜索。
    3. 閾值 : 固定0.5可能不總是最佳的。考慮使其可配置，或是使用更高級的決策方法。
    4. 錯誤處理 : 添加錯誤檢查，例如確保 knownFingerprints 不為空，k 值合理等。
*/