import { createClient } from 'redis';
import type { RedisClientType } from 'redis';
import { config } from '../config/config';
import { logger } from './logger';

const REDIS_URL = config.redis.url;
const REFRESH_TOKEN_TTL = 60 * 60 * 24 * 7; // 7 days in seconds

class RedisService {
  private static instance: RedisService;
  private client: RedisClientType;
  private isConnected: boolean = false;

  private constructor() {
    this.client = createClient({
      url: REDIS_URL,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 5) {
            logger.error('Max Redis reconnection attempts reached');
            return new Error('Max reconnection attempts reached');
          }
          return Math.min(retries * 100, 5000);
        },
      },
    });

    this.setupEventListeners();
  }

  public static getInstance(): RedisService {
    if (!RedisService.instance) {
      RedisService.instance = new RedisService();
    }
    return RedisService.instance;
  }

  private setupEventListeners(): void {
    this.client.on('error', (err) => {
      logger.error('Redis client error:', err);
      this.isConnected = false;
    });

    this.client.on('connect', () => {
      logger.info('Redis client connected');
      this.isConnected = true;
    });

    this.client.on('reconnecting', () => {
      logger.info('Redis client reconnecting...');
      this.isConnected = false;
    });
  }

  public async connect(): Promise<void> {
    if (this.isConnected) return;
    
    try {
      await this.client.connect();
      this.isConnected = true;
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  public async set(key: string, value: string, ttlInSeconds?: number): Promise<boolean> {
    try {
      await this.ensureConnected();
      
      if (ttlInSeconds) {
        await this.client.set(key, value, { EX: ttlInSeconds });
      } else {
        await this.client.set(key, value);
      }
      
      return true;
    } catch (error) {
      logger.error('Redis set error:', error);
      throw error;
    }
  }

  public async get(key: string): Promise<string | null> {
    try {
      await this.ensureConnected();
      return await this.client.get(key);
    } catch (error) {
      logger.error('Redis get error:', error);
      throw error;
    }
  }

  public async delete(key: string): Promise<boolean> {
    try {
      await this.ensureConnected();
      const result = await this.client.del(key);
      return result > 0;
    } catch (error) {
      logger.error('Redis delete error:', error);
      throw error;
    }
  }

  public async setRefreshToken(userId: string, token: string): Promise<boolean> {
    const key = `refresh_token:${userId}`;
    return this.set(key, token, REFRESH_TOKEN_TTL);
  }

  public async getRefreshToken(userId: string): Promise<string | null> {
    const key = `refresh_token:${userId}`;
    return this.get(key);
  }

  public async deleteRefreshToken(userId: string): Promise<boolean> {
    const key = `refresh_token:${userId}`;
    return this.delete(key);
  }

  public async disconnect(): Promise<void> {
    if (this.isConnected) {
      try {
        await this.client.quit();
        this.isConnected = false;
        logger.info('Redis client disconnected');
      } catch (error) {
        logger.error('Error disconnecting from Redis:', error);
        throw error;
      }
    }
  }

  private async ensureConnected(): Promise<void> {
    if (!this.isConnected) {
      await this.connect();
    }
  }
}

// Create and export a singleton instance
const redis = RedisService.getInstance();
export { redis, RedisService };
