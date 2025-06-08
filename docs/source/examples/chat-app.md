# Chat Application Example

This comprehensive example demonstrates how to build a real-time chat application using IOServer. The chat app showcases all core features including real-time messaging, user management, room functionality, and HTTP API endpoints.

## Overview

The chat application demonstrates:

- Real-time messaging with Socket.IO
- User authentication and management
- Room-based conversations
- Typing indicators
- Connection management
- RESTful API for statistics
- Message history
- User presence tracking

## Architecture

The chat application follows IOServer's modular architecture:

```
examples/chat-app/
├── app.ts                 # Main application entry point
├── public/               # Static web files
│   ├── index.html        # Chat interface
│   ├── style.css         # Styling
│   └── script.js         # Client-side logic
├── routes/               # HTTP route definitions
│   └── api.json          # API endpoints
├── services/             # Real-time services
│   └── ChatService.ts    # Chat functionality
├── controllers/          # HTTP controllers
│   └── ApiController.ts  # API endpoints
└── managers/             # Shared logic
    └── ChatManager.ts    # Chat data management
```

## Implementation Details

### 1. Main Application (app.ts)

```typescript
import { IOServer } from '../../src';
import { ChatService } from './services/ChatService';
import { ApiController } from './controllers/ApiController';
import { ChatManager } from './managers/ChatManager';

const server = new IOServer({
  host: 'localhost',
  port: 8080,
  verbose: 'INFO',
  routes: './examples/chat-app/routes',
  cors: {
    origin: ['http://localhost:8080'],
    methods: ['GET', 'POST'],
    credentials: false,
  },
});

// Register manager for shared data
server.addManager({
  name: 'chat',
  manager: ChatManager,
});

// Register real-time chat service
server.addService({
  name: 'chat',
  service: ChatService,
});

// Register HTTP API controller
server.addController({
  name: 'api',
  controller: ApiController,
});

// Serve static files
server.getApp().register(require('@fastify/static'), {
  root: path.join(__dirname, 'public'),
  prefix: '/',
});

await server.start();
console.log('🚀 Chat application running at http://localhost:8080');
```

### 2. Chat Manager (managers/ChatManager.ts)

The Chat Manager handles shared data and business logic:

```typescript
import { BaseManager } from '../../../src';

interface User {
  id: string;
  username: string;
  room: string;
  socketId: string;
  joinedAt: Date;
}

interface Message {
  id: string;
  user: string;
  message: string;
  room: string;
  timestamp: Date;
}

interface Room {
  name: string;
  users: User[];
  messageCount: number;
  createdAt: Date;
}

export class ChatManager extends BaseManager {
  private users: Map<string, User> = new Map();
  private rooms: Map<string, Room> = new Map();
  private messages: Message[] = [];
  private typing: Map<string, Set<string>> = new Map();

  // User Management
  addUser(user: User): void {
    this.users.set(user.socketId, user);

    // Add user to room
    if (!this.rooms.has(user.room)) {
      this.rooms.set(user.room, {
        name: user.room,
        users: [],
        messageCount: 0,
        createdAt: new Date(),
      });
    }

    const room = this.rooms.get(user.room)!;
    room.users.push(user);

    this.appHandle.log(6, `User ${user.username} joined room ${user.room}`);
  }

  removeUser(socketId: string): User | null {
    const user = this.users.get(socketId);
    if (!user) return null;

    this.users.delete(socketId);

    // Remove from room
    const room = this.rooms.get(user.room);
    if (room) {
      room.users = room.users.filter(u => u.socketId !== socketId);

      // Remove empty rooms
      if (room.users.length === 0) {
        this.rooms.delete(user.room);
      }
    }

    // Remove from typing indicators
    this.stopTyping(socketId);

    this.appHandle.log(6, `User ${user.username} left room ${user.room}`);
    return user;
  }

  // Message Management
  addMessage(user: string, message: string, room: string): Message {
    const newMessage: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      user,
      message,
      room,
      timestamp: new Date(),
    };

    this.messages.push(newMessage);

    // Update room message count
    const roomData = this.rooms.get(room);
    if (roomData) {
      roomData.messageCount++;
    }

    // Keep only last 1000 messages to prevent memory issues
    if (this.messages.length > 1000) {
      this.messages = this.messages.slice(-1000);
    }

    return newMessage;
  }

  getRecentMessages(room: string, limit: number = 50): Message[] {
    return this.messages.filter(msg => msg.room === room).slice(-limit);
  }

  // Typing Indicators
  startTyping(room: string, username: string): void {
    if (!this.typing.has(room)) {
      this.typing.set(room, new Set());
    }
    this.typing.get(room)!.add(username);
  }

  stopTyping(socketId: string): void {
    const user = this.users.get(socketId);
    if (!user) return;

    const roomTyping = this.typing.get(user.room);
    if (roomTyping) {
      roomTyping.delete(user.username);
      if (roomTyping.size === 0) {
        this.typing.delete(user.room);
      }
    }
  }

  getTypingUsers(room: string): string[] {
    return Array.from(this.typing.get(room) || []);
  }

  // Statistics
  getStats() {
    return {
      totalUsers: this.users.size,
      totalRooms: this.rooms.size,
      totalMessages: this.messages.length,
      rooms: Array.from(this.rooms.values()).map(room => ({
        name: room.name,
        userCount: room.users.length,
        messageCount: room.messageCount,
        users: room.users.map(u => u.username),
      })),
    };
  }

  getRoomUsers(room: string): User[] {
    const roomData = this.rooms.get(room);
    return roomData ? roomData.users : [];
  }

  getUserBySocket(socketId: string): User | undefined {
    return this.users.get(socketId);
  }
}
```

### 3. Chat Service (services/ChatService.ts)

The Chat Service handles all real-time interactions:

```typescript
import { BaseService } from '../../../src';

export class ChatService extends BaseService {
  // User joins a chat room
  async joinRoom(
    socket: any,
    data: { username: string; room: string },
    callback?: Function
  ) {
    try {
      const { username, room } = data;

      if (!username || !room) {
        throw new Error('Username and room are required');
      }

      // Add user to chat manager
      const user = {
        id: `user_${Date.now()}`,
        username,
        room,
        socketId: socket.id,
        joinedAt: new Date(),
      };

      this.appHandle.chat.addUser(user);

      // Join Socket.IO room
      await socket.join(room);

      // Get room users and recent messages
      const roomUsers = this.appHandle.chat.getRoomUsers(room);
      const recentMessages = this.appHandle.chat.getRecentMessages(room);

      // Notify user of successful join
      socket.emit('room_joined', {
        user,
        users: roomUsers.map(u => ({
          username: u.username,
          joinedAt: u.joinedAt,
        })),
        messages: recentMessages,
      });

      // Notify other users in room
      socket.broadcast.to(room).emit('user_joined', {
        user: { username, joinedAt: user.joinedAt },
        userCount: roomUsers.length,
      });

      if (callback) {
        callback({ status: 'success', message: 'Joined room successfully' });
      }
    } catch (error) {
      this.appHandle.log(3, `Error in joinRoom: ${error}`);
      if (callback) {
        callback({ status: 'error', message: error.message });
      }
    }
  }

  // User sends a message
  async sendMessage(
    socket: any,
    data: { message: string },
    callback?: Function
  ) {
    try {
      const user = this.appHandle.chat.getUserBySocket(socket.id);
      if (!user) {
        throw new Error('User not found');
      }

      const { message } = data;
      if (!message || message.trim().length === 0) {
        throw new Error('Message cannot be empty');
      }

      // Add message to chat manager
      const newMessage = this.appHandle.chat.addMessage(
        user.username,
        message.trim(),
        user.room
      );

      // Stop typing indicator for this user
      this.appHandle.chat.stopTyping(socket.id);

      // Broadcast message to room
      socket.broadcast.to(user.room).emit('new_message', newMessage);

      // Send confirmation to sender
      socket.emit('message_sent', newMessage);

      // Update typing indicators
      const typingUsers = this.appHandle.chat.getTypingUsers(user.room);
      socket.broadcast.to(user.room).emit('typing_update', typingUsers);

      if (callback) {
        callback({
          status: 'success',
          messageId: newMessage.id,
          timestamp: newMessage.timestamp,
        });
      }
    } catch (error) {
      this.appHandle.log(3, `Error in sendMessage: ${error}`);
      if (callback) {
        callback({ status: 'error', message: error.message });
      }
    }
  }

  // Handle typing indicators
  async startTyping(socket: any, data: any, callback?: Function) {
    try {
      const user = this.appHandle.chat.getUserBySocket(socket.id);
      if (!user) return;

      this.appHandle.chat.startTyping(user.room, user.username);
      const typingUsers = this.appHandle.chat.getTypingUsers(user.room);

      socket.broadcast.to(user.room).emit('typing_update', typingUsers);

      if (callback) callback({ status: 'success' });
    } catch (error) {
      if (callback) callback({ status: 'error', message: error.message });
    }
  }

  async stopTyping(socket: any, data: any, callback?: Function) {
    try {
      const user = this.appHandle.chat.getUserBySocket(socket.id);
      if (!user) return;

      this.appHandle.chat.stopTyping(socket.id);
      const typingUsers = this.appHandle.chat.getTypingUsers(user.room);

      socket.broadcast.to(user.room).emit('typing_update', typingUsers);

      if (callback) callback({ status: 'success' });
    } catch (error) {
      if (callback) callback({ status: 'error', message: error.message });
    }
  }

  // Handle user disconnection
  async handleDisconnect(socket: any) {
    const user = this.appHandle.chat.removeUser(socket.id);
    if (user) {
      // Notify room about user leaving
      socket.broadcast.to(user.room).emit('user_left', {
        user: { username: user.username },
        userCount: this.appHandle.chat.getRoomUsers(user.room).length,
      });

      // Update typing indicators
      const typingUsers = this.appHandle.chat.getTypingUsers(user.room);
      socket.broadcast.to(user.room).emit('typing_update', typingUsers);
    }
  }

  // Get room information
  async getRoomInfo(socket: any, data: any, callback?: Function) {
    try {
      const user = this.appHandle.chat.getUserBySocket(socket.id);
      if (!user) {
        throw new Error('User not found');
      }

      const roomUsers = this.appHandle.chat.getRoomUsers(user.room);
      const typingUsers = this.appHandle.chat.getTypingUsers(user.room);

      const roomInfo = {
        room: user.room,
        userCount: roomUsers.length,
        users: roomUsers.map(u => ({
          username: u.username,
          joinedAt: u.joinedAt,
        })),
        typingUsers,
      };

      if (callback) callback({ status: 'success', roomInfo });
    } catch (error) {
      if (callback) callback({ status: 'error', message: error.message });
    }
  }
}
```

### 4. API Controller (controllers/ApiController.ts)

The API Controller provides HTTP endpoints for statistics and management:

```typescript
import { BaseController } from '../../../src';

export class ApiController extends BaseController {
  // Get server status
  async getStatus(request: any, reply: any) {
    const status = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '2.0.0',
    };

    reply.send(status);
  }

  // Get chat statistics
  async getStats(request: any, reply: any) {
    try {
      const stats = this.appHandle.chat.getStats();

      const response = {
        ...stats,
        serverInfo: {
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage(),
          timestamp: new Date().toISOString(),
        },
      };

      reply.send(response);
    } catch (error) {
      this.appHandle.log(3, `Error getting stats: ${error}`);
      reply.status(500).send({
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'Unable to retrieve statistics',
      });
    }
  }

  // Get room details
  async getRoomDetails(request: any, reply: any) {
    try {
      const { room } = request.params;

      if (!room) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Room parameter is required',
        });
      }

      const roomUsers = this.appHandle.chat.getRoomUsers(room);
      const recentMessages = this.appHandle.chat.getRecentMessages(room, 20);

      const roomDetails = {
        room,
        userCount: roomUsers.length,
        users: roomUsers.map(u => ({
          username: u.username,
          joinedAt: u.joinedAt,
        })),
        recentMessages: recentMessages.map(m => ({
          id: m.id,
          user: m.user,
          message: m.message,
          timestamp: m.timestamp,
        })),
      };

      reply.send(roomDetails);
    } catch (error) {
      this.appHandle.log(3, `Error getting room details: ${error}`);
      reply.status(500).send({
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'Unable to retrieve room details',
      });
    }
  }
}
```

### 5. Route Configuration (routes/api.json)

```json
[
  {
    "method": "GET",
    "url": "/status",
    "handler": "getStatus"
  },
  {
    "method": "GET",
    "url": "/stats",
    "handler": "getStats"
  },
  {
    "method": "GET",
    "url": "/rooms/:room",
    "handler": "getRoomDetails"
  }
]
```

## Client-Side Implementation

### HTML Interface (public/index.html)

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>IOServer Chat Example</title>
    <link rel="stylesheet" href="style.css" />
  </head>
  <body>
    <div id="app">
      <!-- Login Form -->
      <div id="login-form" class="form-container">
        <h2>Join Chat</h2>
        <form id="join-form">
          <input
            type="text"
            id="username"
            placeholder="Your username"
            required
          />
          <input type="text" id="room" placeholder="Room name" required />
          <button type="submit">Join Chat</button>
        </form>
      </div>

      <!-- Chat Interface -->
      <div id="chat-interface" class="hidden">
        <div class="chat-header">
          <h2 id="room-title">Room:</h2>
          <div class="user-info">
            <span id="user-name"></span>
            <span id="user-count">0 users</span>
          </div>
        </div>

        <div class="chat-container">
          <div class="sidebar">
            <h3>Users Online</h3>
            <ul id="user-list"></ul>
          </div>

          <div class="chat-main">
            <div id="messages" class="messages"></div>
            <div id="typing-indicator" class="typing-indicator"></div>

            <form id="message-form" class="message-form">
              <input
                type="text"
                id="message-input"
                placeholder="Type a message..."
                required
              />
              <button type="submit">Send</button>
            </form>
          </div>
        </div>
      </div>
    </div>

    <script src="/socket.io/socket.io.js"></script>
    <script src="script.js"></script>
  </body>
</html>
```

### JavaScript Client (public/script.js)

```javascript
class ChatClient {
  constructor() {
    this.socket = null;
    this.username = '';
    this.room = '';
    this.isTyping = false;
    this.typingTimeout = null;

    this.initializeElements();
    this.bindEvents();
  }

  initializeElements() {
    this.loginForm = document.getElementById('login-form');
    this.chatInterface = document.getElementById('chat-interface');
    this.joinForm = document.getElementById('join-form');
    this.messageForm = document.getElementById('message-form');
    this.messageInput = document.getElementById('message-input');
    this.messagesContainer = document.getElementById('messages');
    this.userList = document.getElementById('user-list');
    this.typingIndicator = document.getElementById('typing-indicator');
    this.roomTitle = document.getElementById('room-title');
    this.userName = document.getElementById('user-name');
    this.userCount = document.getElementById('user-count');
  }

  bindEvents() {
    this.joinForm.addEventListener('submit', e => this.handleJoin(e));
    this.messageForm.addEventListener('submit', e => this.handleSendMessage(e));
    this.messageInput.addEventListener('input', () => this.handleTyping());
  }

  handleJoin(e) {
    e.preventDefault();
    this.username = document.getElementById('username').value.trim();
    this.room = document.getElementById('room').value.trim();

    if (this.username && this.room) {
      this.connectToChat();
    }
  }

  connectToChat() {
    this.socket = io('/chat');

    this.socket.on('connect', () => {
      console.log('Connected to chat server');
      this.joinRoom();
    });

    this.socket.on('room_joined', data => this.handleRoomJoined(data));
    this.socket.on('user_joined', data => this.handleUserJoined(data));
    this.socket.on('user_left', data => this.handleUserLeft(data));
    this.socket.on('new_message', message => this.displayMessage(message));
    this.socket.on('message_sent', message =>
      this.displayMessage(message, true)
    );
    this.socket.on('typing_update', users => this.updateTypingIndicator(users));

    this.socket.on('disconnect', () => {
      console.log('Disconnected from chat server');
      this.showError('Disconnected from server');
    });

    this.socket.on('error', error => {
      console.error('Socket error:', error);
      this.showError(error.message);
    });
  }

  joinRoom() {
    this.socket.emit(
      'joinRoom',
      {
        username: this.username,
        room: this.room,
      },
      response => {
        if (response.status === 'error') {
          this.showError(response.message);
        }
      }
    );
  }

  handleRoomJoined(data) {
    this.loginForm.classList.add('hidden');
    this.chatInterface.classList.remove('hidden');

    this.roomTitle.textContent = `Room: ${this.room}`;
    this.userName.textContent = this.username;

    this.updateUserList(data.users);
    this.displayPreviousMessages(data.messages);

    this.messageInput.focus();
  }

  handleUserJoined(data) {
    this.userCount.textContent = `${data.userCount} users`;
    this.displaySystemMessage(`${data.user.username} joined the room`);
  }

  handleUserLeft(data) {
    this.userCount.textContent = `${data.userCount} users`;
    this.displaySystemMessage(`${data.user.username} left the room`);
  }

  handleSendMessage(e) {
    e.preventDefault();
    const message = this.messageInput.value.trim();

    if (message) {
      this.socket.emit('sendMessage', { message }, response => {
        if (response.status === 'error') {
          this.showError(response.message);
        }
      });

      this.messageInput.value = '';
      this.stopTyping();
    }
  }

  handleTyping() {
    if (!this.isTyping) {
      this.isTyping = true;
      this.socket.emit('startTyping');
    }

    clearTimeout(this.typingTimeout);
    this.typingTimeout = setTimeout(() => {
      this.stopTyping();
    }, 2000);
  }

  stopTyping() {
    if (this.isTyping) {
      this.isTyping = false;
      this.socket.emit('stopTyping');
    }
    clearTimeout(this.typingTimeout);
  }

  displayMessage(message, isSent = false) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message');
    if (isSent) messageElement.classList.add('sent');

    const time = new Date(message.timestamp).toLocaleTimeString();
    messageElement.innerHTML = `
      <div class="message-header">
        <span class="username">${message.user}</span>
        <span class="timestamp">${time}</span>
      </div>
      <div class="message-content">${this.escapeHtml(message.message)}</div>
    `;

    this.messagesContainer.appendChild(messageElement);
    this.scrollToBottom();
  }

  displaySystemMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', 'system');
    messageElement.innerHTML = `<div class="message-content">${message}</div>`;

    this.messagesContainer.appendChild(messageElement);
    this.scrollToBottom();
  }

  displayPreviousMessages(messages) {
    messages.forEach(message => this.displayMessage(message));
  }

  updateUserList(users) {
    this.userList.innerHTML = '';
    users.forEach(user => {
      const li = document.createElement('li');
      li.textContent = user.username;
      this.userList.appendChild(li);
    });

    this.userCount.textContent = `${users.length} users`;
  }

  updateTypingIndicator(typingUsers) {
    if (typingUsers.length === 0) {
      this.typingIndicator.textContent = '';
    } else if (typingUsers.length === 1) {
      this.typingIndicator.textContent = `${typingUsers[0]} is typing...`;
    } else {
      this.typingIndicator.textContent = `${typingUsers.join(
        ', '
      )} are typing...`;
    }
  }

  showError(message) {
    const errorElement = document.createElement('div');
    errorElement.classList.add('error-message');
    errorElement.textContent = message;

    document.body.appendChild(errorElement);

    setTimeout(() => {
      errorElement.remove();
    }, 5000);
  }

  scrollToBottom() {
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize chat client when page loads
document.addEventListener('DOMContentLoaded', () => {
  new ChatClient();
});
```

## Features Demonstrated

### 1. Real-time Messaging

- Instant message delivery using Socket.IO
- Message persistence in memory
- Message history loading

### 2. User Management

- User registration with username and room
- User presence tracking
- Online user list display

### 3. Room System

- Room-based conversations
- Multiple rooms support
- Room statistics

### 4. Typing Indicators

- Real-time typing status
- Auto-timeout for typing indicators
- Multiple users typing display

### 5. Connection Management

- Graceful connection handling
- Automatic cleanup on disconnect
- Reconnection support

### 6. HTTP API

- Server status endpoint
- Chat statistics endpoint
- Room information endpoint

### 7. Error Handling

- Comprehensive error catching
- User-friendly error messages
- Graceful degradation

## Running the Example

1. **Start the server:**

   ```bash
   cd examples/chat-app
   npm start
   # or
   pnpm dev:chat
   ```

2. **Open the application:**
   Visit `http://localhost:8080` in your browser

3. **Test the features:**
   - Open multiple browser tabs/windows
   - Join different rooms
   - Send messages and see real-time updates
   - Test typing indicators
   - Check API endpoints at `/api/stats`

## Key Learning Points

This example demonstrates:

- **Modular Architecture**: Clean separation of concerns
- **Real-time Communication**: Bidirectional event-based communication
- **State Management**: Shared state across components using managers
- **Error Handling**: Comprehensive error management
- **Client-Server Interaction**: Both real-time and HTTP communication
- **Production Patterns**: Scalable patterns for real-world applications

The chat application serves as a comprehensive template for building real-time applications with IOServer.
