// 實現了 K nearest neighbors 的算法。它接受已知的指紋，新的指紋，選定的特徵值和K值作為參數。
const _= require('lodash'); //添加這行來引入 lodash

function identifyUser(knownFingerprints, newFingerprint, selectedFeatures,k = 5){
    if(knownFingerprints.length === 0 || selectedFeatures.length === 0) {
        console.log("No known fingerprints of selected features.Treating as new user");
        return {
            isAuthentic: false,
            probability: 0,
            distance: Infinity,
            threshold: Infinity
        };
    }

    // 計算指紋與所有已知指紋的距離
    const distances = knownFingerprints.map(known=>{
        const distance = calculateDistance(known, newFingerprint, selectedFeatures);
        return { fingerprint: known, distance };
    });

    // 按距離排序並選擇k個最近鄰
    distances.sort((a,b) => a.distance - b.distance);
    const nearestNeighbors = distances.slice(0, Math.min(k, distances.length));

    // 計算認證概率，即K個最近鄰中真實用戶的比例
    const authenticCount = nearestNeighbors.filter(n => n.fingerprint.isAuthentic).length;
    const probability = authenticCount / nearestNeighbors.length; // 計算認證概率。

    /*  例如，如果 K = 5（考慮 5 個最近鄰），而其中 3 個是authentic的，那麼：
        authenticCount 將會是 3
        probability 將會是 3/5 = 0.6，即 60% 的概率 
    */

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

    // Adjust the conditions for isAuthentic 
    const isAuthentic = probability > 0.5 && distances[0].distance < threshold;

    return {
        isAuthentic: isAuthentic,
        probability: probability,
        distance: distances[0]?.distance || Infinity,
        threshold: threshold
    };
}

function calculateDistance(fp1,fp2,selectedFeatures){
    return selectedFeatures.reduce((sum,feature)=>{
        const comp1 = fp1.components.find(c=>c.key === feature);
        const comp2 = fp2.components.find(c=>c.key === feature);

        if(!comp1 || !comp2) {
            console.log(`Waring :Feature${feature} not found in one of the fingerprints`);
            return sum + 1; // Treat missing features as maximum difference  
        }

        const value1 = comp1.value;
        const value2 = comp2.value;

        // 使用更靈活的比較方法
        if(typeof value1 === 'string' && typeof value2 === 'string'){
            return sum +(1 - stringSimilarity(value1,value2));
        } else if (typeof value1 === 'number' && typeof value2 === 'number'){
            return sum + Math.abs(value1 - value2) / Math.max(Math.abs(value1), Math.abs(value2), 1);
        } else {
            return sum +(value1 === value2 ? 0 : 1);
        }
    },0) / selectedFeatures.length; //正規化距離
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