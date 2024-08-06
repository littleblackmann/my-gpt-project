function autoGrow(element) {
    element.style.height = "5px";
    element.style.height = (element.scrollHeight + 10) + "px";
}

document.getElementById("userInput").addEventListener("keydown", function(event) {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
});

async function sendMessage() {
    const userInput = document.getElementById("userInput").value.trim();
    if (!userInput) {
        console.log("輸入為空。");
        return;
    }
    document.getElementById("userInput").value = "";
    autoGrow(document.getElementById("userInput"));

    const userBox = document.getElementById("userBox");
    userBox.textContent += "您: \n" + userInput + "\n";
    autoScrollToBottom(userBox);

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
        const aiBox = document.getElementById("aiBox");
        await typeWriter(aiBox, "AI: \n" + (data.response || '未獲得有效回應') + "\n");
        autoScrollToBottom(aiBox);
    } catch (error) {
        console.error('錯誤:', error);
        alert('發送消息時出錯: ' + error.message);
    }
}

async function uploadAndAnalyzeFile() {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
    if (!file) {
        alert('請選擇一個文件');
        return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
        const uploadResponse = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });

        if (!uploadResponse.ok) {
            throw new Error('文件上傳失敗: ' + uploadResponse.status);
        }

        const uploadResult = await uploadResponse.json();
        console.log('文件上傳成功:', uploadResult);

        const analyzeResponse = await fetch(`/api/analyze/${uploadResult.filename}`, {
            method: 'POST'
        });

        if (!analyzeResponse.ok) {
            throw new Error('文件分析失敗: ' + analyzeResponse.status);
        }

        const analysisResult = await analyzeResponse.json();
        console.log('文件分析結果:', analysisResult);

        const aiBox = document.getElementById("aiBox");
        await typeWriter(aiBox, "AI (文件分析結果)：\n" + analysisResult.analysis + "\n");
        autoScrollToBottom(aiBox);
    } catch (error) {
        console.error('錯誤:', error);
        alert('文件處理錯誤: ' + error.message);
    }
}

async function typeWriter(element, text, speed = 20) {
    for (let i = 0; i < text.length; i++) {
        element.textContent += text.charAt(i);
        autoScrollToBottom(element);
        await new Promise(resolve => setTimeout(resolve, speed));
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

document.addEventListener('DOMContentLoaded', (event) => {
    const aiBox = document.getElementById("aiBox");
    const userBox = document.getElementById("userBox");
    
    adjustContainerHeight(aiBox);
    adjustContainerHeight(userBox);

    enableSmoothScroll(aiBox);
    enableSmoothScroll(userBox);

    const observer = new MutationObserver(() => {
        autoScrollToBottom(aiBox);
        autoScrollToBottom(userBox);
    });

    observer.observe(aiBox, { childList: true, subtree: true });
    observer.observe(userBox, { childList: true, subtree: true });
});

window.addEventListener('resize', () => {
    adjustContainerHeight(document.getElementById("aiBox"));
    adjustContainerHeight(document.getElementById("userBox"));
});