import {
  BaseService,
  BaseController,
  BaseManager,
  BaseWatcher,
} from "../../src";

describe("Base Classes Unit Tests", () => {
  const mockAppHandle = {
    send: jest.fn(),
    log: jest.fn(),
    verbose: "ERROR" as const,
  };

  describe("BaseService", () => {
    class TestService extends BaseService {
      getAppHandle() {
        return this.appHandle;
      }
    }

    it("should create instance with appHandle", () => {
      const service = new TestService(mockAppHandle);
      expect(service.getAppHandle()).toBe(mockAppHandle);
    });

    it("should provide access to appHandle methods", () => {
      const service = new TestService(mockAppHandle);
      service.getAppHandle().log(6, "test message");
      expect(mockAppHandle.log).toHaveBeenCalledWith(6, "test message");
    });
  });

  describe("BaseController", () => {
    class TestController extends BaseController {
      async testMethod(request: any, reply: any) {
        reply.send({ test: true });
      }

      getAppHandle() {
        return this.appHandle;
      }
    }

    it("should create instance with appHandle", () => {
      const controller = new TestController(mockAppHandle);
      expect(controller.getAppHandle()).toBe(mockAppHandle);
    });

    it("should handle request/reply cycle", async () => {
      const controller = new TestController(mockAppHandle);
      const mockReply = { send: jest.fn() };

      await controller.testMethod({}, mockReply);
      expect(mockReply.send).toHaveBeenCalledWith({ test: true });
    });
  });

  describe("BaseManager", () => {
    class TestManager extends BaseManager {
      getValue() {
        return "test-value";
      }

      getAppHandle() {
        return this.appHandle;
      }
    }

    it("should create instance with appHandle", () => {
      const manager = new TestManager(mockAppHandle);
      expect(manager.getAppHandle()).toBe(mockAppHandle);
    });

    it("should provide custom functionality", () => {
      const manager = new TestManager(mockAppHandle);
      expect(manager.getValue()).toBe("test-value");
    });
  });

  describe("BaseWatcher", () => {
    class TestWatcher extends BaseWatcher {
      private watchCount = 0;

      async watch() {
        this.watchCount++;
      }

      getWatchCount() {
        return this.watchCount;
      }

      getAppHandle() {
        return this.appHandle;
      }
    }

    it("should create instance with appHandle", () => {
      const watcher = new TestWatcher(mockAppHandle);
      expect(watcher.getAppHandle()).toBe(mockAppHandle);
    });

    it("should execute watch method", async () => {
      const watcher = new TestWatcher(mockAppHandle);

      expect(watcher.getWatchCount()).toBe(0);
      await watcher.watch();
      expect(watcher.getWatchCount()).toBe(1);
    });
  });
});
