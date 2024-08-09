import os
from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
from openai import OpenAI
from PyPDF2 import PdfReader
from docx import Document
from PIL import Image
import io
import base64
from dotenv import load_dotenv

load_dotenv()
upload_bp = Blueprint('upload', __name__)

# 獲取 API 密鑰
api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    raise ValueError("No OpenAI API key found. Please set the OPENAI_API_KEY environment variable.")

# 初始化 OpenAI 客戶端
try:
    client = OpenAI(api_key=api_key)
except Exception as e:
    print(f"Failed to initialize OpenAI client: {str(e)}")
    raise

ALLOWED_EXTENSIONS = {'txt', 'pdf', 'png', 'jpg', 'jpeg', 'gif', 'doc', 'docx'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@upload_bp.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
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

def extract_text_from_docx(filepath):
    doc = Document(filepath)
    return "\n".join([paragraph.text for paragraph in doc.paragraphs])

@upload_bp.route('/analyze/<filename>', methods=['POST'])
def analyze_file(filename):
    filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
    if not os.path.exists(filepath):
        return jsonify({"error": "File not found"}), 404

    try:
        current_app.logger.info(f"開始分析文件: {filename}")
        file_extension = os.path.splitext(filename)[1].lower()
        
        if file_extension in ['.png', '.jpg', '.jpeg', '.gif']:
            with open(filepath, "rb") as image_file:
                image_data = base64.b64encode(image_file.read()).decode('utf-8')
            
            try:
                response = client.chat.completions.create(
                    model="gpt-4o-mini",  # 更新為新的模型名稱
                    messages=[
                        {
                            "role": "user",
                            "content": [
                                {"type": "text", "text": "請分析這張圖片並提供詳細描述。"},
                                {
                                    "type": "image_url",
                                    "image_url": {
                                        "url": f"data:image/png;base64,{image_data}",
                                        "detail": "auto"  # 添加 detail 參數
                                    }
                                },
                            ],
                        }
                    ],
                    max_tokens=300,
                )
                analysis = response.choices[0].message.content
            except Exception as e:
                current_app.logger.error(f"OpenAI API 請求錯誤: {str(e)}")
                return jsonify({"error": f"API 請求錯誤: {str(e)}"}), 400
        elif file_extension == '.pdf':
            file_content = extract_text_from_pdf(filepath)
        elif file_extension in ['.docx', '.doc']:
            file_content = extract_text_from_docx(filepath)
        elif file_extension == '.txt':
            with open(filepath, 'r', encoding='utf-8') as file:
                file_content = file.read()
        else:
            return jsonify({"error": "Unsupported file type"}), 400

        if file_extension not in ['.png', '.jpg', '.jpeg', '.gif']:
            user_question = request.json.get('question', '請分析這個文件並提供摘要')
            try:
                response = client.chat.completions.create(
                    model="gpt-4o",  # 使用新的模型名稱
                    messages=[
                        {"role": "system", "content": "你是一個有用的助手，負責分析文檔並回答問題。請使用繁體中文回答。"},
                        {"role": "user", "content": f"文件內容：\n\n{file_content[:4000]}\n\n用戶問題：{user_question}"}
                    ],
                    max_tokens=1000
                )
                analysis = response.choices[0].message.content
            except Exception as e:
                current_app.logger.error(f"OpenAI API 請求錯誤: {str(e)}")
                return jsonify({"error": f"API 請求錯誤: {str(e)}"}), 400

        current_app.logger.info(f"文件 {filename} 分析完成")
        return jsonify({"analysis": analysis}), 200
    except Exception as e:
        current_app.logger.error(f"分析文件時出錯: {str(e)}")
        return jsonify({"error": f"分析文件時出錯: {str(e)}"}), 500