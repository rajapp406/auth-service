import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';

export const errorHandler: ErrorRequestHandler = (err: any, req: Request, res: Response, next: NextFunction): void => {
  console.error(err.stack);

  if (err.name === 'UnauthorizedError') {
    res.status(401).json({
      status: 'error',
      message: 'Unauthorized access'
    });
    return;
  }

  if (err.name === 'ValidationError') {
    res.status(400).json({
      status: 'error',
      message: err.message
    });
    return;
  }

  res.status(500).json({
    status: 'error',
    message: 'Internal server error'
  });
}; 