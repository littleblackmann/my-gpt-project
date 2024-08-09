let uploadedFile = null;
let inputConfirmed = false; // 記錄是否已確認輸入

function autoGrow(element) {
    element.style.height = "5px";
    element.style.height = (element.scrollHeight) + "px";
}

document.addEventListener('DOMContentLoaded', function () {
    const chatContainer = document.getElementById("chatContainer");
    const userInput = document.getElementById("userInput");
    const fileInput = document.getElementById('fileInput');
    const uploadButton = document.getElementById('uploadButton');
    const fileName = document.getElementById('fileName');
    const sendButton = document.getElementById('sendButton');
    const inputStatus = document.getElementById('inputStatus'); // 用於顯示狀態的元素

    adjustContainerHeight(chatContainer);
    enableSmoothScroll(chatContainer);

    const observer = new MutationObserver(() => {
        autoScrollToBottom(chatContainer);
    });

    observer.observe(chatContainer, { childList: true, subtree: true });

    addWelcomeMessage();

    userInput.addEventListener("keydown", function (event) {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();

            if (!inputConfirmed) {
                inputConfirmed = true; // 第一次按下 Enter 確認輸入
                userInput.classList.add("confirmed");
                inputStatus.textContent = "輸入已確認，按 Enter 發送訊息";
            } else {
                sendMessage(); // 第二次按下 Enter 發送訊息
            }
        } else if (event.key === "Enter" && event.shiftKey) {
            const start = this.selectionStart;
            const end = this.selectionEnd;
            const value = this.value;
            this.value = value.substring(0, start) + "\n" + value.substring(end);
            this.selectionStart = this.selectionEnd = start + 1;
            event.preventDefault();
            autoGrow(this);
        }
    });

    userInput.addEventListener("input", function () {
        autoGrow(this);
        inputConfirmed = false; // 當用戶繼續輸入時，重置確認狀態
        userInput.classList.remove("confirmed");
        inputStatus.textContent = ""; // 清除狀態文字
    });

    uploadButton.addEventListener('click', function () {
        fileInput.click();
    });

    fileInput.addEventListener('change', function () {
        if (this.files && this.files[0]) {
            uploadedFile = this.files[0];
            fileName.textContent = uploadedFile.name;
            userInput.placeholder = "輸入有關文件的問題或直接發送...";
        }
    });

    sendButton.addEventListener('click', sendMessage);
});

async function sendMessage() {
    const userInput = document.getElementById("userInput");
    const message = userInput.value.trim();

    if (!message && !uploadedFile) {
        console.log("沒有輸入訊息或上傳文件。");
        return;
    }

    if (uploadedFile) {
        await uploadAndAnalyzeFile(uploadedFile, message);
        resetInputArea();
    } else {
        await sendTextMessage(message);
    }

    userInput.value = "";
    autoGrow(userInput);
    inputConfirmed = false; // 重置確認狀態
    document.getElementById('inputStatus').textContent = ""; // 清除狀態文字
}

async function sendTextMessage(message) {
    const chatContainer = document.getElementById("chatContainer");

    const userMessage = document.createElement("div");
    userMessage.className = "message user-message";
    userMessage.textContent = message;
    chatContainer.appendChild(userMessage);

    autoScrollToBottom(chatContainer);

    try {
        const response = await fetch("/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ message: message })
        });

        if (!response.ok) {
            throw new Error('伺服器回應錯誤: ' + response.status);
        }

        const data = await response.json();

        const aiMessage = document.createElement("div");
        aiMessage.className = "message ai-message";
        chatContainer.appendChild(aiMessage);

        await typeWriter(aiMessage, data.response || '未獲得有效回應');
        autoScrollToBottom(chatContainer);
    } catch (error) {
        console.error('錯誤:', error);
        displayError('發送消息時出錯: ' + error.message);
    }
}

async function uploadAndAnalyzeFile(file, question) {
    try {
        displayMessage(`正在上傳文件: <span class="file-name">${file.name}</span>`, 'system-message');

        const formData = new FormData();
        formData.append('file', file);

        const uploadResponse = await fetch('/upload', {
            method: 'POST',
            body: formData
        });

        if (!uploadResponse.ok) {
            throw new Error(`文件上傳失敗: ${uploadResponse.status} ${await uploadResponse.text()}`);
        }

        const uploadResult = await uploadResponse.json();
        console.log('文件上傳成功:', uploadResult);

        displayMessage(`文件 "<span class="file-name">${uploadResult.filename}</span>" 上傳成功`, 'system-message');

        if (file.type.startsWith('image/')) {
            const imagePreview = document.createElement('img');
            imagePreview.src = URL.createObjectURL(file);
            imagePreview.alt = file.name;
            imagePreview.style.maxWidth = '100%';
            imagePreview.style.maxHeight = '300px';
            imagePreview.style.marginTop = '10px';
            imagePreview.style.borderRadius = '8px';
            const previewContainer = document.createElement('div');
            previewContainer.className = 'message ai-message';
            previewContainer.appendChild(imagePreview);
            document.getElementById("chatContainer").appendChild(previewContainer);
        }

        displayMessage('正在分析文件...', 'system-message');

        const analyzeUrl = `/analyze/${encodeURIComponent(uploadResult.filename)}`;
        console.log('分析 URL:', analyzeUrl);

        const analyzeResponse = await fetch(analyzeUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ question: question || "請分析這個文件並提供摘要" })
        });

        if (!analyzeResponse.ok) {
            throw new Error(`文件分析失敗: ${analyzeResponse.status} ${await analyzeResponse.text()}`);
        }

        const analysisResult = await analyzeResponse.json();
        console.log('文件分析結果:', analysisResult);

        const chatContainer = document.getElementById("chatContainer");
        const aiMessage = document.createElement("div");
        aiMessage.className = "message ai-message";
        chatContainer.appendChild(aiMessage);

        await typeWriter(aiMessage, `AI（文件分析結果：${file.name}：${analysisResult.analysis}`);
        autoScrollToBottom(chatContainer);
    } catch (error) {
        console.error('錯誤:', error);
        displayError('文件處理錯誤: ' + error.message);
    }
}

async function typeWriter(element, text, speed = 20) {
    element.innerHTML = '';
    const lines = text.split('\n');
    for (let line of lines) {
        const lineElement = document.createElement('p');
        element.appendChild(lineElement);
        for (let i = 0; i < line.length; i++) {
            lineElement.innerHTML += line.charAt(i);
            autoScrollToBottom(element.parentElement);
            await new Promise(resolve => setTimeout(resolve, speed));
        }
    }
}

function autoScrollToBottom(container) {
    setTimeout(() => {
        container.scrollTop = container.scrollHeight;
    }, 0);
}

function enableSmoothScroll(element) {
    element.style.scrollBehavior = 'smooth';
}

function adjustContainerHeight(container) {
    const maxHeight = window.innerHeight * 0.7;
    container.style.maxHeight = `${maxHeight}px`;
    container.style.overflowY = 'auto';
}

function displayError(message) {
    const chatContainer = document.getElementById("chatContainer");
    const errorMessage = document.createElement("div");
    errorMessage.className = "message error-message";
    errorMessage.textContent = message;
    chatContainer.appendChild(errorMessage);
    autoScrollToBottom(chatContainer);
}

function addWelcomeMessage() {
    const chatContainer = document.getElementById("chatContainer");
    const welcomeMessage = document.createElement("div");
    welcomeMessage.className = "message ai-message";
    welcomeMessage.textContent = "歡迎！我是您的小黑AI助手。有什麼我可以幫助您的嗎？";
    chatContainer.appendChild(welcomeMessage);
}

function displayMessage(message, className) {
    const chatContainer = document.getElementById("chatContainer");
    const messageElement = document.createElement("div");
    messageElement.className = `message ${className}`;

    const lines = message.split('\n');
    lines.forEach(line => {
        const p = document.createElement('p');
        p.innerHTML = line;
        messageElement.appendChild(p);
    });

    chatContainer.appendChild(messageElement);
    autoScrollToBottom(chatContainer);
}

function resetInputArea() {
    uploadedFile = null;
    document.getElementById('userInput').value = "";
    document.getElementById('fileName').textContent = "";
    document.getElementById('userInput').placeholder = "輸入您的訊息...";
    inputConfirmed = false;
}
