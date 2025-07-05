import express, { Application as ExpressApp, RequestHandler } from 'express';
import { Server } from 'http';
import { IMiddlewareProvider } from './interfaces/IMiddlewareProvider';
import { IRouteProvider } from './interfaces/IRouteProvider';
import { IErrorHandler } from './interfaces/IErrorHandler';
import { ILogger } from './interfaces/ILogger';
import { SwaggerProvider } from './providers/SwaggerProvider';
import { Config } from './config/Config';

export class FitnessApplication {
  private static instance: FitnessApplication;
  private readonly app: ExpressApp;
  private server: Server | null = null;

  private constructor(
    private readonly config: Config,
    private readonly middlewareProvider: IMiddlewareProvider,
    private readonly routeProvider: IRouteProvider,
    private readonly errorHandler: IErrorHandler,
    private readonly logger: ILogger
  ) {
    this.app = express();
    this.setupSwagger();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  public static getInstance(
    config: Config,
    middlewareProvider: IMiddlewareProvider,
    routeProvider: IRouteProvider,
    errorHandler: IErrorHandler,
    logger: ILogger
  ): FitnessApplication {
    if (!FitnessApplication.instance) {
      FitnessApplication.instance = new FitnessApplication(
        config,
        middlewareProvider,
        routeProvider,
        errorHandler,
        logger
      );
    }
    return FitnessApplication.instance;
  }

  private setupSwagger(): void {
    const swaggerProvider = new SwaggerProvider(this.config, this.logger);
    swaggerProvider.register(this.app);
  }

  private setupMiddleware(): void {
    this.middlewareProvider.register(this.app);
  }

  private setupRoutes(): void {
    this.routeProvider.register(this.app);
  }

  private setupErrorHandling(): void {
    this.errorHandler.register(this.app);
  }

  public async initialize(): Promise<void> {
    try {
      this.logger.info('Application initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize application:', error);
      throw error;
    }
  }

  public async start(port: number): Promise<void> {
    try {
      this.server = this.app.listen(port, () => {
        this.logger.info(`Server is running on port ${port}`);
      });
    } catch (error) {
      this.logger.error('Failed to start server:', error);
      throw error;
    }
  }

  public async shutdown(): Promise<void> {
    if (this.server) {
      await new Promise<void>((resolve, reject) => {
        this.server?.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      this.logger.info('Server shutdown complete');
    }
  }

  public getExpressApp(): ExpressApp {
    return this.app;
  }

  public use(...handlers: RequestHandler[]): void {
    this.app.use(...handlers);
  }
} 