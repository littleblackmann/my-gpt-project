from flask import Flask, render_template, request, jsonify
from flask_session import Session
from flask_cors import CORS
from dotenv import load_dotenv
from openai import OpenAI
import os 
from upload import upload_bp 
from login import login_bp, is_logged_in  # Import the login blueprint and helper function
from login import login_bp

load_dotenv() # 載入 .env 檔案
GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID')
GOOGLE_CLIENT_SECRET = os.getenv('GOOGLE_CLIENT_SECRET')

app = Flask(__name__, static_folder='static', template_folder='templates') # 初始化 Flask 應用
app.secret_key = os.urandom(24)  # 用於會話加密
app.register_blueprint(upload_bp) # 註冊上傳藍圖
app.register_blueprint(login_bp, url_prefix='/api/auth')  # Register the login blueprint

CORS(app, resources={r"/api/*": {"origins": "http://localhost:9527"}}, supports_credentials=True)

app.config['SESSION_TYPE'] = 'filesystem'
app.config['SESSION_PERMANENT'] = False
app.config['SESSION_USE_SIGNER'] = True
app.config['SECRET_KEY'] = os.environ.get('FLASK_SECRET_KEY')  # 請更改為一個安全的隨機值
Session(app)

openai_api_key = os.getenv("OPENAI_API_KEY") # 從環境變數中獲取 OpenAI API 金鑰
if not openai_api_key:  # 如果沒有設置 API 金鑰，則拋出錯誤
    raise ValueError("No OpenAI API key found. Please set the OPENAI_API_KEY environment variable.")

# 初始化 OpenAI 客戶端
try: # 處理初始化失敗的情況
    client = OpenAI(api_key=openai_api_key) # 初始化 OpenAI 客戶端
except Exception as e: # 處理初始化失敗的情況
    print(f"Failed to initialize OpenAI client: {str(e)}") # 輸出錯誤消息
    raise   # 拋出異常以停止程序運行

# 設置上傳文件夾
UPLOAD_FOLDER = 'uploads'  # 上傳文件夾的名稱
if not os.path.exists(UPLOAD_FOLDER): # 如果文件夾不存在，則創建文件夾
    os.makedirs(UPLOAD_FOLDER) # 創建文件夾
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER  # 設置上傳文件夾

@app.route("/") # 首頁路由
def home(): # 首頁視圖函數
    return render_template("index.html") # 返回 index.html 模板

@app.route("/chat", methods=["POST"]) # 聊天路由
def chat(): # 聊天視圖函數
    if not is_logged_in(): # Check if the user is logged in
        return jsonify({"error": "User not authenticated"}), 401 # Return an error if the user is not authenticated

    try: # 處理請求出錯的情況
        user_input = request.json.get("message")  # 從請求中獲取用戶的輸入
        print("從客戶端收到:", user_input)  # 偵錯

        # 初始化會話中的對話歷史
        if 'messages' not in session: # 如果會話中沒有 messages 鍵
            session['messages'] = [ # 初始化對話歷史
                {"role": "system", "content": "你是一個友善搞笑幽默風趣的聊天助手。請使用繁體中文回答，並盡可能提供有趣和有見地的回應。"} # 系統消息
            ]

        session['messages'].append({"role": "user", "content": user_input}) # 將用戶的輸入添加到對話歷史中

        try: # 處理 OpenAI API 請求出錯的情況
            response = client.chat.completions.create( # 請求 OpenAI API
                model="gpt-4",  # 使用 GPT-4 模型
                messages=session['messages'],
                max_tokens=3000
            )

            message = response.choices[0].message.content # 從 API 響應中獲取助手的回應
            print("傳送到客戶端的回應:", message)  # 偵錯

            session['messages'].append({"role": "assistant", "content": message}) # 將助手的回應添加到對話歷史中

            return jsonify({"response": message}) # 返回助手的回應
        except Exception as e: # 處理 OpenAI API 請求出錯的情況
            print(f"OpenAI API 請求錯誤: {str(e)}") # 偵錯
            return jsonify({"error": f"API 請求錯誤: {str(e)}"}), 400 # 返回錯誤消息

    except Exception as e: # 處理請求出錯的情況
        print(f"處理請求出錯: {str(e)}") # 偵錯
        return jsonify({"error": str(e)}), 500 # 返回錯誤消息

if __name__ == "__main__": # 程序運行入口
    app.run(debug=True, port=9527) # 啟動應用，設置 debug 模式和端口為 9527