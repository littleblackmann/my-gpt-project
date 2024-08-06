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
    userBox.textContent += "" + userInput + "\n";
    autoScrollToBottom(userBox);

    const response = await fetch("/chat", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ message: userInput })
    });

    if (!response.ok) {
        console.error('Failed to fetch:', response.status);
        return;
    }

    const data = await response.json();
    const aiBox = document.getElementById("aiBox");
    aiBox.textContent += "" + (data.response || '未獲得有效回應') + "\n";
    autoScrollToBottom(aiBox);
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
            throw new Error('文件上傳失敗');
        }

        const uploadResult = await uploadResponse.json();
        console.log('文件上傳成功:', uploadResult);

        const analyzeResponse = await fetch(`/api/analyze/${uploadResult.filename}`, {
            method: 'POST'
        });

        if (!analyzeResponse.ok) {
            throw new Error('文件分析失敗');
        }

        const analysisResult = await analyzeResponse.json();
        console.log('文件分析結果:', analysisResult);

        const aiBox = document.getElementById("aiBox");
        aiBox.textContent += "文件分析結果：\n" + analysisResult.analysis + "\n";
        autoScrollToBottom(aiBox);

    } catch (error) {
        console.error('錯誤:', error);
        alert(error.message);
    }
}

function autoScrollToBottom(container) {
    container.scrollTop = container.scrollHeight;
}