from flask import Blueprint, request, jsonify
import os
from werkzeug.utils import secure_filename
from openai import OpenAI
from dotenv import load_dotenv
import io
from PIL import Image
from PyPDF2 import PdfReader
from docx import Document

# 載入 .env 檔案中的環境變數
load_dotenv()
openai_api_key = os.getenv("OPENAI_API_KEY")

# 創建一個藍圖
upload_bp = Blueprint('upload', __name__)

# 設置上傳文件夾
UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# 允許的文件類型
ALLOWED_EXTENSIONS = {'txt', 'pdf', 'png', 'jpg', 'jpeg', 'gif', 'doc','docx'}

# 初始化 OpenAI 客戶端
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@upload_bp.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        file.save(filepath)
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

@upload_bp.route('/analyze/<filename>', methods=['POST'])
def analyze_file(filename):
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    if not os.path.exists(filepath):
        return jsonify({"error": "File not found"}), 404

    try:
        if filename.lower().endswith('.pdf'):
            file_content = extract_text_from_pdf(filepath)
        else:
            with io.open(filepath, 'r', encoding='utf-8') as file:
                file_content = file.read()

        # 使用 OpenAI 進行分析
        response = client.chat.completions.create(
            model="gpt-4o", 
            messages=[
                {"role": "system", "content": "你是一個有用的助手，負責分析文檔。請使用繁體中文回答。"},
                {"role": "user", "content": f"請分析以下文檔並提供摘要：\n\n{file_content[:4000]}"}  # 限制輸入長度
            ],
            max_tokens=777
        )

        analysis = response.choices[0].message.content
        os.remove(filepath)
        
        return jsonify({"analysis": analysis}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500