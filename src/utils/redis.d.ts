import { RedisClientType } from 'redis';

declare class RedisService {
  private static instance: RedisService;
  private client: RedisClientType;
  private isConnected: boolean;
  private constructor();
  public static getInstance(): RedisService;
  public connect(): Promise<void>;
  public set(key: string, value: string, ttlInSeconds?: number): Promise<boolean>;
  public get(key: string): Promise<string | null>;
  public delete(key: string): Promise<boolean>;
  public setRefreshToken(userId: string, token: string): Promise<boolean>;
  public getRefreshToken(userId: string): Promise<string | null>;
  public deleteRefreshToken(userId: string): Promise<boolean>;
  public disconnect(): Promise<void>;
  private ensureConnected(): Promise<void>;
}

declare const redis: RedisService;

export { redis, RedisService };
