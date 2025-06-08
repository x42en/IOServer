import { BaseController } from "../../../src";

export class ChatController extends BaseController {
  async getIndex(request: any, reply: any): Promise<void> {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>IOServer Chat App</title>
    <script src="/socket.io/socket.io.js"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .container {
            background: white;
            border-radius: 10px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            overflow: hidden;
            width: 90%;
            max-width: 1200px;
            height: 80vh;
            display: flex;
        }
        
        .login-form {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 40px;
            width: 100%;
        }
        
        .login-form h1 {
            color: #333;
            margin-bottom: 30px;
        }
        
        .login-form input {
            padding: 15px;
            border: 2px solid #ddd;
            border-radius: 8px;
            font-size: 16px;
            width: 300px;
            margin-bottom: 20px;
        }
        
        .login-form button {
            padding: 15px 30px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            cursor: pointer;
            transition: transform 0.2s;
        }
        
        .login-form button:hover {
            transform: translateY(-2px);
        }
        
        .error {
            color: #e74c3c;
            margin-top: 10px;
        }
        
        .chat-container {
            display: none;
            flex: 1;
        }
        
        .sidebar {
            width: 300px;
            background: #2c3e50;
            color: white;
            display: flex;
            flex-direction: column;
        }
        
        .user-info {
            padding: 20px;
            background: #34495e;
            border-bottom: 1px solid #3c5065;
        }
        
        .rooms-section, .users-section {
            padding: 20px;
            flex: 1;
        }
        
        .rooms-section h3, .users-section h3 {
            margin-bottom: 15px;
            color: #ecf0f1;
        }
        
        .room-list, .user-list {
            list-style: none;
        }
        
        .room-item, .user-item {
            padding: 10px;
            margin: 5px 0;
            background: #34495e;
            border-radius: 5px;
            cursor: pointer;
            transition: background 0.2s;
        }
        
        .room-item:hover {
            background: #3c5065;
        }
        
        .room-item.active {
            background: #3498db;
        }
        
        .new-room {
            display: flex;
            margin-top: 10px;
        }
        
        .new-room input {
            flex: 1;
            padding: 8px;
            border: none;
            border-radius: 4px;
            margin-right: 5px;
        }
        
        .new-room button {
            padding: 8px 12px;
            background: #3498db;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }
        
        .main-chat {
            flex: 1;
            display: flex;
            flex-direction: column;
        }
        
        .chat-header {
            padding: 20px;
            background: #ecf0f1;
            border-bottom: 1px solid #bdc3c7;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        
        .notification-badge {
            background: #e74c3c;
            color: white;
            border-radius: 50%;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            margin-left: 10px;
        }
        
        .messages {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
            background: #f8f9fa;
        }
        
        .message {
            margin-bottom: 15px;
            padding: 10px;
            border-radius: 8px;
            max-width: 70%;
        }
        
        .message.own {
            background: #3498db;
            color: white;
            margin-left: auto;
        }
        
        .message.other {
            background: white;
            border: 1px solid #ddd;
        }
        
        .message.system {
            background: #95a5a6;
            color: white;
            text-align: center;
            font-style: italic;
            max-width: 100%;
            margin: 5px auto;
        }
        
        .message-header {
            font-size: 12px;
            opacity: 0.8;
            margin-bottom: 5px;
        }
        
        .message-input {
            padding: 20px;
            background: white;
            border-top: 1px solid #ddd;
            display: flex;
            align-items: center;
        }
        
        .message-input input {
            flex: 1;
            padding: 15px;
            border: 1px solid #ddd;
            border-radius: 25px;
            margin-right: 10px;
        }
        
        .message-input button {
            padding: 15px 25px;
            background: #3498db;
            color: white;
            border: none;
            border-radius: 25px;
            cursor: pointer;
        }
        
        .typing-indicator {
            padding: 10px 20px;
            font-style: italic;
            color: #7f8c8d;
        }
        
        .hidden {
            display: none !important;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Login Form -->
        <div id="loginForm" class="login-form">
            <h1>Welcome to IOServer Chat</h1>
            <input type="text" id="usernameInput" placeholder="Enter your username" maxlength="20">
            <button onclick="login()">Join Chat</button>
            <div id="loginError" class="error"></div>
        </div>
        
        <!-- Chat Interface -->
        <div id="chatContainer" class="chat-container">
            <!-- Sidebar -->
            <div class="sidebar">
                <div class="user-info">
                    <h3 id="currentUser">User</h3>
                    <p id="currentRoom">general</p>
                </div>
                
                <div class="rooms-section">
                    <h3>
                        Rooms 
                        <span id="notificationBadge" class="notification-badge hidden">0</span>
                    </h3>
                    <ul id="roomList" class="room-list"></ul>
                    <div class="new-room">
                        <input type="text" id="newRoomInput" placeholder="New room name">
                        <button onclick="createRoom()">+</button>
                    </div>
                </div>
                
                <div class="users-section">
                    <h3>Online Users (<span id="userCount">0</span>)</h3>
                    <ul id="userList" class="user-list"></ul>
                </div>
            </div>
            
            <!-- Main Chat -->
            <div class="main-chat">
                <div class="chat-header">
                    <h2 id="roomTitle">General</h2>
                </div>
                
                <div id="messages" class="messages"></div>
                <div id="typingIndicator" class="typing-indicator hidden"></div>
                
                <div class="message-input">
                    <input type="text" id="messageInput" placeholder="Type a message..." maxlength="500">
                    <button onclick="sendMessage()">Send</button>
                </div>
            </div>
        </div>
    </div>

    <script>
        const socket = io('/chat');
        let currentUser = '';
        let currentRoom = 'general';
        let typingTimeout;
        let unreadMessages = {};
        
        // DOM Elements
        const loginForm = document.getElementById('loginForm');
        const chatContainer = document.getElementById('chatContainer');
        const usernameInput = document.getElementById('usernameInput');
        const loginError = document.getElementById('loginError');
        const messagesDiv = document.getElementById('messages');
        const messageInput = document.getElementById('messageInput');
        const roomList = document.getElementById('roomList');
        const userList = document.getElementById('userList');
        const currentUserSpan = document.getElementById('currentUser');
        const currentRoomSpan = document.getElementById('currentRoom');
        const roomTitle = document.getElementById('roomTitle');
        const userCount = document.getElementById('userCount');
        const typingIndicator = document.getElementById('typingIndicator');
        const notificationBadge = document.getElementById('notificationBadge');
        const newRoomInput = document.getElementById('newRoomInput');
        
        // Login
        function login() {
            const username = usernameInput.value.trim();
            if (!username) {
                showError('Please enter a username');
                return;
            }
            
            socket.emit('login', { username }, (response) => {
                if (response.status === 'success') {
                    currentUser = username;
                    currentRoom = response.user.room;
                    showChat();
                    updateUserInfo();
                    updateRoomUsers(response.roomUsers);
                    displayMessages(response.recentMessages);
                    updateRoomList(response.availableRooms);
                } else {
                    showError(response.message);
                }
            });
        }
        
        function showError(message) {
            loginError.textContent = message;
            setTimeout(() => loginError.textContent = '', 3000);
        }
        
        function showChat() {
            loginForm.classList.add('hidden');
            chatContainer.style.display = 'flex';
        }
        
        function updateUserInfo() {
            currentUserSpan.textContent = currentUser;
            currentRoomSpan.textContent = currentRoom;
            roomTitle.textContent = currentRoom.charAt(0).toUpperCase() + currentRoom.slice(1);
        }
        
        // Messages
        function sendMessage() {
            const content = messageInput.value.trim();
            if (!content) return;
            
            socket.emit('send_message', { content }, (response) => {
                if (response.status === 'success') {
                    messageInput.value = '';
                    stopTyping();
                }
            });
        }
        
        function displayMessage(message) {
            const messageEl = document.createElement('div');
            messageEl.className = \`message \${message.type === 'system' ? 'system' : 
                message.username === currentUser ? 'own' : 'other'}\`;
            
            if (message.type !== 'system') {
                messageEl.innerHTML = \`
                    <div class="message-header">
                        \${message.username} • \${new Date(message.timestamp).toLocaleTimeString()}
                    </div>
                    <div>\${escapeHtml(message.content)}</div>
                \`;
            } else {
                messageEl.innerHTML = \`<div>\${escapeHtml(message.content)}</div>\`;
            }
            
            messagesDiv.appendChild(messageEl);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }
        
        function displayMessages(messages) {
            messagesDiv.innerHTML = '';
            messages.forEach(displayMessage);
        }
        
        // Rooms
        function createRoom() {
            const roomName = newRoomInput.value.trim();
            if (!roomName) return;
            
            joinRoom(roomName);
            newRoomInput.value = '';
        }
        
        function joinRoom(roomName) {
            socket.emit('join_room', { room: roomName }, (response) => {
                if (response.status === 'success') {
                    currentRoom = response.room;
                    updateUserInfo();
                    updateRoomUsers(response.roomUsers);
                    displayMessages(response.recentMessages);
                    updateActiveRoom();
                    delete unreadMessages[roomName];
                    updateNotificationBadge();
                }
            });
        }
        
        function updateRoomList(rooms) {
            roomList.innerHTML = '';
            rooms.forEach(room => {
                const li = document.createElement('li');
                li.className = 'room-item' + (room.name === currentRoom ? ' active' : '');
                li.innerHTML = \`
                    \${room.name} (\${room.userCount})
                    \${unreadMessages[room.name] ? \`<span class="notification-badge">\${unreadMessages[room.name]}</span>\` : ''}
                \`;
                li.onclick = () => joinRoom(room.name);
                roomList.appendChild(li);
            });
        }
        
        function updateActiveRoom() {
            document.querySelectorAll('.room-item').forEach(item => {
                item.classList.remove('active');
                if (item.textContent.includes(currentRoom)) {
                    item.classList.add('active');
                }
            });
        }
        
        // Users
        function updateRoomUsers(users) {
            userList.innerHTML = '';
            userCount.textContent = users.length;
            users.forEach(username => {
                const li = document.createElement('li');
                li.className = 'user-item';
                li.textContent = username + (username === currentUser ? ' (you)' : '');
                userList.appendChild(li);
            });
        }
        
        // Typing
        function startTyping() {
            socket.emit('typing', { isTyping: true });
            clearTimeout(typingTimeout);
            typingTimeout = setTimeout(stopTyping, 3000);
        }
        
        function stopTyping() {
            socket.emit('typing', { isTyping: false });
            clearTimeout(typingTimeout);
        }
        
        // Notifications
        function updateNotificationBadge() {
            const total = Object.values(unreadMessages).reduce((sum, count) => sum + count, 0);
            if (total > 0) {
                notificationBadge.textContent = total;
                notificationBadge.classList.remove('hidden');
            } else {
                notificationBadge.classList.add('hidden');
            }
        }
        
        // Socket Events
        socket.on('new_message', (message) => {
            if (message.room === currentRoom) {
                displayMessage(message);
            } else {
                unreadMessages[message.room] = (unreadMessages[message.room] || 0) + 1;
                updateNotificationBadge();
            }
        });
        
        socket.on('user_joined', (data) => {
            if (data.message.room === currentRoom) {
                displayMessage(data.message);
                updateRoomUsers(data.roomUsers);
            }
        });
        
        socket.on('user_left', (data) => {
            if (data.message.room === currentRoom) {
                displayMessage(data.message);
                updateRoomUsers(data.roomUsers);
            }
        });
        
        socket.on('user_typing', (data) => {
            if (data.isTyping) {
                typingIndicator.textContent = \`\${data.username} is typing...\`;
                typingIndicator.classList.remove('hidden');
            } else {
                typingIndicator.classList.add('hidden');
            }
        });
        
        socket.on('login_error', (error) => {
            showError(error.message);
        });
        
        // Event Listeners
        usernameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') login();
        });
        
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendMessage();
            } else {
                startTyping();
            }
        });
        
        newRoomInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') createRoom();
        });
        
        // Utility
        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
        
        // Handle disconnect
        socket.on('disconnect', () => {
            socket.emit('disconnect');
        });
    </script>
</body>
</html>
    `;

    reply.type("text/html").send(html);
  }

  async getHealth(request: any, reply: any): Promise<void> {
    reply.send({
      status: "OK",
      timestamp: new Date().toISOString(),
      service: "IOServer Chat App",
      version: "2.0.0",
    });
  }
}
