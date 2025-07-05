import express from 'express';

export interface IMiddlewareProvider {
  register(app: express.Application): Promise<void>;
} 