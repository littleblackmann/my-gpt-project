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

load_dotenv() # 載入 .env 檔案
upload_bp = Blueprint('upload', __name__)


api_key = os.getenv("OPENAI_API_KEY") # 從環境變數中獲取 API 金鑰
if not api_key: # 如果沒有設置 API 金鑰，則拋出錯誤
    raise ValueError("No OpenAI API key found. Please set the OPENAI_API_KEY environment variable.")

try:
    client = OpenAI(api_key=api_key) # 初始化 OpenAI 客戶端
except Exception as e:  # 處理初始化失敗的情況
    print(f"Failed to initialize OpenAI client: {str(e)}")
    raise

ALLOWED_EXTENSIONS = {'txt', 'pdf', 'png', 'jpg', 'jpeg', 'gif', 'doc', 'docx'} # 允許上傳的文件類型

def allowed_file(filename): # 檢查文件類型是否允許
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS # 檢查文件名中是否包含 . 並且文件類型是否在 ALLOWED_EXTENSIONS 中

@upload_bp.route('/upload', methods=['POST']) # 上傳文件的路由
def upload_file(): # 上傳文件的函數
    if 'file' not in request.files: # 如果請求中沒有文件部分，返回錯誤
        return jsonify({"error": "No file part"}), 400
    file = request.files['file'] # 從請求中獲取文件
    if file.filename == '': # 如果文件名為空，返回錯誤
        return jsonify({"error": "No selected file"}), 400
    if file and allowed_file(file.filename): # 如果文件類型允許
        filename = secure_filename(file.filename) # 獲取安全的文件名
        filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], filename) # 構建文件路徑
        file.save(filepath)# 保存文件
        return jsonify({"message": "File uploaded successfully", "filename": filename}), 200 # 返回成功消息
    else: # 如果文件類型不允許，返回錯誤
        return jsonify({"error": "File type not allowed"}), 400

def extract_text_from_pdf(filepath): # 從 PDF 文件中提取文本
    with open(filepath, 'rb') as file: # 以二進制只讀模式打開文件
        reader = PdfReader(file)
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
    return text

def extract_text_from_docx(filepath): # 從 DOCX 文件中提取文本
    doc = Document(filepath)
    return "\n".join([paragraph.text for paragraph in doc.paragraphs]) # 將所有段落文本連接在一起

@upload_bp.route('/analyze/<filename>', methods=['POST']) # 分析文件的路由
def analyze_file(filename): # 分析文件的函數
    filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], filename) # 構建文件路徑
    if not os.path.exists(filepath):    # 如果文件不存在，返回錯誤
        return jsonify({"error": "File not found"}), 404    

    try: # 嘗試分析文件
        current_app.logger.info(f"開始分析文件: {filename}")
        file_extension = os.path.splitext(filename)[1].lower()
        
        if file_extension in ['.png', '.jpg', '.jpeg', '.gif']: # 如果是圖片文件
            with open(filepath, "rb") as image_file: # 以二進制只讀模式打開文件
                image_data = base64.b64encode(image_file.read()).decode('utf-8') # 讀取文件並將其轉換為 base64 編碼
            
            try: # 嘗試使用 OpenAI API 分析圖片
                response = client.chat.completions.create( # 使用 chat 模型
                    model="gpt-4o-mini",  # 更新為新的模型名稱
                    messages=[ # 訊息列表
                        {
                            "role": "user", # 用戶訊息
                            "content": [ # 用戶訊息內容
                                {"type": "text", "text": "請分析這張圖片並提供詳細描述。"}, # 文本訊息
                                { # 圖片訊息
                                    "type": "image_url",    # 圖片類型
                                    "image_url": { # 圖片 URL
                                        "url": f"data:image/png;base64,{image_data}", # 圖片 base64 編碼
                                        "detail": "auto"  # 添加 detail 參數
                                    }
                                },
                            ],
                        }
                    ],
                    max_tokens=500,     # 最大 tokens 數
                )
                analysis = response.choices[0].message.content # 獲取分析結果
            except Exception as e: # 處理 API 請求失敗的情況
                current_app.logger.error(f"OpenAI API 請求錯誤: {str(e)}")
                return jsonify({"error": f"API 請求錯誤: {str(e)}"}), 400
        elif file_extension == '.pdf': # 如果是 PDF 文件
            file_content = extract_text_from_pdf(filepath)
        elif file_extension in ['.docx', '.doc']: # 如果是 DOCX 文件
            file_content = extract_text_from_docx(filepath)
        elif file_extension == '.txt': # 如果是文本文件
            with open(filepath, 'r', encoding='utf-8') as file:
                file_content = file.read()
        else: # 如果是不支持的文件類型
            return jsonify({"error": "Unsupported file type"}), 400

        if file_extension not in ['.png', '.jpg', '.jpeg', '.gif']: # 如果不是圖片文件
            user_question = request.json.get('question', '請分析這個文件並提供摘要') # 從請求中獲取用戶問題
            try: # 嘗試使用 OpenAI API 分析文件
                response = client.chat.completions.create(
                    model="gpt-4o",  # 使用新的模型名稱
                    messages=[ # 訊息列表
                        {"role": "system", "content": "你是一個有用的助手，負責分析文檔並回答問題。請使用繁體中文回答。"}, # 系統訊息
                        {"role": "user", "content": f"文件內容：\n\n{file_content[:4000]}\n\n用戶問題：{user_question}"} # 用戶訊息
                    ],
                    max_tokens=1000 # 最大 tokens 數
                )
                analysis = response.choices[0].message.content # 獲取分析結果
            except Exception as e: # 處理 API 請求失敗的情況
                current_app.logger.error(f"OpenAI API 請求錯誤: {str(e)}")
                return jsonify({"error": f"API 請求錯誤: {str(e)}"}), 400

        current_app.logger.info(f"文件 {filename} 分析完成")
        return jsonify({"analysis": analysis}), 200
    except Exception as e: # 處理分析文件時出錯的情況
        current_app.logger.error(f"分析文件時出錯: {str(e)}")
        return jsonify({"error": f"分析文件時出錯: {str(e)}"}), 500