import { IOServer } from "../../src";
import { ChatService } from "./services/ChatService";
import { ChatController } from "./controllers/ChatController";
import { ApiController } from "./controllers/ApiController";
import { StatsManager } from "./managers/StatsManager";
import { ChatWatcher } from "./watchers/ChatWatcher";

/**
 * IOServer Chat Application
 *
 * Features:
 * - Username-only login (no password required)
 * - Default room join on login
 * - View connected users in current room
 * - Create and join different rooms
 * - Send messages to rooms
 * - Real-time typing indicators
 * - Envelope icon with unread message notifications
 * - System messages for user join/leave events
 * - Responsive web interface
 */

async function createChatApp(): Promise<IOServer> {
  const server = new IOServer({
    host: "localhost",
    port: 3000,
    verbose: "DEBUG",
    cors: {
      origin: ["http://localhost:3000"],
      methods: ["GET", "POST"],
    },
    mode: ["websocket", "polling"],
    routes: "./examples/chat-app/routes",
  });

  // Register components
  server.addManager({
    name: "statsManager",
    manager: StatsManager,
  });

  server.addWatcher({
    name: "chatWatcher",
    watcher: ChatWatcher,
  });

  server.addService({
    name: "chat",
    service: ChatService,
  });

  server.addController({
    name: "chat",
    controller: ChatController,
    prefix: "", // Empty prefix to serve routes at root level
  });

  server.addController({
    name: "api",
    controller: ApiController,
    // No prefix specified, so routes will be prefixed with "/api"
  });

  return server;
}

// Start the chat application
async function startChatApp() {
  try {
    console.log("🔄 Starting IOServer Chat Application...");

    const server = await createChatApp();
    console.log("✅ Server instance created");

    await server.start();

    console.log("🚀 IOServer Chat App started successfully!");
    console.log("📱 Open your browser and go to: http://localhost:3000");
    console.log("💬 Features available:");
    console.log("   - Username-only login");
    console.log("   - Real-time messaging");
    console.log("   - Multiple chat rooms");
    console.log("   - User presence indicators");
    console.log("   - Typing notifications");
    console.log("   - Message notifications");
    console.log("   - Responsive design");
    console.log("🔥 Server is running and waiting for connections...");

    // Keep the process alive
    process.on("SIGINT", async () => {
      console.log("\n🛑 Received SIGINT, shutting down gracefully...");
      try {
        await server.stop();
        console.log("✅ Server stopped successfully");
        process.exit(0);
      } catch (error) {
        console.error("❌ Error stopping server:", error);
        process.exit(1);
      }
    });
  } catch (error) {
    console.error("❌ Failed to start chat app:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  startChatApp();
}

export default createChatApp;
