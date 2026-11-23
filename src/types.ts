/**
 * @fileoverview Public types for the IOServer framework.
 *
 * @author Ben Mz <0x42en@users.noreply.github.com>
 * @version 2.4.1
 * @since 1.0.0
 */

import type { FastifyCorsOptions } from '@fastify/cors';

export interface IOServerOptions {
  /**
   * Logging verbosity level - defaults to 'ERROR'. Case-insensitive; aliases
   * such as 'INFO', 'WARN' and 'NOTICE' are normalized to their canonical
   * `LogLevel` values.
   */
  verbose?: string;
  /** Server hostname - defaults to 'localhost' */
  host?: string;
  /** Server port number - defaults to 8080 */
  port?: number;
  /** Enable Socket.IO cookies - defaults to false */
  cookie?: boolean;
  /** Transport modes for Socket.IO - defaults to ['websocket', 'polling'] */
  mode?: TransportMode | TransportMode[];
  /** CORS configuration options */
  cors?: FastifyCorsOptions;
  /** Path to routes directory - defaults to './routes' */
  routes?: string;
  /** Maximum HTTP request body size in bytes - Fastify default when omitted */
  bodyLimit?: number;
  /** Maximum Socket.IO message size in bytes - Socket.IO default when omitted */
  maxHttpBufferSize?: number;
  /** Trust reverse-proxy headers - defaults to false */
  trustProxy?: boolean;
  /**
   * Absolute path to the directory containing static files to serve (e.g. a
   * built SPA). When provided and the directory exists, IOServer registers
   * \@fastify/static with that root and serves files at prefix "/".
   * If the directory does not exist a warning is logged and static serving
   * is silently disabled (safe to always set in code, even in dev).
   */
  rootDir?: string;
  /**
   * When true (default) and rootDir is active, any GET or HEAD request that
   * does not match an API route or a static file is answered with
   * `index.html` so that client-side routers (Vue Router, React Router, …)
   * work correctly. Other methods receive the standard 404 JSON response.
   */
  spaFallback?: boolean;
}

export interface ServiceOptions {
  /** Service namespace (optional, defaults to '/') */
  name?: string;
  /** Service class constructor that extends BaseService */
  service: new (appHandle: AppHandle) => any;
  /** Array of middleware classes to apply to this service */
  middlewares?: (new () => any)[];
  /**
   * Explicit allowlist of Socket.IO event names to expose. When omitted, every
   * method not prefixed with "_" is exposed for backward compatibility.
   * TypeScript `private` is not a runtime guard: prefix internal methods with
   * "_" or list only public events here.
   */
  events?: string[];
}

export interface ControllerOptions {
  /** Controller name that matches the route file name */
  name: string;
  /** Controller class constructor that extends BaseController */
  controller: new (appHandle: AppHandle) => any;
  /** Array of middleware classes to apply to this controller */
  middlewares?: (new () => any)[];
  /** URL prefix prepended to every route URL - defaults to /{name} */
  prefix?: string;
}

export interface ManagerOptions {
  /** Manager name (used as property name in appHandle) */
  name: string;
  /** Manager class constructor that extends BaseManager */
  manager: new (appHandle: AppHandle) => any;
}

export interface WatcherOptions {
  /** Watcher name for identification */
  name: string;
  /** Watcher class constructor that extends BaseWatcher */
  watcher: new (appHandle: AppHandle) => any;
}

export interface SendToOptions {
  /** Target namespace (optional, defaults to '/') */
  namespace?: string;
  /** Event name to emit */
  event: string;
  /** Data payload to send */
  data: any;
  /** Target specific room (optional) */
  room?: string;
  /** Target specific socket ID (optional) */
  sid?: string;
}

export interface AppHandle {
  /** Function to send real-time messages to clients */
  send: (options: SendToOptions) => boolean;
  /** Logging function with level-based filtering */
  log: (level: number, text: string) => void;
  /** Current logging verbosity level */
  verbose: LogLevel;
  /** Dynamic properties for registered managers */
  [key: string]: any;
}

export type LogLevel =
  | 'EMERGENCY'
  | 'ALERT'
  | 'CRITICAL'
  | 'ERROR'
  | 'WARNING'
  | 'NOTIFICATION'
  | 'INFORMATION'
  | 'DEBUG';

export type TransportMode = 'websocket' | 'polling';
