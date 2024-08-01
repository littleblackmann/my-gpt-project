# 小黑ＡＩ聊天
這是一個基於 Flask 和 OpenAI API 的網頁應用，用於與 AI 進行對話。以下是設置和運行此應用的步驟。  
以下提供兩種執行方式，如果想要簡單運行可以使用devcontainer的方式。
- 一般作業系統
- devcontainer

## 一般作業系統(Windows, Linux, MacOS)
### Environment
請修改 .env的文件，添加您的 OpenAI API 金鑰

### 執行Web Server
```
pip3 install -r requirements.txt
python3 app.py
```

## devcontainer
如果你使用VS Code可以直接使用 devcontainer開啟Web Server

### 瀏覽器輸入 localhost:9527
![簡易聊天](https://hackmd.io/_uploads/B1hag1wSC.png)
