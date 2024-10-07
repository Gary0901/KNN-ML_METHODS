// 實現了 K nearest neighbors 的算法。它接受已知的指紋，新的指紋，選定的特徵值和K值作為參數。

function identifyUser(knownFingerprints, newFingerprint, selectedFeatures,k = 3){
    // 計算指紋與所有已知指紋的距離
    const distances = knownFingerprints.map(known=>{
        const distance = calculateDistance(known, newFingerprint, selectedFeatures);
        return { fingerprint: known, distance };
    });

    // 按距離排序並選擇k個最近鄰
    distances.sort((a,b) => a.distance - b.distance);
    const nearestNeighbors = distances.slice(0,k);

    // 計算認證概率，即K個最近鄰中真實用戶的比例
    const authenticCount = nearestNeighbors.filter(n=>n.fingerprint.isAuthentic).length;
    const probability = authenticCount / k; // 計算認證概率。

    /*  例如，如果 K = 5（考慮 5 個最近鄰），而其中 3 個是authentic的，那麼：
        authenticCount 將會是 3
        probability 將會是 3/5 = 0.6，即 60% 的概率 
    */

    return {
        isAuthentic : probability > 0.5,
        probability: probability 
    };
}

function calculateDistance(fp1,fp2,selectedFeatures){
    return selectedFeatures.reduce((sum,feature)=>{
        const value1 = fp1.components.find(c=>c.key === feature).value;
        const value2 = fp2.components.find(c=>c.key === feature).value;
        return sum + (value1 === value2 ? 0 : 1);
    },0);
}

module.exports = {identifyUser};