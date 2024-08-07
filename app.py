from flask import Flask, render_template, request, jsonify, session
from flask_cors import CORS
from werkzeug.utils import secure_filename

from dotenv import load_dotenv
from openai import OpenAI

import os

from PyPDF2 import PdfReader
from docx import Document


app = Flask(__name__, static_folder='static', template_folder='templates')
app.secret_key = os.urandom(24)  # 用於會話加密
CORS(app)

# 載入 .env 檔案中的環境變數
load_dotenv()
openai_api_key = os.getenv("OPENAI_API_KEY")

# 設置上傳文件夾
UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# 允許的文件類型
ALLOWED_EXTENSIONS = {'txt', 'pdf', 'png', 'jpg', 'jpeg', 'gif', 'doc', 'docx'}

# 初始化 OpenAI 客戶端
client = OpenAI(api_key=openai_api_key)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

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
                {"role": "system", "content": "你是一個友善的聊天助手。請使用繁體中文回答，並盡可能提供有趣和有見地的回應。"}
            ]

        # 將用戶的輸入添加到對話歷史中
        session['messages'].append({"role": "user", "content": user_input})

        # 使用 OpenAI 的聊天模型 API
        response = client.chat.completions.create(
            model="gpt-4o",  # 確保使用適當的模型
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
        app.logger.error(f"處理請求出錯: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        session['current_file'] = filepath
        return jsonify({"message": "File uploaded successfully", "filename": filename}), 200
    else:
        return jsonify({"error": "File type not allowed"}), 400

def extract_text_from_pdf(filepath):
    with open(filepath, 'rb') as file:
        reader = PdfReader(file)
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
    return text

def extract_text_from_docx(filepath):
    doc = Document(filepath)
    return "\n".join([paragraph.text for paragraph in doc.paragraphs])

def extract_text_from_image(filepath):
    try:
        image = Image.open(filepath)
        text = pytesseract.image_to_string(image, lang='chi_tra+eng')
        return text
    except Exception as e:
        app.logger.error(f"從圖片提取文字時出錯: {str(e)}")
        return "無法從圖片中提取文字。"

@app.route('/analyze/<filename>', methods=['POST'])
def analyze_file(filename):
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    if not os.path.exists(filepath):
        return jsonify({"error": "File not found"}), 404

    try:
        if filename.lower().endswith('.pdf'):
            file_content = extract_text_from_pdf(filepath)
        elif filename.lower().endswith('.docx'):
            file_content = extract_text_from_docx(filepath)
        elif filename.lower().endswith(('.png', '.jpg', '.jpeg', '.gif')):
            file_content = extract_text_from_image(filepath)
        else:
            with open(filepath, 'r', encoding='utf-8') as file:
                file_content = file.read()

        user_question = request.json.get('question', '請分析這個文件並提供摘要')

        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "你是一個有用的助手，負責分析文檔並回答問題。請使用繁體中文回答。"},
                {"role": "user", "content": f"文件內容：\n\n{file_content[:4000]}\n\n用戶問題：{user_question}"}
            ],
            max_tokens=1000
        )
        analysis = response.choices[0].message.content

        return jsonify({"analysis": analysis}), 200
    except Exception as e:
        app.logger.error(f"分析文件時出錯: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True, port=9527)