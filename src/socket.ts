/**
 * @fileoverview Socket.IO server creation and service event dispatch.
 *
 * @version 2.4.1
 * @since 2.4.0
 */

import type { FastifyInstance } from 'fastify';
import type { FastifyCorsOptions } from '@fastify/cors';
import { Server as SocketIOServer } from 'socket.io';
import { IOServerError } from './IOServerError';
import { validatePositiveInteger } from './config';
import type { TransportMode } from './types';

type Logger = (level: number, text: string) => void;
type ServiceLookup = (name: string) => any;

export function createSocketIOServer(
  webapp: FastifyInstance,
  transportModes: TransportMode[],
  cookieEnabled: boolean,
  corsOptions: FastifyCorsOptions,
  maxHttpBufferSize: number | undefined
): Promise<SocketIOServer> {
  const bufferSize =
    maxHttpBufferSize === undefined
      ? undefined
      : validatePositiveInteger(maxHttpBufferSize, 'maxHttpBufferSize');

  return Promise.resolve(webapp.ready()).then(() => {
    const socketio = new SocketIOServer(webapp.server, {
      transports: transportModes as any[],
      cookie: cookieEnabled,
      cors: corsOptions as any,
      ...(bufferSize === undefined ? {} : { maxHttpBufferSize: bufferSize }),
    });

    (webapp as any).io = socketio;
    return socketio;
  });
}

export function createConnectionHandler(
  serviceName: string,
  methods: string[],
  getService: ServiceLookup,
  log: Logger
): (socket: any) => void {
  return (socket: any) => {
    log(5, `[*] Received connection for service ${serviceName}`);

    methods.forEach(method => {
      if (method.startsWith('_') || method === 'constructor') {
        return;
      }

      log(6, `[*] Method ${method} of ${serviceName} listening...`);
      socket.on(
        method,
        createCallbackHandler(serviceName, method, socket, getService, log)
      );
    });
  };
}

export function createCallbackHandler(
  serviceName: string,
  methodName: string,
  socket: any,
  getService: ServiceLookup,
  log: Logger
) {
  return async (data: any, callback?: (response: any) => void) => {
    log(6, `[*] Call method ${methodName} of service ${serviceName}`);

    try {
      const service = getService(serviceName);
      if (service && service[methodName]) {
        await service[methodName](socket, data, callback);
      }
    } catch (error) {
      log(
        5,
        `Error on ${serviceName}:${methodName} execution: ${(error as any)?.stack || error}`
      );

      const isIOServerError = error instanceof IOServerError;
      const payload = isIOServerError
        ? {
            status: 'error',
            type: 'IOServerError',
            message: error.message,
            statusCode: error.statusCode,
          }
        : {
            status: 'error',
            type: 'Error',
            message: 'Internal Server Error',
            statusCode: 500,
          };

      if (typeof callback === 'function') {
        callback(payload);
      } else {
        socket.emit('error', payload);
      }
    }
  };
}
