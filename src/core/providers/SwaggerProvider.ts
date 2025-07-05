import { Application } from 'express';
import swaggerUi from 'swagger-ui-express';
import { Config } from '../config/Config';
import { swaggerConfig } from '../swagger/swagger';
import { ILogger } from '../interfaces/ILogger';

export class SwaggerProvider {
  constructor(
    private readonly config: Config,
    private readonly logger: ILogger
  ) {}

  public register(app: Application): void {
    try {
      const swaggerDocs = swaggerConfig(this.config);
      app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));
      this.logger.info(`Swagger UI available at http://localhost:${this.config.getServerConfig().port}/api-docs`);
    } catch (error) {
      this.logger.error('Failed to initialize Swagger:', error);
      throw error;
    }
  }
} 