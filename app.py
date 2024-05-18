from flask import Flask, render_template, request, jsonify
import openai
from langchain.chains import LLMChain
from langchain.llms import OpenAI
from langchain.prompts import PromptTemplate
from dotenv import load_dotenv
import os

app = Flask(__name__)

# 載入 .env 檔案中的環境變量
load_dotenv()
openai_api_key = os.getenv("OPENAI_API_KEY")

# 設置 OpenAI API 密鑰
openai.api_key = openai_api_key

llm = OpenAI(api_key=openai_api_key, max_tokens=1500) # 調整 max_tokens 為更大的值
prompt_template = PromptTemplate(input_variables=["prompt"], template="{prompt}")
chain = LLMChain(llm=llm, prompt=prompt_template)

@app.route("/")
def home():
     return render_template("index.html")

@app.route("/chat", methods=["POST"])
def chat():
     try:
         user_input = request.json.get("message")
         print("從客戶端收到:", user_input) # 調試
         response = chain.invoke(input=user_input) # 傳遞 input 參數
         print("發送到客戶端的回應:", response) # 調試
         return jsonify({"response": response})
     except Exception as e:
         app.logger.error(f"處理請求出錯: {str(e)}")
         return jsonify({"error": str(e)}), 500



if __name__ == "__main__":
     app.run(debug=True, port=9527)