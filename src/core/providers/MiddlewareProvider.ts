import { Application } from 'express';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { IMiddlewareProvider } from '../interfaces/IMiddlewareProvider';
import { ILogger } from '../interfaces/ILogger';
import { Config } from '../config/Config';

export class MiddlewareProvider implements IMiddlewareProvider {
  private constructor(
    private readonly config: Config,
    private readonly logger: ILogger
  ) {}

  public static Builder = class {
    private config!: Config;
    private logger!: ILogger;

    public withConfig(config: Config): this {
      this.config = config;
      return this;
    }

    public withLogger(logger: ILogger): this {
      this.logger = logger;
      return this;
    }

    public build(): MiddlewareProvider {
      if (!this.config || !this.logger) {
        throw new Error('Config and Logger are required to build MiddlewareProvider');
      }
      return new MiddlewareProvider(this.config, this.logger);
    }
  };

  public async register(app: Application): Promise<void> {
    try {
      // Body parsing middleware (before security middleware to properly handle JSON)
      this.registerBodyParsingMiddleware(app);
      
      // Security middleware
      this.registerSecurityMiddleware(app);
      
      // Compression middleware
      app.use(compression());
      
      // Logging middleware
      this.registerLoggingMiddleware(app);

      this.logger.info('Middleware registration completed');
    } catch (error) {
      this.logger.error('Failed to register middleware:', error);
      throw error;
    }
  }

  private registerSecurityMiddleware(app: Application): void {
    // Configure trust proxy to handle X-Forwarded-* headers
    // This is important when running behind a reverse proxy like Nginx or a load balancer
    app.set('trust proxy', this.config.getIsDevelopment() ? 1 : 'loopback');
    
    // Configure Helmet with less restrictive settings for development
    if (this.config.getIsDevelopment()) {
      app.use(helmet({
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false
      }));
    } else {
      app.use(helmet());
    }

    // Configure CORS
    const corsOptions = {
      origin: this.config.getIsDevelopment() ? '*' : this.config.getSecurityConfig().corsOrigin,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
      maxAge: 86400 // 24 hours
    };
    app.use(cors(corsOptions));

    // Configure rate limiting
    const limiter = rateLimit({
      windowMs: this.config.getRateLimitConfig().windowMs,
      max: this.config.getRateLimitConfig().maxRequests,
      standardHeaders: true,
      legacyHeaders: false,
    });
    app.use(limiter);
  }

  private registerBodyParsingMiddleware(app: Application): void {
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
  }

  private registerLoggingMiddleware(app: Application): void {
    if (this.config.getIsDevelopment()) {
      app.use(morgan('dev'));
    } else {
      app.use(morgan('combined', { stream: this.config.getLoggerConfig().stream }));
    }
  }
} 