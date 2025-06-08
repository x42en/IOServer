# 🚀 IOServer

[![npm version](https://badge.fury.io/js/ioserver.svg)](https://badge.fury.io/js/ioserver)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache--2.0-yellow.svg)](https://opensource.org/licenses/Apache-2.0)
[![Node.js CI](https://github.com/x42en/IOServer/workflows/Node.js%20CI/badge.svg)](https://github.com/x42en/IOServer/actions)
[![Coverage Status](https://coveralls.io/repos/github/x42en/IOServer/badge.svg?branch=main)](https://coveralls.io/github/x42en/IOServer?branch=main)
[![TypeScript](https://img.shields.io/badge/TypeScript-4.9+-blue.svg)](https://www.typescriptlang.org/)

**A powerful, production-ready framework for building real-time applications with HTTP and WebSocket support.**

IOServer combines the speed of Fastify with the real-time capabilities of Socket.IO, providing a unified architecture for modern web applications. Built with TypeScript and designed for scalability, it offers a clean separation of concerns through services, controllers, managers, and watchers.

## ✨ Features

- 🚄 **High Performance** - Built on Fastify for maximum HTTP throughput
- ⚡ **Real-time Communication** - Integrated Socket.IO for WebSocket connections
- 🏗️ **Modular Architecture** - Clean separation with Services, Controllers, Managers, and Watchers
- 🔒 **Security First** - Built-in CORS, error handling, and validation
- 📝 **TypeScript Native** - Full type safety and IntelliSense support
- 🧪 **Fully Tested** - Comprehensive test suite with 95%+ coverage
- 🔧 **Configuration Driven** - JSON-based routing and flexible configuration
- 📦 **Production Ready** - Memory leak detection, performance monitoring, and error handling

## 🚀 Quick Start

### Installation

```bash
npm install ioserver
# or
yarn add ioserver
```

### Basic Usage

```typescript
import { IOServer, BaseService, BaseController } from 'ioserver';

// Create a service for real-time functionality
class ChatService extends BaseService {
  async sendMessage(socket: any, data: any, callback?: Function) {
    // Handle real-time messaging
    socket.broadcast.emit('new_message', data);
    if (callback) callback({ status: 'success' });
  }
}

// Create a controller for HTTP endpoints
class ApiController extends BaseController {
  async getStatus(request: any, reply: any) {
    reply.send({ status: 'OK', timestamp: Date.now() });
  }
}

// Initialize and configure server
const server = new IOServer({
  host: 'localhost',
  port: 3000,
  cors: {
    origin: ['http://localhost:3000'],
    methods: ['GET', 'POST'],
  },
});

// Register components
server.addService({ name: 'chat', service: ChatService });
server.addController({ name: 'api', controller: ApiController });

// Start server
await server.start();
console.log('🚀 Server running at http://localhost:3000');
```

## 🏗️ Architecture

IOServer provides four core component types for building scalable applications:

### 📡 **Services** - Real-time Logic

Handle WebSocket connections and real-time events.

```typescript
class NotificationService extends BaseService {
  async notify(socket: any, data: any, callback?: Function) {
    // Real-time notification logic
    socket.emit('notification', { message: data.message });
    if (callback) callback({ delivered: true });
  }
}
```

### 🌐 **Controllers** - HTTP Endpoints

Handle HTTP requests with automatic route mapping from JSON configuration.

```typescript
class UserController extends BaseController {
  async getUser(request: any, reply: any) {
    const userId = request.params.id;
    reply.send({ id: userId, name: 'John Doe' });
  }
}
```

### 🔧 **Managers** - Shared Logic

Provide shared functionality across services and controllers.

```typescript
class DatabaseManager extends BaseManager {
  async query(sql: string, params: any[]) {
    // Database operations
    return await this.db.query(sql, params);
  }
}
```

### 👀 **Watchers** - Background Tasks

Handle background processes, monitoring, and scheduled tasks.

```typescript
class HealthWatcher extends BaseWatcher {
  async watch() {
    setInterval(() => {
      // Monitor system health
      this.checkSystemHealth();
    }, 30000);
  }
}
```

## 📋 Configuration

### Server Options

```typescript
const server = new IOServer({
  host: 'localhost', // Server host
  port: 3000, // Server port
  verbose: 'INFO', // Log level
  routes: './routes', // Route definitions directory
  cors: {
    // CORS configuration
    origin: ['http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
  mode: ['websocket', 'polling'], // Socket.IO transport modes
});
```

### Route Configuration

Define HTTP routes in JSON files (e.g., `routes/api.json`):

```json
[
  {
    "method": "GET",
    "url": "/users/:id",
    "handler": "getUser"
  },
  {
    "method": "POST",
    "url": "/users",
    "handler": "createUser"
  }
]
```

## 🧪 Testing

IOServer includes comprehensive testing utilities and examples:

```bash
# Run all tests
npm test

# Test categories
npm run test:unit        # Unit tests
npm run test:integration # Integration tests
npm run test:e2e        # End-to-end tests
npm run test:performance # Performance tests

# Coverage report
npm run test:coverage
```

## 📚 Examples

### Real-time Chat Application

A complete chat application example is included in the `examples/` directory, showcasing:

- User authentication and management
- Real-time messaging
- Room-based conversations
- Typing indicators
- Connection management
- API endpoints for statistics

```bash
cd examples/chat-app
npm install
npm start
```

Visit `http://localhost:8080` to see the chat application in action.

## 🔧 API Reference

### Core Classes

- **`IOServer`** - Main server class
- **`BaseService`** - Base class for WebSocket services
- **`BaseController`** - Base class for HTTP controllers
- **`BaseManager`** - Base class for shared logic managers
- **`BaseWatcher`** - Base class for background watchers

### Key Methods

```typescript
// Server management
server.addService(options: ServiceOptions)
server.addController(options: ControllerOptions)
server.addManager(options: ManagerOptions)
server.addWatcher(options: WatcherOptions)
server.start(): Promise<void>
server.stop(): Promise<void>

// Real-time messaging
server.sendTo(options: SendToOptions): boolean
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the Apache-2.0 License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Fastify](https://www.fastify.io/) for high-performance HTTP
- Powered by [Socket.IO](https://socket.io/) for real-time communication
- Inspired by modern microservice architectures

## 📞 Support

- 📚 [Documentation](https://github.com/x42en/IOServer/wiki)
- 🐛 [Issue Tracker](https://github.com/x42en/IOServer/issues)
- 💬 [Discussions](https://github.com/x42en/IOServer/discussions)

---

<div align="center">
  <strong>Built with ❤️ for the Node.js community</strong>
</div>
