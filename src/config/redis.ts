import { createClient } from 'redis';
import { config } from './config';
import { logger } from './logger';

const redisClient = createClient({
  url: config.redis.url,
});

redisClient.on('error', (err) => {
  logger.error('Redis Client Error:', err);
});

redisClient.on('connect', () => {
  logger.info('Connected to Redis');
});

redisClient.on('reconnecting', () => {
  logger.info('Reconnecting to Redis');
});

export const connectRedis = async () => {
  try {
    await redisClient.connect();
  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
    process.exit(1);
  }
};

export { redisClient }; 