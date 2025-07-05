import { Server as HttpServer } from 'http';
import { Config } from './core/config/Config';
import { ILogger } from './core/interfaces/ILogger';
import { IDatabaseClient } from './core/interfaces/IDatabaseClient';
import { ICacheClient } from './core/interfaces/ICacheClient';
import { FitnessApplication } from './core/Application';
import { MiddlewareProvider } from './core/providers/MiddlewareProvider';
import { RouteProvider } from './core/routes/RouteProvider';
import { ErrorHandler } from './core/error/ErrorHandler';
import { HealthCheck } from './core/monitoring/HealthCheck';
import { MetricsCollector } from './core/monitoring/Metrics';
import { AuthRouteFactory } from './core/routes/AuthRouteFactory';
import { AuthController } from './controllers/AuthController';

export class FitnessServer {
  private static instance: FitnessServer;
  private server: HttpServer | null = null;
  private readonly app: FitnessApplication;
  private readonly healthCheck: HealthCheck;
  private readonly metricsCollector: MetricsCollector;

  private constructor(
    private readonly config: Config,
    private readonly logger: ILogger,
    private readonly dbClient: IDatabaseClient,
    private readonly cacheClient: ICacheClient
  ) {
    const middlewareProvider = new MiddlewareProvider.Builder()
      .withConfig(config)
      .withLogger(logger)
      .build();

    const authController = new AuthController(config, logger);
    const routeFactories = [
      new AuthRouteFactory(authController)
    ];

    const routeProvider = new RouteProvider(config, logger, routeFactories);
    const errorHandler = ErrorHandler.getInstance(config, logger);

    this.app = FitnessApplication.getInstance(
      config,
      middlewareProvider,
      routeProvider,
      errorHandler,
      logger
    );

    this.healthCheck = HealthCheck.getInstance(logger, dbClient, cacheClient);
    this.metricsCollector = MetricsCollector.getInstance(logger, config.getMetricsConfig());
  }

  public static getInstance(
    config: Config,
    logger: ILogger,
    dbClient: IDatabaseClient,
    cacheClient: ICacheClient
  ): FitnessServer {
    if (!FitnessServer.instance) {
      FitnessServer.instance = new FitnessServer(config, logger, dbClient, cacheClient);
    }
    return FitnessServer.instance;
  }

  public async start(): Promise<void> {
    try {
      await this.app.initialize();
      
      // Start metrics collection
      if (this.config.getMetricsConfig().enabled) {
        this.metricsCollector.start();
      }

      // Create HTTP server
      this.server = new HttpServer(this.app.getExpressApp());

      // Start listening
      this.server.listen(this.config.getServerConfig().port, () => {
        this.logger.info(`Server is running on port ${this.config.getServerConfig().port}`);
        this.logger.info(`Swagger documentation available at http://localhost:${this.config.getServerConfig().port}/api-docs`);
      });

      // Handle server errors
      this.server.on('error', (error) => {
        this.logger.error('Server error:', error);
      });

    } catch (error) {
      this.logger.error('Failed to start server:', error);
      throw error;
    }
  }

  public async stop(): Promise<void> {
    try {
      if (this.server) {
        this.server.close();
        this.server = null;
      }

      // Stop metrics collection
      this.metricsCollector.stop();

      // Close database connection
      await this.dbClient.disconnect();

      // Close cache connection
      await this.cacheClient.disconnect();

      this.logger.info('Server stopped successfully');
    } catch (error) {
      this.logger.error('Error stopping server:', error);
      throw error;
    }
  }
} 
