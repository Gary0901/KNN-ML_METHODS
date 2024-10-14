//使用fingerprintjs2庫收集瀏覽器的各種特徵
function collectAndSendFingerprint(){
    Fingerprint2.get(function(components){ 
        // 使用Fingerprint2 庫收集瀏覽器指紋
        const values = components.map(function(component){return component.value});
        const fingerprint = Fingerprint2.x64hash128(values.join(''),31); 

        // 發送指紋到服務器的 /login 端點
        fetch('/login',{
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({fingerprint:fingerprint,components:components})
        }).then(response=>response.json())
        .then(result=>{
            // 顯示服務器返回的結果
            document.getElementById('status').innerText = result.message + 
                ' Fingerprint: ' + result.fingerprint + 
                ' Probability: ' + (result.probability * 100).toFixed(2) + '%';
        })
        .catch(err=>{
            console.error('Error:',err);
        });
    });
}


// 用戶識別
function identifyUser(){
    Fingerprint2.get(function(components){
        // 再次收集指紋
        const values = components.map(function(component){
            return component.value;
        });
        const fingerprint = Fingerprint2.x64hash128(values.join(''), 31);
        
        //發送指紋到服務器的 /identify 端點
        fetch('/identify',{
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({fingerprint: fingerprint , components : components})
        })
        .then(response => response.json())
        .then(result => {
            // 顯示識別結果
            if (result.message === "User identified") {
                document.getElementById('status').innerText = `User identified with ${result.probability * 100}% probability`;
            } else if (result.message === "New user saved") {
                document.getElementById('status').innerText = `New user saved with fingerprint: ${result.fingerprint}`;
            }
        })
        .catch(err => {
            console.error('Error:', err);
        });
    });
}

function checkDataExistence(){
    Fingerprint2.get(function(components){
        const values = components.map(function(component){
            return component.value;
        });
        const fingerprint = Fingerprint2.x64hash128(values.join(''),31);

        fetch('/checkData',{
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({fingerprint:fingerprint})
        })
            .then(response => response.json())
            .then(result => {
                if (result.exists) {
                    document.getElementById('status').innerText = '你的資料已被存在資料庫，ID: ' + result.fingerprint;
                } else {
                    document.getElementById('status').innerText = '你的資料尚未被存入資料庫。';
                }
            });
    })
}

// 添加一個按鈕來觸發識別過程
document.getElementById('identifyButton').addEventListener('click', identifyUser);

// 你可以在需要的时候调用 identifyUser 函数，例如：
// document.getElementById('identifyButton').addEventListener('click', identifyUser);

//新增錯誤處理和日誌記錄
//實現資料持久化（例如,使用資料庫儲存指紋資料）
//新增使用者介面來展示收集和識別過程
//實現更多的安全措施,如API認證
//新增單元測試和整合測試

/*
    mongoDB Atlas
    username: gary50132
    Password : NvHvn8TGSroRRC9o
    
    mongodb+srv://gary50132:<db_password>@cluster0-forknn-method.g2inm.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0-forKNN-method
*/