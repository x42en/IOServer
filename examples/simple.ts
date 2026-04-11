import {
  IOServer,
  BaseService,
  BaseController,
  BaseManager,
  BaseWatcher,
} from "../src";

// Simple example showing basic IOServer usage
// For a complete chat application, see ./chat-app/

// Example Service
class SimpleService extends BaseService {
  async hello(socket: any, data: any, callback?: Function): Promise<void> {
    this.appHandle.log(6, `Hello received: ${JSON.stringify(data)}`);
    socket.emit("hello_response", {
      message: "Hello from TypeScript server!",
      timestamp: Date.now(),
    });

    if (callback) {
      callback({ status: "success" });
    }
  }
}

// Example Controller
class SimpleController extends BaseController {
  async getStatus(request: any, reply: any): Promise<void> {
    reply.send({
      status: "OK",
      timestamp: Date.now(),
      version: "2.0.0",
    });
  }
}

// Example Manager
class SimpleManager extends BaseManager {
  private counter: number = 0;

  increment(): number {
    return ++this.counter;
  }

  getCount(): number {
    return this.counter;
  }
}

// Example Watcher
class SimpleWatcher extends BaseWatcher {
  private intervalId: ReturnType<typeof setInterval> | null = null;

  async watch(): Promise<void> {
    this.intervalId = setInterval(() => {
      this.appHandle.log(6, "Simple watcher is running...");
    }, 30000); // Every 30 seconds
  }

  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

// Create and configure server
async function createSimpleServer(): Promise<IOServer> {
  const server = new IOServer({
    host: "localhost",
    port: 8080,
    verbose: "DEBUG",
    cors: {
      origin: ["http://localhost:3000", "http://localhost:8080"],
      methods: ["GET", "POST"],
    },
    mode: ["websocket", "polling"],
  });

  // Register components
  server.addManager({ name: "simpleManager", manager: SimpleManager });
  server.addWatcher({ name: "simpleWatcher", watcher: SimpleWatcher });
  server.addService({ name: "simple", service: SimpleService });
  server.addController({ name: "api", controller: SimpleController });

  return server;
}

// Start server
if (require.main === module) {
  createSimpleServer()
    .then((server) => server.start())
    .then(() => {
      console.log("🚀 IOServer v2.0.0 Simple Example started!");
      console.log("📡 Socket.io available at: http://localhost:8080");
      console.log("🌐 REST API available at: http://localhost:8080/api");
      console.log("💬 For a complete chat app example, see ./chat-app/");
    })
    .catch((error) => {
      console.error("❌ Failed to start server:", error);
      process.exit(1);
    });
}

export default createSimpleServer;
