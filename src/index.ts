/**
 * @fileoverview IOServer Framework - TypeScript Socket.IO Server Framework
 *
 * A comprehensive framework for building real-time applications with TypeScript,
 * combining Fastify HTTP server with Socket.IO WebSocket support.
 *
 * Features:
 * - Modular architecture with Services, Controllers, Managers, and Watchers
 * - Type-safe development with full TypeScript support
 * - Built-in error handling and logging
 * - Middleware support for HTTP and WebSocket routes
 * - Production-ready with security best practices
 *
 * @author Ben Mz <0x42en@users.noreply.github.com>
 * @version 2.0.0
 * @since 1.0.0
 *
 * @example
 * ```typescript
 * import { IOServer, BaseService } from 'ioserver';
 *
 * class ChatService extends BaseService {
 *   async sendMessage(socket: any, data: any, callback?: Function) {
 *     socket.broadcast.emit('new_message', data);
 *     if (callback) callback({ status: 'sent' });
 *   }
 * }
 *
 * const server = new IOServer({ port: 3000 });
 * server.addService({ service: ChatService });
 * await server.start();
 * ```
 */

// Main framework exports
export { IOServer as default, IOServer } from './IOServer';
export { IOServerError } from './IOServerError';

// Base classes for extending
export {
  BaseService,
  BaseController,
  BaseManager,
  BaseWatcher,
  BaseMiddleware,
} from './BaseClasses';

// Type definitions
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
} from './IOServer';
