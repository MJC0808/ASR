/**
 * AI 챗봇 JavaScript
 */

let messages = [];

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    initializeChatbot();
});

/**
 * 챗봇 초기화
 */
function initializeChatbot() {
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    
    // Enter 키로 메시지 전송
    if (chatInput) {
        chatInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }
    
    // 전송 버튼 클릭
    if (sendBtn) {
        sendBtn.addEventListener('click', sendMessage);
    }
}

/**
 * 메시지 전송
 */
async function sendMessage() {
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const userMessage = chatInput.value.trim();
    
    if (!userMessage) {
        return;
    }
    
    // 입력 필드 비우기
    chatInput.value = '';
    sendBtn.disabled = true;
    sendBtn.textContent = '전송 중...';
    
    // 사용자 메시지 추가
    const userMessageObj = {
        role: 'user',
        content: userMessage
    };
    messages.push(userMessageObj);
    addMessageToChat(userMessageObj);
    
    try {
        // AI 응답 받기
        const response = await fetch('http://localhost:5000/api/chatbot/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messages: messages,
                username: 'guest' // 실제로는 로그인한 사용자 이름 사용
            })
        });
        
        const data = await response.json();
        
        if (data.success && data.response) {
            const assistantMessage = {
                role: 'assistant',
                content: data.response
            };
            messages.push(assistantMessage);
            addMessageToChat(assistantMessage);
        } else {
            showError(data.error || 'AI 응답을 받을 수 없습니다.');
        }
        
    } catch (error) {
        console.error('챗봇 오류:', error);
        showError('챗봇 응답 중 오류가 발생했습니다: ' + error.message);
    } finally {
        // 버튼 활성화
        sendBtn.disabled = false;
        sendBtn.textContent = '전송';
    }
}

/**
 * 채팅에 메시지 추가
 */
function addMessageToChat(message) {
    const chatContainer = document.getElementById('chat-container');
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${message.role}`;
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = message.role === 'user' ? '👤' : '🤖';
    
    const content = document.createElement('div');
    content.className = 'message-content';
    content.textContent = message.content;
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(content);
    
    chatContainer.appendChild(messageDiv);
    
    // 스크롤을 맨 아래로
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

/**
 * 대화 기록 삭제
 */
function deleteChatHistory() {
    if (confirm('모든 대화 내용을 삭제하시겠습니까?')) {
        messages = [];
        const chatContainer = document.getElementById('chat-container');
        chatContainer.innerHTML = '';
        alert('대화 내용이 삭제되었습니다.');
    }
}

/**
 * 에러 메시지 표시
 */
function showError(errorMessage) {
    const assistantMessage = {
        role: 'assistant',
        content: '⚠️ ' + errorMessage
    };
    addMessageToChat(assistantMessage);
}

