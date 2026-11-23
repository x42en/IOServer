/**
 * @fileoverview Fastify plugin, static serving and error-handler setup.
 *
 * @version 2.4.1
 * @since 2.4.0
 */

import * as fs from 'fs';
import * as path from 'path';
import { STATUS_CODES } from 'http';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { FastifyCorsOptions } from '@fastify/cors';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import fastifyStatic from '@fastify/static';
import { IOServerError } from './IOServerError';

type Logger = (level: number, text: string) => void;

export function sendNotFound(
  request: FastifyRequest,
  reply: FastifyReply
): void {
  reply.code(404).send({
    statusCode: 404,
    error: 'Not Found',
    message: `Route ${request.method}:${request.url} not found`,
  });
}

function isDotfileRequest(url: string): boolean {
  const pathname = url.split('?')[0];
  return pathname
    .split('/')
    .some(
      segment => segment.startsWith('.') && segment !== '.' && segment !== '..'
    );
}

function getErrorStatusCode(error: any): number | undefined {
  const candidate =
    typeof error?.statusCode === 'number'
      ? error.statusCode
      : typeof error?.status === 'number'
        ? error.status
        : undefined;

  if (
    candidate === undefined ||
    !Number.isInteger(candidate) ||
    candidate < 400 ||
    candidate > 599
  ) {
    return undefined;
  }

  return candidate;
}

export function setupHttp(
  webapp: FastifyInstance,
  corsOptions: FastifyCorsOptions,
  rootDir: string | undefined,
  spaFallback: boolean,
  log: Logger
): void {
  try {
    webapp.register(sensible);

    webapp.register(cors, {
      ...corsOptions,
      credentials: corsOptions.credentials ?? false,
      optionsSuccessStatus: 204,
    });

    if (rootDir) {
      webapp.register(fastifyStatic, {
        root: rootDir,
        prefix: '/',
        dotfiles: 'ignore',
        decorateReply: true,
      });
      log(6, `[*] Serving static files from: ${rootDir}`);
    }

    const spaEntryPoint = rootDir
      ? path.join(rootDir, 'index.html')
      : undefined;
    const spaEnabled =
      Boolean(rootDir) &&
      spaFallback &&
      Boolean(spaEntryPoint) &&
      fs.existsSync(spaEntryPoint as string);

    if (spaEnabled) {
      webapp.setNotFoundHandler((request, reply) => {
        if (
          (request.method === 'GET' || request.method === 'HEAD') &&
          !isDotfileRequest(request.url)
        ) {
          reply.sendFile('index.html');
          return;
        }
        sendNotFound(request, reply);
      });
    } else {
      if (rootDir && spaFallback) {
        log(
          4,
          `[!] SPA fallback disabled, index.html not found in: ${rootDir}`
        );
      }
      webapp.setNotFoundHandler((request, reply) => {
        sendNotFound(request, reply);
      });
    }

    webapp.setErrorHandler(
      (error: any, request: FastifyRequest, reply: FastifyReply) => {
        if (error instanceof IOServerError) {
          reply.status(error.statusCode).send({
            statusCode: error.statusCode,
            error: error.name,
            message: error.message,
          });
          return;
        }

        const statusCode = getErrorStatusCode(error);

        if (statusCode !== undefined && statusCode < 500) {
          log(
            4,
            `[!] Client error on ${request.method}:${request.url}: ${error?.stack || error}`
          );
          reply.status(statusCode).send({
            statusCode,
            error: STATUS_CODES[statusCode] || 'Error',
            message: STATUS_CODES[statusCode] || 'Request Error',
          });
          return;
        }

        log(
          3,
          `[!] Unhandled error on ${request.method}:${request.url}: ${error?.stack || error}`
        );
        reply.status(500).send({
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'Internal Server Error',
        });
      }
    );
  } catch (error) {
    if (error instanceof IOServerError) {
      throw error;
    }
    throw new IOServerError(`Unable to setup plugins: ${error}`, 500);
  }
}
