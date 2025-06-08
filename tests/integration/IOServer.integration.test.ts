import { IOServer } from "../../src/IOServer";
import { BaseService, BaseController } from "../../src";
const supertest = require("supertest");

describe("IOServer Integration Tests", () => {
  let server: IOServer;

  class TestService extends BaseService {
    async hello(socket: any, data: any, callback?: Function): Promise<void> {
      socket.emit("hello_response", { message: "Hello from test service" });
      if (callback) callback({ status: "success" });
    }

    async echo(socket: any, data: any, callback?: Function): Promise<void> {
      socket.emit("echo_response", data);
      if (callback) callback({ status: "success", data });
    }
  }

  class TestController extends BaseController {
    async getStatus(request: any, reply: any): Promise<void> {
      reply.send({ status: "OK", timestamp: Date.now() });
    }

    async postData(request: any, reply: any): Promise<void> {
      reply.send({ received: request.body });
    }
  }

  beforeAll(async () => {
    server = new IOServer({
      host: "localhost",
      port: 3003,
      verbose: "ERROR",
      routes: "./tests/routes",
      cors: {
        origin: ["http://localhost:3003"],
        methods: ["GET", "POST", "OPTIONS"],
      },
    });

    // Register test components
    server.addService({
      name: "test",
      service: TestService,
    });

    server.addController({
      name: "api",
      controller: TestController,
    });

    await server.start();
  });

  afterAll(async () => {
    if (server) {
      await server.stop();
    }
  });

  describe("HTTP Routes", () => {
    it("should respond to registered GET route", async () => {
      const response = await supertest(`http://localhost:3003`)
        .get("/api/status")
        .expect(200);

      expect(response.body).toEqual({
        status: "OK",
        timestamp: expect.any(Number),
      });
    });

    it("should handle 404 for unregistered routes", async () => {
      const response = await supertest(`http://localhost:3003`)
        .get("/nonexistent")
        .expect(404);

      expect(response.body).toHaveProperty("statusCode", 404);
      expect(response.body).toHaveProperty("error", "Not Found");
    });

    it("should handle CORS preflight requests", async () => {
      const response = await supertest(`http://localhost:3003`)
        .options("/api/status")
        .set("Origin", "http://localhost:3003")
        .set("Access-Control-Request-Method", "GET")
        .expect(204);

      expect(response.headers).toHaveProperty("access-control-allow-origin");
      expect(response.headers).toHaveProperty("access-control-allow-methods");
    });

    it("should handle POST requests", async () => {
      const testData = { message: "test data" };

      const response = await supertest(`http://localhost:3003`)
        .post("/api/data")
        .send(testData)
        .expect(200);

      expect(response.body).toEqual({
        received: testData,
      });
    });
  });

  describe("WebSocket Connections", () => {
    it("should accept Socket.IO connections", (done) => {
      const io = require("socket.io-client");
      const client = io("http://localhost:3003/test");

      client.on("connect", () => {
        expect(client.connected).toBe(true);
        client.disconnect();
        done();
      });

      client.on("connect_error", (error: any) => {
        done(error);
      });
    });

    it("should handle service events", (done) => {
      const io = require("socket.io-client");
      const client = io("http://localhost:3003/test");

      client.on("connect", () => {
        client.emit("hello", { message: "test" }, (response: any) => {
          expect(response.status).toBe("success");
          client.disconnect();
          done();
        });
      });

      client.on("connect_error", (error: any) => {
        done(error);
      });
    });

    it("should echo data correctly", (done) => {
      const io = require("socket.io-client");
      const client = io("http://localhost:3003/test");
      const testData = { test: "data", number: 42 };

      client.on("connect", () => {
        client.emit("echo", testData);
      });

      client.on("echo_response", (data: any) => {
        expect(data).toEqual(testData);
        client.disconnect();
        done();
      });

      client.on("connect_error", (error: any) => {
        done(error);
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle malformed Socket.IO events gracefully", (done) => {
      const io = require("socket.io-client");
      const client = io("http://localhost:3003/test");

      client.on("connect", () => {
        // Send event to non-existent handler
        client.emit("nonexistent_event", { data: "test" });

        // Should not crash the server
        setTimeout(() => {
          expect(client.connected).toBe(true);
          client.disconnect();
          done();
        }, 100);
      });

      client.on("connect_error", (error: any) => {
        done(error);
      });
    });
  });
});
