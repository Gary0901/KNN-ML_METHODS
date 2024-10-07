const _ = require('lodash');

// 接受指紋數據和一個唯一值閾值作為參數
function selectFeatures(fingerprintData, uniquenessThreshold = 0.5 /* , maxComputationTime = 100 */) {
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

    //步驟三 : 計算每一個屬性的唯一性
    const uniqueness = {};
    validFeatures.forEach(key=>{
        const uniqueValues = _.uniq(allFeatures[key].values);
        uniqueness[key] = (uniqueValues.length - 1) / fingerprintData.length;
    });
    // 唯一性 : 唯一值的數量 / 總用戶數

    //步驟四 : 選擇唯一性高於閾值的屬性
    const selectedFeatures = validFeatures.filter(key => 
        uniqueness[key] > uniquenessThreshold 
    );

    /* console.log("Valid Features:",validFeatures);
    console.log("Uniqueness:",uniqueness);
    console.log("Selected Features:",selectedFeatures); */

    return selectedFeatures;
}

module.exports = { selectFeatures }