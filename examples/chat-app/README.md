# IOServer Chat Application

A complete real-time chat application built with IOServer v2.0.0 demonstrating all framework features.

## Features

✅ **User Authentication**

- Username-only login (no password required)
- Unique username validation
- Automatic join to default room

✅ **Room Management**

- Default "general" room
- Create custom rooms
- Join/leave rooms dynamically
- Room user count display

✅ **Real-time Messaging**

- Send messages to current room
- Message history per room
- System messages for user events
- Message timestamps

✅ **User Presence**

- View connected users in current room
- Real-time user join/leave notifications
- Typing indicators

✅ **Notifications**

- Envelope icon with unread message count
- Per-room message notifications
- Visual notification badges

✅ **Modern UI**

- Responsive design
- Clean, modern interface
- Mobile-friendly layout
- Real-time updates

## Quick Start

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Build the project:**

   ```bash
   npm run build
   ```

3. **Start the chat app:**

   ```bash
   npm run dev examples/chat-app/app.ts
   ```

4. **Open your browser:**
   - Go to `http://localhost:3000`
   - Enter a username
   - Start chatting!

## Architecture

### Components Used

- **ChatService** - Handles all Socket.io events (login, messaging, rooms)
- **ChatController** - Serves the web interface and health endpoint
- **StatsManager** - Tracks user and message statistics
- **ChatWatcher** - Background monitoring and cleanup tasks

### API Endpoints

- `GET /` - Chat application interface
- `GET /health` - Health check endpoint

### Socket.io Events

**Client → Server:**

- `login` - User authentication
- `send_message` - Send message to current room
- `join_room` - Join a specific room
- `get_room_users` - Get users in current room
- `get_available_rooms` - Get list of available rooms
- `typing` - Typing indicator
- `disconnect` - User disconnect

**Server → Client:**

- `login_success` / `login_error` - Login response
- `new_message` - New message received
- `user_joined` / `user_left` - User presence changes
- `user_typing` - Typing notifications
- `room_users` - Updated user list
- `available_rooms` - Updated room list

## Usage Examples

### Basic Chat Flow

1. **Login:**

   ```javascript
   socket.emit("login", { username: "john" }, (response) => {
     if (response.status === "success") {
       // User logged in successfully
       console.log("Welcome!", response.user);
     }
   });
   ```

2. **Send Message:**

   ```javascript
   socket.emit("send_message", { content: "Hello everyone!" });
   ```

3. **Join Room:**
   ```javascript
   socket.emit("join_room", { room: "gaming" }, (response) => {
     if (response.status === "success") {
       // Joined room successfully
       console.log("Joined room:", response.room);
     }
   });
   ```

### Event Handling

```javascript
// Listen for new messages
socket.on("new_message", (message) => {
  console.log(`${message.username}: ${message.content}`);
});

// Listen for user presence
socket.on("user_joined", (data) => {
  console.log(`${data.username} joined the room`);
});

// Listen for typing indicators
socket.on("user_typing", (data) => {
  if (data.isTyping) {
    console.log(`${data.username} is typing...`);
  }
});
```

## File Structure

```
examples/chat-app/
├── app.ts                 # Main application entry point
├── services/
│   └── ChatService.ts     # Socket.io event handlers
├── controllers/
│   └── ChatController.ts  # HTTP endpoints & web interface
├── managers/
│   └── StatsManager.ts    # Statistics tracking
├── watchers/
│   └── ChatWatcher.ts     # Background monitoring
└── routes/
    └── chat.json          # Route definitions
```

## Customization

### Adding New Features

1. **New Socket.io Events:**

   - Add methods to `ChatService.ts`
   - Update client-side JavaScript in `ChatController.ts`

2. **New HTTP Endpoints:**

   - Add methods to `ChatController.ts`
   - Update `routes/chat.json`

3. **Background Tasks:**
   - Extend `ChatWatcher.ts`
   - Add new watchers if needed

### Configuration

Modify `app.ts` to change:

- Server host and port
- CORS settings
- Log levels
- Routes directory

## Development

### Running in Development

```bash
# Start with auto-reload
npm run build:watch
npm run dev examples/chat-app/app.ts
```

### Testing

Open multiple browser tabs to test:

- Multiple users
- Different rooms
- Real-time messaging
- Notifications

## Production Deployment

1. Build the application:

   ```bash
   npm run build
   ```

2. Start the server:

   ```bash
   node dist/examples/chat-app/app.js
   ```

3. Configure reverse proxy (nginx, Apache, etc.)

4. Set up process management (PM2, systemd, etc.)

## Extending the Example

This chat application demonstrates IOServer's full capabilities and can be extended with:

- User authentication with passwords
- Private messaging
- File sharing
- Message encryption
- Push notifications
- Mobile app integration
- Database persistence
- User profiles and avatars
- Message search and history
- Moderation tools

The clean architecture makes it easy to add new features while maintaining code organization and type safety.
