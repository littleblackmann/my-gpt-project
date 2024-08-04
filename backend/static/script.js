// 此函數使輸入框根據內容自動調整高度
function autoGrow(element) {
    element.style.height = "5px";
    element.style.height = (element.scrollHeight + 10) + "px";
}

// 為輸入框添加事件監聽器，處理按下 Enter 鍵發送消息
document.getElementById("userInput").addEventListener("keydown", function(event) {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault(); // 阻止預設的 Enter 鍵行為（新增換行）
        sendMessage(); // 發送消息
    }
});

// 這個函數處理消息的發送
async function sendMessage() {
    const userInput = document.getElementById("userInput").value.trim();
    if (!userInput) {
        console.log("輸入為空。"); // 如果輸入是空的，不執行任何操作
        return;
    }
    document.getElementById("userInput").value = ""; // 清空輸入框
    autoGrow(document.getElementById("userInput")); // 調整輸入框大小

    // 在使用者消息框中顯示輸入
    const userBox = document.getElementById("userBox");
    userBox.textContent += "" + userInput + "\n"; // 添加使用者的輸入
    autoScrollToBottom(userBox); // 自動滾動到底部

    // 向後端發送 POST 請求
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

    // 處理後端的回應
    const data = await response.json();
    const aiBox = document.getElementById("aiBox");
    aiBox.textContent += "" + (data.response || '未獲得有效回應') + "\n"; // 顯示 AI 回應
    autoScrollToBottom(aiBox); // 確保滾動到底部
}

// 此函數確保聊天框可以自動滾動到底部
function autoScrollToBottom(container) {
    container.scrollTop = container.scrollHeight;
}
