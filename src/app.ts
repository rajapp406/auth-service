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

const app = express();
const config = new Config();
const logger = new Logger(config);
const authController = new AuthController(config, logger);
const authRouteFactory = new AuthRouteFactory(authController);
console.log(authRouteFactory, 'authRouteFactory')
// Middleware
app.use(cors({
  origin: config.getSecurityConfig().corsOrigin,
  credentials: true
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