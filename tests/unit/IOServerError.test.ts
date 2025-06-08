import { IOServerError } from "../../src";

describe("IOServerError Unit Tests", () => {
  describe("Constructor", () => {
    it("should create error with message and status code", () => {
      const error = new IOServerError("Test error", 500);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(IOServerError);
      expect(error.message).toBe("Test error");
      expect(error.statusCode).toBe(500);
      expect(error.name).toBe("IOServerError");
    });

    it("should create error with default status code", () => {
      const error = new IOServerError("Test error");

      expect(error.message).toBe("Test error");
      expect(error.statusCode).toBe(500);
    });

    it("should have proper stack trace", () => {
      const error = new IOServerError("Test error", 400);

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain("IOServerError");
    });
  });

  describe("Status Codes", () => {
    it("should handle different HTTP status codes", () => {
      const badRequest = new IOServerError("Bad request", 400);
      const unauthorized = new IOServerError("Unauthorized", 401);
      const notFound = new IOServerError("Not found", 404);
      const serverError = new IOServerError("Server error", 500);

      expect(badRequest.statusCode).toBe(400);
      expect(unauthorized.statusCode).toBe(401);
      expect(notFound.statusCode).toBe(404);
      expect(serverError.statusCode).toBe(500);
    });
  });

  describe("Error Inheritance", () => {
    it("should be caught as Error", () => {
      try {
        throw new IOServerError("Test error", 500);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(IOServerError);
      }
    });

    it("should preserve error properties in catch block", () => {
      try {
        throw new IOServerError("Custom error", 422);
      } catch (error) {
        if (error instanceof IOServerError) {
          expect(error.message).toBe("Custom error");
          expect(error.statusCode).toBe(422);
        } else {
          fail("Error should be instance of IOServerError");
        }
      }
    });
  });
});
