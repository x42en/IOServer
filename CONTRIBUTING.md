# Contributing to IOServer

Thank you for your interest in contributing to IOServer! This document covers the development setup, architecture rules, testing strategy, and release process.

## Table of contents

- [Prerequisites](#prerequisites)
- [Development setup](#development-setup)
- [Architecture rules](#architecture-rules)
  - [Component separation](#component-separation)
  - [Registration order](#registration-order)
  - [TypeScript requirements](#typescript-requirements)
  - [Naming conventions](#naming-conventions)
- [Test suite](#test-suite)
  - [Running tests](#running-tests)
  - [Coverage targets](#coverage-targets)
  - [Writing tests](#writing-tests)
- [Linting](#linting)
- [Commit conventions](#commit-conventions)
- [Pull requests](#pull-requests)
- [Release process](#release-process)

---

## Prerequisites

- Node.js ≥ 18 (≥ 20 recommended)
- pnpm v9 — `npm install -g pnpm@9`
- TypeScript ≥ 5.0

## Development setup

```bash
git clone https://github.com/x42en/IOServer.git
cd IOServer
pnpm install

# Compile src/ → dist/
pnpm run build

# Run the minimal example
pnpm run dev:simple

# Run the full chat application example
pnpm run dev:chat
```

---

## Architecture rules

IOServer enforces a strict five-component model. Follow these rules when writing code or reviewing PRs.

### Component separation

| Component | Responsibilities | Must NOT |
|---|---|---|
| **Manager** | Hold shared state; interact with external services; expose a typed public API | Handle HTTP/WS connections; know about sockets |
| **Service** | Handle Socket.IO events; access managers via `appHandle`; emit/broadcast to clients | Directly call Fastify; import HTTP libraries |
| **Controller** | Handle Fastify requests; access managers via `appHandle`; return responses | Hold persistent in-request state; access Socket.IO sockets |
| **Watcher** | Run periodic background tasks; access managers; push WS events via `appHandle.send` | Handle HTTP/WS client connections directly |
| **Middleware** | Intercept requests/connections; read from managers; set request/socket properties | Hold state between requests |

### Registration order

Managers **must** be registered before any component that reads from them:

```typescript
// ✅ Correct — db is available in appHandle when ChatService is instantiated
server.addManager({ name: "db", manager: DatabaseManager });
server.addService({ name: "chat", service: ChatService });

// ❌ Wrong — appHandle.db is undefined when ChatService constructor runs
server.addService({ name: "chat", service: ChatService });
server.addManager({ name: "db", manager: DatabaseManager });
```

### TypeScript requirements

- `"strict": true` — no exceptions
- Avoid `any` in public method signatures. Use `unknown` + type-guards, or define proper interfaces
- Exception: `socket: any` and `data: any` in service methods are acceptable because Socket.IO payloads are inherently untyped at the transport level
- Watcher interval IDs: use `ReturnType<typeof setInterval>` (not `NodeJS.Timeout`) for portability
- All manager public methods must have explicit return types
- Route handler method signatures should accept `FastifyRequest` / `FastifyReply` where types are available

### Naming conventions

| Element | Convention | Reason |
|---|---|---|
| Manager name in `addManager` | camelCase (e.g. `sessionManager`) | Becomes a property on `appHandle` |
| Private service methods | `_methodName` prefix | Prevents automatic Socket.IO event registration |
| Route files | Match controller `name` exactly | IOServer reads `{routesPath}/{name}.json` |
| Watcher interval tracking | `private intervals: ...[] = []` | Enables clean `stop()` |

---

## Test suite

### Structure

```
tests/
├── setup.ts                            # Global config — timeouts, console suppression
├── unit/
│   ├── IOServer.test.ts               # Init, registration, errors, logging, duplicates
│   ├── IOServer.static.test.ts        # rootDir / spaFallback
│   ├── BaseClasses.test.ts            # All five base class instantiation and methods
│   └── IOServerError.test.ts          # Error creation, statusCode, instanceof chain
├── integration/
│   └── IOServer.integration.test.ts   # HTTP routes via supertest, WS connect/emit, CORS, 404
├── e2e/
│   └── chat-app.e2e.test.ts          # Full chat app: login, messaging, rooms, HTTP endpoints
└── performance/
    └── performance.test.ts            # 50 concurrent conns, rapid messages, memory leak < 20 MB
```

### Running tests

```bash
pnpm test                       # all tests
pnpm run test:unit              # unit tests only
pnpm run test:integration       # integration tests only
pnpm run test:e2e               # end-to-end tests only
pnpm run test:performance       # performance tests
pnpm run test:coverage          # coverage report
pnpm run test:watch             # watch mode (development)
```

### Coverage targets

| Metric | Target |
|---|---|
| Statements | > 90% |
| Branches | > 85% |
| Functions | > 95% |
| Lines | > 90% |

### Writing tests

- **Unit tests** must not bind to real ports — mock or use component-level isolation
- **Integration tests** bind to ports 3001–3020 (avoid conflicts with other test suites)
- **E2E tests** use port 3004
- **Performance tests** use port 3005
- Each test file **must** close its server in `afterAll` / `afterEach` to avoid port leaks between test runs
- Use the global `setup.ts` for shared teardown logic

---

## Linting

```bash
pnpm run lint        # report issues
pnpm run lint:fix    # auto-fix where possible
```

Configuration is in `eslint.config.js`. Lint warnings must not accumulate — resolve them before opening a PR.

---

## Commit conventions

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add BaseService._onConnect lifecycle hook
fix: handle missing callback in service error path
docs: update BaseMiddleware WebSocket example
test: add integration test for SPA fallback
refactor: extract route prefix logic to helper
perf: reduce prototype chain traversal in dumpMethods
chore: bump fastify to 5.8
ci: fix checkout action version
```

Types: `feat`, `fix`, `docs`, `test`, `refactor`, `perf`, `chore`, `ci`.

Breaking changes: append `!` to the type/scope and add a `BREAKING CHANGE:` footer:

```
feat!: rename addWatcher name parameter to id

BREAKING CHANGE: The `name` field in WatcherOptions is now required and
renamed to `id` for consistency with other options.
```

---

## Pull requests

1. Fork the repository and create a feature branch from `main` (e.g. `feat/my-feature`)
2. Write or update tests for your change
3. Ensure `pnpm test` passes (all four test suites)
4. Ensure `pnpm run build` produces no TypeScript errors
5. Open a PR against `main` — the CI pipeline (`build.yml`) runs automatically on every PR
6. Address review comments; squash merge when approved

---

## Release process

Releases are cut by maintainers only:

1. Update `version` in `package.json`
2. Commit and push: `git commit -m "chore: release vX.Y.Z"`
3. Create a **GitHub Release** named `vX.Y.Z` — this triggers the `publish.yml` workflow
4. The workflow automatically:
   - Builds and tests the package
   - Publishes to [npm](https://www.npmjs.com/package/ioserver)
   - Publishes to [GitHub Packages](https://github.com/x42en/IOServer/packages)

Pre-releases: release names containing `-` (e.g. `v3.0.0-beta.1`) are automatically marked as pre-release on GitHub.
