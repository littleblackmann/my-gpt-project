function autoGrow(element) {
    element.style.height = "5px";
    element.style.height = (element.scrollHeight + 10) + "px";
}

let enterPressCount = 0;

document.getElementById("userInput").addEventListener("keydown", function(event) {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        enterPressCount++;
        if (enterPressCount >= 2) {
            sendMessage();
            enterPressCount = 0;
        }
    } else if (event.shiftKey && event.key === "Enter") {
        enterPressCount = 0;
    }
});

function displayMessage(container, message, className) {
    if (message.trim() === "") {
        console.log("無消息顯示。"); // 調試
        return;
    }
    const messageDiv = document.createElement("div");
    messageDiv.className = `chat-message ${className}`;
    messageDiv.textContent = message;
    container.appendChild(messageDiv);
    container.appendChild(document.createElement("br")); // 在每條消息後添加換行
    container.style.display = "block";
    container.style.backgroundColor = "#f5f5dc";
    container.scrollTop = container.scrollHeight; // 確保滾動到新消息
}

async function sendMessage() {
    const userInput = document.getElementById("userInput").value;
    if (userInput.trim() === "") {
        return;
    }
    document.getElementById("userInput").value = "";
    autoGrow(document.getElementById("userInput"));

    const userBox = document.getElementById("userBox");
    userBox.textContent += userInput + "\n";  // 更新使用 textContent 以直接添加文本
    userBox.scrollTop = userBox.scrollHeight;

    const response = await fetch("/chat", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ message: userInput })
    });

    const data = await response.json();
    const aiBox = document.getElementById("aiBox");
    aiBox.textContent += data.response.text || '未獲得有效回應';  // 直接添加文本
    aiBox.scrollTop = aiBox.scrollHeight;
}
