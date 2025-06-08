import * as fs from "fs";
import * as path from "path";
import fastify, {
  FastifyInstance,
  FastifyRequest,
  FastifyReply,
  RouteOptions,
} from "fastify";
import { Server as SocketIOServer } from "socket.io";
import cors from "@fastify/cors";
import sensible from "@fastify/sensible";

// Extend Fastify instance to include Socket.IO
declare module "fastify" {
  interface FastifyInstance {
    io: SocketIOServer;
  }
}

export interface IOServerOptions {
  verbose?: LogLevel;
  host?: string;
  port?: number;
  cookie?: boolean;
  mode?: TransportMode | TransportMode[];
  cors?: any;
  routes?: string;
}

export interface ServiceOptions {
  name?: string;
  service: new (appHandle: AppHandle) => any;
  middlewares?: (new () => any)[];
}

export interface ControllerOptions {
  name: string;
  controller: new (appHandle: AppHandle) => any;
  middlewares?: (new () => any)[];
  prefix?: string;
}

export interface ManagerOptions {
  name: string;
  manager: new (appHandle: AppHandle) => any;
}

export interface WatcherOptions {
  name: string;
  watcher: new (appHandle: AppHandle) => any;
}

export interface SendToOptions {
  namespace?: string;
  event: string;
  data: any;
  room?: string;
  sid?: string;
}

export interface AppHandle {
  send: (options: SendToOptions) => boolean;
  log: (level: number, text: string) => void;
  verbose: LogLevel;
  [key: string]: any; // For managers
}

export type LogLevel =
  | "EMERGENCY"
  | "ALERT"
  | "CRITICAL"
  | "ERROR"
  | "WARNING"
  | "NOTIFICATION"
  | "INFORMATION"
  | "DEBUG";
export type TransportMode = "websocket" | "polling";

export class IOServerError extends Error {
  public readonly type: string;
  public readonly code: number;

  constructor(message: string, code: number = -1) {
    super(message);
    this.name = "IOServerError";
    this.type = this.constructor.name;
    this.code = code;

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, IOServerError.prototype);
  }

  getMessage(): string {
    return this.message;
  }

  getType(): string {
    return this.type;
  }

  getCode(): number {
    return this.code;
  }

  toJson(): object {
    return {
      message: this.message,
      type: this.type,
      code: this.code,
    };
  }
}

export class IOServer {
  private static readonly VERSION = "2.0.0";
  private static readonly DEFAULT_PORT = 8080;
  private static readonly DEFAULT_HOST = "localhost";
  private static readonly LOG_LEVELS: LogLevel[] = [
    "EMERGENCY",
    "ALERT",
    "CRITICAL",
    "ERROR",
    "WARNING",
    "NOTIFICATION",
    "INFORMATION",
    "DEBUG",
  ];
  private static readonly TRANSPORTS: TransportMode[] = [
    "websocket",
    "polling",
  ];
  private static readonly RESERVED_NAMES = ["send", "log", "verbose"];

  private readonly host: string;
  private readonly port: number;
  private readonly verbose: LogLevel;
  private readonly routesPath: string;
  private readonly webapp: FastifyInstance;
  private socketio!: SocketIOServer;
  private readonly appHandle: AppHandle;

  private readonly serviceLists: Map<string, any> = new Map();
  private readonly managerLists: Map<string, any> = new Map();
  private readonly methodLists: Map<string, string[]> = new Map();
  private readonly watcherLists: Map<string, any> = new Map();
  private readonly controllerLists: Map<string, any> = new Map();
  private readonly middlewareLists: Map<string, any[]> = new Map();

  constructor(options: IOServerOptions = {}) {
    this.host = options.host || IOServer.DEFAULT_HOST;
    this.port = this.validatePort(options.port || IOServer.DEFAULT_PORT);
    this.verbose = this.validateLogLevel(options.verbose || "ERROR");

    const defaultRoutes = path.join(process.cwd(), "routes");
    this.routesPath =
      options.routes && fs.existsSync(options.routes)
        ? options.routes
        : defaultRoutes;

    const transportModes = this.processTransportModes(options.mode);
    const corsOptions = this.processCorsOptions(options.cors);
    const cookieEnabled = Boolean(options.cookie);

    this.webapp = this.initializeFastify();
    this.setupPlugins(corsOptions);
    this.setupSocketIO(transportModes, cookieEnabled, corsOptions);

    this.appHandle = {
      send: this.sendTo.bind(this),
      log: this.log.bind(this),
      verbose: this.verbose,
    };
  }

  private validatePort(port: number): number {
    const numPort = Number(port);
    if (isNaN(numPort) || numPort <= 0 || numPort > 65535) {
      throw new IOServerError("Invalid port number", 400);
    }
    return numPort;
  }

  private validateLogLevel(level: string): LogLevel {
    const upperLevel = level.toUpperCase() as LogLevel;
    return IOServer.LOG_LEVELS.includes(upperLevel) ? upperLevel : "ERROR";
  }

  private processTransportModes(
    mode?: TransportMode | TransportMode[]
  ): TransportMode[] {
    if (!mode) {
      return ["websocket", "polling"];
    }

    const modes: TransportMode[] = [];
    if (typeof mode === "string") {
      if (IOServer.TRANSPORTS.includes(mode)) {
        modes.push(mode);
      }
    } else if (Array.isArray(mode)) {
      mode.forEach((m) => {
        if (IOServer.TRANSPORTS.includes(m)) {
          modes.push(m);
        }
      });
    }

    return modes.length > 0 ? modes : ["websocket", "polling"];
  }

  private processCorsOptions(cors?: any): any {
    const corsConfig = cors || {};

    if (!corsConfig.methods) {
      corsConfig.methods = ["GET", "POST"];
    }

    if (!corsConfig.origin) {
      corsConfig.origin = [`https://${this.host}`, `http://${this.host}`];
    }

    return corsConfig;
  }

  private initializeFastify(): FastifyInstance {
    try {
      return fastify({
        logger: this.verbose === "DEBUG",
        ignoreTrailingSlash: true,
        maxParamLength: 200,
        caseSensitive: true,
      });
    } catch (error) {
      throw new IOServerError(`Unable to initialize server: ${error}`, 500);
    }
  }

  private setupPlugins(corsOptions: any): void {
    try {
      // Register sensible plugin for HTTP shortcuts
      this.webapp.register(sensible);

      // Register CORS plugin with secure defaults
      this.webapp.register(cors, {
        ...corsOptions,
        credentials: corsOptions?.credentials ?? false, // Default to false for security
        optionsSuccessStatus: 204, // For CORS preflight requests
      });

      // Add 404 handler
      this.webapp.setNotFoundHandler((request, reply) => {
        reply.code(404).send({
          statusCode: 404,
          error: "Not Found",
          message: `Route ${request.method}:${request.url} not found`,
        });
      });

      // Setup error handler
      this.webapp.setErrorHandler(
        (error: any, request: FastifyRequest, reply: FastifyReply) => {
          if (error instanceof IOServerError) {
            const code = error.getCode() < 0 ? 500 : error.getCode();
            reply.status(code).send(error.toJson());
          } else if (error.status) {
            reply.status(error.status).send({
              statusCode: error.status,
              error: error.name || "Error",
              message: error.message,
            });
          } else {
            reply.status(500).send({
              statusCode: 500,
              error: "Internal Server Error",
              message: error.message,
            });
          }
        }
      );
    } catch (error) {
      throw new IOServerError(`Unable to setup plugins: ${error}`, 500);
    }
  }

  private setupSocketIO(
    transportModes: TransportMode[],
    cookieEnabled: boolean,
    corsOptions: any
  ): void {
    try {
      // Create Socket.IO server immediately, but it will attach when Fastify starts
      this.webapp.ready().then(() => {
        this.socketio = new SocketIOServer(this.webapp.server, {
          transports: transportModes as any[],
          cookie: cookieEnabled,
          cors: corsOptions,
        });

        // Add io property to webapp for compatibility
        (this.webapp as any).io = this.socketio;

        this.log(6, "[*] Socket.IO server attached to HTTP server");
      });
    } catch (error) {
      throw new IOServerError(`Unable to setup Socket.IO: ${error}`, 500);
    }
  }

  private log(level: number, text: string): void {
    const currentLevel = IOServer.LOG_LEVELS.indexOf(this.verbose);

    if (level <= currentLevel) {
      if (level <= 4) {
        console.error(text);
      } else {
        console.log(text);
      }
    }
  }

  private unique<T>(array: T[]): T[] {
    return [...new Set(array)];
  }

  private registerInternalClass(
    type: string,
    name: string,
    ClassConstructor: new (appHandle: AppHandle) => any
  ): void {
    if (!name) {
      throw new IOServerError("Name is mandatory", 400);
    }

    if (type !== "service" && name.length < 2) {
      throw new IOServerError("Name must be longer than 2 characters", 400);
    }

    if (IOServer.RESERVED_NAMES.includes(name)) {
      throw new IOServerError("Sorry this is a reserved name", 400);
    }

    if (!ClassConstructor || !ClassConstructor.prototype) {
      throw new IOServerError("Must be a constructor function", 400);
    }

    const listMap = this.getListMap(type);
    if (listMap.has(name)) {
      throw new IOServerError(`Sorry this ${type} already exists`, 409);
    }

    try {
      this.log(7, `[*] Register ${type} ${name}`);
      const instance = new ClassConstructor(this.appHandle);
      listMap.set(name, instance);
    } catch (error) {
      throw new IOServerError(`Error instantiating ${type}: ${error}`, 500);
    }
  }

  private getListMap(type: string): Map<string, any> {
    switch (type) {
      case "service":
        return this.serviceLists;
      case "manager":
        return this.managerLists;
      case "watcher":
        return this.watcherLists;
      case "controller":
        return this.controllerLists;
      default:
        throw new IOServerError(`Unknown type: ${type}`, 400);
    }
  }

  private dumpMethods(
    ClassConstructor: new (appHandle: AppHandle) => any
  ): string[] {
    const result: string[] = [];
    let prototype = ClassConstructor.prototype;

    while (prototype && Object.getPrototypeOf(prototype)) {
      const names = Object.getOwnPropertyNames(prototype);
      result.push(...names);
      prototype = Object.getPrototypeOf(prototype);
    }

    return this.unique(result).sort();
  }

  public addWatcher(options: WatcherOptions): void {
    try {
      this.registerInternalClass("watcher", options.name, options.watcher);
    } catch (error) {
      throw new IOServerError(
        `Error while instantiating ${options.name} watcher: ${error}`,
        500
      );
    }
  }

  public addManager(options: ManagerOptions): void {
    try {
      this.registerInternalClass("manager", options.name, options.manager);
    } catch (error) {
      throw new IOServerError(
        `Error while instantiating ${options.name} manager: ${error}`,
        500
      );
    }
  }

  public addService(options: ServiceOptions): void {
    const name = options.name || "/";

    try {
      this.registerInternalClass("service", name, options.service);
    } catch (error) {
      throw new IOServerError(
        `Error while instantiating ${name} service: ${error}`,
        500
      );
    }

    this.methodLists.set(name, this.dumpMethods(options.service));
    this.middlewareLists.set(name, options.middlewares || []);
  }

  public addController(options: ControllerOptions): void {
    const middlewares = options.middlewares || [];
    let prefix = options.prefix;

    // Sanitize prefix
    if (prefix) {
      if (!prefix.startsWith("/")) {
        prefix = `/${prefix}`;
      }
      if (prefix.endsWith("/")) {
        prefix = prefix.slice(0, -1);
      }
    }

    try {
      this.registerInternalClass(
        "controller",
        options.name,
        options.controller
      );
    } catch (error) {
      throw new IOServerError(
        `Error while instantiating ${options.name} controller: ${error}`,
        500
      );
    }

    const routeFile = path.join(this.routesPath, `${options.name}.json`);
    if (!fs.existsSync(routeFile)) {
      throw new IOServerError(`Routes file does not exist: ${routeFile}`, 404);
    }

    try {
      const routes = JSON.parse(fs.readFileSync(routeFile, "utf8"));
      this.registerControllerRoutes(routes, options.name, prefix, middlewares);
    } catch (error) {
      throw new IOServerError(
        `Error loading routes for ${options.name}: ${error}`,
        500
      );
    }
  }

  private registerControllerRoutes(
    routes: any[],
    controllerName: string,
    prefix?: string,
    middlewares: any[] = []
  ): void {
    const controller = this.controllerLists.get(controllerName);

    routes.forEach((route) => {
      // Map controller methods to route handlers
      const handlerOptions = [
        "onRequest",
        "preParsing",
        "preValidation",
        "preHandler",
        "preSerialization",
        "onSend",
        "onResponse",
        "handler",
        "errorHandler",
      ];

      handlerOptions.forEach((option) => {
        if (route[option] && controller[route[option]]) {
          route[option] = controller[route[option]].bind(controller);
        }
      });

      // Set URL with prefix logic:
      // 1. If custom prefix is provided, use it
      // 2. Otherwise, use controller name as prefix (unless it's root route)
      if (prefix !== undefined) {
        // Custom prefix provided (can be empty string for no prefix)
        route.url = prefix + route.url;
      } else {
        // Default behavior: use controller name as prefix unless route is "/"
        if (route.url === "/" && controllerName !== "root") {
          // Keep root route as-is for main controllers
          route.url = "/";
        } else {
          route.url = `/${controllerName}${route.url}`;
        }
      }

      // Setup middleware
      if (!route.preValidation) {
        route.preValidation = [];
      }

      middlewares.forEach((MiddlewareClass) => {
        const middleware = new MiddlewareClass();
        if (middleware.handle) {
          route.preValidation.push(middleware.handle(this.appHandle));
        }
      });

      try {
        this.log(
          7,
          `[*] Register controller route ${route.method} ${route.url}`
        );
        this.webapp.route(route as RouteOptions);
      } catch (error) {
        this.log(3, `[!] Unable to register route: ${error}`);
      }
    });
  }

  public getService(name: string): any {
    return this.serviceLists.get(name);
  }

  public async start(): Promise<void> {
    const now = new Date();
    const timestamp = now.toISOString();

    this.log(
      4,
      `################### IOServer v${IOServer.VERSION} ###################`
    );
    this.log(5, `################### ${timestamp} ###################`);

    // Register managers in appHandle
    this.managerLists.forEach((manager, name) => {
      this.log(6, `[*] Register ${name} manager`);
      this.appHandle[name] = manager;
    });

    // Ensure Fastify is ready and Socket.IO is initialized
    await this.webapp.ready();

    // Wait for Socket.IO to be properly initialized
    let retries = 0;
    const maxRetries = 10;
    while (!this.socketio && retries < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      retries++;
    }

    if (!this.socketio) {
      throw new IOServerError("Socket.IO server failed to initialize", 500);
    }

    this.log(6, "[*] Socket.IO server ready");

    // Setup Socket.IO namespaces and services
    this.serviceLists.forEach((service, serviceName) => {
      const namespace =
        serviceName === "/"
          ? this.socketio.of("/")
          : this.socketio.of(`/${serviceName}`);

      // Register middleware for namespace
      const middlewares = this.middlewareLists.get(serviceName) || [];
      middlewares.forEach((MiddlewareClass) => {
        const middleware = new MiddlewareClass();
        if (middleware.handle) {
          namespace.use(middleware.handle(this.appHandle));
        }
      });

      // Setup connection handler
      namespace.on("connection", this.handleConnection(serviceName));
      this.log(6, `[*] Service ${serviceName} registered...`);
    });

    // Start watchers
    try {
      const watcherPromises = Array.from(this.watcherLists.values()).map(
        async (watcher) => {
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
      Promise.all(watcherPromises).catch((error) => {
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

  public getHost(): string {
    return this.host;
  }

  public getPort(): number {
    return this.port;
  }

  public getApp(): FastifyInstance {
    return this.webapp;
  }

  public async stop(): Promise<void> {
    try {
      await this.webapp.close();
      this.log(6, "[*] Server stopped");
    } catch (error) {
      throw new IOServerError(`Unable to stop server: ${error}`, 500);
    }
  }

  public sendTo(options: SendToOptions): boolean {
    if (!this.socketio) {
      this.log(3, "[!] Socket.IO not initialized, cannot send message");
      return false;
    }

    let namespace = options.namespace;

    if (namespace) {
      if (!namespace.startsWith("/")) {
        namespace = `/${namespace}`;
      }
    } else {
      namespace = "/";
    }

    const ns = this.socketio.of(namespace);

    if (options.sid) {
      const socket = ns.sockets.get(options.sid);
      if (socket) {
        socket.emit(options.event, options.data);
      }
    } else {
      const target = options.room ? ns.in(options.room) : ns;
      target.emit(options.event, options.data);
    }

    return true;
  }

  private handleConnection(serviceName: string) {
    return (socket: any) => {
      this.log(5, `[*] Received connection for service ${serviceName}`);

      const methods = this.methodLists.get(serviceName) || [];
      const service = this.serviceLists.get(serviceName);

      methods.forEach((method) => {
        // Skip private methods and constructor
        if (method.startsWith("_") || method === "constructor") {
          return;
        }

        this.log(6, `[*] Method ${method} of ${serviceName} listening...`);
        socket.on(method, this.handleCallback(serviceName, method, socket));
      });
    };
  }

  private handleCallback(serviceName: string, methodName: string, socket: any) {
    return async (data: any, callback?: Function) => {
      this.log(6, `[*] Call method ${methodName} of service ${serviceName}`);

      try {
        const service = this.serviceLists.get(serviceName);
        if (service && service[methodName]) {
          await service[methodName](socket, data, callback);
        }
      } catch (error) {
        let ioError = error;
        if (typeof error === "string") {
          ioError = new IOServerError(error, -1);
        }

        const payload = {
          status: "error",
          type: (ioError as any)?.constructor?.name || "Error",
          message: (ioError as any)?.message || null,
          code: (ioError as any)?.code || -1,
        };

        this.log(
          5,
          `Error on ${serviceName}:${methodName} execution: ${error}`
        );

        if (callback) {
          callback(payload);
        } else {
          socket.emit("error", payload);
        }
      }
    };
  }
}

export default IOServer;
