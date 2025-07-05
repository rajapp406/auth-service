import Redis from 'ioredis';
import { ICacheClient } from '../../core/interfaces/ICacheClient';
import { ILogger } from '../../core/interfaces/ILogger';
import { Config } from '../../core/config/Config';

export class RedisClient implements ICacheClient {
  private static instance: RedisClient;
  private client: Redis;

  private constructor(
    private readonly config: Config,
    private readonly logger: ILogger
  ) {
    this.client = new Redis({
      host: config.getRedisConfig().host,
      port: config.getRedisConfig().port,
      password: config.getRedisConfig().password,
      db: config.getRedisConfig().db
    });
  }

  public static getInstance(config: Config, logger: ILogger): RedisClient {
    if (!RedisClient.instance) {
      RedisClient.instance = new RedisClient(config, logger);
    }
    return RedisClient.instance;
  }

  public async connect(): Promise<void> {
    try {
      await this.client.ping();
      this.logger.info('Successfully connected to Redis');
    } catch (error) {
      this.logger.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await this.client.quit();
      this.logger.info('Successfully disconnected from Redis');
    } catch (error) {
      this.logger.error('Failed to disconnect from Redis:', error);
      throw error;
    }
  }

  public getClient(): Redis {
    return this.client;
  }
} 