# 小黑ＡＩ聊天測試1
> * 創作日：2024/05/18
> * 最後日：2024/05/18
> * 使用系統：MacOS
> * 創作者：小黑

---
這是一個基於 Flask 和 OpenAI API 的網頁應用，用於與 AI 進行對話。以下是設置和運行此應用的步驟。

### 1. 安裝必要的套件
確認你已經安裝了Python然後在終端機運行以下命令來安裝 
Flask、OpenAI、LangChain 和 python-dotenv
* `python3 --version`

* `pip3 install flask openai langchain python-dotenv`

### 2. 創建資料夾
在你的工作目錄中創建一個新的資料夾
* `pwd`
* 我的是/Users/black/程式練習/my-gpt-project

### 3. 創建 .env 文件
在項目根目錄中創建一個.env的文件，並添加你的 OpenAI API 金鑰
* `nano .env`
裡面的程式碼放
* `OPENAI_API_KEY=[自己的OPENAI_API_KEY]`

### 4. 再去創建app.py輸入程式碼
* `nano app.py`
```
from flask import Flask, render_template, request, jsonify
import openai
from langchain.chains import LLMChain
from langchain.llms import OpenAI
from langchain.prompts import PromptTemplate
from dotenv import load_dotenv
import os

app = Flask(__name__)

# 載入 .env 檔案中的環境變量
load_dotenv()
openai_api_key = os.getenv("OPENAI_API_KEY")

# 設置 OpenAI API 密鑰
openai.api_key = openai_api_key

llm = OpenAI(api_key=openai_api_key, max_tokens=1500) # 調整 max_tokens 為更大的值
prompt_template = PromptTemplate(input_variables=["prompt"], template="{prompt}")
chain = LLMChain(llm=llm, prompt=prompt_template)

@app.route("/")
def home():
     return render_template("index.html")

@app.route("/chat", methods=["POST"])
def chat():
     try:
         user_input = request.json.get("message")
         print("從客戶端收到:", user_input) # 調試
         response = chain.invoke(input=user_input) # 傳遞 input 參數
         print("發送到客戶端的回應:", response) # 調試
         return jsonify({"response": response})
     except Exception as e:
         app.logger.error(f"處理請求出錯: {str(e)}")
         return jsonify({"error": str(e)}), 500



if __name__ == "__main__":
     app.run(debug=True, port=9527)
```
### 5. 在去創建templates資料夾，在templates裡面創建一個index.html的檔案在輸入程式碼
* `mkdir templates`
* `cd templates`
* `nano index.html`
```
<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>小黑AI</title>
    <link rel="stylesheet" href="/static/styles.css">
</head>
<body>
    <div class="chat-container">
        <div id="aiBox" class="chat-box"></div>
        <div id="userBox" class="chat-box"></div>
    </div>
    <div class="input-container">
        <textarea id="userInput" class="chat-input" placeholder="輸入你的訊息..." oninput="autoGrow(this)"></textarea>
        <button id="sendButton" onclick="sendMessage()">發送</button>
    </div>
    <script src="/static/script.js"></script>
</body>
</html>
```

### 6. 在回到my-gpt-project去創建static資料夾，在static資料夾中創建script.js跟styles.css
* `cd ..`
* `mkdir static`
* `cd static`
* `nano script.js`
```
function autoGrow(element) {
    element.style.height = "5px";
    element.style.height = (element.scrollHeight + 10) + "px";
}

let enterPressCount = 0;

document.getElementById("userInput").addEventListener("keydown", function(event) {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        enterPressCount++;
        console.log("按 Enter 次數:", enterPressCount); // 調試
        if (enterPressCount >= 2) {
            sendMessage();
            enterPressCount = 0;
        }
    } else if (event.shiftKey && event.key === "Enter") {
        enterPressCount = 0;
    }
});

function autoScrollToBottom(container) {
    setTimeout(() => {
        container.scrollTop = container.scrollHeight;
    }, 0); // 延遲0毫秒，確保DOM完全更新後執行滾動
}

async function sendMessage() {
    const userInput = document.getElementById("userInput").value;
    if (userInput.trim() === "") {
        console.log("輸入為空。"); // 調試
        return;
    }
    document.getElementById("userInput").value = "";
    autoGrow(document.getElementById("userInput"));

    const userBox = document.getElementById("userBox");
    userBox.textContent += userInput + "\n"; // 更新使用 textContent 以直接新增文字
    autoScrollToBottom(userBox); // 確保滾動到底部

    const response = await fetch("/chat", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ message: userInput })
    });

    const data = await response.json();
    const aiBox = document.getElementById("aiBox");
    aiBox.textContent += data.response.text || '未獲得有效回應'; //直接增加
    autoScrollToBottom(aiBox); // 確保滾動到底部
}
```

* `nano styles.css`

```
body, html {
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
    background-color: #f5f5dc; /* 米白色背景 */
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; /* 設置易讀的字體 */
}

.chat-container {
    width: 100%;
    display: flex;
    justify-content: space-between;
    padding: 20px;
}

.chat-box {
    width: 45%;
    margin: 5px;
    max-height: 80vh; /* 設定最大高度 */
    overflow-y: auto; /* 啟用滾輪 */
    color: #505050; /* 深灰色字體 */
    text-align: left;
    word-wrap: break-word; /* 允許文字自動換行 */
    white-space: pre-wrap; /* 保持空白格式並自動換行 */
}


#aiBox {
    text-align: left;
}

#userBox {
    text-align: right;
}

.input-container {
    width: 100%;
    position: fixed;
    bottom: 0;
    left: 0;
    background-color: #f5f5dc;
    padding: 10px 0;
    text-align: center;
}

.chat-input {
    width: 80%;
    padding: 10px;
    margin-top: 10px;
    border-radius: 5px;
    border: 1px solid #ccc;
    background-color: #fff;
}

button {
    padding: 10px 20px;
    border: none;
    border-radius: 5px;
    background-color: #1e90ff;
    color: #fff;
    cursor: pointer;
    width: 20%;
}
```


### 7. 在去執行python3 app.py
* `python3 app.py`

### 8. 瀏覽器輸入localhost:9527
![截圖 2024-05-18 晚上10.35.59](https://hackmd.io/_uploads/SkMlpVLQC.png)








