import { Server } from 'http';
import { Express } from 'express';

declare module 'express' {
  interface Application {
    listen(port: number, callback?: () => void): Server;
    get(path: string, ...handlers: any[]): Express;
    use(...handlers: any[]): Express;
  }
} 