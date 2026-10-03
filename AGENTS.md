# AGENTS.md — x42en/IOServer

## Project identity

- Repository: x42en/IOServer
- Type: TypeScript/Node.js — Damn simple Fastify & Socket.io server framework with TypeScript support
- Production branch: main (protected)
- Work branch: develop
- Package manager: pnpm
- Runtime: Node.js >= 20
- TypeScript: >= 5.0, strict mode
- License: Apache-2.0

## Engineering profiles

- typescript

## Branch model

- main: production branch, protected. No direct pushes. Release commits land here.
- develop: active development branch. All work PRs target develop.

## Quality gates

Run all of these before requesting merge. A change is not complete while any gate is red.

- Type checking: tsc (npm run build)
- Linting: ESLint (npm run lint)
- Tests: Jest (npm test)
- Formatting: Prettier (configured via .prettierrc)

Prefer the commands that CI actually executes. CI workflow build.yml runs: pnpm install, pnpm run lint (continue-on-error), pnpm run build, pnpm test.

## Development workflow

1. Branch from develop.
2. Implement change with focused responsibilities.
3. Add or update tests for behavior changes.
4. Run all quality gates locally.
5. Open a PR targeting develop with a clear title and description.
6. State the active engineering profiles and exact gates executed in the PR description.

## Code standards

### File size

- Target: 500 lines or fewer per file.
- Hard ceiling: 1000 lines unless repository rules are stricter or a documented exception exists.

### Error handling

- Fail loudly and early. Do not mask invalid state.
- Preserve explicit error handling and diagnostic context.
- Do not convert failures into silent success or fallback behavior.
- Validate untrusted values at trust boundaries.

### Safety

- Do not weaken type checking, linting, or tests merely to land a change.
- Never introduce dead code, commented-out code, or speculative compatibility shims.
- Keep secrets out of source, logs, patches, artifacts, and test output.

### Exception documentation

An exception to any rule must be documented in the same change with:
- Reason
- Risk/impact
- Mitigation
- Rejected alternatives
- Removal or revisit condition

Compatibility work is an exception, not a default.

## Architecture (five-component model)

IOServer enforces a strict five-component model. Follow these rules when writing code or reviewing PRs.

### Component separation

| Component | Responsibilities | Must NOT |
|---|---|---|
| Manager | Hold shared state; interact with external services; expose a typed public API | Handle HTTP/WS connections; know about sockets |
| Service | Handle Socket.IO events; access managers via appHandle; emit/broadcast to clients | Directly call Fastify; import HTTP libraries |
| Controller | Handle Fastify requests; access managers via appHandle; return responses | Hold persistent in-request state; access Socket.IO sockets |
| Watcher | Run periodic background tasks; access managers; push WS events via appHandle.send | Handle HTTP/WS client connections directly |
| Middleware | Intercept requests/connections; read from managers; set request/socket properties | Hold state between requests |

### Registration order

Managers must be registered before any component that reads from them.

### TypeScript requirements

- strict: true — no exceptions
- Avoid any in public method signatures. Use unknown + type-guards, or define proper interfaces
- Exception: socket: any and data: any in service methods are acceptable because Socket.IO payloads are inherently untyped at the transport level
- Watcher interval IDs: use ReturnType<typeof setInterval> (not NodeJS.Timeout) for portability
- All manager public methods must have explicit return types
- Route handler method signatures should accept FastifyRequest / FastifyReply where types are available

### Naming conventions

| Element | Convention | Reason |
|---|---|---|
| Manager name in addManager | camelCase (e.g. sessionManager) | Becomes a property on appHandle |
| Private service methods | _methodName prefix | Prevents automatic Socket.IO event registration |
| Route files | Match controller name exactly | IOServer reads {routesPath}/{name}.json |
| Watcher interval tracking | private intervals: ...[] = [] | Enables clean stop() |

## Test suite

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

### Coverage targets

| Metric | Target |
|---|---|
| Statements | > 90% |
| Branches | > 85% |
| Functions | > 95% |
| Lines | > 90% |

### Writing tests

- Unit tests must not bind to real ports — mock or use component-level isolation
- Integration tests bind to ports 3001–3020 (avoid conflicts with other test suites)
- E2E tests use port 3004
- Performance tests use port 3005
- Each test file must close its server in afterAll / afterEach to avoid port leaks between test runs
- Use the global setup.ts for shared teardown logic

## Commit conventions

Use Conventional Commits (https://www.conventionalcommits.org/).

Types: feat, fix, docs, test, refactor, perf, chore, ci.

Breaking changes: append ! to the type/scope and add a BREAKING CHANGE: footer.

## Release process

Releases are cut by maintainers only:

1. Update version in package.json
2. Commit and push: git commit -m "chore: release vX.Y.Z"
3. Create a GitHub Release named vX.Y.Z — this triggers the publish.yml workflow
4. The workflow automatically builds, tests, and publishes to npm and GitHub Packages

Pre-releases: release names containing - (e.g. v3.0.0-beta.1) are automatically marked as pre-release on GitHub.

## Project structure

- src/ — TypeScript source code
- dist/ — build output (generated, not checked in)
- tests/ — test suite
- examples/ — example applications
- docs/ — Sphinx documentation source
- docs-site/ — static documentation site
- build/ — build configuration
- scripts/ — utility scripts
- package.json — project configuration, dependencies
- pnpm-lock.yaml — pnpm dependency lockfile
- tsconfig.json — TypeScript configuration
- jest.config.js — Jest configuration
- eslint.config.js — ESLint configuration
- typedoc.json — TypeDoc API documentation configuration

## Delivery gates

Before requesting merge, verify:

1. Repository-specific rules from AGENTS.md and nested context have been followed.
2. Deterministic compile/typecheck/lint/static-analysis/test/build gates have been run.
3. Tests cover behavior changes.
4. Documentation and changelog are updated for user-visible changes.
5. All required local gates that can be reproduced have been executed.
6. Required CI gates are green.
7. Breaking behavior has explicit versioning/migration treatment consistent with the project.

## Historical context files consulted

- README.md
- package.json
- tsconfig.json
- CONTRIBUTING.md
- .github/workflows/build.yml
