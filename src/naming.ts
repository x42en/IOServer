/**
 * @fileoverview Component naming and service method discovery helpers.
 *
 * @version 2.4.0
 * @since 2.4.0
 */

import { IOServerError } from './IOServerError';
import type { AppHandle } from './types';

export const MAX_NAME_LENGTH = 64;
export const NAME_PATTERN = /^[A-Za-z][A-Za-z0-9._-]*$/;
export const RESERVED_NAMES = new Set([
  'send',
  'log',
  'verbose',
  '__proto__',
  'prototype',
  'constructor',
  ...Object.getOwnPropertyNames(Object.prototype),
]);

export function validateName(type: string, name: string): void {
  if (!name) {
    throw new IOServerError('Name is mandatory', 400);
  }

  if (type === 'service' && name === '/') {
    return;
  }

  if (type !== 'service' && name.length < 2) {
    throw new IOServerError('Name must be longer than 2 characters', 400);
  }

  if (name.length > MAX_NAME_LENGTH) {
    throw new IOServerError(
      `Name must not exceed ${MAX_NAME_LENGTH} characters`,
      400
    );
  }

  if (
    !NAME_PATTERN.test(name) ||
    name.includes('..') ||
    name.includes('/') ||
    name.includes('\\')
  ) {
    throw new IOServerError(
      'Name must start with a letter and contain only letters, digits, dots, underscores or hyphens',
      400
    );
  }

  if (RESERVED_NAMES.has(name)) {
    throw new IOServerError('Sorry this is a reserved name', 400);
  }
}

export function dumpMethods(
  ClassConstructor: new (appHandle: AppHandle) => any
): string[] {
  const result: string[] = [];
  let prototype = ClassConstructor.prototype;

  while (prototype && Object.getPrototypeOf(prototype)) {
    const names = Object.getOwnPropertyNames(prototype);
    result.push(...names);
    prototype = Object.getPrototypeOf(prototype);
  }

  return [...new Set(result)].sort();
}
