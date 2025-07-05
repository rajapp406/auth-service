import { PrismaClient as Prisma } from '@prisma/client';
import { IDatabaseClient } from '../../core/interfaces/IDatabaseClient';
import { ILogger } from '../../core/interfaces/ILogger';

export class PrismaClient implements IDatabaseClient {
  private static instance: PrismaClient;
  private client: Prisma;

  private constructor(private readonly logger: ILogger) {
    this.client = new Prisma();
  }

  public static getInstance(logger: ILogger): PrismaClient {
    if (!PrismaClient.instance) {
      PrismaClient.instance = new PrismaClient(logger);
    }
    return PrismaClient.instance;
  }

  public async connect(): Promise<void> {
    try {
      await this.client.$connect();
      this.logger.info('Successfully connected to database');
    } catch (error) {
      this.logger.error('Failed to connect to database:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await this.client.$disconnect();
      this.logger.info('Successfully disconnected from database');
    } catch (error) {
      this.logger.error('Failed to disconnect from database:', error);
      throw error;
    }
  }

  public getClient(): Prisma {
    return this.client;
  }
} 