# 小黑ＡＩ聊天測試1
> * 創作日：2024/05/18
> * 最後日：2024/05/18
> * 使用系統：MacOS
> * 創作者：小黑

---
這是一個基於 Flask 和 OpenAI API 的網頁應用，用於與 AI 進行對話。以下是設置和運行此應用的步驟。

* 1. 安裝必要的套件
確認你已經安裝了Python然後在終端機運行以下命令來安裝 
Flask、OpenAI、LangChain 和 python-dotenv
![AI筆記1-確認python版本](https://hackmd.io/_uploads/HkCE0CrmC.png)

![AI筆記2-安裝套件](https://hackmd.io/_uploads/H1UBARrmC.png)

* 2. 創建資料夾
在你的工作目錄中創建一個新的資料夾
我的是/Users/black/程式練習/my-gpt-project
![AI筆記3-位置](https://hackmd.io/_uploads/H1FRACSX0.png)

* 3. 創建 .env 文件
在項目根目錄中創建一個.env的文件，並添加你的 OpenAI API 金鑰
![AI筆記4ＡＰＩＫＥＹ](https://hackmd.io/_uploads/ryzlgJLQR.png)

* 4. 再去創建app.py輸入程式碼
```
from flask import Flask, render_template, request, jsonify
import openai
from langchain.chains import LLMChain
from langchain.llms import OpenAI
from langchain.prompts import PromptTemplate
from dotenv import load_dotenv
import os

app = Flask(__name__)

load_dotenv()
openai_api_key = os.getenv("OPENAI_API_KEY")

# 設置 OpenAI API 金鑰
openai.api_key = openai_api_key

llm = OpenAI(api_key=openai_api_key)
prompt_template = PromptTemplate(input_variables=["prompt"], template="{prompt}")
chain = LLMChain(llm=llm, prompt=prompt_template)

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/chat", methods=["POST"])
def chat():
    user_input = request.json.get("message")
    response = chain.run(prompt=user_input)
    return jsonify({"response": response})

if __name__ == "__main__":
    app.run(debug=True, port=9527)
```

* 5. templates資料夾中創建一個index.html的檔案在輸入程式碼
```
 <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>小黑AI</title>
    <style>
        body {
            background-color: #000;
            color: #fff;
            font-family: Arial, sans-serif;
        }
        .chat-container {
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        .chat-box {
            width: 80%;
            margin-top: 20px;
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            word-wrap: break-word; /* 確保文本自動換行 */
        }
        .chat-input {
            width: 50%;
            padding: 10px;
            margin-top: 20px;
            border-radius: 5px;
            border: 1px solid #ccc;
            margin-bottom: 10px;
            background-color: #f5f5dc; /* 米白色背景 */
            overflow: hidden;
            resize: none; /* 禁止調整大小 */
        }
        .chat-message {
            margin: 10px 0;
            display: flex;
            justify-content: space-between;
            width: 100%;
        }
        .chat-message .user, .chat-message .ai {
            padding: 10px;
            border-radius: 5px;
            white-space: pre-wrap; /* 保持空白字符並換行 */
            max-width: 45%;
            background-color: #f5f5dc; /* 米白色背景 */
        }
        .chat-message .user {
            color: #1e90ff;
            text-align: right;
            margin-left: auto;
        }
        .chat-message .ai {
            color: #32cd32;
            text-align: left;
            margin-right: auto;
        }
        button {
            padding: 10px 20px;
            margin-top: 10px;
            border: none;
            border-radius: 5px;
            background-color: #1e90ff;
            color: #fff;
            cursor: pointer;
        }
        .input-container {
            display: flex;
            justify-content: center;
            width: 100%;
            position: fixed;
            bottom: 0;
            background-color: #000;
            padding: 10px 0;
        }
    </style>
</head>
<body>
    <div class="chat-container">
        <h1>小黑AI</h1>
        <div id="chatBox" class="chat-box"></div>
        <div class="input-container">
            <textarea id="userInput" rows="1" class="chat-input" placeholder="輸入你的訊息..." oninput="autoGrow(this)"></textarea><br>
            <button onclick="sendMessage()">發送</button>
        </div>
    </div>

    <script>
        function autoGrow(element) {
            element.style.height = "5px";
            element.style.height = (element.scrollHeight) + "px";
        }

        document.getElementById("userInput").addEventListener("keydown", function(event) {
            if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                sendMessage();
            }
        });

        async function sendMessage() {
            const userInput = document.getElementById("userInput").value;
            if (userInput.trim() === "") {
                return;
            }
            const response = await fetch("/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ message: userInput })
            });
            const data = await response.json();
            const chatBox = document.getElementById("chatBox");
            chatBox.innerHTML += `<div class="chat-message"><div class="ai"><strong>AI:</strong> ${data.response}</div><div class="user"><strong>你:</strong> ${userInput}</div></div>`;
            document.getElementById("userInput").value = "";
            autoGrow(document.getElementById("userInput"));
            chatBox.scrollTop = chatBox.scrollHeight;
        }
    </script>
</body>
</html>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>小黑AI</title>
    <style>
        body {
            background-color: #000;
            color: #fff;
            font-family: Arial, sans-serif;
        }
        .chat-container {
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        .chat-box {
            width: 80%;
            margin-top: 20px;
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            word-wrap: break-word; /* 確保文本自動換行 */
        }
        .chat-input {
            width: 50%;
            padding: 10px;
            margin-top: 20px;
            border-radius: 5px;
            border: 1px solid #ccc;
            margin-bottom: 10px;
            background-color: #f5f5dc; /* 米白色背景 */
            overflow: hidden;
            resize: none; /* 禁止調整大小 */
        }
        .chat-message {
            margin: 10px 0;
            display: flex;
            justify-content: space-between;
            width: 100%;
        }
        .chat-message .user, .chat-message .ai {
            padding: 10px;
            border-radius: 5px;
            white-space: pre-wrap; /* 保持空白字符並換行 */
            max-width: 45%;
            background-color: #f5f5dc; /* 米白色背景 */
        }
        .chat-message .user {
            color: #1e90ff;
            text-align: right;
            margin-left: auto;
        }
        .chat-message .ai {
            color: #32cd32;
            text-align: left;
            margin-right: auto;
        }
        button {
            padding: 10px 20px;
            margin-top: 10px;
            border: none;
            border-radius: 5px;
            background-color: #1e90ff;
            color: #fff;
            cursor: pointer;
        }
        .input-container {
            display: flex;
            justify-content: center;
            width: 100%;
            position: fixed;
            bottom: 0;
            background-color: #000;
            padding: 10px 0;
        }
    </style>
</head>
<body>
    <div class="chat-container">
        <h1>小黑AI</h1>
        <div id="chatBox" class="chat-box"></div>
        <div class="input-container">
            <textarea id="userInput" rows="1" class="chat-input" placeholder="輸入你的訊息..." oninput="autoGrow(this)"></textarea><br>
            <button onclick="sendMessage()">發送</button>
        </div>
    </div>

    <script>
        function autoGrow(element) {
            element.style.height = "5px";
            element.style.height = (element.scrollHeight) + "px";
        }

        document.getElementById("userInput").addEventListener("keydown", function(event) {
            if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                sendMessage();
            }
        });

        async function sendMessage() {
            const userInput = document.getElementById("userInput").value;
            if (userInput.trim() === "") {
                return;
            }
            const response = await fetch("/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ message: userInput })
            });
            const data = await response.json();
            const chatBox = document.getElementById("chatBox");
            chatBox.innerHTML += `<div class="chat-message"><div class="ai"><strong>AI:</strong> ${data.response}</div><div class="user"><strong>你:</strong> ${userInput}</div></div>`;
            document.getElementById("userInput").value = "";
            autoGrow(document.getElementById("userInput"));
            chatBox.scrollTop = chatBox.scrollHeight;
        }
    </script>
</body>
</html>
```

* 6. 在去執行python3 app.py
![AI筆記5-執行](https://hackmd.io/_uploads/rJ22b1UXR.png)

* 7. 瀏覽器輸入localhost:9527
![AI測試9](https://hackmd.io/_uploads/HyORWJ870.png)








