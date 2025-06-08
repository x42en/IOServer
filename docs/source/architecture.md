# Architecture

IOServer provides a modular architecture with four core component types that promote clean separation of concerns and scalable application design.

## Core Components

### 🌐 Controllers - HTTP Endpoints

Controllers handle HTTP requests and responses. They map to route definitions and provide RESTful API functionality.

**Key Features:**

- Automatic route mapping from JSON configuration
- Middleware support
- Error handling
- Request validation

**Example:**

```typescript
import { BaseController } from '@ioserver/core';

class UserController extends BaseController {
  async getUser(request: any, reply: any) {
    const { id } = request.params;
    const user = await this.appHandle.database.findUser(id);
    reply.send(user);
  }

  async createUser(request: any, reply: any) {
    const userData = request.body;
    const user = await this.appHandle.database.createUser(userData);
    reply.status(201).send(user);
  }
}
```

### 📡 Services - Real-time Logic

Services handle WebSocket connections and real-time events. They provide the core real-time functionality of your application.

**Key Features:**

- Socket.IO integration
- Automatic event binding
- Namespace support
- Real-time messaging

**Example:**

```typescript
import { BaseService } from '@ioserver/core';

class ChatService extends BaseService {
  async joinRoom(socket: any, data: any, callback?: Function) {
    await socket.join(data.room);
    socket.broadcast.to(data.room).emit('user_joined', {
      user: data.username,
      room: data.room,
    });

    if (callback) callback({ status: 'joined' });
  }

  async sendMessage(socket: any, data: any, callback?: Function) {
    const message = {
      id: Date.now(),
      user: data.user,
      message: data.message,
      timestamp: new Date().toISOString(),
    };

    socket.broadcast.to(data.room).emit('new_message', message);
    if (callback) callback({ status: 'sent', messageId: message.id });
  }
}
```

### 🔧 Managers - Shared Logic

Managers provide shared functionality that can be accessed by services and controllers. They're perfect for database connections, external APIs, and business logic.

**Key Features:**

- Singleton instances
- Dependency injection
- Shared across components
- Lifecycle management

**Example:**

```typescript
import { BaseManager } from '@ioserver/core';

class DatabaseManager extends BaseManager {
  private connection: any;

  constructor(appHandle: any) {
    super(appHandle);
    this.connection = null;
  }

  async connect() {
    // Initialize database connection
    this.connection = await createConnection();
  }

  async findUser(id: string) {
    return await this.connection.query('SELECT * FROM users WHERE id = ?', [
      id,
    ]);
  }

  async createUser(userData: any) {
    const result = await this.connection.query(
      'INSERT INTO users (name, email) VALUES (?, ?)',
      [userData.name, userData.email]
    );
    return { id: result.insertId, ...userData };
  }
}
```

### 👀 Watchers - Background Tasks

Watchers handle background processes, monitoring, and scheduled tasks. They run independently of HTTP requests and WebSocket connections.

**Key Features:**

- Background processing
- Scheduled tasks
- System monitoring
- Independent lifecycle

**Example:**

```typescript
import { BaseWatcher } from '@ioserver/core';

class HealthWatcher extends BaseWatcher {
  async watch() {
    // Check system health every 30 seconds
    setInterval(() => {
      this.checkSystemHealth();
    }, 30000);

    // Check database connectivity every 5 minutes
    setInterval(() => {
      this.checkDatabaseHealth();
    }, 300000);
  }

  private async checkSystemHealth() {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    if (memoryUsage.heapUsed > 500 * 1024 * 1024) {
      // 500MB
      this.appHandle.log(4, '[WARNING] High memory usage detected');
    }

    // Send health metrics to monitoring service
    this.appHandle.send({
      namespace: 'admin',
      event: 'health_update',
      data: { memory: memoryUsage, cpu: cpuUsage },
    });
  }

  private async checkDatabaseHealth() {
    try {
      await this.appHandle.database.ping();
      this.appHandle.log(6, '[INFO] Database health check passed');
    } catch (error) {
      this.appHandle.log(3, `[ERROR] Database health check failed: ${error}`);
    }
  }
}
```

## Component Registration

### Services

```typescript
server.addService({
  name: 'chat', // Namespace (optional, defaults to '/')
  service: ChatService, // Service class
  middlewares: [], // Optional middleware
});
```

### Controllers

```typescript
server.addController({
  name: 'api', // Route file name (api.json)
  controller: ApiController, // Controller class
  prefix: '/api', // Optional URL prefix
  middlewares: [], // Optional middleware
});
```

### Managers

```typescript
server.addManager({
  name: 'database', // Access name in appHandle
  manager: DatabaseManager, // Manager class
});
```

### Watchers

```typescript
server.addWatcher({
  name: 'health', // Watcher name
  watcher: HealthWatcher, // Watcher class
});
```

## Application Handle

The `appHandle` provides shared functionality across all components:

```typescript
interface AppHandle {
  send: (options: SendToOptions) => boolean; // Send real-time messages
  log: (level: number, text: string) => void; // Logging
  verbose: LogLevel; // Current log level
  [managerName]: any; // Registered managers
}
```

## Middleware System

Middleware can be applied to services and controllers for cross-cutting concerns:

```typescript
import { BaseMiddleware } from '@ioserver/core';

class AuthMiddleware extends BaseMiddleware {
  handle(appHandle: any) {
    return (req: any, reply: any, done: any) => {
      const token = req.headers.authorization;

      if (!token) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      // Validate token
      try {
        const user = validateToken(token);
        req.user = user;
        done();
      } catch (error) {
        reply.status(401).send({ error: 'Invalid token' });
      }
    };
  }
}
```

## Route Configuration

Routes are defined in JSON files in the `routes` directory:

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
    "handler": "createUser",
    "preValidation": ["validateUserData"]
  }
]
```

## Namespaces

Services can be organized into namespaces for better organization:

```typescript
// Default namespace (/)
server.addService({ service: DefaultService });

// Custom namespace (/chat)
server.addService({ name: 'chat', service: ChatService });

// Admin namespace (/admin)
server.addService({ name: 'admin', service: AdminService });
```

Clients connect to namespaces:

```javascript
// Default namespace
const socket = io('http://localhost:3000');

// Chat namespace
const chatSocket = io('http://localhost:3000/chat');

// Admin namespace
const adminSocket = io('http://localhost:3000/admin');
```

## Error Handling

IOServer provides comprehensive error handling:

```typescript
import { IOServerError } from '@ioserver/core';

class UserService extends BaseService {
  async createUser(socket: any, data: any, callback?: Function) {
    try {
      if (!data.email) {
        throw new IOServerError('Email is required', 400);
      }

      const user = await this.appHandle.database.createUser(data);
      if (callback) callback({ status: 'success', user });
    } catch (error) {
      // Error is automatically handled and sent to client
      throw error;
    }
  }
}
```
