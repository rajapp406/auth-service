import { Application, Request, Response } from 'express';
import { NextFunction } from 'connect';
import { IErrorHandler } from '../interfaces/IErrorHandler';
import { ILogger } from '../interfaces/ILogger';
import { Config } from '../config/Config';
import { ZodError } from 'zod';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class ErrorHandler implements IErrorHandler {
  private static instance: ErrorHandler;

  private constructor(
    private readonly config: Config,
    private readonly logger: ILogger
  ) {}

  public static getInstance(config: Config, logger: ILogger): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler(config, logger);
    }
    return ErrorHandler.instance;
  }

  public async register(app: Application): Promise<void> {
    app.use(this.notFoundHandler.bind(this));
    app.use(this.handleError.bind(this));
  }

  private notFoundHandler(req: Request, res: Response, next: NextFunction): void {
    const error = new AppError(404, 'Route not found');
    next(error);
  }

  public handleError(err: Error, req: Request, res: Response, next: NextFunction): Response | void {
    this.logger.error('Error:', {
      error: err,
      path: req.path,
      method: req.method,
    });

    // Handle Prisma errors
    if (err instanceof PrismaClientKnownRequestError) {
      if (err.code === 'P2002') {
        return res.status(409).json({
          status: 'error',
          message: 'A record with this value already exists',
        });
      }
    }

    // Handle Zod validation errors
    if (err instanceof ZodError) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation error',
        errors: err.errors,
      });
    }

    // Handle operational errors
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({
        status: 'error',
        message: err.message,
      });
    }

    // Handle unknown errors
    const statusCode = err instanceof AppError ? err.statusCode : 500;
    const message = this.config.getIsProduction()
      ? 'Internal server error'
      : err.message || 'Something went wrong';

    return res.status(statusCode).json({
      status: 'error',
      message,
      ...(this.config.getIsDevelopment() && { stack: err.stack }),
    });
  }
} 