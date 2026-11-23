import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import supertest from 'supertest';
import { io, Socket } from 'socket.io-client';
import {
  IOServer,
  BaseController,
  BaseManager,
  BaseService,
  IOServerError,
} from '../../src';
import { validateLogLevel } from '../../src/config';

const ROUTES = './tests/routes';

class ApiController extends BaseController {
  async getStatus(_request: any, reply: any): Promise<void> {
    reply.send({ status: 'OK' });
  }

  async postData(request: any, reply: any): Promise<void> {
    reply.send({ received: request.body });
  }
}

function withStatus(fn: () => void): any {
  try {
    fn();
  } catch (error) {
    return error;
  }
  throw new Error('Expected the operation to throw');
}

describe('IOServer security hardening', () => {
  const clients: Socket[] = [];

  afterEach(() => {
    clients.forEach(client => client.close());
    clients.length = 0;
  });

  describe('Configuration validation', () => {
    it('rejects an invalid transport mode instead of silently re-enabling polling', () => {
      const error = withStatus(
        () => new IOServer({ mode: 'websockets' as any })
      );
      expect(error).toBeInstanceOf(IOServerError);
      expect(error.statusCode).toBe(400);
    });

    it('rejects an invalid log level', () => {
      const error = withStatus(() => new IOServer({ verbose: 'LOUD' }));
      expect(error).toBeInstanceOf(IOServerError);
      expect(error.statusCode).toBe(400);
    });

    it.each([
      ['emerg', 'EMERGENCY'],
      ['crit', 'CRITICAL'],
      ['err', 'ERROR'],
      ['warn', 'WARNING'],
      ['notice', 'NOTIFICATION'],
      ['info', 'INFORMATION'],
      ['DEBUG', 'DEBUG'],
    ] as const)('maps log level %s to %s', (input, expected) => {
      expect(validateLogLevel(input)).toBe(expected);
    });

    it('accepts INFO through the IOServer constructor', () => {
      expect(
        () => new IOServer({ verbose: 'INFO', routes: ROUTES })
      ).not.toThrow();
    });

    it('rejects a routes directory that does not exist', () => {
      const error = withStatus(
        () => new IOServer({ routes: '/does/not/exist/routes' })
      );
      expect(error).toBeInstanceOf(IOServerError);
      expect(error.statusCode).toBe(400);
    });

    it('rejects wildcard CORS origins combined with credentials', () => {
      const error = withStatus(
        () => new IOServer({ cors: { origin: '*', credentials: true } })
      );
      expect(error).toBeInstanceOf(IOServerError);
      expect(error.statusCode).toBe(400);
    });
  });

  describe('Registration names and status codes', () => {
    class Manager extends BaseManager {}

    it('preserves 409 for duplicate components and 400 for invalid names', () => {
      const server = new IOServer({ port: 3031, routes: ROUTES });
      server.addManager({ name: 'safeManager', manager: Manager });

      const duplicate = withStatus(() =>
        server.addManager({ name: 'safeManager', manager: Manager })
      );
      expect(duplicate.statusCode).toBe(409);

      const tooShort = withStatus(() =>
        server.addManager({ name: 'x', manager: Manager })
      );
      expect(tooShort.statusCode).toBe(400);
    });

    it('rejects prototype-polluting manager names and keeps AppHandle clean', () => {
      let appHandle: any;
      class CaptureManager extends BaseManager {
        constructor(handle: any) {
          super(handle);
          appHandle = handle;
        }
      }

      const server = new IOServer({ port: 3031, routes: ROUTES });
      server.addManager({ name: 'capture', manager: CaptureManager });

      expect(Object.getPrototypeOf(appHandle)).toBe(Object.prototype);
      expect(Object.prototype.hasOwnProperty.call(appHandle, 'capture')).toBe(
        true
      );

      for (const name of ['__proto__', 'constructor', 'toString']) {
        const error = withStatus(() =>
          server.addManager({ name, manager: Manager })
        );
        expect(error.statusCode).toBe(400);
      }

      expect(Object.getPrototypeOf(appHandle)).toBe(Object.prototype);
    });
  });

  describe('Programming errors fail loud', () => {
    it('throws when a route references a missing controller handler', () => {
      const routesDir = fs.mkdtempSync(
        path.join(os.tmpdir(), 'ioserver-routes-')
      );
      fs.writeFileSync(
        path.join(routesDir, 'broken.json'),
        JSON.stringify([
          { method: 'GET', url: '/broken', handler: 'missingHandler' },
        ])
      );

      try {
        const server = new IOServer({ port: 3031, routes: routesDir });
        const error = withStatus(() =>
          server.addController({ name: 'broken', controller: ApiController })
        );

        expect(error).toBeInstanceOf(IOServerError);
        expect(error.statusCode).toBe(500);
        expect(error.message).toContain('missingHandler');
      } finally {
        fs.rmSync(routesDir, { recursive: true, force: true });
      }
    });
  });

  describe('HTTP stack', () => {
    let server: IOServer;
    let staticDir: string;
    const port = 3032;
    const baseUrl = `http://localhost:${port}`;

    beforeAll(async () => {
      staticDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ioserver-static-'));
      fs.writeFileSync(path.join(staticDir, 'index.html'), '<html>spa</html>');
      fs.writeFileSync(path.join(staticDir, '.env'), 'SECRET=value');

      server = new IOServer({
        host: 'localhost',
        port,
        routes: ROUTES,
        rootDir: staticDir,
        spaFallback: true,
        bodyLimit: 100,
      });
      server.addController({ name: 'api', controller: ApiController });
      await server.start();
    });

    afterAll(async () => {
      await server.stop();
      fs.rmSync(staticDir, { recursive: true, force: true });
    });

    it('does not serve dotfiles', async () => {
      await supertest(baseUrl).get('/.env').expect(404);
    });

    it('serves index.html for GET but not for POST on unknown routes', async () => {
      const getResponse = await supertest(baseUrl).get('/unknown').expect(200);
      expect(getResponse.headers['content-type']).toMatch(/text\/html/);

      await supertest(baseUrl).post('/unknown').expect(404);
    });

    it('returns 400 for malformed JSON without leaking parser details', async () => {
      const response = await supertest(baseUrl)
        .post('/api/data')
        .set('Content-Type', 'application/json')
        .send('{not json')
        .expect(400);

      expect(response.body).toEqual({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Bad Request',
      });
    });

    it('returns 413 for bodies larger than the configured limit', async () => {
      await supertest(baseUrl)
        .post('/api/data')
        .send({ payload: 'x'.repeat(500) })
        .expect(413);
    });

    it('reports a missing socket id as a failed send', async () => {
      expect(
        server.sendTo({ event: 'test', data: {}, sid: 'missing-socket' })
      ).toBe(false);
    });
  });

  describe('Shutdown', () => {
    class ShutdownService extends BaseService {
      async ping(): Promise<void> {
        return;
      }
    }

    it('closes active Socket.IO clients instead of hanging', async () => {
      const port = 3033;
      const server = new IOServer({
        host: 'localhost',
        port,
        routes: ROUTES,
      });
      server.addService({ name: 'shutdown', service: ShutdownService });
      await server.start();

      const client = io(`http://localhost:${port}/shutdown`, {
        transports: ['websocket'],
      });
      clients.push(client);
      await new Promise<void>((resolve, reject) => {
        client.on('connect', () => resolve());
        client.on('connect_error', reject);
      });

      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error('stop() timed out')),
          4000
        );
        server
          .stop()
          .then(() => {
            clearTimeout(timer);
            resolve();
          })
          .catch(reject);
      });

      if (client.connected) {
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(
            () => reject(new Error('client was not disconnected')),
            2000
          );
          client.once('disconnect', () => {
            clearTimeout(timer);
            resolve();
          });
        });
      }
      expect(client.connected).toBe(false);
    });
  });

  describe('Service event surface', () => {
    class SurfaceService extends BaseService {
      async publicEvent(
        _socket: any,
        _data: any,
        callback?: (response: any) => void
      ): Promise<void> {
        if (callback) callback({ status: 'success', event: 'publicEvent' });
      }

      async allowedEvent(
        _socket: any,
        _data: any,
        callback?: (response: any) => void
      ): Promise<void> {
        if (callback) callback({ status: 'success', event: 'allowedEvent' });
      }

      async _privateEvent(
        _socket: any,
        _data: any,
        callback?: (response: any) => void
      ): Promise<void> {
        if (callback) callback({ status: 'success' });
      }

      async throwString(): Promise<void> {
        throw 'sensitive internal detail';
      }
    }

    function emitWithTimeout(
      client: Socket,
      event: string,
      data: unknown
    ): Promise<any> {
      return new Promise(resolve => {
        client.timeout(300).emit(event, data, (error: any, response: any) => {
          resolve(error || response);
        });
      });
    }

    it('does not expose underscore-prefixed internal methods', async () => {
      const port = 3034;
      const server = new IOServer({ host: 'localhost', port, routes: ROUTES });
      server.addService({ name: 'surface', service: SurfaceService });
      await server.start();

      const client = io(`http://localhost:${port}/surface`, {
        transports: ['websocket'],
      });
      clients.push(client);
      await new Promise<void>((resolve, reject) => {
        client.on('connect', () => resolve());
        client.on('connect_error', reject);
      });

      const privateResult = await emitWithTimeout(client, '_privateEvent', {});
      expect(privateResult).toBeInstanceOf(Error);

      const publicResult = await emitWithTimeout(client, 'publicEvent', {});
      expect(publicResult).toEqual({
        status: 'success',
        event: 'publicEvent',
      });

      await server.stop();
    });

    it('honours an explicit event allowlist and masks thrown strings', async () => {
      const port = 3035;
      const server = new IOServer({ host: 'localhost', port, routes: ROUTES });
      server.addService({
        name: 'surface',
        service: SurfaceService,
        events: ['allowedEvent', 'throwString'],
      });
      await server.start();

      const client = io(`http://localhost:${port}/surface`, {
        transports: ['websocket'],
      });
      clients.push(client);
      await new Promise<void>((resolve, reject) => {
        client.on('connect', () => resolve());
        client.on('connect_error', reject);
      });

      const blocked = await emitWithTimeout(client, 'publicEvent', {});
      expect(blocked).toBeInstanceOf(Error);

      const allowed = await emitWithTimeout(client, 'allowedEvent', {});
      expect(allowed).toEqual({
        status: 'success',
        event: 'allowedEvent',
      });

      const thrown = await emitWithTimeout(client, 'throwString', {});
      expect(thrown).toEqual({
        status: 'error',
        type: 'Error',
        message: 'Internal Server Error',
        statusCode: 500,
      });

      await server.stop();
    });
  });
});
