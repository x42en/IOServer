/**
 * @file IOServer.static.test.ts
 * @description Tests for the static file serving feature introduced in v2.1.0.
 *
 * Covered scenarios:
 *  - Constructor behaviour with rootDir (existing / non-existent / absent)
 *  - HTTP serving of static files (root, nested, correct Content-Type)
 *  - SPA fallback (spaFallback: true  → index.html on unknown routes)
 *  - No SPA fallback (spaFallback: false → 404 JSON on unknown routes)
 *  - API routes have priority over static files
 *  - Server without rootDir keeps its normal 404 JSON behaviour
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { IOServer } from '../../src/IOServer';
import { BaseController } from '../../src';

const supertest = require('supertest');

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Creates a temporary directory tree with static assets used by the tests. */
function createStaticFixtures(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ioserver-static-'));

  // / index.html — the SPA entry point
  fs.writeFileSync(
    path.join(root, 'index.html'),
    '<!doctype html><html><head><title>SPA</title></head><body><div id="app"></div></body></html>',
    'utf8'
  );

  // /assets/app.js — simulated bundled asset
  const assetsDir = path.join(root, 'assets');
  fs.mkdirSync(assetsDir);
  fs.writeFileSync(
    path.join(assetsDir, 'app.js'),
    'console.log("app");',
    'utf8'
  );

  // /assets/style.css
  fs.writeFileSync(
    path.join(assetsDir, 'style.css'),
    'body { margin: 0; }',
    'utf8'
  );

  // /favicon.ico — minimal 0-byte placeholder
  fs.writeFileSync(path.join(root, 'favicon.ico'), '', 'utf8');

  return root;
}

/** Recursively removes a temporary directory. */
function removeStaticFixtures(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

// ── Shared fixtures ──────────────────────────────────────────────────────────

let staticDir: string;

beforeAll(() => {
  staticDir = createStaticFixtures();
});

afterAll(() => {
  removeStaticFixtures(staticDir);
});

// ── Test suites ──────────────────────────────────────────────────────────────

describe('IOServer — Static file serving', () => {
  // ── 1. Constructor / instanciation ─────────────────────────────────────────
  describe('Constructor behaviour', () => {
    it('accepts a valid rootDir without throwing', () => {
      expect(
        () =>
          new IOServer({
            port: 3010,
            rootDir: staticDir,
          })
      ).not.toThrow();
    });

    it('does not throw when rootDir does not exist — just disables static serving', () => {
      const warn = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(
        () =>
          new IOServer({
            port: 3011,
            rootDir: '/this/path/does/not/exist-ioserver-test',
          })
      ).not.toThrow();

      warn.mockRestore();
    });

    it('creates server normally when rootDir is omitted', () => {
      const server = new IOServer({ port: 3012 });
      expect(server).toBeInstanceOf(IOServer);
    });

    it('exposes getApp() regardless of rootDir', () => {
      const server = new IOServer({ port: 3013, rootDir: staticDir });
      expect(server.getApp()).toBeDefined();
    });
  });

  // ── 2. HTTP serving of static files ────────────────────────────────────────
  describe('HTTP — serving static assets (spaFallback: true, default)', () => {
    let server: IOServer;
    const PORT = 3020;

    beforeAll(async () => {
      server = new IOServer({
        host: 'localhost',
        port: PORT,
        verbose: 'ERROR',
        routes: './tests/routes',
        rootDir: staticDir,
        // spaFallback defaults to true
      });
      await server.start();
    });

    afterAll(async () => {
      await server.stop();
    });

    it('serves index.html at /', async () => {
      const res = await supertest(`http://localhost:${PORT}`)
        .get('/')
        .expect(200);

      expect(res.headers['content-type']).toMatch(/text\/html/);
      expect(res.text).toContain('<div id="app">');
    });

    it('serves index.html at /index.html explicitly', async () => {
      const res = await supertest(`http://localhost:${PORT}`)
        .get('/index.html')
        .expect(200);

      expect(res.text).toContain('<div id="app">');
    });

    it('serves a nested JS asset with the correct Content-Type', async () => {
      const res = await supertest(`http://localhost:${PORT}`)
        .get('/assets/app.js')
        .expect(200);

      expect(res.headers['content-type']).toMatch(/javascript/);
      expect(res.text).toContain('console.log');
    });

    it('serves a nested CSS asset with the correct Content-Type', async () => {
      const res = await supertest(`http://localhost:${PORT}`)
        .get('/assets/style.css')
        .expect(200);

      expect(res.headers['content-type']).toMatch(/css/);
      expect(res.text).toContain('margin');
    });

    it('serves favicon.ico', async () => {
      await supertest(`http://localhost:${PORT}`)
        .get('/favicon.ico')
        .expect(200);
    });
  });

  // ── 3. SPA fallback enabled (default) ──────────────────────────────────────
  describe('SPA fallback — spaFallback: true (default)', () => {
    let server: IOServer;
    const PORT = 3021;

    beforeAll(async () => {
      server = new IOServer({
        host: 'localhost',
        port: PORT,
        verbose: 'ERROR',
        routes: './tests/routes',
        rootDir: staticDir,
        spaFallback: true,
      });
      await server.start();
    });

    afterAll(async () => {
      await server.stop();
    });

    it('returns index.html (200) for an unknown deep route', async () => {
      const res = await supertest(`http://localhost:${PORT}`)
        .get('/settings/profile')
        .expect(200);

      expect(res.headers['content-type']).toMatch(/text\/html/);
      expect(res.text).toContain('<div id="app">');
    });

    it('returns index.html for any unknown route at root level', async () => {
      const res = await supertest(`http://localhost:${PORT}`)
        .get('/about')
        .expect(200);

      expect(res.text).toContain('<div id="app">');
    });
  });

  // ── 4. SPA fallback disabled ───────────────────────────────────────────────
  describe('SPA fallback — spaFallback: false', () => {
    let server: IOServer;
    const PORT = 3022;

    beforeAll(async () => {
      server = new IOServer({
        host: 'localhost',
        port: PORT,
        verbose: 'ERROR',
        routes: './tests/routes',
        rootDir: staticDir,
        spaFallback: false,
      });
      await server.start();
    });

    afterAll(async () => {
      await server.stop();
    });

    it('returns 404 JSON for an unknown route', async () => {
      const res = await supertest(`http://localhost:${PORT}`)
        .get('/does-not-exist')
        .expect(404);

      expect(res.body).toHaveProperty('statusCode', 404);
      expect(res.body).toHaveProperty('error', 'Not Found');
    });

    it('still serves existing static files normally', async () => {
      const res = await supertest(`http://localhost:${PORT}`)
        .get('/assets/app.js')
        .expect(200);

      expect(res.headers['content-type']).toMatch(/javascript/);
    });
  });

  // ── 5. API routes have priority over static files ──────────────────────────
  describe('API route priority over static assets', () => {
    let server: IOServer;
    const PORT = 3023;

    class ApiController extends BaseController {
      async getStatus(request: any, reply: any): Promise<void> {
        reply.send({ source: 'api', ok: true });
      }

      async postData(request: any, reply: any): Promise<void> {
        reply.send({ received: request.body });
      }
    }

    beforeAll(async () => {
      server = new IOServer({
        host: 'localhost',
        port: PORT,
        verbose: 'ERROR',
        routes: './tests/routes',
        rootDir: staticDir,
        spaFallback: true,
      });

      server.addController({
        name: 'api',
        controller: ApiController,
        prefix: '/api',
      });

      await server.start();
    });

    afterAll(async () => {
      await server.stop();
    });

    it('returns JSON from the controller at /api/status', async () => {
      const res = await supertest(`http://localhost:${PORT}`)
        .get('/api/status')
        .expect(200);

      expect(res.body).toEqual({ source: 'api', ok: true });
      // Must NOT be the HTML index
      expect(res.headers['content-type']).toMatch(/json/);
    });

    it('still serves static files alongside API routes', async () => {
      const res = await supertest(`http://localhost:${PORT}`)
        .get('/assets/app.js')
        .expect(200);

      expect(res.headers['content-type']).toMatch(/javascript/);
    });

    it('SPA fallback does not intercept API routes (returns JSON, not HTML)', async () => {
      const res = await supertest(`http://localhost:${PORT}`)
        .get('/api/status')
        .expect(200);

      expect(res.headers['content-type']).not.toMatch(/text\/html/);
    });
  });

  // ── 6. Server without rootDir preserves default 404 behaviour ─────────────
  describe('No rootDir — standard 404 behaviour preserved', () => {
    let server: IOServer;
    const PORT = 3024;

    beforeAll(async () => {
      server = new IOServer({
        host: 'localhost',
        port: PORT,
        verbose: 'ERROR',
        routes: './tests/routes',
        // rootDir intentionally omitted
      });
      await server.start();
    });

    afterAll(async () => {
      await server.stop();
    });

    it('returns 404 JSON for unknown routes when no rootDir is set', async () => {
      const res = await supertest(`http://localhost:${PORT}`)
        .get('/some/unknown/path')
        .expect(404);

      expect(res.body).toHaveProperty('statusCode', 404);
      expect(res.body).toHaveProperty('error', 'Not Found');
      expect(res.headers['content-type']).toMatch(/json/);
    });
  });
});
