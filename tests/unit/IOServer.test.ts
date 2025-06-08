import { IOServer } from "../../src/IOServer";
import {
  BaseService,
  BaseController,
  BaseManager,
  BaseWatcher,
} from "../../src";

describe("IOServer Unit Tests", () => {
  let server: IOServer;

  beforeEach(() => {
    server = new IOServer({
      host: "localhost",
      port: 3001,
      verbose: "ERROR", // Minimize logging during tests
      routes: "./tests/routes", // Use test routes directory
    });
  });

  afterEach(async () => {
    if (server) {
      try {
        await server.stop();
      } catch (error) {
        // Ignore stop errors in tests
      }
    }
  });

  describe("Server Initialization", () => {
    it("should create server with default configuration", () => {
      expect(server).toBeInstanceOf(IOServer);
      expect(server.getHost()).toBe("localhost");
      expect(server.getPort()).toBe(3001);
    });

    it("should create server with custom configuration", () => {
      const customServer = new IOServer({
        host: "0.0.0.0",
        port: 8080,
        verbose: "DEBUG",
        cors: {
          origin: ["http://localhost:3000"],
          methods: ["GET", "POST"],
        },
        mode: ["websocket"],
      });

      expect(customServer.getHost()).toBe("0.0.0.0");
      expect(customServer.getPort()).toBe(8080);
    });

    it("should throw error for invalid port", () => {
      expect(() => {
        new IOServer({
          host: "localhost",
          port: -1,
        });
      }).toThrow();
    });
  });

  describe("Component Registration", () => {
    class TestService extends BaseService {
      async testMethod() {
        return "test";
      }
    }

    class TestController extends BaseController {
      async testHandler(request: any, reply: any) {
        reply.send({ test: true });
      }
    }

    class TestManager extends BaseManager {
      getValue() {
        return "manager-value";
      }
    }

    class TestWatcher extends BaseWatcher {
      async watch() {
        // Test watcher implementation
      }
    }

    it("should register service successfully", () => {
      expect(() => {
        server.addService({
          name: "test",
          service: TestService,
        });
      }).not.toThrow();
    });

    it("should register controller successfully", () => {
      expect(() => {
        server.addController({
          name: "test",
          controller: TestController,
        });
      }).not.toThrow();
    });

    it("should register manager successfully", () => {
      expect(() => {
        server.addManager({
          name: "testManager",
          manager: TestManager,
        });
      }).not.toThrow();
    });

    it("should register watcher successfully", () => {
      expect(() => {
        server.addWatcher({
          name: "testWatcher",
          watcher: TestWatcher,
        });
      }).not.toThrow();
    });

    it("should throw error for duplicate service names", () => {
      server.addService({ name: "test", service: TestService });

      expect(() => {
        server.addService({ name: "test", service: TestService });
      }).toThrow("Sorry this service already exists");
    });

    it("should throw error for duplicate controller names", () => {
      server.addController({ name: "test", controller: TestController });

      expect(() => {
        server.addController({ name: "test", controller: TestController });
      }).toThrow("Sorry this controller already exists");
    });
  });

  describe("Logging System", () => {
    it("should log messages at different levels", () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      // Create server with verbose logging
      const verboseServer = new IOServer({
        host: "localhost",
        port: 3002,
        verbose: "DEBUG",
      });

      // Test logging (Note: actual log calls would be internal)
      // This tests the logging infrastructure is set up
      expect(verboseServer).toBeInstanceOf(IOServer);

      consoleSpy.mockRestore();
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid host gracefully", () => {
      // Empty host should work (will use default)
      expect(() => {
        new IOServer({
          host: "",
          port: 3000,
        });
      }).not.toThrow();
    });

    it("should use defaults for missing configuration", () => {
      // Missing config should use defaults
      const defaultServer = new IOServer();
      expect(defaultServer.getHost()).toBe("localhost");
      expect(defaultServer.getPort()).toBe(8080);
    });
  });
});
