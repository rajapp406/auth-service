import { Application, Router, Request, Response, NextFunction, RequestHandler } from 'express';
import { Config } from '../config/Config';
import { ILogger } from '../interfaces/ILogger';
import { IRouteProvider } from '../interfaces/IRouteProvider';
import { VersionMiddleware } from '../middleware/VersionMiddleware';
import { IRouteFactory } from '../interfaces/IRouteFactory';

export class RouteProvider implements IRouteProvider {
  private readonly versionMiddleware: VersionMiddleware;

  constructor(
    private readonly config: Config,
    private readonly logger: ILogger,
    private readonly routeFactories: IRouteFactory[]
  ) {
    this.versionMiddleware = VersionMiddleware.getInstance(config, logger);
  }

  public async register(app: Application): Promise<void> {
    try {
      // Create base router for API
      const apiRouter = Router();

      // Add version middleware to validate API version
      const validateVersionMiddleware: RequestHandler = async (req, res, next) => {
        try {
          await this.versionMiddleware.validateVersion(req, res, next);
        } catch (error) {
          next(error);
        }
      };
      apiRouter.use('/:version', validateVersionMiddleware);

      // Register routes for each version
      this.versionMiddleware.getSupportedVersions().forEach(version => {
        const versionRouter = Router();

        // Register all route factories for this version
        this.routeFactories.forEach(factory => {
          const router = factory.createRouter(version);
          versionRouter.use(router);
        });

        // Mount version router
        apiRouter.use(`/${version}`, versionRouter);
      });

      // Mount API router at base path
      app.use('/api', apiRouter);

      // Add redirect from base API path to latest version
      app.get('/api', (req: Request, res: Response) => {
        const latestVersion = this.versionMiddleware.getLatestVersion();
        res.redirect(`/api/${latestVersion}`);
      });

      this.logger.info('Routes registered successfully');
    } catch (error) {
      this.logger.error('Failed to register routes:', error);
      throw error;
    }
  }
} 