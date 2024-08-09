from flask import Flask, render_template, request, jsonify, session
from flask_cors import CORS
from dotenv import load_dotenv
from openai import OpenAI
import os
from upload import upload_bp

app = Flask(__name__, static_folder='static', template_folder='templates')
app.secret_key = os.urandom(24)  # 用於會話加密
app.register_blueprint(upload_bp)
CORS(app, resources={r"/*": {"origins": "http://localhost:3000"}})

load_dotenv()

# 獲取 API 密鑰
openai_api_key = os.getenv("OPENAI_API_KEY")
if not openai_api_key:
    raise ValueError("No OpenAI API key found. Please set the OPENAI_API_KEY environment variable.")

# 初始化 OpenAI 客戶端
try:
    client = OpenAI(api_key=openai_api_key)
except Exception as e:
    print(f"Failed to initialize OpenAI client: {str(e)}")
    raise

# 設置上傳文件夾
UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/chat", methods=["POST"])
def chat():
    try:
        user_input = request.json.get("message")
        print("從客戶端收到:", user_input)  # 偵錯

        # 初始化會話中的對話歷史
        if 'messages' not in session:
            session['messages'] = [
                {"role": "system", "content": "你是一個友善搞笑幽默風趣的聊天助手。請使用繁體中文回答，並盡可能提供有趣和有見地的回應。"}
                
            ]

        # 將用戶的輸入添加到對話歷史中
        session['messages'].append({"role": "user", "content": user_input})

        try:
            # 使用 OpenAI 的聊天模型 API
            response = client.chat.completions.create(
                model="gpt-4o",  # 使用新的模型名稱
                messages=session['messages'],
                max_tokens=3000
            )

            # 從回應中提取文本
            message = response.choices[0].message.content
            print("傳送到客戶端的回應:", message)  # 偵錯

            # 將助手的回應添加到對話歷史中
            session['messages'].append({"role": "assistant", "content": message})

            return jsonify({"response": message})
        except Exception as e:
            print(f"OpenAI API 請求錯誤: {str(e)}")
            return jsonify({"error": f"API 請求錯誤: {str(e)}"}), 400

    except Exception as e:
        print(f"處理請求出錯: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True, port=9527)