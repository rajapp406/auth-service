import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';
import { config } from '../config/config';
import { ZodError } from 'zod';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

declare module 'express' {
  interface Request {
    path: string;
    method: string;
  }
  interface Response {
    status(code: number): this & { json: (body: any) => Response };
  }
}

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

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) => {
  logger.error('Error:', {
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
  const message = config.isProduction
    ? 'Internal server error'
    : err.message || 'Something went wrong';

  return res.status(statusCode).json({
    status: 'error',
    message,
    ...(config.isDevelopment && { stack: err.stack }),
  });
}; 