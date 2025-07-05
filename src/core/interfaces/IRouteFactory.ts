import { Router } from 'express';

export interface IRouteFactory {
  createRouter(version: string): Router;
} 