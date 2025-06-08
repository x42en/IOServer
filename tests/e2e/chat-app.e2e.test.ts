import { IOServer } from "../../src";
import { ChatService } from "../../examples/chat-app/services/ChatService";
import { ChatController } from "../../examples/chat-app/controllers/ChatController";
import { ApiController } from "../../examples/chat-app/controllers/ApiController";
import { StatsManager } from "../../examples/chat-app/managers/StatsManager";
import { ChatWatcher } from "../../examples/chat-app/watchers/ChatWatcher";
const supertest = require("supertest");
const io = require("socket.io-client");

describe("Chat Application E2E Tests", () => {
  let server: IOServer;
  const port = 3004;
  const serverUrl = `http://localhost:${port}`;

  beforeAll(async () => {
    // Create chat app server
    server = new IOServer({
      host: "localhost",
      port,
      verbose: "ERROR",
      cors: {
        origin: [`http://localhost:${port}`],
        methods: ["GET", "POST"],
      },
      mode: ["websocket", "polling"],
      routes: "./examples/chat-app/routes", // Use actual chat app routes
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
      prefix: "",
    });

    server.addController({
      name: "api",
      controller: ApiController,
    });

    await server.start();
  });

  afterAll(async () => {
    if (server) {
      await server.stop();
    }
  });

  describe("HTTP Endpoints", () => {
    it("should serve the chat interface at root", async () => {
      const response = await supertest(serverUrl).get("/").expect(200);

      expect(response.headers["content-type"]).toMatch(/text\/html/);
      expect(response.text).toContain("IOServer Chat");
    });

    it("should return health status", async () => {
      const response = await supertest(serverUrl).get("/health").expect(200);

      expect(response.body).toEqual({
        status: "OK",
        timestamp: expect.any(String),
        service: "IOServer Chat App",
        version: "2.0.0",
      });
    });

    it("should return API status", async () => {
      const response = await supertest(serverUrl)
        .get("/api/status")
        .expect(200);

      expect(response.body).toHaveProperty("status", "OK");
      expect(response.body).toHaveProperty("service", "IOServer Chat App API");
      expect(response.body).toHaveProperty("version", "2.0.0");
    });

    it("should return chat statistics", async () => {
      const response = await supertest(serverUrl).get("/api/stats").expect(200);

      expect(response.body).toHaveProperty("status", "OK");
      expect(response.body).toHaveProperty("data");
      expect(response.body.data).toHaveProperty("totalUsers");
      expect(response.body.data).toHaveProperty("uptime");
    });
  });

  describe("Chat Functionality", () => {
    let client1: any;
    let client2: any;

    beforeEach((done) => {
      let connected = 0;
      const checkConnected = () => {
        connected++;
        if (connected === 2) done();
      };

      client1 = io(`http://localhost:${port}/chat`);
      client2 = io(`http://localhost:${port}/chat`);

      client1.on("connect", checkConnected);
      client2.on("connect", checkConnected);
    });

    afterEach(() => {
      if (client1) client1.disconnect();
      if (client2) client2.disconnect();
    });

    it("should allow user login", (done) => {
      client1.emit("login", { username: "testuser1" }, (response: any) => {
        expect(response.status).toBe("success");
        expect(response.user.username).toBe("testuser1");
        expect(response.user.room).toBe("general");
        done();
      });
    });

    it("should prevent duplicate usernames", (done) => {
      client1.emit("login", { username: "duplicate" }, (response1: any) => {
        expect(response1.status).toBe("success");

        client2.emit("login", { username: "duplicate" }, (response2: any) => {
          expect(response2.status).toBe("error");
          expect(response2.message).toContain("already taken");
          done();
        });
      });
    });

    it("should handle message sending", (done) => {
      client1.emit("login", { username: "sender" }, () => {
        client2.emit("login", { username: "receiver" }, () => {
          client2.on("new_message", (message: any) => {
            expect(message.username).toBe("sender");
            expect(message.content).toBe("Hello World!");
            expect(message.room).toBe("general");
            done();
          });

          client1.emit("send_message", { content: "Hello World!" });
        });
      });
    });
  });

  describe("Error Handling", () => {
    let client: any;

    beforeEach((done) => {
      client = io(`http://localhost:${port}/chat`);
      client.on("connect", () => done());
    });

    afterEach(() => {
      if (client) client.disconnect();
    });

    it("should handle empty username login", (done) => {
      client.emit("login", { username: "" }, (response: any) => {
        expect(response.status).toBe("error");
        expect(response.message).toContain("required");
        done();
      });
    });

    it("should handle message without login", (done) => {
      client.emit("send_message", { content: "test" }, (response: any) => {
        expect(response.status).toBe("error");
        expect(response.message).toContain("not logged in");
        done();
      });
    });
  });
});
