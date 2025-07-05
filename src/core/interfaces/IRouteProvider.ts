import express from 'express';

export interface IRouteProvider {
  register(app: express.Application): Promise<void>;
} 