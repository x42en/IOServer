/**
 * @fileoverview IOServerError - Custom error class for IOServer framework
 *
 * Provides structured error handling with HTTP status codes and detailed messages.
 * Extends the native Error class with additional properties for better debugging
 * and API error responses.
 *
 * @author Ben Mz <0x42en@users.noreply.github.com>
 * @version 2.1.1
 * @since 1.0.0
 */

/**
 * Custom error class for IOServer framework
 *
 * Provides structured error handling with HTTP-compatible status codes
 * and consistent error formatting across the application.
 *
 * @class IOServerError
 * @extends {Error}
 *
 * @example
 * ```typescript
 * // Basic error
 * throw new IOServerError('User not found', 404);
 *
 * // Validation error
 * throw new IOServerError('Invalid email format', 400);
 *
 * // Server error
 * throw new IOServerError('Database connection failed', 500);
 *
 * // Using in service
 * class UserService extends BaseService {
 *   async getUser(socket: any, data: any, callback?: Function) {
 *     if (!data.userId) {
 *       throw new IOServerError('User ID is required', 400);
 *     }
 *
 *     const user = await this.appHandle.database.findUser(data.userId);
 *     if (!user) {
 *       throw new IOServerError('User not found', 404);
 *     }
 *
 *     if (callback) callback(user);
 *   }
 * }
 * ```
 */
export class IOServerError extends Error {
  /**
   * HTTP status code associated with this error
   * @type {number}
   */
  public statusCode: number;

  /**
   * Creates a new IOServerError instance
   * @param {string} message - Error message describing what went wrong
   * @param {number} statusCode - HTTP status code (default: 500)
   *
   * @example
   * ```typescript
   * // Client error (4xx)
   * throw new IOServerError('Invalid request parameters', 400);
   *
   * // Authentication error
   * throw new IOServerError('Access token expired', 401);
   *
   * // Authorization error
   * throw new IOServerError('Insufficient permissions', 403);
   *
   * // Not found error
   * throw new IOServerError('Resource not found', 404);
   *
   * // Server error (5xx)
   * throw new IOServerError('Internal server error', 500);
   * ```
   */
  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.name = 'IOServerError';
    this.statusCode = statusCode;

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, IOServerError.prototype);
  }
}
