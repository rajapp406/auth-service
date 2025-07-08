import express from 'express';
import cors from 'cors';
import { Config } from './core/config/Config';
import { Logger } from './core/logger/Logger';
import { AuthController } from './controllers/AuthController';
import { AuthRouteFactory } from './core/routes/AuthRouteFactory';
import { errorHandler } from './middleware/error.middleware';
import { rateLimiter } from './middleware/rate-limiter.middleware';
import swaggerUi from 'swagger-ui-express';
import { swaggerConfig } from './core/swagger/swagger';
import { connectRedis } from './config/redis';

const app = express();
const config = new Config();
const logger = new Logger(config);

// Initialize Redis connection
connectRedis().catch(error => {
  logger.error('Failed to connect to Redis:', error);
  process.exit(1);
});

const authController = new AuthController(config, logger);
const authRouteFactory = new AuthRouteFactory(authController);
logger.info('Auth route factory initialized');
// Middleware
const securityConfig = config.getSecurityConfig();
app.use(cors({
  origin: securityConfig.corsOrigin,
  credentials: true,  // Important: Allow credentials
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['set-cookie'],
  optionsSuccessStatus: 200  // Some legacy browsers choke on 204
}));

// Handle preflight requests
app.options('*', cors({
  origin: securityConfig.corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(rateLimiter);

// Routes
const v1Router = authRouteFactory.createRouter('v1');
const v2Router = authRouteFactory.createRouter('v2');
app.use('/api/v1/auth', v1Router);
app.use('/api/v2/auth', v2Router);

// Swagger documentation
const swaggerDocs = swaggerConfig(config);
app.get('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Error handling
app.use(errorHandler);

const PORT = config.getServerConfig().port;

app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});

export { app }; 