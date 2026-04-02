export class AppError extends Error {
  public readonly statusCode:   number;
  public readonly isOperational: boolean;
  public readonly code?:        string;

  constructor(message: string, statusCode = 500, options: { isOperational?: boolean; code?: string } = {}) {
    super(message);
    this.name          = 'AppError';
    this.statusCode    = statusCode;
    this.isOperational = options.isOperational ?? true;
    this.code          = options.code;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest    (message: string, code?: string) { return new AppError(message, 400, { code }); }
  static unauthorized  (message = 'Unauthorized', code?: string) { return new AppError(message, 401, { code }); }
  static forbidden     (message = 'Forbidden', code?: string) { return new AppError(message, 403, { code }); }
  static notFound      (message = 'Resource not found', code?: string) { return new AppError(message, 404, { code }); }
  static conflict      (message: string, code?: string) { return new AppError(message, 409, { code }); }
  static unprocessable (message: string, code?: string) { return new AppError(message, 422, { code }); }
  static internal      (message = 'Internal server error') { return new AppError(message, 500, { isOperational: false }); }
}
