import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';

export const notFoundHandler = (_req: Request, _res: Response, _next: NextFunction): void => {
  throw new AppError(404, 'Route not found');
}; 