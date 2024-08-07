import os
from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
from openai import OpenAI
import pytesseract
from PIL import Image
from PyPDF2 import PdfReader
from docx import Document

upload_bp = Blueprint('upload', __name__)

# 確保您已經設置了 OPENAI_API_KEY
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

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

def extract_text_from_image(filepath):
    try:
        image = Image.open(filepath)
        text = pytesseract.image_to_string(image, lang='chi_tra+eng')
        return text
    except Exception as e:
        current_app.logger.error(f"從圖片提取文字時出錯: {str(e)}")
        return f"無法從圖片中提取文字。錯誤: {str(e)}"

@upload_bp.route('/analyze/<filename>', methods=['POST'])
def analyze_file(filename):
    filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
    if not os.path.exists(filepath):
        return jsonify({"error": "File not found"}), 404

    try:
        file_extension = os.path.splitext(filename)[1].lower()
        
        if file_extension == '.pdf':
            content = extract_text_from_pdf(filepath)
        elif file_extension in ['.docx', '.doc']:
            content = extract_text_from_docx(filepath)
        elif file_extension in ['.png', '.jpg', '.jpeg', '.gif']:
            content = extract_text_from_image(filepath)
        elif file_extension == '.txt':
            with open(filepath, 'r', encoding='utf-8') as file:
                content = file.read()
        else:
            return jsonify({"error": "Unsupported file type"}), 400

        if not content:
            return jsonify({"error": "無法提取文件內容"}), 400

        user_question = request.json.get('question', '請分析這個文件並提供摘要')

        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "你是一個有用的助手，負責分析文檔並回答問題。請使用繁體中文回答。"},
                {"role": "user", "content": f"文件內容：\n\n{content[:4000]}\n\n用戶問題：{user_question}"}
            ],
            max_tokens=1000
        )
        analysis = response.choices[0].message.content

        return jsonify({"analysis": analysis}), 200
    except Exception as e:
        current_app.logger.error(f"分析文件時出錯: {str(e)}")
        return jsonify({"error": f"分析文件時出錯: {str(e)}"}), 500