/**
 * @fileoverview Configuration validation helpers for IOServer.
 *
 * @version 2.4.1
 * @since 2.4.0
 */

import * as fs from 'fs';
import * as path from 'path';
import type { FastifyCorsOptions } from '@fastify/cors';
import { IOServerError } from './IOServerError';
import type { LogLevel, TransportMode } from './types';

export const DEFAULT_PORT = 8080;
export const DEFAULT_HOST = 'localhost';
export const LOG_LEVELS: LogLevel[] = [
  'EMERGENCY',
  'ALERT',
  'CRITICAL',
  'ERROR',
  'WARNING',
  'NOTIFICATION',
  'INFORMATION',
  'DEBUG',
];
const LOG_LEVEL_ALIASES: Readonly<Record<string, LogLevel>> = {
  EMERG: 'EMERGENCY',
  CRIT: 'CRITICAL',
  ERR: 'ERROR',
  WARN: 'WARNING',
  NOTICE: 'NOTIFICATION',
  INFO: 'INFORMATION',
};
export const TRANSPORTS: TransportMode[] = ['websocket', 'polling'];

export function validatePort(port: number): number {
  const numPort = Number(port);
  if (!Number.isInteger(numPort) || numPort <= 0 || numPort > 65535) {
    throw new IOServerError('Invalid port number', 400);
  }
  return numPort;
}

function isLogLevel(value: string): value is LogLevel {
  return (LOG_LEVELS as readonly string[]).includes(value);
}

export function validateLogLevel(level: string): LogLevel {
  const upperLevel = level.toUpperCase();
  const canonicalLevel = LOG_LEVEL_ALIASES[upperLevel];

  if (canonicalLevel !== undefined) {
    return canonicalLevel;
  }

  if (!isLogLevel(upperLevel)) {
    throw new IOServerError(
      `Invalid log level: ${level} (expected one of: ${LOG_LEVELS.join(', ')}, or aliases: ${Object.keys(LOG_LEVEL_ALIASES).join(', ')})`,
      400
    );
  }

  return upperLevel;
}

export function validatePositiveInteger(value: unknown, name: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new IOServerError(`${name} must be a positive integer`, 400);
  }
  return parsed;
}

export function resolveRoutesPath(routes?: string): string {
  if (routes === undefined) {
    return path.join(process.cwd(), 'routes');
  }

  const resolved = path.resolve(routes);
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
    throw new IOServerError(
      `Routes directory does not exist: ${resolved}`,
      400
    );
  }
  return resolved;
}

export function resolveRootDir(
  rootDir: string | undefined,
  log: (level: number, text: string) => void
): string | undefined {
  if (!rootDir) {
    return undefined;
  }

  const resolved = path.resolve(rootDir);
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
    log(
      4,
      `[!] Static files directory not found, static serving disabled: ${resolved}`
    );
    return undefined;
  }

  return resolved;
}

export function processTransportModes(
  mode?: TransportMode | TransportMode[]
): TransportMode[] {
  if (mode === undefined) {
    return ['websocket', 'polling'];
  }

  const modes = Array.isArray(mode) ? mode : [mode];
  if (modes.length === 0) {
    throw new IOServerError('At least one transport mode is required', 400);
  }

  modes.forEach(candidate => {
    if (!TRANSPORTS.includes(candidate)) {
      throw new IOServerError(
        `Invalid transport mode: ${String(candidate)}`,
        400
      );
    }
  });

  return [...new Set(modes)];
}

export function processCorsOptions(
  corsOptions: FastifyCorsOptions | undefined,
  host: string
): FastifyCorsOptions {
  const corsConfig: FastifyCorsOptions = { ...(corsOptions || {}) };

  if (!corsConfig.methods) {
    corsConfig.methods = ['GET', 'POST'];
  }

  if (!corsConfig.origin) {
    corsConfig.origin = [`https://${host}`, `http://${host}`];
  }

  corsConfig.credentials = corsConfig.credentials ?? false;

  if (
    corsConfig.credentials &&
    (corsConfig.origin === true ||
      corsConfig.origin === '*' ||
      (Array.isArray(corsConfig.origin) && corsConfig.origin.includes('*')))
  ) {
    throw new IOServerError(
      'CORS credentials cannot be combined with a wildcard origin',
      400
    );
  }

  return corsConfig;
}
