# API Reference

This section provides detailed documentation of IOServer's classes, interfaces, and methods.

## Core Classes

### IOServer

The main server class that orchestrates all components.

```typescript
class IOServer {
  constructor(options?: IOServerOptions);

  // Component registration
  addService(options: ServiceOptions): void;
  addController(options: ControllerOptions): void;
  addManager(options: ManagerOptions): void;
  addWatcher(options: WatcherOptions): void;

  // Server lifecycle
  start(): Promise<void>;
  stop(): Promise<void>;

  // Utilities
  getService(name: string): any;
  getHost(): string;
  getPort(): number;
  getApp(): FastifyInstance;
  sendTo(options: SendToOptions): boolean;
}
```

#### Constructor Options

```typescript
interface IOServerOptions {
  host?: string; // Server host (default: 'localhost')
  port?: number; // Server port (default: 8080)
  verbose?: LogLevel; // Log level (default: 'ERROR')
  routes?: string; // Routes directory (default: './routes')
  cors?: CorsOptions; // CORS configuration
  mode?: TransportMode[]; // Socket.IO transport modes
  cookie?: boolean; // Enable cookies (default: false)
}
```

#### Methods

##### `addService(options: ServiceOptions): void`

Registers a real-time service for WebSocket handling.

**Parameters:**

- `options.name`: Service namespace (optional, defaults to '/')
- `options.service`: Service class constructor
- `options.middlewares`: Array of middleware classes (optional)

**Example:**

```typescript
server.addService({
  name: 'chat',
  service: ChatService,
  middlewares: [AuthMiddleware],
});
```

##### `addController(options: ControllerOptions): void`

Registers an HTTP controller with route mapping.

**Parameters:**

- `options.name`: Controller name (matches route file)
- `options.controller`: Controller class constructor
- `options.prefix`: URL prefix (optional)
- `options.middlewares`: Array of middleware classes (optional)

**Example:**

```typescript
server.addController({
  name: 'api',
  controller: ApiController,
  prefix: '/v1',
  middlewares: [ValidationMiddleware],
});
```

##### `sendTo(options: SendToOptions): boolean`

Sends real-time messages to connected clients.

**Parameters:**

```typescript
interface SendToOptions {
  namespace?: string; // Target namespace
  event: string; // Event name
  data: any; // Message data
  room?: string; // Target room
  sid?: string; // Target socket ID
}
```

**Returns:** `boolean` - Success status

**Example:**

```typescript
server.sendTo({
  namespace: 'chat',
  event: 'notification',
  data: { message: 'Server announcement' },
  room: 'general',
});
```

### IOServerError

Custom error class for framework-specific errors.

```typescript
class IOServerError extends Error {
  constructor(message: string, statusCode: number = 500);

  readonly statusCode: number;
  readonly name: string;
}
```

## Base Classes

### BaseService

Abstract base class for real-time services.

```typescript
abstract class BaseService {
  protected appHandle: AppHandle;

  constructor(appHandle: AppHandle);
}
```

**Usage:**

```typescript
class ChatService extends BaseService {
  async sendMessage(socket: any, data: any, callback?: Function) {
    // Handle real-time event
    socket.broadcast.emit('new_message', data);
    if (callback) callback({ status: 'success' });
  }
}
```

### BaseController

Abstract base class for HTTP controllers.

```typescript
abstract class BaseController {
  protected appHandle: AppHandle;

  constructor(appHandle: AppHandle);
}
```

**Usage:**

```typescript
class ApiController extends BaseController {
  async getUsers(request: FastifyRequest, reply: FastifyReply) {
    const users = await this.appHandle.database.findUsers();
    reply.send(users);
  }
}
```

### BaseManager

Abstract base class for shared logic managers.

```typescript
abstract class BaseManager {
  protected appHandle: AppHandle;

  constructor(appHandle: AppHandle);
}
```

**Usage:**

```typescript
class DatabaseManager extends BaseManager {
  async connect() {
    // Initialize database connection
  }

  async findUsers() {
    // Database operations
  }
}
```

### BaseWatcher

Abstract base class for background watchers.

```typescript
abstract class BaseWatcher {
  protected appHandle: AppHandle;

  constructor(appHandle: AppHandle);
  abstract watch(): Promise<void>;
}
```

**Usage:**

```typescript
class HealthWatcher extends BaseWatcher {
  async watch() {
    setInterval(() => {
      this.checkSystemHealth();
    }, 30000);
  }

  private checkSystemHealth() {
    // Health monitoring logic
  }
}
```

### BaseMiddleware

Abstract base class for middleware components.

```typescript
abstract class BaseMiddleware {
  abstract handle(
    appHandle: AppHandle
  ): (req: any, reply: any, done: any) => void;
}
```

**Usage:**

```typescript
class AuthMiddleware extends BaseMiddleware {
  handle(appHandle: AppHandle) {
    return (req: any, reply: any, done: any) => {
      // Authentication logic
      const token = req.headers.authorization;
      if (!token) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }
      done();
    };
  }
}
```

## Interfaces

### AppHandle

The application handle provides access to shared functionality across components.

```typescript
interface AppHandle {
  send: (options: SendToOptions) => boolean; // Send real-time messages
  log: (level: number, text: string) => void; // Logging function
  verbose: LogLevel; // Current log level
  [managerName]: any; // Registered managers
}
```

### Component Options

#### ServiceOptions

```typescript
interface ServiceOptions {
  name?: string; // Service namespace
  service: new (appHandle: AppHandle) => any; // Service class
  middlewares?: (new () => any)[]; // Middleware classes
}
```

#### ControllerOptions

```typescript
interface ControllerOptions {
  name: string; // Controller name
  controller: new (appHandle: AppHandle) => any; // Controller class
  middlewares?: (new () => any)[]; // Middleware classes
  prefix?: string; // URL prefix
}
```

#### ManagerOptions

```typescript
interface ManagerOptions {
  name: string; // Manager name in appHandle
  manager: new (appHandle: AppHandle) => any; // Manager class
}
```

#### WatcherOptions

```typescript
interface WatcherOptions {
  name: string; // Watcher name
  watcher: new (appHandle: AppHandle) => any; // Watcher class
}
```

## Type Definitions

### LogLevel

```typescript
type LogLevel =
  | 'EMERGENCY' // Level 0
  | 'ALERT' // Level 1
  | 'CRITICAL' // Level 2
  | 'ERROR' // Level 3
  | 'WARNING' // Level 4
  | 'NOTIFICATION' // Level 5
  | 'INFORMATION' // Level 6
  | 'DEBUG'; // Level 7
```

### TransportMode

```typescript
type TransportMode = 'websocket' | 'polling';
```

## Route Configuration

Routes are defined in JSON files that map HTTP endpoints to controller methods.

### Route Structure

```typescript
interface Route {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string; // URL pattern with parameters
  handler: string; // Controller method name
  preValidation?: string[]; // Middleware method names
  schema?: object; // Fastify schema validation
}
```

### Example Route File

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
  },
  {
    "method": "PUT",
    "url": "/users/:id",
    "handler": "updateUser"
  },
  {
    "method": "DELETE",
    "url": "/users/:id",
    "handler": "deleteUser"
  }
]
```

## Error Handling

### IOServerError Usage

```typescript
// In a service or controller
throw new IOServerError('User not found', 404);
throw new IOServerError('Invalid input data', 400);
throw new IOServerError('Database connection failed', 500);
```

### Error Response Format

```typescript
interface ErrorResponse {
  statusCode: number;
  error: string;
  message: string;
}
```

## Logging

### Log Levels (Numeric)

- `0` - EMERGENCY
- `1` - ALERT
- `2` - CRITICAL
- `3` - ERROR
- `4` - WARNING
- `5` - NOTIFICATION
- `6` - INFORMATION
- `7` - DEBUG

### Usage

```typescript
// In any component with appHandle
this.appHandle.log(6, 'Information message');
this.appHandle.log(3, 'Error occurred');
this.appHandle.log(7, 'Debug information');
```

## WebSocket Events

### Service Method Binding

Service methods are automatically bound to WebSocket events based on their names:

```typescript
class ChatService extends BaseService {
  // Bound to 'sendMessage' event
  async sendMessage(socket: any, data: any, callback?: Function) {
    // Handle event
  }

  // Bound to 'joinRoom' event
  async joinRoom(socket: any, data: any, callback?: Function) {
    // Handle event
  }
}
```

### Client Usage

```javascript
// Connect to service namespace
const socket = io('/chat');

// Emit events
socket.emit('sendMessage', { message: 'Hello' }, response => {
  console.log(response);
});

socket.emit('joinRoom', { room: 'general' });

// Listen for events
socket.on('new_message', data => {
  console.log('New message:', data);
});
```

## Best Practices

### Service Design

```typescript
class ExampleService extends BaseService {
  // Always handle errors
  async methodName(socket: any, data: any, callback?: Function) {
    try {
      // Validate input
      if (!data || !data.requiredField) {
        throw new IOServerError('Required field missing', 400);
      }

      // Process request
      const result = await this.processRequest(data);

      // Send response
      if (callback) {
        callback({ status: 'success', data: result });
      }
    } catch (error) {
      // Error is automatically handled by framework
      throw error;
    }
  }
}
```

### Controller Design

```typescript
class ExampleController extends BaseController {
  async methodName(request: FastifyRequest, reply: FastifyReply) {
    try {
      // Access managers through appHandle
      const data = await this.appHandle.database.findData();

      // Send response
      reply.send(data);
    } catch (error) {
      // Log error
      this.appHandle.log(3, `Error in methodName: ${error}`);

      // Send error response
      reply.status(500).send({
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'Operation failed',
      });
    }
  }
}
```
