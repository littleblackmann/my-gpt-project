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
from dotenv import load_dotenv
import os
from openai import OpenAI

app = Flask(__name__)

# 載入 .env 檔案中的環境變數
load_dotenv()
openai_api_key = os.getenv("OPENAI_API_KEY")

# 設定 OpenAI API 金鑰
client = OpenAI(api_key=openai_api_key)

@app.route("/")
def home():
     return render_template("index.html")

@app.route("/chat", methods=["POST"])
def chat():
     try:
         user_input = request.json.get("message")
         print("從客戶端收到:", user_input) # 調試

         # 使用 OpenAI 的聊天模型 API
         response = client.chat.completions.create(
             model="gpt-4o", # 確保使用適當的模型
             messages=[{"role": "user", "content": user_input}],
             max_tokens=1500
         )

         # 從回應中提取文本
         message = response.choices[0].message.content
         print("傳送到客戶端的回應:", message) # 偵錯
         return jsonify({"response": message})
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
// 此函數使輸入框根據內容自動調整高度
function autoGrow(element) {
    element.style.height = "5px";
    element.style.height = (element.scrollHeight + 10) + "px";
}

// 為輸入框添加事件監聽器，處理按下 Enter 鍵發送消息
document.getElementById("userInput").addEventListener("keydown", function(event) {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault(); // 阻止預設的 Enter 鍵行為（新增換行）
        sendMessage(); // 發送消息
    }
});

// 這個函數處理消息的發送
async function sendMessage() {
    const userInput = document.getElementById("userInput").value.trim();
    if (!userInput) {
        console.log("輸入為空。"); // 如果輸入是空的，不執行任何操作
        return;
    }
    document.getElementById("userInput").value = ""; // 清空輸入框
    autoGrow(document.getElementById("userInput")); // 調整輸入框大小

    // 在使用者消息框中顯示輸入
    const userBox = document.getElementById("userBox");
    userBox.textContent += "" + userInput + "\n"; // 添加使用者的輸入
    autoScrollToBottom(userBox); // 自動滾動到底部

    // 向後端發送 POST 請求
    const response = await fetch("/chat", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ message: userInput })
    });

    if (!response.ok) {
        console.error('Failed to fetch:', response.status);
        return;
    }

    // 處理後端的回應
    const data = await response.json();
    const aiBox = document.getElementById("aiBox");
    aiBox.textContent += "" + (data.response || '未獲得有效回應') + "\n"; // 顯示 AI 回應
    autoScrollToBottom(aiBox); // 確保滾動到底部
}

// 此函數確保聊天框可以自動滾動到底部
function autoScrollToBottom(container) {
    container.scrollTop = container.scrollHeight;
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
![GPT-4結果圖](https://hackmd.io/_uploads/rkzjx0FQ0.png)










