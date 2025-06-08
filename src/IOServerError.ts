export class IOServerError extends Error {
  public statusCode: number;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.name = "IOServerError";
    this.statusCode = statusCode;

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, IOServerError.prototype);
  }
}
