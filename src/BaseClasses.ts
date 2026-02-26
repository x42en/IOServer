/**
 * @fileoverview Base classes for IOServer components
 *
 * This module provides abstract base classes that define the common interface
 * for Services, Controllers, Managers, Watchers, and Middlewares in the IOServer framework.
 *
 * @author Ben Mz <0x42en@users.noreply.github.com>
 * @version 2.1.1
 * @since 1.0.0
 */

import { AppHandle } from './IOServer';

/**
 * Abstract base class for real-time services
 *
 * Services handle WebSocket connections and real-time events.
 * Each public method automatically becomes a WebSocket event handler.
 *
 * @abstract
 * @example
 * ```typescript
 * class ChatService extends BaseService {
 *   async sendMessage(socket: any, data: any, callback?: Function) {
 *     // Validate data
 *     if (!data.message) {
 *       throw new IOServerError('Message is required', 400);
 *     }
 *
 *     // Broadcast to room
 *     socket.broadcast.to(data.room).emit('new_message', {
 *       message: data.message,
 *       username: data.username,
 *       timestamp: new Date()
 *     });
 *
 *     // Send confirmation
 *     if (callback) {
 *       callback({ status: 'success', messageId: Date.now() });
 *     }
 *   }
 * }
 * ```
 */
export abstract class BaseService {
  /**
   * Application handle providing access to shared functionality
   * @protected
   */
  protected appHandle: AppHandle;

  /**
   * Creates a new service instance
   * @param {AppHandle} appHandle - Application handle for shared functionality
   */
  constructor(appHandle: AppHandle) {
    this.appHandle = appHandle;
  }
}

/**
 * Abstract base class for HTTP controllers
 *
 * Controllers handle HTTP requests and route mapping.
 * Methods are mapped to routes via JSON configuration files.
 *
 * @abstract
 * @example
 * ```typescript
 * class UsersController extends BaseController {
 *   async getUser(request: FastifyRequest, reply: FastifyReply) {
 *     const { id } = request.params as { id: string };
 *
 *     try {
 *       const user = await this.appHandle.database.findUser(id);
 *
 *       if (!user) {
 *         return reply.status(404).send({
 *           statusCode: 404,
 *           error: 'Not Found',
 *           message: 'User not found'
 *         });
 *       }
 *
 *       reply.send(user);
 *     } catch (error) {
 *       this.appHandle.log(3, `Error fetching user: ${error}`);
 *       reply.status(500).send({
 *         statusCode: 500,
 *         error: 'Internal Server Error',
 *         message: 'Failed to fetch user'
 *       });
 *     }
 *   }
 * }
 * ```
 */
export abstract class BaseController {
  /**
   * Application handle providing access to shared functionality
   * @protected
   */
  protected appHandle: AppHandle;

  /**
   * Creates a new controller instance
   * @param {AppHandle} appHandle - Application handle for shared functionality
   */
  constructor(appHandle: AppHandle) {
    this.appHandle = appHandle;
  }
}

/**
 * Abstract base class for shared logic managers
 *
 * Managers provide shared functionality across services and controllers.
 * They are registered in the appHandle and accessible by their name.
 *
 * @abstract
 * @example
 * ```typescript
 * class DatabaseManager extends BaseManager {
 *   private connection: any;
 *
 *   async connect() {
 *     try {
 *       this.connection = await createConnection({
 *         host: process.env.DB_HOST,
 *         database: process.env.DB_NAME
 *       });
 *       this.appHandle.log(6, 'Database connected successfully');
 *     } catch (error) {
 *       this.appHandle.log(3, `Database connection failed: ${error}`);
 *       throw error;
 *     }
 *   }
 *
 *   async findUser(id: string) {
 *     return this.connection.query('SELECT * FROM users WHERE id = ?', [id]);
 *   }
 *
 *   async createUser(userData: any) {
 *     const result = await this.connection.query(
 *       'INSERT INTO users (name, email) VALUES (?, ?)',
 *       [userData.name, userData.email]
 *     );
 *     return { id: result.insertId, ...userData };
 *   }
 * }
 * ```
 */
export abstract class BaseManager {
  /**
   * Application handle providing access to shared functionality
   * @protected
   */
  protected appHandle: AppHandle;

  /**
   * Creates a new manager instance
   * @param {AppHandle} appHandle - Application handle for shared functionality
   */
  constructor(appHandle: AppHandle) {
    this.appHandle = appHandle;
  }
}

/**
 * Abstract base class for background watchers
 *
 * Watchers run background tasks and monitoring processes.
 * The watch() method is called when the server starts.
 *
 * @abstract
 * @example
 * ```typescript
 * class HealthWatcher extends BaseWatcher {
 *   private intervalId: NodeJS.Timeout | null = null;
 *
 *   async watch() {
 *     this.appHandle.log(6, 'Starting health monitoring');
 *
 *     this.intervalId = setInterval(async () => {
 *       await this.checkSystemHealth();
 *     }, 30000); // Check every 30 seconds
 *   }
 *
 *   private async checkSystemHealth() {
 *     try {
 *       const memUsage = process.memoryUsage();
 *       const cpuUsage = process.cpuUsage();
 *
 *       // Log memory usage
 *       const memMB = Math.round(memUsage.heapUsed / 1024 / 1024);
 *       this.appHandle.log(7, `Memory usage: ${memMB}MB`);
 *
 *       // Alert on high memory usage
 *       if (memUsage.heapUsed > 100 * 1024 * 1024) { // 100MB
 *         this.appHandle.log(4, 'High memory usage detected');
 *
 *         // Send alert to monitoring service
 *         this.appHandle.send({
 *           namespace: 'admin',
 *           event: 'health_alert',
 *           data: { type: 'memory', usage: memMB }
 *         });
 *       }
 *
 *     } catch (error) {
 *       this.appHandle.log(3, `Health check failed: ${error}`);
 *     }
 *   }
 *
 *   stop() {
 *     if (this.intervalId) {
 *       clearInterval(this.intervalId);
 *       this.intervalId = null;
 *     }
 *   }
 * }
 * ```
 */
export abstract class BaseWatcher {
  /**
   * Application handle providing access to shared functionality
   * @protected
   */
  protected appHandle: AppHandle;

  /**
   * Creates a new watcher instance
   * @param {AppHandle} appHandle - Application handle for shared functionality
   */
  constructor(appHandle: AppHandle) {
    this.appHandle = appHandle;
  }

  /**
   * Abstract method that must be implemented by watchers
   * This method is called when the server starts
   * @abstract
   * @returns {Promise<void>} Promise that resolves when watcher is started
   */
  abstract watch(): Promise<void>;

  /**
   * Abstract method that must be implemented by watchers
   * This method is called when the server stops
   * @abstract
   * @returns {void} Return when watcher is stopped
   */
  abstract stop(): void;
}

/**
 * Abstract base class for middleware components
 *
 * Middlewares provide request/response processing for HTTP routes
 * and WebSocket namespaces.
 *
 * @abstract
 * @example
 * ```typescript
 * class AuthMiddleware extends BaseMiddleware {
 *   handle(appHandle: AppHandle) {
 *     return (req: any, reply: any, done: any) => {
 *       const token = req.headers.authorization;
 *
 *       if (!token) {
 *         return reply.status(401).send({
 *           statusCode: 401,
 *           error: 'Unauthorized',
 *           message: 'Authorization header required'
 *         });
 *       }
 *
 *       try {
 *         // Validate token (pseudo-code)
 *         const user = validateJWT(token);
 *         req.user = user;
 *         done();
 *       } catch (error) {
 *         appHandle.log(4, `Authentication failed: ${error}`);
 *         return reply.status(401).send({
 *           statusCode: 401,
 *           error: 'Unauthorized',
 *           message: 'Invalid token'
 *         });
 *       }
 *     };
 *   }
 * }
 *
 * // For WebSocket middleware
 * class SocketAuthMiddleware extends BaseMiddleware {
 *   handle(appHandle: AppHandle) {
 *     return (socket: any, next: any) => {
 *       const token = socket.handshake.auth.token;
 *
 *       if (!token) {
 *         return next(new Error('Authentication required'));
 *       }
 *
 *       try {
 *         const user = validateJWT(token);
 *         socket.user = user;
 *         next();
 *       } catch (error) {
 *         appHandle.log(4, `Socket authentication failed: ${error}`);
 *         next(new Error('Invalid token'));
 *       }
 *     };
 *   }
 * }
 * ```
 */
export abstract class BaseMiddleware {
  /**
   * Abstract method that must be implemented by middlewares
   * Returns a middleware function for Fastify or Socket.IO
   * @abstract
   * @param {AppHandle} appHandle - Application handle for shared functionality
   * @returns {Function} Middleware function
   */
  abstract handle(
    appHandle: AppHandle
  ): (req: any, reply: any, done: any) => void;
}
