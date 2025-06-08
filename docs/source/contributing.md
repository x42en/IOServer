# Contributing

We welcome contributions to IOServer! This guide will help you get started with contributing to the project.

## Getting Started

### Prerequisites

- **Node.js**: >= 18.0.0
- **pnpm**: >= 8.0.0
- **TypeScript**: >= 5.0.0
- **Git**: Latest version

### Development Setup

1. **Fork and clone the repository:**

   ```bash
   git clone https://github.com/yourusername/ioserver-ts.git
   cd ioserver-ts
   ```

2. **Install dependencies:**

   ```bash
   pnpm install
   ```

3. **Run tests:**

   ```bash
   pnpm test
   ```

4. **Start development:**
   ```bash
   pnpm run build:watch
   ```

## Project Structure

```
ioserver-ts/
├── src/                    # Source code
│   ├── IOServer.ts        # Main server class
│   ├── IOServerError.ts   # Error handling
│   └── index.ts          # Public API exports
├── examples/              # Example applications
│   └── chat-app/         # Chat application demo
├── tests/                # Test suites
│   ├── unit/            # Unit tests
│   ├── integration/     # Integration tests
│   └── e2e/            # End-to-end tests
├── docs/                # Documentation
├── .github/             # GitHub Actions workflows
└── README.md           # Project overview
```

## Development Guidelines

### Code Style

We use ESLint and Prettier for code formatting. The configuration is already set up in the project.

```bash
# Lint code
pnpm run lint

# Fix linting issues
pnpm run lint:fix
```

### TypeScript Guidelines

- **Always use TypeScript**: No plain JavaScript files
- **Strict typing**: Avoid `any` when possible
- **Interface definitions**: Use interfaces for public APIs
- **JSDoc comments**: Document public methods and classes
- **Export organization**: Use index.ts for clean exports

### Example Code Style

```typescript
/**
 * Represents a user in the chat system
 */
interface User {
  id: string;
  username: string;
  room: string;
  joinedAt: Date;
}

/**
 * Chat service for handling real-time messaging
 */
export class ChatService extends BaseService {
  /**
   * Handles user joining a chat room
   * @param socket - Socket.IO socket instance
   * @param data - Join room data containing username and room
   * @param callback - Optional callback function
   */
  async joinRoom(
    socket: any,
    data: { username: string; room: string },
    callback?: Function
  ): Promise<void> {
    try {
      // Validate input
      if (!data.username || !data.room) {
        throw new IOServerError('Username and room are required', 400);
      }

      // Implementation here...
    } catch (error) {
      this.appHandle.log(3, `Error in joinRoom: ${error}`);
      throw error;
    }
  }
}
```

## Testing

We maintain high test coverage and use Jest for testing.

### Test Structure

```
tests/
├── unit/                  # Unit tests for individual components
│   ├── IOServer.test.ts
│   └── IOServerError.test.ts
├── integration/           # Integration tests for component interaction
│   ├── services.test.ts
│   └── controllers.test.ts
├── e2e/                  # End-to-end tests
│   └── chat-app.test.ts
└── fixtures/             # Test data and mocks
    └── mock-data.ts
```

### Writing Tests

#### Unit Tests

```typescript
// tests/unit/IOServer.test.ts
import { IOServer, IOServerError } from '../../src';

describe('IOServer', () => {
  let server: IOServer;

  beforeEach(() => {
    server = new IOServer({ port: 0 }); // Use random port
  });

  afterEach(async () => {
    await server.stop();
  });

  describe('constructor', () => {
    it('should create server with default options', () => {
      const defaultServer = new IOServer();
      expect(defaultServer.getHost()).toBe('localhost');
      expect(defaultServer.getPort()).toBe(8080);
    });

    it('should throw error for invalid port', () => {
      expect(() => {
        new IOServer({ port: -1 });
      }).toThrow(IOServerError);
    });
  });

  describe('addService', () => {
    it('should register service successfully', () => {
      class TestService extends BaseService {
        async testMethod() {
          return 'test';
        }
      }

      expect(() => {
        server.addService({ service: TestService });
      }).not.toThrow();
    });
  });
});
```

#### Integration Tests

```typescript
// tests/integration/services.test.ts
import { IOServer, BaseService } from '../../src';
import { io as Client } from 'socket.io-client';

describe('Service Integration', () => {
  let server: IOServer;
  let clientSocket: any;

  beforeAll(async () => {
    server = new IOServer({ port: 0 });

    class TestService extends BaseService {
      async echo(socket: any, data: any, callback?: Function) {
        if (callback) callback({ message: data.message });
      }
    }

    server.addService({ service: TestService });
    await server.start();
  });

  afterAll(async () => {
    await server.stop();
  });

  beforeEach(done => {
    clientSocket = Client(`http://localhost:${server.getPort()}`);
    clientSocket.on('connect', done);
  });

  afterEach(() => {
    if (clientSocket.connected) {
      clientSocket.disconnect();
    }
  });

  it('should handle service method calls', done => {
    clientSocket.emit('echo', { message: 'hello' }, (response: any) => {
      expect(response.message).toBe('hello');
      done();
    });
  });
});
```

### Test Commands

```bash
# Run all tests
pnpm test

# Run specific test types
pnpm run test:unit
pnpm run test:integration
pnpm run test:e2e

# Run tests in watch mode
pnpm run test:watch

# Generate coverage report
pnpm run test:coverage
```

## Documentation

### Writing Documentation

- **Markdown format**: All documentation uses Markdown
- **Code examples**: Include working examples
- **API documentation**: Document all public APIs
- **Keep it updated**: Update docs with code changes

### Documentation Structure

```
docs/source/
├── index.md              # Main documentation page
├── getting-started.md    # Quick start guide
├── architecture.md       # Architecture concepts
├── api-reference.md      # API documentation
├── examples/            # Example documentation
│   └── chat-app.md     # Chat app tutorial
├── deployment.md        # Deployment guide
└── contributing.md      # This file
```

### Building Documentation

```bash
# Install documentation dependencies
pip install sphinx sphinx-rtd-theme myst-parser

# Build documentation
cd docs
make html

# Serve documentation locally
python -m http.server 8000 -d build/html
```

## Pull Request Process

### Before Submitting

1. **Fork the repository** and create a feature branch
2. **Write tests** for your changes
3. **Ensure all tests pass**: `pnpm test`
4. **Lint your code**: `pnpm run lint`
5. **Update documentation** if needed
6. **Write clear commit messages**

### Commit Message Format

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types:**

- `feat`: New features
- `fix`: Bug fixes
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**

```
feat(services): add message encryption support

Add end-to-end encryption for chat messages using AES-256.
Includes new EncryptionService and updates to ChatService.

Closes #123
```

```
fix(cors): handle undefined origin in CORS configuration

Previously, undefined origin would cause server startup to fail.
Now defaults to false for security.

Fixes #456
```

### Pull Request Template

When creating a pull request, please include:

```markdown
## Description

Brief description of changes made.

## Type of Change

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing

- [ ] Tests pass locally
- [ ] New tests added for new functionality
- [ ] Integration tests updated if needed

## Documentation

- [ ] Documentation updated
- [ ] API documentation updated
- [ ] Examples updated if needed

## Checklist

- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] No new warnings introduced
```

## Issue Guidelines

### Reporting Bugs

Please include:

1. **Environment details**: Node.js version, OS, IOServer version
2. **Steps to reproduce**: Clear, minimal reproduction steps
3. **Expected behavior**: What should happen
4. **Actual behavior**: What actually happens
5. **Code examples**: Minimal reproduction code
6. **Error messages**: Full error stack traces

### Feature Requests

Please include:

1. **Use case**: Why is this feature needed?
2. **Proposed solution**: How should it work?
3. **Alternatives considered**: Other approaches you've considered
4. **Examples**: Code examples of proposed API

### Issue Labels

- `bug`: Something isn't working
- `enhancement`: New feature or request
- `documentation`: Improvements or additions to documentation
- `good first issue`: Good for newcomers
- `help wanted`: Extra attention is needed
- `question`: Further information is requested

## Code Review Process

### What We Look For

1. **Correctness**: Does the code solve the problem?
2. **Testing**: Are there adequate tests?
3. **Performance**: Any performance implications?
4. **Security**: Any security concerns?
5. **Maintainability**: Is the code clean and well-documented?
6. **Compatibility**: Breaking changes properly documented?

### Review Checklist

- [ ] Code compiles without warnings
- [ ] All tests pass
- [ ] New functionality has tests
- [ ] Documentation updated
- [ ] No obvious performance issues
- [ ] Security implications considered
- [ ] Error handling appropriate
- [ ] Logging appropriate
- [ ] Code style consistent

## Release Process

### Versioning

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR**: Breaking changes
- **MINOR**: New features (backwards compatible)
- **PATCH**: Bug fixes (backwards compatible)

### Release Steps

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Create release tag
4. GitHub Actions handles publishing

## Community

### Code of Conduct

We are committed to providing a welcoming and inspiring community for all. Please read our [Code of Conduct](CODE_OF_CONDUCT.md).

### Getting Help

- **GitHub Discussions**: For questions and general discussion
- **GitHub Issues**: For bug reports and feature requests
- **Discord**: Real-time chat (link in README)

### Recognition

Contributors are recognized in:

- **CONTRIBUTORS.md**: All contributors listed
- **Release notes**: Major contributors mentioned
- **Documentation**: Example contributors credited

## Thank You!

Your contributions make IOServer better for everyone. Whether you're fixing bugs, adding features, improving documentation, or helping others, your efforts are appreciated! 🎉
