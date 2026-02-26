# IOServer v2.1.1 Testing Guide

## 📋 Test Coverage

This project includes comprehensive test coverage across multiple testing levels:

### 🧪 Test Types

- **Unit Tests** - Test individual components in isolation
- **Integration Tests** - Test component interactions and HTTP/WebSocket functionality
- **E2E Tests** - Test complete application workflows
- **Performance Tests** - Test scalability and memory usage

### 📁 Test Structure

```
tests/
├── setup.ts                           # Global test configuration
├── unit/                              # Unit tests
│   ├── IOServer.test.ts              # Core server functionality
│   ├── BaseClasses.test.ts           # Base class behaviors
│   └── IOServerError.test.ts         # Error handling
├── integration/                       # Integration tests
│   └── IOServer.integration.test.ts  # HTTP/WebSocket integration
├── e2e/                              # End-to-end tests
│   └── chat-app.e2e.test.ts         # Complete chat application
└── performance/                       # Performance tests
    └── performance.test.ts           # Load and memory tests
```

## 🚀 Running Tests

### All Tests

```bash
npm test
```

### Test Categories

```bash
# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# E2E tests only
npm run test:e2e

# With coverage report
npm run test:coverage

# Watch mode for development
npm run test:watch
```

### Individual Test Files

```bash
# Run specific test file
npx jest tests/unit/IOServer.test.ts

# Run with verbose output
npx jest tests/e2e/chat-app.e2e.test.ts --verbose
```

## 📊 Test Coverage Goals

- **Statements**: > 90%
- **Branches**: > 85%
- **Functions**: > 95%
- **Lines**: > 90%

## 🧪 Unit Tests

### IOServer Core (`tests/unit/IOServer.test.ts`)

- Server initialization with various configurations
- Component registration (services, controllers, managers, watchers)
- Error handling for invalid configurations
- Logging system verification
- Duplicate component name validation

### Base Classes (`tests/unit/BaseClasses.test.ts`)

- BaseService, BaseController, BaseManager, BaseWatcher instantiation
- AppHandle integration
- Method execution and inheritance

### Error Handling (`tests/unit/IOServerError.test.ts`)

- Custom error creation with status codes
- Error inheritance and stack traces
- Error catching and property preservation

## 🔗 Integration Tests

### HTTP/WebSocket Integration (`tests/integration/IOServer.integration.test.ts`)

- HTTP route registration and responses
- WebSocket connection establishment
- Service event handling
- CORS configuration
- 404 error handling
- Malformed request handling

## 🔄 E2E Tests

### Chat Application (`tests/e2e/chat-app.e2e.test.ts`)

- Complete user authentication flow
- Real-time messaging between users
- Room creation and switching
- Typing indicators
- User presence notifications
- Error scenarios (invalid inputs, unauthorized actions)
- HTTP endpoints (health checks, API status, statistics)

## ⚡ Performance Tests

### Load Testing (`tests/performance/performance.test.ts`)

- Concurrent connection handling (50+ simultaneous connections)
- Rapid message processing (100+ messages/second)
- Memory leak detection across connection cycles
- Performance degradation monitoring

## 🛠️ Test Utilities

### Global Setup (`tests/setup.ts`)

- Console output suppression during tests
- Global timeout configuration
- Mock cleanup and restoration

### Test Environment Variables

```bash
# Enable verbose logging during tests
NODE_ENV=test-verbose npm test

# Run tests with garbage collection
node --expose-gc node_modules/.bin/jest
```

## 🎯 Writing New Tests

### Unit Test Template

```typescript
import { IOServer } from '../../src';

describe('Component Name', () => {
  let component: ComponentType;

  beforeEach(() => {
    // Setup
  });

  afterEach(() => {
    // Cleanup
  });

  it('should perform expected behavior', () => {
    // Test implementation
    expect(result).toBe(expected);
  });
});
```

### Integration Test Template

```typescript
describe('Feature Integration', () => {
  let server: IOServer;

  beforeAll(async () => {
    server = new IOServer({
      /* config */
    });
    await server.start();
  });

  afterAll(async () => {
    await server.stop();
  });

  it('should integrate components correctly', async () => {
    // Test implementation
  });
});
```

## 🐛 Debugging Tests

### Running Single Test

```bash
npx jest --testNamePattern="should handle user login"
```

### Debug Mode

```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

### Verbose Output

```bash
npm test -- --verbose --no-coverage
```

## 📈 Continuous Integration

Tests are configured to run in CI/CD pipelines with:

- Automatic dependency installation
- Parallel test execution
- Coverage reporting
- Performance regression detection
- Test result artifacts

## 🚨 Test Requirements

Before submitting code:

1. All tests must pass
2. Coverage thresholds must be met
3. No performance regressions
4. Linting must pass
5. No TypeScript errors

## 🤝 Contributing Tests

When adding new features:

1. Write unit tests for isolated functionality
2. Add integration tests for component interactions
3. Include E2E tests for user-facing features
4. Update performance tests for scalability-critical changes
5. Maintain test documentation
