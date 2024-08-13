// 全局變量
let uploadedFile = null;    // 上傳的文件
let inputConfirmed = false; // 輸入是否已確認

document.addEventListener('DOMContentLoaded', function () {
    // 獲取 DOM 元素
    const chatContainer = document.getElementById("chatContainer");
    const userInput = document.getElementById("userInput");
    const fileInput = document.getElementById('fileInput');
    const uploadButton = document.getElementById('uploadButton');
    const fileName = document.getElementById('fileName');
    const sendButton = document.getElementById('sendButton');
    const inputStatus = document.getElementById('inputStatus');
    const loginContainer = document.getElementById('login-container');
    const userInfo = document.getElementById('user-info');
    const userName = document.getElementById('user-name');
    const userPicture = document.getElementById('user-picture');
    const logoutButton = document.getElementById('logout-button');

    // 初始化設置
    adjustContainerHeight(chatContainer);
    enableSmoothScroll(chatContainer);
    addWelcomeMessage();

    // 設置 MutationObserver 以在聊天內容變化時自動滾動
    const observer = new MutationObserver(() => {
        autoScrollToBottom(chatContainer);
    });
    observer.observe(chatContainer, { childList: true, subtree: true });

    // 添加事件監聽器
    userInput.addEventListener("keydown", handleKeyDown);
    userInput.addEventListener("input", handleInput);
    uploadButton.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileUpload);
    sendButton.addEventListener('click', sendMessage);
    logoutButton.addEventListener('click', handleSignOut);

    // 檢查用戶登錄狀態
    checkLoginStatus();

    // 處理鍵盤輸入
    function handleKeyDown(event) {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            if (!inputConfirmed) {
                confirmInput();
            } else {
                sendMessage();
            }
        } else if (event.key === "Enter" && event.shiftKey) {
            insertNewline(this);
        }
    }

    // 處理輸入變化
    function handleInput() {
        autoGrow(this);
        resetConfirmation();
    }

    // 處理文件上傳
    function handleFileUpload() {
        if (this.files && this.files[0]) {
            uploadedFile = this.files[0];
            fileName.textContent = uploadedFile.name;
            userInput.placeholder = "輸入有關文件的問題或直接發送...";
        }
    }

    // 確認輸入
    function confirmInput() {
        inputConfirmed = true;
        userInput.classList.add("confirmed");
        inputStatus.textContent = "輸入已確認，按 Enter 發送訊息";
    }

    // 重置確認狀態
    function resetConfirmation() {
        inputConfirmed = false;
        userInput.classList.remove("confirmed");
        inputStatus.textContent = "";
    }

    // 插入新行
    function insertNewline(element) {
        const start = element.selectionStart;
        const end = element.selectionEnd;
        const value = element.value;
        element.value = value.substring(0, start) + "\n" + value.substring(end);
        element.selectionStart = element.selectionEnd = start + 1;
        autoGrow(element);
    }
});

/// Google 登錄處理
function handleCredentialResponse(response) {
    console.log("Google 登錄響應:", response);
    const id_token = response.credential; 
    console.log("準備發送到後端的 id_token:", id_token); // 這是您應該發送到後端的 id_token

    // 在發送請求之前加入延遲，確保 session 已經設置
    setTimeout(() => {
        fetch('https://537c-114-43-157-51.ngrok-free.app/api/auth/google', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ id_token: id_token }),
            credentials: 'include'
        })
        .then(response => {
            console.log("後端響應狀態:", response.status);
            return response.json();
        })
        .then(data => {
            console.log("後端響應數據:", data);
            if (data.status === 'success') {
                console.log('登錄成功:', data.user);
                updateUIAfterLogin(data.user);
            } else {
                console.error('登錄失敗:', data.message);
                alert('登錄失敗: ' + data.message);
            }
        })
        .catch(error => {
            console.error('錯誤:', error);
            alert('登錄失敗，請檢查控制台以獲取更多信息。');
        });
        
    }, 1000); // 延遲 1 秒
}

function updateUIAfterLogin(user) { 
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('chatPage').style.display = 'flex'; // 改為 'flex'
    document.getElementById('user-info').style.display = 'flex';
    document.getElementById('user-name').textContent = user.name;
    document.getElementById('user-picture').src = user.picture;
    
    // 確保聊天容器和輸入區域正確顯示
    document.querySelector('.chat-container').style.display = 'flex';
    document.querySelector('.input-container').style.display = 'flex';
    
    // 調整聊天容器高度
    adjustChatContainerHeight();
}

// 新增函數來調整聊天容器高度
function adjustChatContainerHeight() {
    const header = document.querySelector('.header');
    const inputContainer = document.querySelector('.input-container');
    const chatContainer = document.querySelector('.chat-container');
    
    const availableHeight = window.innerHeight - header.offsetHeight - inputContainer.offsetHeight;
    chatContainer.style.height = `${availableHeight}px`;
}

// 在窗口大小改變時重新調整高度
window.addEventListener('resize', adjustChatContainerHeight);


function handleSignOut() { // 處理登出
    fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            updateUIAfterLogout();
        } else {
            console.error('登出失敗:', data.message);
        }
    })
    .catch(error => {
        console.error('登出錯誤:', error);
        alert('登出失敗，請檢查控制台以獲取更多信息。');
    });
}

// 更新登出後的 UI
function updateUIAfterLogout() {
    document.getElementById('loginPage').style.display = 'flex'; // 顯示登錄頁面
    document.getElementById('chatPage').style.display = 'none'; // 隱藏聊天頁面
    document.getElementById('user-info').style.display = 'none'; // 隱藏用戶信息
    document.getElementById('user-name').textContent = ''; // 清空用戶名
    document.getElementById('user-picture').src = ''; // 清空用戶頭像
}


function checkLoginStatus() {
    fetch('/api/auth/user', {
        method: 'GET',
        credentials: 'include'
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Login status check failed');
        }
        return response.json();
    })
    .then(data => {
        if (data.status === 'success') {
            updateUIAfterLogin(data.user);
        } else {
            updateUIAfterLogout();
        }
    })
    .catch(error => {
        console.error('檢查登錄狀態錯誤:', error);
        updateUIAfterLogout();
    });
}

// 自動調整輸入框高度
function autoGrow(element) {
    element.style.height = "5px";
    element.style.height = (element.scrollHeight) + "px";
}

// 發送消息
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
    inputConfirmed = false;
    document.getElementById('inputStatus').textContent = "";
}

// 發送文本消息
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
            body: JSON.stringify({ message: message }),
            credentials: 'include'
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

// 上傳並分析文件
async function uploadAndAnalyzeFile(file, question) {
    try {
        displayMessage(`正在上傳文件: <span class="file-name">${file.name}</span>`, 'system-message');

        const formData = new FormData();
        formData.append('file', file);

        const uploadResponse = await fetch('/upload', {
            method: 'POST',
            body: formData,
            credentials: 'include'
        });

        if (!uploadResponse.ok) {
            throw new Error(`文件上傳失敗: ${uploadResponse.status} ${await uploadResponse.text()}`);
        }

        const uploadResult = await uploadResponse.json();
        console.log('文件上傳成功:', uploadResult);

        displayMessage(`文件 "<span class="file-name">${uploadResult.filename}</span>" 上傳成功`, 'system-message');

        if (file.type.startsWith('image/')) {
            displayImagePreview(file);
        }

        displayMessage('正在分析文件...', 'system-message');

        const analyzeUrl = `/analyze/${encodeURIComponent(uploadResult.filename)}`;
        console.log('分析 URL:', analyzeUrl);

        const analyzeResponse = await fetch(analyzeUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ question: question || "請分析這個文件並提供摘要" }),
            credentials: 'include'
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

// 顯示圖片預覽
function displayImagePreview(file) {
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

// 打字機效果
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

// 自動滾動到底部
function autoScrollToBottom(container) {
    setTimeout(() => {
        container.scrollTop = container.scrollHeight;
    }, 0);
}

// 啟用平滑滾動
function enableSmoothScroll(element) {
    element.style.scrollBehavior = 'smooth';
}

// 調整容器高度
function adjustContainerHeight(container) {
     // 不再設置固定的最大高度
     container.style.flex = '1';
     container.style.overflowY = 'auto';
 }

// 顯示錯誤信息
function displayError(message) {
    const chatContainer = document.getElementById("chatContainer");
    const errorMessage = document.createElement("div");
    errorMessage.className = "message error-message";
    errorMessage.textContent = message;
    chatContainer.appendChild(errorMessage);
    autoScrollToBottom(chatContainer);
}

// 添加歡迎信息
function addWelcomeMessage() {
    const chatContainer = document.getElementById("chatContainer");
    const welcomeMessage = document.createElement("div");
    welcomeMessage.className = "message ai-message";
    welcomeMessage.textContent = "歡迎！我是您的小黑AI助手。有什麼我可以幫助您的嗎？";
    chatContainer.appendChild(welcomeMessage);
}

// 顯示消息
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

// 重置輸入區域
function resetInputArea() {
    uploadedFile = null;
    document.getElementById('userInput').value = "";
    document.getElementById('fileName').textContent = "";
    document.getElementById('userInput').placeholder = "輸入您的訊息...";
    inputConfirmed = false;
}