// Global test setup
beforeAll(() => {
  // Suppress console output during tests unless explicitly needed
  if (process.env.NODE_ENV !== "test-verbose") {
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
  }
});

afterAll(() => {
  // Cleanup after all tests
  jest.restoreAllMocks();
});

// Global test timeout
jest.setTimeout(10000);
