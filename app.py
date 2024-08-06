from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os
from openai import OpenAI
from upload import upload_bp  

app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app, resources={r"/chat": {"origins": "http://localhost:3000"}})  

# 載入 .env 檔案中的環境變數
load_dotenv()
openai_api_key = os.getenv("OPENAI_API_KEY")

# 上傳藍圖
app.register_blueprint(upload_bp, url_prefix='/api')

# 設定 OpenAI API 金鑰
client = OpenAI(api_key=openai_api_key)

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/chat", methods=["POST"])
def chat():
    try:
        user_input = request.json.get("message")
        print("從客戶端收到:", user_input)  # 調試

        # 使用 OpenAI 的聊天模型 API
        response = client.chat.completions.create(
            model="gpt-4o", 
            messages=[{"role": "user", "content": user_input}],
            max_tokens=3000
        )

        # 從回應中提取文本
        message = response.choices[0].message.content
        print("傳送到客戶端的回應:", message)  
        return jsonify({"response": message})
    except Exception as e:
        app.logger.error(f"處理請求出錯: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=9527, debug=True)