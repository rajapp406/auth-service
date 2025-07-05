import { ILogger } from '../interfaces/ILogger';
import { IDatabaseClient } from '../interfaces/IDatabaseClient';
import { ICacheClient } from '../interfaces/ICacheClient';

export interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: Date;
  services: {
    database: {
      status: 'up' | 'down';
      latency: number;
    };
    cache: {
      status: 'up' | 'down';
      latency: number;
    };
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    cpu: {
      usage: number;
    };
  };
}

export class HealthCheck {
  private static instance: HealthCheck;

  private constructor(
    private readonly logger: ILogger,
    private readonly dbClient: IDatabaseClient,
    private readonly cacheClient: ICacheClient
  ) {}

  public static getInstance(
    logger: ILogger,
    dbClient: IDatabaseClient,
    cacheClient: ICacheClient
  ): HealthCheck {
    if (!HealthCheck.instance) {
      HealthCheck.instance = new HealthCheck(logger, dbClient, cacheClient);
    }
    return HealthCheck.instance;
  }

  public async check(): Promise<HealthStatus> {
    const startTime = Date.now();
    const status: HealthStatus = {
      status: 'healthy',
      timestamp: new Date(),
      services: {
        database: await this.checkDatabase(),
        cache: await this.checkCache(),
        memory: this.checkMemory(),
        cpu: await this.checkCPU()
      }
    };

    // Determine overall health
    if (status.services.database.status === 'down' || 
        status.services.cache.status === 'down' ||
        status.services.memory.percentage > 90 ||
        status.services.cpu.usage > 90) {
      status.status = 'unhealthy';
    }

    const duration = Date.now() - startTime;
    this.logger.info(`Health check completed in ${duration}ms`, { status });

    return status;
  }

  private async checkDatabase(): Promise<{ status: 'up' | 'down'; latency: number }> {
    const start = Date.now();
    try {
      await this.dbClient.connect();
      return { status: 'up', latency: Date.now() - start };
    } catch (error) {
      this.logger.error('Database health check failed:', error);
      return { status: 'down', latency: Date.now() - start };
    }
  }

  private async checkCache(): Promise<{ status: 'up' | 'down'; latency: number }> {
    const start = Date.now();
    try {
      await this.cacheClient.connect();
      return { status: 'up', latency: Date.now() - start };
    } catch (error) {
      this.logger.error('Cache health check failed:', error);
      return { status: 'down', latency: Date.now() - start };
    }
  }

  private checkMemory(): { used: number; total: number; percentage: number } {
    const used = process.memoryUsage().heapUsed;
    const total = process.memoryUsage().heapTotal;
    const percentage = (used / total) * 100;
    return { used, total, percentage };
  }

  private async checkCPU(): Promise<{ usage: number }> {
    const cpuUsage = process.cpuUsage();
    const usage = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds
    return { usage };
  }
} 