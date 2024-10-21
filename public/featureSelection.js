const _ = require('lodash');

// 接受指紋數據和一個唯一值閾值作為參數
function selectFeatures(fingerprintData, uniquenessThreshold = 0.1, stabilityThreshold = 0.7, minFeatures = 5 /* , maxComputationTime = 100 */) {
    //步驟一　：　收集所有用戶的所有屬性 reduce方法遍歷所有fingerprintData
    const allFeatures = fingerprintData.reduce((acc,fp)=>{
        fp.components.forEach(comp=>{
            if(!acc[comp.key]){
                acc[comp.key] = {values:[] /* , times:[] */};
            }
            acc[comp.key].values.push(comp.value);
            /* acc[comp.key].times.push(comp.duration) */
        });
        return acc;
    },{}) // acc 初始值 = {}

    //步驟二 : 排除無法為所有用戶計算的屬性
    const validFeatures = Object.keys(allFeatures).filter(key=>
        allFeatures[key].values.length === fingerprintData.length && 
        !allFeatures[key].values.some(v =>v === undefined || v === null || v === '')/* &&
        _.mean(allFeatures[key].times) <= maxComputationTime */ //計算時間小於最大計算時間
    ); 
    //選擇那些在所有指紋數據中都存在的特徵。
    //確保選中的特徵沒有缺失值（undefined 或 null 或空字串）。

    //步驟三 : 計算每一個屬性的唯一性和穩定性
    const uniqueness = {};
    const stability = {};
    validFeatures.forEach(key=>{
        const uniqueValues = _.uniq(allFeatures[key].values);
        uniqueness[key] = (uniqueValues.length - 1) / fingerprintData.length;

        // 計算穩定性 : 最常見值的出現頻率
        const valueCounts = _.countBy(allFeatures[key].values);
        const maxCount = _.max(Object.values(valueCounts));
        stability[key] = maxCount / fingerprintData.length;
    });
    // 唯一性 : 唯一值的數量 / 總用戶數

    //步驟四 : 選擇唯一性高於閾值且穩定性高的的屬性
    let selectedFeatures = validFeatures.filter(key => 
        uniqueness[key] > uniquenessThreshold && stability[key] > stabilityThreshold 
    );

    //如果選擇的特徵少於最小數量，則添加更多特徵
    if(selectedFeatures.length < minFeatures) {
        const remainingFeatures = validFeatures
            .filter(f => !selectedFeatures.includes(f))
            .sort((a,b)=>(uniqueness[b] * stability[b]) - (uniqueness[a] * stability[a]));
        selectedFeatures = selectedFeatures.concat(
            remainingFeatures.slice(0,minFeatures - selectedFeatures.length)
        )
    }

    /* console.log("Uniqueness scores:", uniqueness);
    console.log("Stability scores:", stability); */

    return selectedFeatures;
}

module.exports = { selectFeatures }

/*
    未來可以改進的部分 : 
    1. 效率 : 可以考慮用更高效的數據結構或算法來優化性能
    2. 彈性 : 考慮更複雜的特徵重要性評估方法，如信息增益或卡方檢驗。
    3. 錯誤處理 : 錯誤檢查和異常處理。確保fingerprintData不為空。
    4. 文檔 : 添加更多的註釋或文檔字符串來解釋函數的參數和返回值會使代碼更容易理解和維護。
*/