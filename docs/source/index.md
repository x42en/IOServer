# IOServer Documentation

Welcome to **IOServer** - a powerful, production-ready framework for building real-time applications with HTTP and WebSocket support.

```{toctree}
:maxdepth: 2
:caption: Contents:

getting-started
architecture
api-reference
examples/chat-app
deployment
contributing
```

## Quick Overview

IOServer combines the speed of [Fastify](https://www.fastify.io/) with the real-time capabilities of [Socket.IO](https://socket.io/), providing a unified architecture for modern web applications. Built with TypeScript and designed for scalability, it offers a clean separation of concerns through services, controllers, managers, and watchers.

## Key Features

- 🚄 **High Performance** - Built on Fastify for maximum HTTP throughput
- ⚡ **Real-time Communication** - Integrated Socket.IO for WebSocket connections
- 🏗️ **Modular Architecture** - Clean separation with Services, Controllers, Managers, and Watchers
- 🔒 **Security First** - Built-in CORS, error handling, and validation
- 📝 **TypeScript Native** - Full type safety and IntelliSense support
- 🧪 **Fully Tested** - Comprehensive test suite with 95%+ coverage
- 🔧 **Configuration Driven** - JSON-based routing and flexible configuration
- 📦 **Production Ready** - Memory leak detection, performance monitoring, and error handling

## Installation

```bash
npm install ioserver
# or
yarn add ioserver
```

## Quick Start

```typescript
import { IOServer, BaseService, BaseController } from 'ioserver';

// Create a service for real-time functionality
class ChatService extends BaseService {
  async sendMessage(socket: any, data: any, callback?: Function) {
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
});

// Register components
server.addService({ name: 'chat', service: ChatService });
server.addController({ name: 'api', controller: ApiController });

// Start server
await server.start();
```

## Indices and tables

- {ref}`genindex`
- {ref}`modindex`
- {ref}`search`
