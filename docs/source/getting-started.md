# Getting Started

This guide will help you get started with IOServer quickly and efficiently.

## Installation

Install IOServer using npm or yarn:

```bash
npm install ioserver
# or
yarn add ioserver
# or
pnpm add ioserver
```

## Requirements

- **Node.js**: >= 18.0.0
- **TypeScript**: >= 5.0.0 (for TypeScript projects)

## Basic Setup

### 1. Create Your First Server

```typescript
import { IOServer } from 'ioserver';

const server = new IOServer({
  host: 'localhost',
  port: 3000,
  verbose: 'INFO',
});

await server.start();
console.log('🚀 Server running at http://localhost:3000');
```

### 2. Add a Service (Real-time)

Services handle WebSocket connections and real-time events:

```typescript
import { BaseService } from 'ioserver';

class NotificationService extends BaseService {
  async notify(socket: any, data: any, callback?: Function) {
    // Broadcast to all connected clients
    socket.broadcast.emit('notification', {
      message: data.message,
      timestamp: Date.now(),
    });

    if (callback) callback({ status: 'sent' });
  }
}

// Register the service
server.addService({
  name: 'notifications',
  service: NotificationService,
});
```

### 3. Add a Controller (HTTP)

Controllers handle HTTP requests with automatic route mapping:

```typescript
import { BaseController } from 'ioserver';

class ApiController extends BaseController {
  async getStatus(request: any, reply: any) {
    reply.send({
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  }

  async createUser(request: any, reply: any) {
    const userData = request.body;
    // Process user creation
    reply.status(201).send({
      id: 'user123',
      ...userData,
    });
  }
}

// Register the controller
server.addController({
  name: 'api',
  controller: ApiController,
});
```

### 4. Configure Routes

Create a JSON file to define HTTP routes (`routes/api.json`):

```json
[
  {
    "method": "GET",
    "url": "/status",
    "handler": "getStatus"
  },
  {
    "method": "POST",
    "url": "/users",
    "handler": "createUser"
  }
]
```

Route URLs are relative to the controller prefix. With no `prefix`, IOServer
prepends `/{name}`: the routes above are served at `/api/status` and
`/api/users`. A route already named after its controller is therefore
duplicated — `{ "url": "/health" }` in `health.json` registers
`/health/health`. Use `prefix: ''` for root-level routes.

## Configuration Options

### Server Options

```typescript
interface IOServerOptions {
  host?: string; // Default: 'localhost'
  port?: number; // Default: 8080
  verbose?: LogLevel; // Default: 'ERROR'
  routes?: string; // Default: './routes'
  cors?: CorsOptions; // CORS configuration
  mode?: TransportMode[]; // Socket.IO transports
  cookie?: boolean; // Enable cookies
}
```

### CORS Configuration

```typescript
const server = new IOServer({
  cors: {
    origin: ['http://localhost:3000', 'https://yourdomain.com'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
});
```

### Transport Modes

```typescript
const server = new IOServer({
  mode: ['websocket', 'polling'], // Default: both
});
```

## Directory Structure

Organize your project like this:

```
my-ioserver-app/
├── src/
│   ├── services/
│   │   └── ChatService.ts
│   ├── controllers/
│   │   └── ApiController.ts
│   ├── managers/
│   │   └── DatabaseManager.ts
│   └── app.ts
├── routes/
│   ├── api.json
│   └── chat.json
├── package.json
└── tsconfig.json
```

## Next Steps

- Learn about the [Architecture](architecture.md) concepts
- Explore the [Chat Application Example](examples/chat-app.md)
- Check the [API Reference](api-reference.md) for detailed documentation
- See [Deployment](deployment.md) options for production
