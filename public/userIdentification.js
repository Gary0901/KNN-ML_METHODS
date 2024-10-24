// 實現了 K nearest neighbors 的算法。它接受已知的指紋，新的指紋，選定的特徵值和K值作為參數。
const _= require('lodash'); //添加這行來引入 lodash

function determineOptimalK(totalFingerprints) {
    // 常見的經驗法則 : k = √n，其中n為樣本總數
    const k = Math.round(Math.sqrt(totalFingerprints.length));

    // 設置合理的上下限
    const minK = 3;  // 至少要3個鄰居
    const maxK = 15; // 至少要15個鄰居

    return Math.min(Math.max(k,minK),maxK);
}

function identifyUser(knownFingerprints, newFingerprint, selectedFeatures){
    const k = determineOptimalK(knownFingerprints);
    if(knownFingerprints.length === 0 || selectedFeatures.length === 0) {
        console.log("No known fingerprints of selected features.Treating as new user");
        return {
            isSameUser : false,
            predictedUserId : null, // 使用 _id
            confidence : 0,
            nearestDistance : Infinity,
            nearestNeighbors:[] // 添加以便追蹤
        };
    }

    // 計算指紋與所有已知指紋的距離
    const distances = knownFingerprints.map(known=>{
        const distance = calculateDistance(known, newFingerprint, selectedFeatures);
        return { 
            userId: known._id, // 儲存 _id 
            distance : distance,
            fingerprint: known.fingerprint // 保留fingerprint 以便除錯
         };
    });

    // 按距離排序並選擇k個最近鄰
    distances.sort((a,b) => a.distance - b.distance);
    const nearestNeighbors = distances.slice(0, Math.min(k, distances.length));

    // 分析最近鄰中的用戶ID分布
    const userCounts = {};
    nearestNeighbors.forEach(n=>{
        userCounts[n.userId] = (userCounts[n.userId] || 0) +1;
    })

    // 選擇最多的用戶ID
    const [mostFrequentUserId, count] = Object.entries(userCounts)
        .sort((a,b)=>b[1] - a[1])[0];
        
    // 計算 confidence 
    const confidence = count / k;

    // 計算距離閾值
    let meanDistance = 0;
    let stdDevDistance = 0;
    let threshold = Infinity;

    if (nearestNeighbors.length > 0) {
        meanDistance = _.mean(nearestNeighbors.map(n => n.distance));
        stdDevDistance = Math.sqrt(_.mean(nearestNeighbors.map(n => Math.pow(n.distance - meanDistance, 2))));
        threshold = meanDistance + stdDevDistance;
    }

    console.log("Nearest neighbors:",nearestNeighbors.map(n=>({
        distance:n.distance,
        isAuthentic:n.fingerprint.isAuthentic,
        fingerprintId:n.fingerprint._id
    })));
    console.log("Mean distance:",meanDistance,"StdDev:",stdDevDistance,"Threshold:",threshold);


    return {
        isSameUser : confidence >= 0.6 && distances[0].distance < threshold,
        predictedUserId : mostFrequentUserId,
        confidence : confidence,
        nearestDistance : distances[0].distance,
        threshold : threshold,
        nearestNeighbors:nearestNeighbors // 返回最近鄰資訊以便除錯
    };
}

function calculateDistance(fp1,fp2,selectedFeatures){
    // 先印出debug的資訊
    console.log("Calculating distance between",selectedFeatures);
    
    return selectedFeatures.reduce((sum,feature)=>{
        const comp1 = fp1.components.find(c=>c.key === feature);
        const comp2 = fp2.components.find(c=>c.key === feature);

        if(!comp1 || !comp2) {
            console.log(`Waring :Feature${feature} not found in one of the fingerprints`);
            return sum + 1; // Treat missing features as maximum difference  
        }

        /* console.log(`Comparing feature ${feature}:`, {
            value1: comp1.value,
            type1: typeof comp1.value,
            value2: comp2.value,
            type2: typeof comp2.value
        }); */

        // 針對不同類型的特徵使用不同的比較方法
        try {
            switch (feature) {
                case 'screenResolution':
                case 'availableScreenResolution':
                    // 確保值是字串或可以轉換為字串
                    const str1 = String(comp1.value);
                    const str2 = String(comp2.value);
                    if (str1.includes('x') && str2.includes('x')) {
                        const [width1, height1] = str1.split('x').map(Number);
                        const [width2, height2] = str2.split('x').map(Number);
                        const widthDiff = Math.abs(width1 - width2) / Math.max(width1, width2);
                        const heightDiff = Math.abs(height1 - height2) / Math.max(height1, height2);
                        return sum + (widthDiff + heightDiff) / 2;
                    }
                    return sum + (str1 === str2 ? 0 : 1);

                case 'plugins':
                    // 安全地處理插件資訊
                    const getPluginList = (value) => {
                        if (Array.isArray(value)) {
                            return value;
                        } else if (typeof value === 'string') {
                            return value.split(',');
                        } else if (typeof value === 'object' && value !== null) {
                            return Object.values(value);
                        }
                        return [];
                    };

                    const plugins1 = new Set(getPluginList(comp1.value));
                    const plugins2 = new Set(getPluginList(comp2.value));
                    const intersection = new Set([...plugins1].filter(x => plugins2.has(x)));
                    const union = new Set([...plugins1, ...plugins2]);
                    return sum + (1 - (intersection.size / union.size));

                case 'webgl':
                    // 處理 WebGL 資訊
                    if (typeof comp1.value === 'object' && typeof comp2.value === 'object') {
                        // 如果是物件，比較其字串表示
                        return sum + (JSON.stringify(comp1.value) === JSON.stringify(comp2.value) ? 0 : 1);
                    }
                    return sum + (comp1.value === comp2.value ? 0 : 1);

                case 'touchSupport':
                    // 處理觸控支援資訊
                    if (typeof comp1.value === 'object' && typeof comp2.value === 'object') {
                        const touch1 = comp1.value.maxTouchPoints || 0;
                        const touch2 = comp2.value.maxTouchPoints || 0;
                        return sum + (touch1 === touch2 ? 0 : 0.5);
                    }
                    return sum + (comp1.value === comp2.value ? 0 : 1);

                case 'fonts':
                    // 處理字體列表
                    const getFontList = (value) => {
                        if (Array.isArray(value)) {
                            return value;
                        } else if (typeof value === 'string') {
                            return value.split(',');
                        } else if (typeof value === 'object' && value !== null) {
                            return Object.values(value);
                        }
                        return [];
                    };

                    const fonts1 = new Set(getFontList(comp1.value));
                    const fonts2 = new Set(getFontList(comp2.value));
                    const fontIntersection = new Set([...fonts1].filter(x => fonts2.has(x)));
                    const fontUnion = new Set([...fonts1, ...fonts2]);
                    return sum + (1 - (fontIntersection.size / fontUnion.size));

                default:
                    // 預設比較邏輯
                    if (typeof comp1.value === 'string' && typeof comp2.value === 'string') {
                        return sum + (1 - stringSimilarity(comp1.value, comp2.value));
                    } else if (typeof comp1.value === 'number' && typeof comp2.value === 'number') {
                        return sum + Math.abs(comp1.value - comp2.value) / Math.max(Math.abs(comp1.value), Math.abs(comp2.value), 1);
                    } else if (typeof comp1.value === 'object' && typeof comp2.value === 'object') {
                        return sum + (JSON.stringify(comp1.value) === JSON.stringify(comp2.value) ? 0 : 1);
                    } else {
                        return sum + (comp1.value === comp2.value ? 0 : 1);
                    }
            }
        } catch (error) {
            console.error(`Error comparing feature ${feature}:`, error);
            return sum + 1; // 如果比較出錯，視為最大差異
        }
    }, 0) / selectedFeatures.length;
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

module.exports = {identifyUser};

/*
    未來可以改進的部分 : 
    1. 距離計算 : 距離計算基於特徵值是否完全相同。對於某些類型的特徵太過嚴格。考慮使用更靈活的距離度量，如Jaccard距離或餘弦相似度。
    2. 效率 : 使用更高效的數據結構，如k-d tree來加速最近鄰搜索。
    3. 閾值 : 固定0.5可能不總是最佳的。考慮使其可配置，或是使用更高級的決策方法。
    4. 錯誤處理 : 添加錯誤檢查，例如確保 knownFingerprints 不為空，k 值合理等。
*/