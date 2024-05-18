from flask import Flask, render_template, request, jsonify
import openai
from langchain.chains import LLMChain
from langchain.llms import OpenAI
from langchain.prompts import PromptTemplate
from dotenv import load_dotenv
import os

app = Flask(__name__)

load_dotenv()
openai_api_key = os.getenv("OPENAI_API_KEY")

# 設置 OpenAI API 金鑰
openai.api_key = openai_api_key

llm = OpenAI(api_key=openai_api_key)
prompt_template = PromptTemplate(input_variables=["prompt"], template="{prompt}")
chain = LLMChain(llm=llm, prompt=prompt_template)

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/chat", methods=["POST"])
def chat():
    user_input = request.json.get("message")
    response = chain.run(prompt=user_input)
    return jsonify({"response": response})

if __name__ == "__main__":
    app.run(debug=True, port=9527)
