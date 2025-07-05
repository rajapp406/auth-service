import express from 'express';
import cors from 'cors';
import { Config } from './core/config/Config';
import { AuthController } from './controllers/AuthController';
import { AuthRouteFactory } from './core/routes/AuthRouteFactory';
import { Logger } from './core/logger/Logger';
import { SwaggerProvider } from './core/providers/SwaggerProvider';
import { errorHandler } from './middleware/error.middleware';
import { rateLimiter } from './middleware/rate-limiter.middleware';

const app = express();
const config = new Config();
const logger = new Logger(config);
const authController = new AuthController(config, logger);

// Swagger UI
new SwaggerProvider(config, logger).register(app);

app.use(cors({
  origin: config.getSecurityConfig().corsOrigin,
  credentials: true
}));
app.use(express.json());
app.use(rateLimiter);

// Routes
const authRouterV1 = new AuthRouteFactory(authController).createRouter('v1');
const authRouterV2 = new AuthRouteFactory(authController).createRouter('v2');
app.use('/api/v1/auth', authRouterV1);
app.use('/api/v2/auth', authRouterV2);

// Error handling
app.use(errorHandler);

const PORT = config.getServerConfig().port;

app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
}); 