import { Request, Response, NextFunction } from 'express';
import { Config } from '../config/Config';
import { ILogger } from '../interfaces/ILogger';

export class VersionMiddleware {
  private static instance: VersionMiddleware;
  private readonly supportedVersions: string[];

  private constructor(
    private readonly config: Config,
    private readonly logger: ILogger
  ) {
    // Define supported API versions
    this.supportedVersions = ['v1', 'v2'];
  }

  public static getInstance(config: Config, logger: ILogger): VersionMiddleware {
    if (!VersionMiddleware.instance) {
      VersionMiddleware.instance = new VersionMiddleware(config, logger);
    }
    return VersionMiddleware.instance;
  }

  public validateVersion(req: any, res: Response, next: NextFunction): Response | void {
    const version = req.params.version;

    if (!version) {
      this.logger.warn('API version not specified in request');
      return res.status(400).json({
        status: 'error',
        message: 'API version is required'
      });
    }

    if (!this.supportedVersions.includes(version)) {
      this.logger.warn(`Unsupported API version requested: ${version}`);
      return res.status(400).json({
        status: 'error',
        message: `API version ${version} is not supported. Supported versions: ${this.supportedVersions.join(', ')}`
      });
    }

    // Add version to request for use in route handlers
    req.apiVersion = version;
    next();
  }

  public getLatestVersion(): string {
    return this.supportedVersions[this.supportedVersions.length - 1];
  }

  public getSupportedVersions(): string[] {
    return [...this.supportedVersions];
  }
} 