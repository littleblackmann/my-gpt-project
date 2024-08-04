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
             max_tokens=3000
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