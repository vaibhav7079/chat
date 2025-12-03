const loginScreen = document.getElementById('login-screen');
const chatScreen = document.getElementById('chat-screen');
const usernameInput = document.getElementById('username-input');
const passwordInput = document.getElementById('password-input');
const togglePasswordBtn = document.getElementById('toggle-password');
const loginError = document.getElementById('login-error');
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
passwordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') joinChat();
});

togglePasswordBtn.addEventListener('click', () => {
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    
    // Update icon (optional, could switch eye/eye-slash)
    const icon = togglePasswordBtn.querySelector('svg');
    if (type === 'text') {
        icon.style.color = 'var(--primary-color)';
    } else {
        icon.style.color = 'currentColor';
    }
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

let currentRecipient = null; // null means General
let allMessages = []; // Store all messages locally

function selectRecipient(recipient) {
    currentRecipient = recipient;
    
    // Update UI
    document.querySelectorAll('.user-item').forEach(item => item.classList.remove('active'));
    if (recipient) {
        const items = document.querySelectorAll('.user-item');
        items.forEach(item => {
            if (item.querySelector('.user-name')?.textContent === recipient) {
                item.classList.add('active');
            }
        });
    } else {
        document.getElementById('general-channel').classList.add('active');
    }

    // Update Header
    const channelName = document.querySelector('.chat-info h2');
    if (recipient) {
        channelName.textContent = `Private with ${recipient}`;
    } else {
        channelName.textContent = "General Channel";
    }
    
    // Render filtered messages
    renderMessages();
    
    // Clear input
    messageInput.focus();
}

// Expose to window for onclick
window.selectRecipient = selectRecipient;

function joinChat() {
    username = usernameInput.value.trim();
    const password = passwordInput.value.trim();
    
    loginError.textContent = ''; // Clear previous errors

    if (!username) {
        loginError.textContent = "Please enter a username";
        return;
    }
    if (!password) {
        loginError.textContent = "Please enter the password";
        return;
    }

    // Determine WebSocket URL based on current location
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws/${encodeURIComponent(username)}?token=${encodeURIComponent(password)}`;

    connectWebSocket(wsUrl);
}

function connectWebSocket(url) {
    websocket = new WebSocket(url);

    websocket.onopen = () => {
        showChatScreen();
        myUsernameDisplay.textContent = username;
        myAvatar.textContent = username.charAt(0).toUpperCase();
        loginError.textContent = '';
        allMessages = []; // Clear messages on new connection
        selectRecipient(null); // Reset to General
    };

    websocket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleMessage(data);
    };

    websocket.onclose = (event) => {
        if (event.code === 4003) {
            loginError.textContent = "Incorrect Password!";
        } else if (event.code === 4009) {
            loginError.textContent = "Username already taken!";
        }
        showLoginScreen();
    };

    websocket.onerror = (error) => {
        console.error('WebSocket Error:', error);
    };
}

function handleMessage(data) {
    if (data.type === 'message') {
        allMessages.push(data);
        if (shouldDisplayMessage(data)) {
            displayMessage(data);
        }
    } else if (data.type === 'user_list') {
        updateUserList(data.users);
    }
}

function shouldDisplayMessage(data) {
    const { recipient, sender } = data;
    const isPrivate = !!recipient;
    
    if (currentRecipient === null) {
        // General Channel: Show only public messages (no recipient)
        return !isPrivate;
    } else {
        // Private Channel: Show messages with the current recipient
        if (!isPrivate) return false;
        
        const isMe = sender === username;
        if (isMe) {
            return recipient === currentRecipient;
        } else {
            return sender === currentRecipient;
        }
    }
}

function renderMessages() {
    messagesContainer.innerHTML = '';
    allMessages.forEach(msg => {
        if (shouldDisplayMessage(msg)) {
            displayMessage(msg);
        }
    });
    scrollToBottom();
}

function sendMessage() {
    const message = messageInput.value.trim();
    if (message && websocket && websocket.readyState === WebSocket.OPEN) {
        const payload = JSON.stringify({
            content: message,
            recipient: currentRecipient
        });
        websocket.send(payload);
        messageInput.value = '';
    }
}

function displayMessage(data) {
    const { content, sender, timestamp, recipient } = data;
    const isMe = sender === username;
    const isSystem = sender === 'System';
    const isPrivate = !!recipient;

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

    if (isPrivate) {
        messageBubble.classList.add('private');
        // Optional: We don't strictly need the label anymore since the view is filtered,
        // but it doesn't hurt to keep it for clarity.
        // Let's keep it but maybe simplify? No, keep as is for consistency.
        const privateLabel = document.createElement('span');
        privateLabel.style.fontSize = '0.7em';
        privateLabel.style.fontWeight = 'bold';
        privateLabel.style.display = 'block';
        privateLabel.style.marginBottom = '4px';
        privateLabel.style.color = 'var(--accent-color)';
        
        if (isMe) {
            privateLabel.textContent = `Private to ${recipient}`;
        } else {
            privateLabel.textContent = `Private from ${sender}`;
        }
        messageBubble.prepend(privateLabel);
    }

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
    // Keep reference to general channel
    const generalActive = currentRecipient === null;
    
    userList.innerHTML = '';
    userCount.textContent = users.length;

    users.forEach(user => {
        if (user === username) return; // Don't show self in list to chat with

        const li = document.createElement('li');
        li.classList.add('user-item');
        if (currentRecipient === user) {
            li.classList.add('active');
        }
        li.onclick = () => selectRecipient(user);
        
        const avatar = document.createElement('div');
        avatar.classList.add('user-avatar');
        avatar.textContent = user.charAt(0).toUpperCase();
        
        const name = document.createElement('span');
        name.classList.add('user-name');
        name.textContent = user;

        li.appendChild(avatar);
        li.appendChild(name);
        userList.appendChild(li);
    });
    
    // Re-apply active class to General if needed
    const generalChannel = document.getElementById('general-channel');
    if (generalActive) {
        generalChannel.classList.add('active');
    } else {
        generalChannel.classList.remove('active');
    }
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
