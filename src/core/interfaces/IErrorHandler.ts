import { Application, Request, Response } from 'express';
import { NextFunction } from 'connect';

export interface IErrorHandler {
  register(app: Application): Promise<void>;
  handleError(err: Error, req: Request, res: Response, next: NextFunction): Response | void;
} 