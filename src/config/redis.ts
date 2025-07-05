import { createClient } from 'redis';
import { config } from './config';
import { logger } from './logger';

const redisClient = createClient({
  url: config.redis.url,
  socket: {
    reconnectStrategy: (retries) => {
      logger.warn(`Redis reconnecting attempt ${retries}`);
      if (retries > 5) {
        logger.error('Max Redis reconnection attempts reached');
        return new Error('Max reconnection attempts reached');
      }
      // Reconnect after waiting
      return Math.min(retries * 100, 5000);
    },
  },
});

// Log Redis connection events
redisClient.on('error', (err) => {
  logger.error('Redis Client Error:', err);});

redisClient.on('connect', () => {
  logger.info('Connected to Redis server');
});

redisClient.on('ready', () => {
  logger.info('Redis client is ready to use');});

redisClient.on('reconnecting', () => {
  logger.info('Redis client is reconnecting...');
});

redisClient.on('end', () => {
  logger.warn('Redis client connection closed');
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