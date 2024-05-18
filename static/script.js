function autoGrow(element) {
    element.style.height = "5px";
    element.style.height = (element.scrollHeight + 10) + "px";
}

let enterPressCount = 0;

document.getElementById("userInput").addEventListener("keydown", function(event) {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        enterPressCount++;
        console.log("按 Enter 次數:", enterPressCount); // 調試
        if (enterPressCount >= 2) {
            sendMessage();
            enterPressCount = 0;
        }
    } else if (event.shiftKey && event.key === "Enter") {
        enterPressCount = 0;
    }
});

function autoScrollToBottom(container) {
    setTimeout(() => {
        container.scrollTop = container.scrollHeight;
    }, 0); // 延遲0毫秒，確保DOM完全更新後執行滾動
}

async function sendMessage() {
    const userInput = document.getElementById("userInput").value;
    if (userInput.trim() === "") {
        console.log("輸入為空。"); // 調試
        return;
    }
    document.getElementById("userInput").value = "";
    autoGrow(document.getElementById("userInput"));

    const userBox = document.getElementById("userBox");
    userBox.textContent += userInput + "\n"; // 更新使用 textContent 以直接新增文字
    autoScrollToBottom(userBox); // 確保滾動到底部

    const response = await fetch("/chat", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ message: userInput })
    });

    const data = await response.json();
    const aiBox = document.getElementById("aiBox");
    aiBox.textContent += data.response.text || '未獲得有效回應'; //直接增加
    autoScrollToBottom(aiBox); // 確保滾動到底部
}