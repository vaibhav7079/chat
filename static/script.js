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
let unreadCounts = {
    'General': 0
};

function selectRecipient(recipient) {
    currentRecipient = recipient;
    
    // Reset unread count
    if (recipient) {
        unreadCounts[recipient] = 0;
    } else {
        unreadCounts['General'] = 0;
    }
    updateNotificationUI(recipient);

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
    const headerAvatar = document.getElementById('header-avatar');
    
    if (recipient) {
        channelName.textContent = recipient;
        headerAvatar.style.display = 'flex';
        headerAvatar.style.background = '#334155'; // Default or dynamic color
        headerAvatar.textContent = recipient.charAt(0).toUpperCase();
    } else {
        channelName.textContent = "General";
        headerAvatar.style.display = 'flex';
        headerAvatar.style.background = 'var(--primary-color)';
        headerAvatar.textContent = '#';
    }
    
    // Render filtered messages
    renderMessages();
    
    // Clear input
    messageInput.focus();
    
    // Mobile: Show chat view
    showChatView();
}

// Expose to window for onclick
window.selectRecipient = selectRecipient;
window.showSidebarView = showSidebarView;

function showChatView() {
    if (window.innerWidth <= 768) {
        document.querySelector('.sidebar').classList.add('hidden');
        document.querySelector('.chat-area').classList.add('active');
    }
}

function showSidebarView() {
    if (window.innerWidth <= 768) {
        document.querySelector('.sidebar').classList.remove('hidden');
        document.querySelector('.chat-area').classList.remove('active');
        // Optional: Deselect recipient to clear active state? 
        // No, keep state, just change view.
    }
}

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
        unreadCounts = { 'General': 0 }; // Reset counts
        selectRecipient(null); // Reset to General
        showSidebarView(); // Ensure sidebar is visible on load (mobile)
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
        
        // Handle unread counts
        const { recipient, sender } = data;
        const isPrivate = !!recipient;
        const isMe = sender === username;

        if (!isMe) {
            if (isPrivate) {
                // Private message received
                // If I am NOT chatting with the sender, increment their count
                if (currentRecipient !== sender) {
                    unreadCounts[sender] = (unreadCounts[sender] || 0) + 1;
                    updateNotificationUI(sender);
                }
            } else {
                // Public message received
                // If I am NOT in General, increment General count
                if (currentRecipient !== null) {
                    unreadCounts['General'] = (unreadCounts['General'] || 0) + 1;
                    updateNotificationUI(null); // null for General
                }
            }
        }

        if (shouldDisplayMessage(data)) {
            displayMessage(data);
        }
    } else if (data.type === 'user_list') {
        updateUserList(data.users);
    }
}

function updateNotificationUI(user) {
    let container;
    let countSpan;
    let count;

    if (user) {
        // Find user item
        const items = document.querySelectorAll('.user-item');
        items.forEach(item => {
            if (item.querySelector('.user-name')?.textContent === user) {
                container = item.querySelector('.badge-container');
                countSpan = item.querySelector('.notification-count');
            }
        });
        count = unreadCounts[user] || 0;
    } else {
        // General
        container = document.getElementById('general-badge-container');
        countSpan = document.getElementById('general-badge');
        count = unreadCounts['General'] || 0;
    }

    if (container && countSpan) {
        countSpan.textContent = count;
        if (count > 0) {
            container.style.display = 'flex';
        } else {
            container.style.display = 'none';
        }
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
        // Private label removed as per user request
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

        // Badge Container
        const badgeContainer = document.createElement('div');
        badgeContainer.classList.add('badge-container');
        badgeContainer.style.display = 'none'; // Hidden by default

        const countSpan = document.createElement('span');
        countSpan.classList.add('notification-count');
        const count = unreadCounts[user] || 0;
        countSpan.textContent = count;
        
        if (count > 0) {
            badgeContainer.style.display = 'flex';
        }

        // Bell Icon SVG
        badgeContainer.innerHTML = `
            <span class="notification-count">${count}</span>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" class="bell-icon">
                <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z"/>
            </svg>
        `;
        
        li.appendChild(avatar);
        li.appendChild(name);
        li.appendChild(badgeContainer);
        userList.appendChild(li);
    });
    
    // Re-apply active class to General if needed
    const generalChannel = document.getElementById('general-channel');
    if (generalActive) {
        generalChannel.classList.add('active');
    } else {
        generalChannel.classList.remove('active');
    }
    
    // Update General badge as well (it might have changed while list was rebuilding)
    updateNotificationUI(null);
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
