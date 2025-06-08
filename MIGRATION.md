# Migration Guide: IOServer v1.x to v2.0.0

This guide helps you migrate from the CoffeeScript-based IOServer v1.x to the TypeScript-based v2.0.0.

## Key Changes

### 1. Language Migration

- **v1.x**: CoffeeScript
- **v2.0**: TypeScript with full type safety

### 2. Import/Export System

```typescript
// v1.x (CoffeeScript)
IOServer = require 'ioserver'

// v2.0 (TypeScript)
import { IOServer, BaseService } from '@ioserver/core';
```

### 3. Class Definition

```coffeescript
# v1.x (CoffeeScript)
module.exports = class MyService
    constructor: (@appHandle) ->

    hello: (socket, data, callback) ->
        socket.emit 'response', data
```

```typescript
// v2.0 (TypeScript)
import { BaseService } from "@ioserver/core";

export class MyService extends BaseService {
  async hello(socket: any, data: any, callback?: Function): Promise<void> {
    socket.emit("response", data);
  }
}
```

### 4. Server Configuration

```coffeescript
# v1.x (CoffeeScript)
server = new IOServer
    host: 'localhost'
    port: 8080
    verbose: 'DEBUG'

server.addService
    name: 'chat'
    service: ChatService
```

```typescript
// v2.0 (TypeScript)
const server = new IOServer({
  host: "localhost",
  port: 8080,
  verbose: "DEBUG",
});

server.addService({
  name: "chat",
  service: ChatService,
});
```

## Step-by-Step Migration

### Step 1: Install Dependencies

```bash
npm install @ioserver/core
npm install -D typescript @types/node
```

### Step 2: Convert Services

```coffeescript
# OLD: service.coffee
module.exports = class ChatService
    constructor: (@appHandle) ->

    join: (socket, data, callback) ->
        room = data.room
        socket.join room
        @appHandle.send
            namespace: 'chat'
            event: 'user_joined'
            data: user: socket.id
            room: room
        callback? status: 'joined'
```

```typescript
// NEW: service.ts
import { BaseService } from "@ioserver/core";

export class ChatService extends BaseService {
  async join(
    socket: any,
    data: { room: string },
    callback?: Function
  ): Promise<void> {
    const { room } = data;
    await socket.join(room);

    this.appHandle.send({
      namespace: "chat",
      event: "user_joined",
      data: { user: socket.id },
      room,
    });

    if (callback) {
      callback({ status: "joined" });
    }
  }
}
```

### Step 3: Convert Controllers

```coffeescript
# OLD: controller.coffee
module.exports = class UserController
    constructor: (@appHandle) ->

    getUser: (request, reply) ->
        reply.send user: 'John'
```

```typescript
// NEW: controller.ts
import { BaseController } from "@ioserver/core";

export class UserController extends BaseController {
  async getUser(request: any, reply: any): Promise<void> {
    reply.send({ user: "John" });
  }
}
```

### Step 4: Convert Managers

```coffeescript
# OLD: manager.coffee
module.exports = class SessionManager
    constructor: (@appHandle) ->
        @sessions = {}

    addSession: (id, data) ->
        @sessions[id] = data
```

```typescript
// NEW: manager.ts
import { BaseManager } from "@ioserver/core";

export class SessionManager extends BaseManager {
  private sessions: Map<string, any> = new Map();

  addSession(id: string, data: any): void {
    this.sessions.set(id, data);
  }
}
```

### Step 5: Convert Watchers

```coffeescript
# OLD: watcher.coffee
module.exports = class HealthWatcher
    constructor: (@appHandle) ->

    watch: ->
        setInterval =>
            @appHandle.log 6, 'Health check'
        , 30000
```

```typescript
// NEW: watcher.ts
import { BaseWatcher } from "@ioserver/core";

export class HealthWatcher extends BaseWatcher {
  async watch(): Promise<void> {
    setInterval(() => {
      this.appHandle.log(6, "Health check");
    }, 30000);
  }
}
```

### Step 6: Update Main Server File

```coffeescript
# OLD: server.coffee
IOServer = require './src/ioserver'
ChatService = require './services/chat'

server = new IOServer
    port: 8080
    verbose: 'DEBUG'

server.addService
    name: 'chat'
    service: ChatService

server.start()
```

```typescript
// NEW: server.ts
import { IOServer } from "@ioserver/core";
import { ChatService } from "./services/chat";

const server = new IOServer({
  port: 8080,
  verbose: "DEBUG",
});

server.addService({
  name: "chat",
  service: ChatService,
});

server.start();
```

## Breaking Changes

### 1. Method Signatures

- All service methods should now be `async` and return `Promise<void>`
- Callback parameter is now optional with proper typing

### 2. Error Handling

```typescript
// v2.0 - Use IOServerError for custom errors
import { IOServerError } from "@ioserver/core";

throw new IOServerError("Custom error message", 400);
```

### 3. AppHandle Type Safety

```typescript
// v2.0 - Properly typed appHandle
interface CustomAppHandle extends AppHandle {
  sessionManager: SessionManager;
  userManager: UserManager;
}
```

### 4. Configuration Options

Some configuration options have been renamed or removed:

- `mode` now accepts typed transport modes
- `cors` configuration is more structured
- `verbose` uses the same log levels but with better typing

## Benefits of v2.0

1. **Type Safety**: Full TypeScript support catches errors at compile time
2. **Better IDE Support**: IntelliSense, auto-completion, and refactoring
3. **Modern JavaScript**: ES2020+ features and async/await
4. **Improved Performance**: Optimized for Node.js 16+
5. **Better Testing**: Jest configuration included
6. **NPM Package**: Easy installation and updates

## Common Migration Issues

### 1. CoffeeScript Syntax

Remember to add semicolons, braces, and proper TypeScript syntax.

### 2. Callback Handling

```coffeescript
# OLD
callback? data

# NEW
if (callback) {
  callback(data);
}
```

### 3. String Interpolation

```coffeescript
# OLD
"Hello #{name}"

# NEW
`Hello ${name}`
```

### 4. Object Property Access

```coffeescript
# OLD
obj?.property

# NEW
obj?.property // Same syntax works!
```

## Need Help?

If you encounter issues during migration:

1. Check the [examples](./examples/) directory
2. Review the [API documentation](./README.md)
3. Open an issue on GitHub with your specific migration question
