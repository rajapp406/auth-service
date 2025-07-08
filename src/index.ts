import express from 'express';
import cors from 'cors';
import { Config } from './core/config/Config';
import { AuthController } from './controllers/AuthController';
import { AuthRouteFactory } from './core/routes/AuthRouteFactory';
import { Logger } from './core/logger/Logger';
import { SwaggerProvider } from './core/providers/SwaggerProvider';
import { errorHandler } from './middleware/error.middleware';
import { rateLimiter } from './middleware/rate-limiter.middleware';
import { connectRedis } from './config/redis';
import { userServiceClient } from './infrastructure/grpc/UserServiceClient';

const app = express();
const config = new Config();
const logger = new Logger(config);
const authController = new AuthController(config, logger);

// Handle graceful shutdown
const shutdown = async (server: any, signal?: string) => {
  logger.info(`Received ${signal || 'shutdown'} signal. Shutting down gracefully...`);
  
  try {
    // Close the gRPC client
    await userServiceClient.close();
    logger.info('gRPC client closed successfully');
    
    // Close the HTTP server if it exists
    if (server) {
      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });

      // Force close after 10 seconds
      setTimeout(() => {
        logger.warn('Forcing shutdown after timeout');
        process.exit(1);
      }, 10000);
    } else {
      process.exit(0);
    }
  } catch (error) {
    logger.error('Error during shutdown', { error: error instanceof Error ? error.message : 'Unknown error' });
    process.exit(1);
  }
};

// Swagger UI
new SwaggerProvider(config, logger).register(app);

app.use(cors({
  origin: config.getSecurityConfig().corsOrigin,
  credentials: true
}));
app.use(express.json());
//app.use(rateLimiter);

// Routes
const authRouterV1 = new AuthRouteFactory(authController).createRouter('v1');
const authRouterV2 = new AuthRouteFactory(authController).createRouter('v2');
app.use('/api/v1/auth', authRouterV1);
app.use('/api/v2/auth', authRouterV2);

// Error handling middleware
app.use(errorHandler);

const PORT = config.getServerConfig().port;

// Initialize Redis connection before starting the server
const startServer = async () => {
  let server: any;
  
  try {
    // Connect to Redis
    logger.info('Connecting to Redis...');
    await connectRedis();
    logger.info('Successfully connected to Redis');

    // Start the server
    server = app.listen(PORT, () => {
      logger.info(`Auth Service running on port ${PORT}`);
    });

    // Set up signal handlers
    process.on('SIGTERM', () => shutdown(server, 'SIGTERM'));
    process.on('SIGINT', () => shutdown(server, 'SIGINT'));
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
      shutdown(server, 'uncaughtException');
    });
    
    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', { promise, reason });
      shutdown(server, 'unhandledRejection');
    });
    
  } catch (error) {
    console.error('Failed to start Auth Service:', error);
    process.exit(1);
  }
};

// Start the server
startServer();