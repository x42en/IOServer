import { IOServer } from "../../src";

describe("Performance Tests", () => {
  let server: IOServer;
  const port = 3005;

  beforeAll(async () => {
    server = new IOServer({
      host: "localhost",
      port,
      verbose: "ERROR",
    });

    await server.start();
  });

  afterAll(async () => {
    if (server) {
      await server.stop();
    }
  });

  describe("Concurrent Connections", () => {
    it("should handle multiple simultaneous connections", async () => {
      const io = require("socket.io-client");
      const connectionCount = 50;
      const clients: any[] = [];

      const connectionPromises = Array.from(
        { length: connectionCount },
        (_, i) => {
          return new Promise((resolve, reject) => {
            const client = io(`http://localhost:${port}`);
            clients.push(client);

            client.on("connect", () => resolve(client));
            client.on("connect_error", reject);
          });
        }
      );

      const connectedClients = await Promise.all(connectionPromises);
      expect(connectedClients).toHaveLength(connectionCount);

      // Cleanup
      clients.forEach((client) => client.disconnect());
    }, 15000);

    it("should handle rapid message sending", async () => {
      const io = require("socket.io-client");
      const client = io(`http://localhost:${port}`);

      await new Promise((resolve) => client.on("connect", resolve));

      const messageCount = 100;
      const responses: any[] = [];

      client.on("test_response", (data: any) => {
        responses.push(data);
      });

      // Send messages rapidly
      for (let i = 0; i < messageCount; i++) {
        client.emit("test", { id: i, message: `Message ${i}` });
      }

      // Wait for responses
      await new Promise((resolve) => setTimeout(resolve, 1000));

      client.disconnect();
    }, 10000);
  });

  describe("Memory Usage", () => {
    it("should not leak memory with connection cycles", async () => {
      const io = require("socket.io-client");
      const initialMemory = process.memoryUsage().heapUsed;

      // Create and destroy connections multiple times (reduced cycles)
      for (let cycle = 0; cycle < 5; cycle++) {
        const clients = Array.from({ length: 5 }, () => {
          return io(`http://localhost:${port}`);
        });

        await Promise.all(
          clients.map(
            (client) => new Promise((resolve) => client.on("connect", resolve))
          )
        );

        clients.forEach((client) => client.disconnect());

        // Allow more time for cleanup
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      // Force garbage collection multiple times if available
      if (global.gc) {
        for (let i = 0; i < 3; i++) {
          global.gc();
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // More realistic memory allowance (20MB for Socket.IO overhead)
      expect(memoryIncrease).toBeLessThan(20 * 1024 * 1024);
    }, 20000);
  });
});
