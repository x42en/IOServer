# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.3.0] — 2026-11-04

### Changed

- Dependency pass: Fastify 5.12.8, `@fastify/cors` 11.4.0,
  `@fastify/sensible` 6.0.7, `@fastify/static` 10.1.10, Socket.IO 4.8.4,
  Jest 30.5.2, ts-jest 29.4.15, ESLint 10.14.0, `@typescript-eslint` 8.72.1,
  TypeDoc 0.28.20 and Prettier 3.9.10.
- TypeScript 6.0.3: the build now uses `module`/`moduleResolution: node16`
  (the `node10` resolver is deprecated). `isolatedModules` is enabled and Jest
  globals are declared explicitly for ts-jest.
- Node.js floor raised to 22; pnpm pinned at 12.9.1.
- Added `AGENTS.md` aligned with the auth-service / auth-ai implementation
  contract.
- Documentation site dependencies updated to Docus 5.15, Nuxt 4.6.4 and
  better-sqlite3 12.11.1, with npm overrides for `zod`, `minimatch`, `glob` and
  `esbuild`.

### Security

- Cleared every high and moderate advisory reachable from this repository with
  `pnpm-workspace.yaml` overrides: `brace-expansion`, `engine.io`, `fast-uri`,
  `form-data`, `socket.io-parser`, `ws`, `js-yaml`, `glob`, `minimatch`,
  `markdown-it`, `qs`, `browserslist` and `baseline-browser-mapping`.
- `@fastify/static` raised to 10.1.10, which fixes the route-guard bypass
  (GHSA-83w8-p2f5-377r) and non-canonical path bypass. Its ESM-only
  `content-disposition` 3.x dependency is overridden to the CommonJS 2.0.1
  release, which exposes the same `create()` API and keeps the CJS build and
  Jest path working.
- One low advisory remains in the package tree: `deepmerge` 4.3.1 in Jest's
  configuration path has no patched release. It is dev-only, not shipped in
  `dist/`, and never receives untrusted runtime input. Revisit when Jest updates
  the dependency or a patched release exists; remove the exception then.
- The documentation site (`docs-site/`, npm) reports only low advisories in its
  build toolchain (`deepmerge` and transitive Nuxt modules). It is a separate
  private package, never published, and never handles untrusted input. Revisit
  with the next Docus/Nuxt upgrade.

## [2.2.1] — 2026-10-04

### Security

- **Dependency advisory floors raised** — `fastify` `^5.8.5` → `^5.12.5`
  (GHSA-w2qp-rph6-63g4, GHSA-9q9j-q6p8-xq58, GHSA-hwr6-493r-vm6h,
  GHSA-667r-xxjv-c9mm, GHSA-4mh8-r7rc-xpvc / CVE-2026-92081) and
  `@fastify/static` `^9.1.3` → `>=10.1.2 <10.1.4` (GHSA-x428-ghpx-8j92,
  GHSA-pr96-94w5-mx2h, GHSA-83w8-p2f5-377r, GHSA-8pvw-jcv7-9cmj), with the
  pnpm lockfile refreshed. This clears the 94 Dependabot alerts that the two
  committed lockfiles carried. `@fastify/static` stays capped below 10.1.4
  because 10.1.4+ depends on `content-disposition@3`, which is ESM-only and
  requires Node ≥ 22, while this package is CommonJS and declares Node ≥ 20.

### Changed

- **pnpm 12** — `packageManager` is now `pnpm@12.9.1` and the lockfile is
  regenerated so the pin is recorded inside it. No resolved dependency
  version changed.
- **CI** — GitHub Actions bumped: `actions/checkout` v4→v7 (v5→v7 in
  `docs.yml`), `pnpm/action-setup` v4→v6, `actions/setup-node` v4→v7,
  `actions/upload-artifact` v4→v7 and `actions/download-artifact` v4→v8.
  `pnpm/action-setup` v6 is required: v4/v5 cannot install pnpm 12.
- **CI** — `build.yml` now runs on pull requests toward `develop` and on
  pushes to `main`/`develop`. It previously only ran on pull requests toward
  `main`, so no PR touching the work branch and nothing after a merge into
  the production branch was ever verified.
- **CI** — the lint step is blocking again in `build.yml` and `publish.yml`
  (`continue-on-error` removed).
- **Chore** — the vestigial `package-lock.json` is no longer in the tree;
  `pnpm-lock.yaml` is the single committed lockfile.

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

[Unreleased]: https://github.com/x42en/IOServer/compare/v2.3.0...HEAD
[2.3.0]: https://github.com/x42en/IOServer/compare/v2.2.1...v2.3.0
[2.2.1]: https://github.com/x42en/IOServer/compare/v2.2.0...v2.2.1
[2.2.0]: https://github.com/x42en/IOServer/compare/v2.1.2...v2.2.0
[2.1.2]: https://github.com/x42en/IOServer/compare/v2.1.1...v2.1.2
[2.1.1]: https://github.com/x42en/IOServer/compare/v2.1.0...v2.1.1
[2.1.0]: https://github.com/x42en/IOServer/compare/v2.0.6...v2.1.0
[2.0.0]: https://github.com/x42en/IOServer/releases/tag/v2.0.0
