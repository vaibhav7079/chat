const loginScreen = document.getElementById('login-screen');
const chatScreen = document.getElementById('chat-screen');
const usernameInput = document.getElementById('username-input');
const joinBtn = document.getElementById('join-btn');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const messagesContainer = document.getElementById('messages-container');
const leaveBtn = document.getElementById('leave-btn');
const userList = document.getElementById('user-list');
const userCount = document.getElementById('user-count');
const myUsernameDisplay = document.getElementById('my-username');
const myAvatar = document.getElementById('my-avatar');
const menuBtn = document.getElementById('menu-btn');
const sidebar = document.querySelector('.sidebar');

let websocket = null;
let username = '';

// Event Listeners
joinBtn.addEventListener('click', joinChat);
usernameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') joinChat();
});

sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

leaveBtn.addEventListener('click', () => {
    if (websocket) {
        websocket.close();
    }
    showLoginScreen();
});

menuBtn.addEventListener('click', () => {
    sidebar.classList.toggle('open');
});

// Close sidebar when clicking outside on mobile
document.addEventListener('click', (e) => {
    if (window.innerWidth <= 768 && 
        !sidebar.contains(e.target) && 
        !menuBtn.contains(e.target) && 
        sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
    }
});

function joinChat() {
    username = usernameInput.value.trim();
    if (!username) return;

    // Determine WebSocket URL based on current location
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws/${encodeURIComponent(username)}`;

    connectWebSocket(wsUrl);
}

function connectWebSocket(url) {
    websocket = new WebSocket(url);

    websocket.onopen = () => {
        showChatScreen();
        myUsernameDisplay.textContent = username;
        myAvatar.textContent = username.charAt(0).toUpperCase();
    };

    websocket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleMessage(data);
    };

    websocket.onclose = () => {
        showLoginScreen();
    };

    websocket.onerror = (error) => {
        console.error('WebSocket Error:', error);
        alert('Connection error. Please try again.');
        showLoginScreen();
    };
}

function handleMessage(data) {
    if (data.type === 'message') {
        displayMessage(data);
    } else if (data.type === 'user_list') {
        updateUserList(data.users);
    }
}

function sendMessage() {
    const message = messageInput.value.trim();
    if (message && websocket && websocket.readyState === WebSocket.OPEN) {
        websocket.send(message);
        // Note: Server now broadcasts back to sender too (in my updated logic), 
        // OR we can optimistically add it. 
        // Let's check server logic: "await manager.broadcast(data, sender=username)"
        // And broadcast excludes sender? No, I removed the "if connection != sender" check in the new broadcast method!
        // Wait, let me double check the server code I wrote.
        // "for connection in self.active_connections: await connection.send_text(data)"
        // YES, it sends to everyone including sender. So I should NOT add it manually here to avoid duplicates.
        
        messageInput.value = '';
    }
}

function displayMessage(data) {
    const { content, sender, timestamp } = data;
    const isMe = sender === username;
    const isSystem = sender === 'System';

    if (isSystem) {
        addSystemMessage(content);
        return;
    }

    const messageWrapper = document.createElement('div');
    messageWrapper.classList.add('message-wrapper', isMe ? 'sent' : 'received');

    const messageMeta = document.createElement('div');
    messageMeta.classList.add('message-meta');
    
    if (!isMe) {
        const senderName = document.createElement('span');
        senderName.classList.add('sender-name');
        senderName.textContent = sender;
        messageMeta.appendChild(senderName);
    }

    const timeSpan = document.createElement('span');
    timeSpan.textContent = timestamp;
    messageMeta.appendChild(timeSpan);

    const messageBubble = document.createElement('div');
    messageBubble.classList.add('message-bubble');
    messageBubble.textContent = content;

    messageWrapper.appendChild(messageMeta);
    messageWrapper.appendChild(messageBubble);

    messagesContainer.appendChild(messageWrapper);
    scrollToBottom();
}

function addSystemMessage(text) {
    const div = document.createElement('div');
    div.classList.add('system-message');
    div.textContent = text;
    messagesContainer.appendChild(div);
    scrollToBottom();
}

function updateUserList(users) {
    userList.innerHTML = '';
    userCount.textContent = users.length;

    users.forEach(user => {
        const li = document.createElement('li');
        li.classList.add('user-item');
        
        const avatar = document.createElement('div');
        avatar.classList.add('user-avatar');
        avatar.textContent = user.charAt(0).toUpperCase();
        
        const name = document.createElement('span');
        name.classList.add('user-name');
        name.textContent = user;
        
        if (user === username) {
            name.textContent += ' (You)';
            name.style.fontWeight = 'bold';
        }

        li.appendChild(avatar);
        li.appendChild(name);
        userList.appendChild(li);
    });
}

function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function showChatScreen() {
    loginScreen.classList.remove('active');
    chatScreen.classList.add('active');
}

function showLoginScreen() {
    chatScreen.classList.remove('active');
    loginScreen.classList.add('active');
    messagesContainer.innerHTML = '';
    websocket = null;
}
