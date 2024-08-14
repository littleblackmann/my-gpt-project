from flask import Flask, render_template, request, jsonify, session
from flask_session import Session
from flask_cors import CORS
from dotenv import load_dotenv
from openai import OpenAI
import os 
from upload import upload_bp 
from login import login_bp, is_logged_in
from flask.json.provider import DefaultJSONProvider
from datetime import datetime
from bson.objectid import ObjectId
from database import Database  # 從 database.py 中導入 Database 類

# 確保正確導入了 Database 類
import importlib
import database
importlib.reload(database)

print("Database module path:", database.__file__)
print("Database class methods:", dir(Database))


load_dotenv()  # 載入 .env 檔案
GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID')
GOOGLE_CLIENT_SECRET = os.getenv('GOOGLE_CLIENT_SECRET')

class CustomJSONProvider(DefaultJSONProvider):
    def default(self, obj):
        if isinstance(obj, ObjectId):
            return str(obj)
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)

app = Flask(__name__, static_folder='static', template_folder='templates')
app.json = CustomJSONProvider(app)
app.secret_key = os.urandom(24)
app.register_blueprint(upload_bp)
app.register_blueprint(login_bp, url_prefix='/api/auth')

CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

app.config['SESSION_TYPE'] = 'filesystem'
app.config['SESSION_PERMANENT'] = False
app.config['SESSION_USE_SIGNER'] = True
app.config['SECRET_KEY'] = os.environ.get('FLASK_SECRET_KEY')

Session(app)

openai_api_key = os.getenv("OPENAI_API_KEY")
if not openai_api_key:
    raise ValueError("No OpenAI API key found. Please set the OPENAI_API_KEY environment variable.")

try:
    client = OpenAI(api_key=openai_api_key)
except Exception as e:
    print(f"Failed to initialize OpenAI client: {str(e)}")
    raise

UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/chat", methods=["POST"])
def chat():
    if not is_logged_in():
        return jsonify({"error": "User not authenticated"}), 401

    user_id = session['user']['id']
    chat_id = request.json.get("chatId")
    user_input = request.json.get("message")

    db = Database()

    if not chat_id:
            # 創建新聊天
            title = user_input[:20] + "..." if len(user_input) > 20 else user_input
            chat_id = db.create_chat(user_id, title)
    else:
            # 更新聊天標題
            chat = db.get_chat(chat_id)
            if chat and chat['title'] == "New Chat":
                db.update_chat_title(chat_id, user_input[:20] + "..." if len(user_input) > 20 else user_input)

    try:
        # 獲取聊天歷史
        chat_messages = db.get_chat_messages(chat_id)
        messages = [{"role": "system", "content": "你是一個友善搞笑幽默風趣的天才聊天助手。請使用繁體中文回答，並盡可能提供有趣和有見地的回應。"}]
        messages.extend([{"role": msg["role"], "content": msg["content"]} for msg in chat_messages])
        messages.append({"role": "user", "content": user_input})

        response = client.chat.completions.create(
            model="gpt-4",
            messages=messages,
            max_tokens=2000
        )

        assistant_message = response.choices[0].message.content

        # 保存消息
        db.insert_message(chat_id, 'user', user_input)
        db.insert_message(chat_id, 'assistant', assistant_message)

        return jsonify({"response": assistant_message, "chatId": chat_id})
    except Exception as e:
        print(f"OpenAI API 請求錯誤: {str(e)}")
        return jsonify({"error": f"API 請求錯誤: {str(e)}"}), 400
    finally:
        db.close()

@app.route("/api/chat/new", methods=["POST"])
def new_chat():
    if not is_logged_in():
        return jsonify({"status": "error", "message": "用戶未登錄"}), 401

    user_id = session['user']['id']
    db = Database()
    try:
        chat_id = db.create_chat(user_id)
        return jsonify({"status": "success", "chatId": chat_id})
    except Exception as e:
        print(f"創建新聊天時出錯: {str(e)}")
        return jsonify({"status": "error", "message": "創建新聊天失敗"}), 500
    finally:
        db.close()

@app.route("/api/chat/history", methods=["GET"])
def get_chat_history():
    if not is_logged_in():
        return jsonify({"status": "error", "message": "用戶未登錄"}), 401

    user_id = session['user']['id']
    try:
        db = Database()
        chats = db.get_user_chats(user_id)
        db.close()
        
        chat_summaries = [
            {
                'id': str(chat['_id']),
                'title': chat['title']
            }
            for chat in chats
        ]
        
        return jsonify({"status": "success", "chats": chat_summaries})
    except Exception as e:
        print(f"獲取聊天歷史紀錄時出錯: {str(e)}")
        return jsonify({"status": "error", "message": "獲取聊天歷史紀錄失敗"}), 500

@app.route("/api/chat/<chat_id>", methods=["GET"])
def get_chat(chat_id):
    if not is_logged_in():
        return jsonify({"status": "error", "message": "用戶未登錄"}), 401

    try:
        db = Database()
        chat = db.get_chat(chat_id)
        if not chat:
            return jsonify({"status": "error", "message": "聊天不存在"}), 404
        
        messages = db.get_chat_messages(chat_id)
        db.close()
        
        return jsonify({
            "status": "success",
            "chat": {
                "id": str(chat['_id']),
                "title": chat['title'],
                "messages": messages
            }
        })
    except Exception as e:
        print(f"獲取聊天時出錯: {str(e)}")
        return jsonify({"status": "error", "message": "獲取聊天失敗"}), 500

@app.route("/api/chat/<chat_id>/delete", methods=["DELETE"])
def delete_chat(chat_id):
    if not is_logged_in():
        return jsonify({"status": "error", "message": "用戶未登錄"}), 401

    try:
        db = Database()
        print("Database instance methods:", dir(db))
        print("delete_chat method exists:", hasattr(db, 'delete_chat'))
        print("Type of db:", type(db))
        db.delete_chat(chat_id)
        db.close()
        return jsonify({"status": "success", "message": "聊天已刪除"})
    except Exception as e:
        print(f"刪除聊天時出錯: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"status": "error", "message": f"刪除聊天失敗: {str(e)}"}), 500

@app.route("/api/chat/<chat_id>/rename", methods=["PUT"])
def rename_chat(chat_id):
    if not is_logged_in():
        return jsonify({"status": "error", "message": "用戶未登錄"}), 401

    new_title = request.json.get("title")
    if not new_title:
        return jsonify({"status": "error", "message": "新標題不能為空"}), 400

    try:
        db = Database()
        print("Database instance methods:", dir(db))
        print("update_chat_title method exists:", hasattr(db, 'update_chat_title'))
        print("Type of db:", type(db))
        db.update_chat_title(chat_id, new_title)
        db.close()
        return jsonify({"status": "success", "message": "聊天標題已更新"})
    except Exception as e:
        print(f"重命名聊天時出錯: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"status": "error", "message": f"重命名聊天失敗: {str(e)}"}), 500

if __name__ == "__main__":
    app.run(debug=True, port=9527)
