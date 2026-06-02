# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.2.0] — 2026-06-02

### Security

- **Error masking** — the Fastify HTTP error handler and the Socket.IO event
  dispatcher no longer leak internal error details to clients. Any error that
  is **not** an `IOServerError` (and carries no explicit `.status`) is logged
  server-side (log level 3) and returned to the client as a generic
  `500 Internal Server Error`. Throw an `IOServerError` to surface a specific
  message and status code intentionally. This prevents stack traces, database
  driver messages, and file paths from reaching API consumers.

### Changed

- Dependency updates: Fastify 5.8.5, `@fastify/cors` 11, `@fastify/static`
  9.1.3, Jest 30, ESLint 10, `@types/node` 25, `@typescript-eslint` 8.60,
  TypeDoc 0.28. Added a `pnpm-workspace.yaml` (pnpm v11 `allowBuilds`).

## [2.1.2] — 2026-04-12

### Changed

- Migrated the documentation to a Nuxt/Docus site (`docs-site/`).
- Rewrote the README with a cleaner format and component examples.
- CI maintenance and routine dependency bumps (Fastify 5.8, socket.io-parser
  4.2.6, and others).

## [2.1.1] — 2026-02-26

### Fixed

- Upgraded GitHub Actions workflow actions.

## [2.1.0] — 2026-02-25

### Added

- Static file serving via `@fastify/static`.

### Changed

- Routine dependency synchronisation and bumps.

## [2.0.0] — 2025-06-08

### Added

- Full TypeScript rewrite of the framework: modular architecture with
  Services, Controllers, Managers, Watchers, and Middlewares; Fastify 5 +
  Socket.IO 4 integration; structured `IOServerError`; typed `AppHandle`.

> Releases prior to 2.0.0 are documented in the
> [Git history](https://github.com/x42en/IOServer/releases).

[Unreleased]: https://github.com/x42en/IOServer/compare/v2.2.0...HEAD
[2.2.0]: https://github.com/x42en/IOServer/compare/v2.1.2...v2.2.0
[2.1.2]: https://github.com/x42en/IOServer/compare/v2.1.1...v2.1.2
[2.1.1]: https://github.com/x42en/IOServer/compare/v2.1.0...v2.1.1
[2.1.0]: https://github.com/x42en/IOServer/compare/v2.0.6...v2.1.0
[2.0.0]: https://github.com/x42en/IOServer/releases/tag/v2.0.0
