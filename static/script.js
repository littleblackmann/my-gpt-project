// 全局變量
let uploadedFile = null;
let inputConfirmed = false;
let historyList = [];
let currentChatId = null;

document.addEventListener('DOMContentLoaded', function () {
    // 獲取 DOM 元素
    const chatContainer = document.getElementById("chatContainer");
    const userInput = document.getElementById("userInput");
    const fileInput = document.getElementById('fileInput');
    const uploadButton = document.getElementById('uploadButton');
    const fileName = document.getElementById('fileName');
    const sendButton = document.getElementById('sendButton');
    const inputStatus = document.getElementById('inputStatus');
    const newChatButton = document.getElementById('newChatButton');
    

    // 初始化設置
    adjustChatContainerHeight();
    enableSmoothScroll(chatContainer);
    addWelcomeMessage();
    fetchChatHistory(); // 初始加載聊天歷史

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
    document.getElementById('logout-button').addEventListener('click', handleSignOut);
    document.getElementById('newChatButton').addEventListener('click', startNewChat);
    newChatButton.addEventListener('click', startNewChat);

    // 檢查用戶登錄狀態
    checkLoginStatus();

    // 獲取聊天歷史紀錄
    fetchChatHistory();

    // 處理窗口大小改變
    window.addEventListener('resize', adjustChatContainerHeight);
});

function startNewChat() {
    currentChatId = null;
    clearChatContainer();
    addWelcomeMessage();
    // 向服務器發送請求，創建新的聊天
    fetch('/api/chat/new', {
        method: 'POST',
        credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            currentChatId = data.chatId;
            fetchChatHistory(); // 更新聊天歷史列表
            // 移除其他項目的 'active' 類
            document.querySelectorAll('.chat-history-item').forEach(item => item.classList.remove('active'));
        }
    })
    .catch(error => console.error('創建新聊天時出錯:', error));
}

// 清空聊天容器
function clearChatContainer() {
    const chatContainer = document.getElementById("chatContainer");
    chatContainer.innerHTML = '';
}

// 獲取聊天歷史紀錄
function fetchChatHistory() {
    fetch('/api/chat/history', {
        method: 'GET',
        credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            displayChatHistory(data.chats);
        } else {
            console.error('無法獲取聊天歷史紀錄:', data.message);
        }
    })
    .catch(error => {
        console.error('獲取聊天歷史紀錄時出錯:', error);
    });
}

// 顯示聊天歷史紀錄
function displayChatHistory(chats) {
    const historyList = document.getElementById("historyList");
    historyList.innerHTML = '';

    chats.forEach(chat => {
        const chatItem = document.createElement('div');
        chatItem.className = 'chat-history-item';
        chatItem.dataset.id = chat.id;
        chatItem.innerHTML = `
            <span class="chat-title">${chat.title || '新對話'}</span>
            <button class="options-button">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="1"></circle>
                    <circle cx="19" cy="12" r="1"></circle>
                    <circle cx="5" cy="12" r="1"></circle>
                </svg>
            </button>
            <div class="options-menu" style="display: none;">
                <button class="rename-button">重新命名</button>
                <button class="delete-button">刪除</button>
            </div>
        `;

        chatItem.querySelector('.options-button').addEventListener('click', toggleOptionsMenu);
        chatItem.querySelector('.rename-button').addEventListener('click', (e) => {
            e.stopPropagation();
            renameChat(chat.id);
        });
        chatItem.querySelector('.delete-button').addEventListener('click', (e) => {
            e.stopPropagation();
            deleteChat(chat.id);
        });

        chatItem.addEventListener('click', (e) => {
            if (!e.target.closest('.options-button') && !e.target.closest('.options-menu')) {
                loadChat(chat.id);
                document.querySelectorAll('.chat-history-item').forEach(item => item.classList.remove('active'));
                chatItem.classList.add('active');
            }
        });

        if (chat.id === currentChatId) {
            chatItem.classList.add('active');
        }
        historyList.appendChild(chatItem);
    });
}

// 加載特定聊天
function loadChat(chatId) {
    currentChatId = chatId;
    fetch(`/api/chat/${chatId}`, {
        method: 'GET',
        credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            displayChatMessages(data.messages);
        } else {
            console.error('無法加載聊天:', data.message);
        }
    })
    .catch(error => {
        console.error('加載聊天時出錯:', error);
    });
}

// 顯示聊天消息
function displayChatMessages(messages) {
    clearChatContainer();
    const chatContainer = document.getElementById("chatContainer");

    // 檢查 messages 是否為數組
    if (Array.isArray(messages)) {
        messages.forEach(message => {
            const messageElement = document.createElement('div');
            messageElement.className = `message ${message.role}-message`;
            messageElement.textContent = message.content;
            chatContainer.appendChild(messageElement);
        });
    } else {
        console.error("無法顯示聊天消息: messages 不是一個數組。", messages);
    }
    
    autoScrollToBottom(chatContainer);
}


// Google 登錄處理
function handleCredentialResponse(response) {
    const id_token = response.credential;
    fetch('https://537c-114-43-157-51.ngrok-free.app/api/auth/google', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id_token: id_token }),
        credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
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
}

function updateUIAfterLogin(user) {
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('chatPage').style.display = 'flex';
    document.getElementById('user-info').style.display = 'flex';
    document.getElementById('user-name').textContent = user.name;
    document.getElementById('user-picture').src = user.picture;
    adjustChatContainerHeight();
}

function handleSignOut() {
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

function updateUIAfterLogout() {
    document.getElementById('loginPage').style.display = 'flex';
    document.getElementById('chatPage').style.display = 'none';
    document.getElementById('user-info').style.display = 'none';
    document.getElementById('user-name').textContent = '';
    document.getElementById('user-picture').src = '';
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

function autoGrow(element) {
    element.style.height = "5px";
    element.style.height = (element.scrollHeight) + "px";
}

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
            body: JSON.stringify({ message: message, chatId: currentChatId }),
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

        if (!currentChatId) {
            currentChatId = data.chatId;
            fetchChatHistory(); // 更新聊天歷史列表
        } else {
            // 更新當前對話的標題（如果需要）
            updateChatTitle(currentChatId, message.substring(0, 30) + '...');
        }
    } catch (error) {
        console.error('錯誤:', error);
        displayError('發送消息時出錯: ' + error.message);
    }
}

async function uploadAndAnalyzeFile(file, question) {
    try {
        displayMessage(`正在上傳文件: ${file.name}`, 'system-message');

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

        displayMessage(`文件 "${uploadResult.filename}" 上傳成功`, 'system-message');

        if (file.type.startsWith('image/')) {
            displayImagePreview(file);
        }

        displayMessage('正在分析文件...', 'system-message');

        const analyzeUrl = `/analyze/${encodeURIComponent(uploadResult.filename)}`;
        const analyzeResponse = await fetch(analyzeUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ question: question || "請分析這個文件並提供摘要", chatId: currentChatId }),
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

        if (!currentChatId) {
            currentChatId = analysisResult.chatId;
            fetchChatHistory(); // 更新聊天歷史列表
        }
    } catch (error) {
        console.error('錯誤:', error);
        displayError('文件處理錯誤: ' + error.message);
    }
}

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

function toggleOptionsMenu(e) {
    e.stopPropagation();
    const optionsMenu = e.target.closest('.chat-history-item').querySelector('.options-menu');
    optionsMenu.style.display = optionsMenu.style.display === 'none' ? 'block' : 'none';
}

function renameChat(chatId) {
    const chatItem = document.querySelector(`.chat-history-item[data-id="${chatId}"]`);
    const currentTitle = chatItem.querySelector('.chat-title').textContent;
    const newTitle = prompt("請輸入新的聊天標題:", currentTitle);
    
    if (newTitle && newTitle !== currentTitle) {
        fetch(`/api/chat/${chatId}/rename`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ title: newTitle }),
            credentials: 'include'
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                chatItem.querySelector('.chat-title').textContent = newTitle;
            } else {
                console.error('重命名聊天失敗:', data.message);
            }
        })
        .catch(error => console.error('重命名聊天時出錯:', error));
    }
}

function deleteChat(chatId) {
    if (confirm('確定要刪除這個對話嗎？')) {
        fetch(`/api/chat/${chatId}/delete`, {
            method: 'DELETE',
            credentials: 'include'
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                const chatItem = document.querySelector(`.chat-history-item[data-id="${chatId}"]`);
                chatItem.remove();
                if (currentChatId === chatId) {
                    currentChatId = null;
                    clearChatContainer();
                    addWelcomeMessage();
                }
            } else {
                console.error('刪除聊天失敗:', data.message);
            }
        })
        .catch(error => console.error('刪除聊天時出錯:', error));
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

function adjustChatContainerHeight() {
    const chatContainer = document.querySelector('.chat-messages');
    const inputContainer = document.querySelector('.input-container');
    const availableHeight = window.innerHeight - inputContainer.offsetHeight;
    chatContainer.style.height = `${availableHeight}px`;
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
    messageElement.textContent = message;
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

function handleInput() {
    autoGrow(this);
    resetConfirmation();
}

function handleFileUpload() {
    if (this.files && this.files[0]) {
        uploadedFile = this.files[0];
        fileName.textContent = uploadedFile.name;
        userInput.placeholder = "輸入有關文件的問題或直接發送...";
    }
}

function confirmInput() {
    inputConfirmed = true;
    userInput.classList.add("confirmed");
    inputStatus.textContent = "輸入已確認，按 Enter 發送訊息";
}

function resetConfirmation() {
    inputConfirmed = false;
    userInput.classList.remove("confirmed");
    inputStatus.textContent = "";
}

function insertNewline(element) {
    const start = element.selectionStart;
    const end = element.selectionEnd;
    const value = element.value;
    element.value = value.substring(0, start) + "\n" + value.substring(end);
    element.selectionStart = element.selectionEnd = start + 1;
    autoGrow(element);
}

// 新增：保存聊天記錄
function saveChatHistory() {
    if (currentChatId) {
        const chatContainer = document.getElementById("chatContainer");
        const messages = chatContainer.innerHTML;
        localStorage.setItem(`chat_${currentChatId}`, messages);
    }
}

// 新增：加載保存的聊天記錄
function loadSavedChat(chatId) {
    const savedChat = localStorage.getItem(`chat_${chatId}`);
    if (savedChat) {
        const chatContainer = document.getElementById("chatContainer");
        chatContainer.innerHTML = savedChat;
        autoScrollToBottom(chatContainer);
    }
}

function fetchAndDisplayChatHistory() {
    fetch('/api/chat/history', {
        method: 'GET',
        credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
        const historyList = document.getElementById('historyList');
        historyList.innerHTML = '';  // 清空现有列表
        data.chats.forEach(chat => {
            const li = document.createElement('li');
            li.textContent = chat.title || '新对话';  // 假设每个聊天有一个标题
            li.onclick = () => loadChat(chat.id);  // 加载特定聊天的函数
            historyList.appendChild(li);
        });
    })
    .catch(error => console.error('Error fetching chat history:', error));
}

// 在文件末尾添加這個函數
function updateChatTitle(chatId, newTitle) {
    fetch(`/api/chat/${chatId}/title`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title: newTitle }),
        credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            fetchChatHistory(); // 更新聊天歷史列表以顯示新標題
        }
    })
    .catch(error => console.error('更新聊天標題時出錯:', error));
}
// 在適當的地方調用 saveChatHistory()，比如在發送消息後和接收回應後
// 在 loadChat 函數中調用 loadSavedChat(chatId)