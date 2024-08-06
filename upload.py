from flask import Blueprint, request, jsonify, current_app
import os
from werkzeug.utils import secure_filename
from openai import OpenAI
from dotenv import load_dotenv
import io
import PyPDF2
from PIL import Image
import pytesseract

# 載入 .env 檔案中的環境變數
load_dotenv()
openai_api_key = os.getenv("OPENAI_API_KEY")

upload_bp = Blueprint('upload', __name__)

UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

ALLOWED_EXTENSIONS = {'txt', 'pdf', 'doc', 'docx', 'jpg',}

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

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
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        file.save(filepath)
        return jsonify({"message": "File uploaded successfully", "filename": filename}), 200
    else:
        return jsonify({"error": "File type not allowed"}), 400

@upload_bp.route('/analyze/<filename>', methods=['POST'])
def analyze_file(filename):
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    if not os.path.exists(filepath):
        return jsonify({"error": "File not found"}), 404

    try:
        file_content = ""
        if filename.endswith('.pdf'):
            import PyPDF2
            with open(filepath, 'rb') as file:
                reader = PyPDF2.PdfReader(file)
                file_content = "\n".join([page.extract_text() for page in reader.pages])
        elif filename.endswith('.txt'):
            with io.open(filepath, 'r', encoding='utf-8') as file:
                file_content = file.read()
        elif filename.endswith('.doc') or filename.endswith('.docx'):
            from docx import Document
            doc = Document(filepath)
            file_content = "\n".join([paragraph.text for paragraph in doc.paragraphs])
        elif filename.endswith('.jpg') or filename.endswith('.jpeg'):
            # 使用Pillow和pytesseract來提取圖像中的文字
            image = Image.open(filepath)
            file_content = pytesseract.image_to_string(image)
        else:
            return jsonify({"error": "Unsupported file type"}), 400

        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "你是一個能夠分析文件的助手，請用中文提供分析結果。"},
                {"role": "user", "content": f"請分析以下文件並提供摘要：\n\n{file_content[:6666]}"}
            ],
            max_tokens=777
        )

        analysis = response.choices[0].message.content

        # 刪除上傳的檔案
        os.remove(filepath)

        return jsonify({"analysis": analysis}), 200
    except Exception as e:
        current_app.logger.error(f"Error analyzing file {filename}: {str(e)}")
        return jsonify({"error": f"An error occurred while analyzing the file: {str(e)}"}), 500