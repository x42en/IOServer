/**
 * @fileoverview IOServer - A TypeScript framework for building real-time applications
 * with Socket.IO and Fastify integration. Provides modular architecture with
 * Services, Controllers, Managers, and Watchers.
 *
 * @author Ben Mz <0x42en@users.noreply.github.com>
 * @version 2.4.1
 * @since 1.0.0
 */

import * as fs from 'fs';
import * as path from 'path';
import fastify, { FastifyInstance, RouteOptions } from 'fastify';
import { Server as SocketIOServer } from 'socket.io';
import { IOServerError } from './IOServerError';
import {
  DEFAULT_HOST,
  DEFAULT_PORT,
  LOG_LEVELS,
  processCorsOptions,
  processTransportModes,
  resolveRootDir,
  resolveRoutesPath,
  validateLogLevel,
  validatePort,
  validatePositiveInteger,
} from './config';
import { dumpMethods, validateName } from './naming';
import { setupHttp } from './http';
import { createConnectionHandler, createSocketIOServer } from './socket';
import type {
  IOServerOptions,
  ServiceOptions,
  ControllerOptions,
  ManagerOptions,
  WatcherOptions,
  SendToOptions,
  AppHandle,
  LogLevel,
} from './types';

export type {
  IOServerOptions,
  ServiceOptions,
  ControllerOptions,
  ManagerOptions,
  WatcherOptions,
  SendToOptions,
  AppHandle,
  LogLevel,
  TransportMode,
} from './types';

// Extend Fastify instance to include Socket.IO
declare module 'fastify' {
  interface FastifyInstance {
    io: SocketIOServer;
  }
}

/**
 * Main IOServer class - A framework for building real-time applications
 *
 * Combines Fastify HTTP server with Socket.IO for WebSocket support,
 * providing a modular architecture with Services, Controllers, Managers, and Watchers.
 *
 * @example
 * ```typescript
 * const server = new IOServer({
 *   host: 'localhost',
 *   port: 3000,
 *   verbose: 'INFO'
 * });
 *
 * server.addService({ service: ChatService });
 * server.addController({ name: 'api', controller: ApiController });
 * await server.start();
 * ```
 */
export class IOServer {
  private static readonly VERSION = '2.4.1';

  private readonly host: string;
  private readonly port: number;
  private readonly verbose: LogLevel;
  private readonly routesPath: string;
  private readonly rootDir: string | undefined;
  private readonly spaFallback: boolean;
  private readonly webapp: FastifyInstance;
  private socketio!: SocketIOServer;
  private readonly appHandle: AppHandle;
  private socketReady!: Promise<void>;
  private socketSetupError: IOServerError | undefined;

  private readonly serviceLists: Map<string, any> = new Map();
  private readonly managerLists: Map<string, any> = new Map();
  private readonly methodLists: Map<string, string[]> = new Map();
  private readonly watcherLists: Map<string, any> = new Map();
  private readonly controllerLists: Map<string, any> = new Map();
  private readonly middlewareLists: Map<string, any[]> = new Map();

  /**
   * Creates a new IOServer instance
   * @param {IOServerOptions} options - Configuration options for the server
   */
  constructor(options: IOServerOptions = {}) {
    this.host = options.host || DEFAULT_HOST;
    this.port = validatePort(options.port ?? DEFAULT_PORT);
    this.verbose = validateLogLevel(options.verbose || 'ERROR');
    this.routesPath = resolveRoutesPath(options.routes);
    this.rootDir = resolveRootDir(options.rootDir, this.log.bind(this));
    this.spaFallback = options.spaFallback !== false;

    const transportModes = processTransportModes(options.mode);
    const corsOptions = processCorsOptions(options.cors, this.host);
    const cookieEnabled = Boolean(options.cookie);

    this.webapp = this.initializeFastify(options.bodyLimit, options.trustProxy);
    setupHttp(
      this.webapp,
      corsOptions,
      this.rootDir,
      this.spaFallback,
      this.log.bind(this)
    );
    this.socketReady = createSocketIOServer(
      this.webapp,
      transportModes,
      cookieEnabled,
      corsOptions,
      options.maxHttpBufferSize
    )
      .then(socketio => {
        this.socketio = socketio;
        this.log(6, '[*] Socket.IO server attached to HTTP server');
      })
      .catch((error: unknown) => {
        this.socketSetupError = new IOServerError(
          `Unable to setup Socket.IO: ${error}`,
          500
        );
      });

    this.appHandle = {
      send: this.sendTo.bind(this),
      log: this.log.bind(this),
      verbose: this.verbose,
    };
  }

  private initializeFastify(
    bodyLimit?: number,
    trustProxy?: boolean
  ): FastifyInstance {
    try {
      return fastify({
        logger: this.verbose === 'DEBUG',
        trustProxy: trustProxy ?? false,
        bodyLimit:
          bodyLimit === undefined
            ? undefined
            : validatePositiveInteger(bodyLimit, 'bodyLimit'),
        routerOptions: {
          ignoreTrailingSlash: true,
          maxParamLength: 200,
          caseSensitive: true,
        },
      });
    } catch (error) {
      if (error instanceof IOServerError) {
        throw error;
      }
      throw new IOServerError(`Unable to initialize server: ${error}`, 500);
    }
  }

  public log(level: number, text: string): void {
    const currentLevel = LOG_LEVELS.indexOf(this.verbose);

    if (level <= currentLevel) {
      if (level <= 4) {
        console.error(text);
      } else {
        console.log(text);
      }
    }
  }

  private registerInternalClass(
    type: string,
    name: string,
    ClassConstructor: new (appHandle: AppHandle) => any
  ): void {
    validateName(type, name);

    if (!ClassConstructor || !ClassConstructor.prototype) {
      throw new IOServerError('Must be a constructor function', 400);
    }

    const listMap = this.getListMap(type);
    if (listMap.has(name)) {
      throw new IOServerError(`Sorry this ${type} already exists`, 409);
    }

    try {
      this.log(7, `[*] Register ${type} ${name}`);
      const instance = new ClassConstructor(this.appHandle);
      listMap.set(name, instance);
      if (type === 'manager') {
        Object.defineProperty(this.appHandle, name, {
          value: instance,
          enumerable: true,
          configurable: true,
          writable: true,
        });
        if (typeof instance.start === 'function') {
          instance.start().catch((error: any) => {
            this.log(3, `[!] Error starting ${name} manager: ${error}`);
          });
        }
      }
    } catch (error) {
      if (error instanceof IOServerError) {
        throw error;
      }
      throw new IOServerError(`Error instantiating ${type}: ${error}`, 500);
    }
  }

  public isRegistered(type: string, name: string): boolean {
    if (!name) {
      throw new IOServerError('Name is mandatory', 400);
    }

    const listMap = this.getListMap(type);
    return listMap.has(name);
  }

  private getListMap(type: string): Map<string, any> {
    switch (type) {
      case 'service':
        return this.serviceLists;
      case 'manager':
        return this.managerLists;
      case 'watcher':
        return this.watcherLists;
      case 'controller':
        return this.controllerLists;
      default:
        throw new IOServerError(`Unknown type: ${type}`, 400);
    }
  }

  /**
   * Registers a watcher component for background tasks
   * @param {WatcherOptions} options - Watcher configuration options
   * @throws {IOServerError} When watcher instantiation fails
   */
  public addWatcher(options: WatcherOptions): void {
    try {
      this.registerInternalClass('watcher', options.name, options.watcher);
    } catch (error) {
      if (error instanceof IOServerError) {
        throw error;
      }
      throw new IOServerError(
        `Error while instantiating ${options.name} watcher: ${error}`,
        500
      );
    }
  }

  /**
   * Registers a manager component for shared functionality
   * @param {ManagerOptions} options - Manager configuration options
   * @throws {IOServerError} When manager instantiation fails
   */
  public addManager(options: ManagerOptions): void {
    try {
      this.registerInternalClass('manager', options.name, options.manager);
    } catch (error) {
      if (error instanceof IOServerError) {
        throw error;
      }
      throw new IOServerError(
        `Error while instantiating ${options.name} manager: ${error}`,
        500
      );
    }
  }

  /**
   * Registers a service component for real-time WebSocket handling
   * @param {ServiceOptions} options - Service configuration options
   * @throws {IOServerError} When service instantiation fails
   */
  public addService(options: ServiceOptions): void {
    const name = options.name || '/';
    const methods = options.events
      ? this.validateServiceEvents(options.service, options.events)
      : dumpMethods(options.service);

    try {
      this.registerInternalClass('service', name, options.service);
    } catch (error) {
      if (error instanceof IOServerError) {
        throw error;
      }
      throw new IOServerError(
        `Error while instantiating ${name} service: ${error}`,
        500
      );
    }

    this.methodLists.set(name, methods);
    this.middlewareLists.set(name, options.middlewares || []);
  }

  private validateServiceEvents(
    ClassConstructor: new (appHandle: AppHandle) => any,
    events: string[]
  ): string[] {
    const available = new Set(dumpMethods(ClassConstructor));
    const uniqueEvents = [...new Set(events)];

    uniqueEvents.forEach(event => {
      if (
        typeof event !== 'string' ||
        event.length === 0 ||
        event.startsWith('_') ||
        event === 'constructor'
      ) {
        throw new IOServerError(`Invalid service event: ${String(event)}`, 400);
      }
      if (!available.has(event)) {
        throw new IOServerError(
          `Service event is not implemented: ${event}`,
          400
        );
      }
    });

    return uniqueEvents;
  }

  /**
   * Registers a controller component for HTTP route handling
   * @param {ControllerOptions} options - Controller configuration options
   * @throws {IOServerError} When controller instantiation or route loading fails
   */
  public addController(options: ControllerOptions): void {
    const middlewares = options.middlewares || [];
    let prefix = options.prefix;

    if (prefix) {
      if (!prefix.startsWith('/')) {
        prefix = `/${prefix}`;
      }
      if (prefix.endsWith('/')) {
        prefix = prefix.slice(0, -1);
      }
    }

    validateName('controller', options.name);

    const routeFile = path.join(this.routesPath, `${options.name}.json`);
    if (!fs.existsSync(routeFile)) {
      throw new IOServerError(`Routes file does not exist: ${routeFile}`, 404);
    }

    let routes: unknown;
    try {
      routes = JSON.parse(fs.readFileSync(routeFile, 'utf8'));
    } catch (error) {
      throw new IOServerError(
        `Error loading routes for ${options.name}: ${error}`,
        500
      );
    }

    try {
      this.registerInternalClass(
        'controller',
        options.name,
        options.controller
      );
    } catch (error) {
      if (error instanceof IOServerError) {
        throw error;
      }
      throw new IOServerError(
        `Error while instantiating ${options.name} controller: ${error}`,
        500
      );
    }

    try {
      this.registerControllerRoutes(routes, options.name, prefix, middlewares);
    } catch (error) {
      if (error instanceof IOServerError) {
        throw error;
      }
      throw new IOServerError(
        `Error loading routes for ${options.name}: ${error}`,
        500
      );
    }
  }

  private registerControllerRoutes(
    routes: unknown,
    controllerName: string,
    prefix?: string,
    middlewares: any[] = []
  ): void {
    if (!Array.isArray(routes)) {
      throw new IOServerError(
        `Routes file for ${controllerName} must contain an array`,
        500
      );
    }

    const controller = this.controllerLists.get(controllerName);
    const handlerOptions = [
      'onRequest',
      'preParsing',
      'preValidation',
      'preHandler',
      'preSerialization',
      'onSend',
      'onResponse',
      'handler',
      'errorHandler',
    ];

    routes.forEach((route: any) => {
      if (!route || typeof route !== 'object') {
        throw new IOServerError(
          `Invalid route definition for controller ${controllerName}`,
          500
        );
      }

      handlerOptions.forEach(option => {
        if (route[option] !== undefined) {
          if (typeof route[option] === 'string') {
            const handler = controller?.[route[option]];
            if (typeof handler !== 'function') {
              throw new IOServerError(
                `Handler ${route[option]} not found on controller ${controllerName}`,
                500
              );
            }
            route[option] = handler.bind(controller);
          } else if (typeof route[option] !== 'function') {
            throw new IOServerError(
              `Route option ${option} must reference a controller method`,
              500
            );
          }
        }
      });

      if (typeof route.handler !== 'function') {
        throw new IOServerError(
          `Route ${String(route.method)} ${String(route.url)} has no handler`,
          500
        );
      }

      if (prefix !== undefined) {
        route.url = prefix + route.url;
      } else if (route.url === '/' && controllerName !== 'root') {
        route.url = '/';
      } else {
        route.url = `/${controllerName}${route.url}`;
      }

      if (route.preValidation === undefined) {
        route.preValidation = [];
      } else if (!Array.isArray(route.preValidation)) {
        route.preValidation = [route.preValidation];
      }

      middlewares.forEach(MiddlewareClass => {
        const middleware = new MiddlewareClass();
        if (middleware.handle) {
          route.preValidation.push(middleware.handle(this.appHandle));
        }
      });

      this.log(7, `[*] Register controller route ${route.method} ${route.url}`);
      try {
        this.webapp.route(route as RouteOptions);
      } catch (error) {
        throw new IOServerError(
          `Unable to register route ${String(route.method)} ${String(route.url)}: ${error}`,
          500
        );
      }
    });
  }

  /**
   * Retrieves a registered service by name
   * @param {string} name - The service name
   * @returns {any} The service instance or undefined if not found
   */
  public getService(name: string): any {
    return this.serviceLists.get(name);
  }

  /**
   * Starts the IOServer instance
   * Initializes Socket.IO, starts watchers, and begins listening for connections
   * @returns {Promise<void>} Promise that resolves when server is started
   * @throws {IOServerError} When server startup fails
   */
  public async start(): Promise<void> {
    const now = new Date();
    const timestamp = now.toISOString();

    this.log(
      4,
      `################### IOServer v${IOServer.VERSION} ###################`
    );
    this.log(5, `################### ${timestamp} ###################`);

    await this.socketReady;

    if (this.socketSetupError) {
      throw this.socketSetupError;
    }

    if (!this.socketio) {
      throw new IOServerError('Socket.IO server failed to initialize', 500);
    }

    this.log(6, '[*] Socket.IO server ready');

    // Setup Socket.IO namespaces and services
    this.serviceLists.forEach((service, serviceName) => {
      const namespace =
        serviceName === '/'
          ? this.socketio.of('/')
          : this.socketio.of(`/${serviceName}`);

      // Register middleware for namespace
      const middlewares = this.middlewareLists.get(serviceName) || [];
      middlewares.forEach(MiddlewareClass => {
        const middleware = new MiddlewareClass();
        if (middleware.handle) {
          namespace.use(middleware.handle(this.appHandle));
        }
      });

      // Setup connection handler
      namespace.on(
        'connection',
        createConnectionHandler(
          serviceName,
          this.methodLists.get(serviceName) || [],
          name => this.serviceLists.get(name),
          this.log.bind(this)
        )
      );
      this.log(6, `[*] Service ${serviceName} registered...`);
    });

    // Start watchers
    try {
      const watcherPromises = Array.from(this.watcherLists.values()).map(
        async watcher => {
          try {
            this.log(6, `[*] Start watcher ${watcher.constructor.name}`);
            if (watcher.watch) {
              await watcher.watch();
            }
          } catch (error) {
            throw new IOServerError(
              `Unable to start ${watcher.constructor.name} watcher: ${error}`,
              500
            );
          }
        }
      );

      // Don't wait for watchers to complete
      Promise.all(watcherPromises).catch(error => {
        this.log(3, `[!] Error starting watchers: ${error}`);
      });
    } catch (error) {
      throw new IOServerError(`Error starting watchers: ${error}`, 500);
    }

    // Start web server
    try {
      this.log(
        5,
        `[*] Starting server on http://${this.host}:${this.port} ...`
      );
      await this.webapp.listen({ port: this.port, host: this.host });
      this.log(5, `[*] Server listening on http://${this.host}:${this.port}`);
    } catch (error) {
      this.log(3, `[!] Unable to start server: ${error}`);
      throw new IOServerError(`Unable to start server: ${error}`, 500);
    }
  }

  /**
   * Gets the server hostname
   * @returns {string} The server hostname
   */
  public getHost(): string {
    return this.host;
  }

  /**
   * Gets the server port number
   * @returns {number} The server port
   */
  public getPort(): number {
    return this.port;
  }

  /**
   * Gets the Fastify instance
   * @returns {FastifyInstance} The Fastify application instance
   */
  public getApp(): FastifyInstance {
    return this.webapp;
  }

  /**
   * Stops the IOServer instance
   * @returns {Promise<void>} Promise that resolves when server is stopped
   * @throws {IOServerError} When server shutdown fails
   */
  public async stop(): Promise<void> {
    const watcherFailures: unknown[] = [];

    await Promise.all(
      Array.from(this.watcherLists.values()).map(async watcher => {
        try {
          this.log(6, `[*] Stopping watcher ${watcher.constructor.name}`);
          if (watcher.stop) {
            await watcher.stop();
          }
        } catch (error) {
          watcherFailures.push(error);
          this.log(
            3,
            `[!] Error stopping ${watcher.constructor.name} watcher: ${error}`
          );
        }
      })
    );

    try {
      if (this.socketio) {
        await this.socketio.close();
      }
      await this.webapp.close();
      this.log(6, '[*] Server stopped');
    } catch (error) {
      if (error instanceof IOServerError) {
        throw error;
      }
      throw new IOServerError(`Unable to stop server: ${error}`, 500);
    }

    if (watcherFailures.length > 0) {
      throw new IOServerError(
        `Unable to stop ${watcherFailures.length} watcher(s): ${watcherFailures.join('; ')}`,
        500
      );
    }
  }

  /**
   * Sends real-time messages to connected clients
   * @param {SendToOptions} options - Options for message delivery
   * @returns {boolean} True if message was sent successfully, false otherwise
   */
  public sendTo(options: SendToOptions): boolean {
    if (!this.socketio) {
      this.log(3, '[!] Socket.IO not initialized, cannot send message');
      return false;
    }

    let namespace = options.namespace;

    if (namespace) {
      if (!namespace.startsWith('/')) {
        namespace = `/${namespace}`;
      }
    } else {
      namespace = '/';
    }

    const ns = this.socketio.of(namespace);

    if (options.sid) {
      const socket = ns.sockets.get(options.sid);
      if (!socket) {
        return false;
      }
      socket.emit(options.event, options.data);
    } else {
      const target = options.room ? ns.in(options.room) : ns;
      target.emit(options.event, options.data);
    }

    return true;
  }
}

export default IOServer;
