function autoGrow(element) {
    element.style.height = "5px";
    element.style.height = (element.scrollHeight + 10) + "px";
}

let enterPressCount = 0;

document.addEventListener('DOMContentLoaded', function() {
    const chatContainer = document.getElementById("chatContainer");
    const userInput = document.getElementById("userInput");
    const fileInput = document.getElementById('fileInput');
    const uploadButton = document.getElementById('uploadButton');
    const fileName = document.getElementById('fileName');
    const analyzeButton = document.getElementById('analyzeButton');

    adjustContainerHeight(chatContainer);
    enableSmoothScroll(chatContainer);

    const observer = new MutationObserver(() => {
        autoScrollToBottom(chatContainer);
    });

    observer.observe(chatContainer, { childList: true, subtree: true });

    addWelcomeMessage();

    userInput.addEventListener("keydown", function(event) {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            enterPressCount++;
            if (enterPressCount === 2) {
                sendMessage();
                enterPressCount = 0;
            }
        }
    });

    uploadButton.addEventListener('click', function() {
        fileInput.click();
    });

    fileInput.addEventListener('change', function() {
        if (this.files && this.files[0]) {
            fileName.textContent = this.files[0].name;
            analyzeButton.style.display = 'inline-block';
        }
    });

    analyzeButton.addEventListener('click', function() {
        uploadAndAnalyzeFile();
    });
});

async function sendMessage() {
    const userInput = document.getElementById("userInput").value.trim();
    if (!userInput) {
        console.log("輸入為空。");
        return;
    }
    document.getElementById("userInput").value = "";
    autoGrow(document.getElementById("userInput"));

    const chatContainer = document.getElementById("chatContainer");
    
    // 創建並添加用戶消息
    const userMessage = document.createElement("div");
    userMessage.className = "message user-message";
    userMessage.textContent = userInput;
    chatContainer.appendChild(userMessage);

    autoScrollToBottom(chatContainer);

    try {
        const response = await fetch("/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ message: userInput })
        });

        if (!response.ok) {
            throw new Error('伺服器回應錯誤: ' + response.status);
        }

        const data = await response.json();
        
        // 創建並添加 AI 消息
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

async function uploadAndAnalyzeFile() {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
    if (!file) {
        displayError('請選擇一個文件');
        return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
        displayMessage('正在上傳文件...', 'system-message');

        const uploadResponse = await fetch('/upload', {
            method: 'POST',
            body: formData
        });

        if (!uploadResponse.ok) {
            throw new Error(`文件上傳失敗: ${uploadResponse.status} ${await uploadResponse.text()}`);
        }

        const uploadResult = await uploadResponse.json();
        console.log('文件上傳成功:', uploadResult);

        displayMessage(`文件 "${uploadResult.filename}" 上傳成功`, 'system-message');
        displayMessage('正在分析文件...', 'system-message');

        const analyzeUrl = `/analyze/${encodeURIComponent(uploadResult.filename)}`;
        console.log('分析 URL:', analyzeUrl);

        const analyzeResponse = await fetch(analyzeUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ question: '請分析這個文件並提供摘要' })
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

        await typeWriter(aiMessage, "AI (文件分析結果)：\n" + analysisResult.analysis);
        autoScrollToBottom(chatContainer);
    } catch (error) {
        console.error('錯誤:', error);
        displayError('文件處理錯誤: ' + error.message);
    }
}

async function typeWriter(element, text, speed = 20) {
    element.innerHTML = ''; // 使用 innerHTML 而不是 textContent
    const lines = text.split('\n');
    for (let line of lines) {
        const lineElement = document.createElement('p');
        element.appendChild(lineElement);
        for (let i = 0; i < line.length; i++) {
            lineElement.textContent += line.charAt(i);
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
    const maxHeight = window.innerHeight * 0.7; // 視窗高度的 70%
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
        p.textContent = line;
        messageElement.appendChild(p);
    });
    
    chatContainer.appendChild(messageElement);
    autoScrollToBottom(chatContainer);
}

window.addEventListener('resize', () => {
    adjustContainerHeight(document.getElementById("chatContainer"));
});