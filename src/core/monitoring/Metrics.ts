import { ILogger } from '../interfaces/ILogger';
import { MetricsConfig } from '../config/Config';

export interface MetricPoint {
  timestamp: Date;
  value: number;
}

export interface ServiceMetrics {
  requestCount: number;
  responseTime: MetricPoint[];
  errorCount: number;
  activeConnections: number;
  memoryUsage: MetricPoint[];
  cpuUsage: MetricPoint[];
}

export class MetricsCollector {
  private static instance: MetricsCollector;
  private metrics: ServiceMetrics;
  private readonly retentionPeriod: number;
  private collectionInterval: NodeJS.Timeout | null = null;

  private constructor(
    private readonly logger: ILogger,
    private readonly config: MetricsConfig
  ) {
    this.retentionPeriod = config.retention;
    this.metrics = this.initializeMetrics();
  }

  public static getInstance(logger: ILogger, config: MetricsConfig): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector(logger, config);
    }
    return MetricsCollector.instance;
  }

  private initializeMetrics(): ServiceMetrics {
    return {
      requestCount: 0,
      responseTime: [],
      errorCount: 0,
      activeConnections: 0,
      memoryUsage: [],
      cpuUsage: []
    };
  }

  public start(): void {
    if (this.config.enabled && !this.collectionInterval) {
      this.collectionInterval = setInterval(() => {
        this.collectMetrics();
        this.cleanOldMetrics();
      }, this.config.interval);
      this.logger.info('Metrics collection started');
    }
  }

  public stop(): void {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = null;
      this.logger.info('Metrics collection stopped');
    }
  }

  public getMetrics(): ServiceMetrics {
    return { ...this.metrics };
  }

  public recordRequest(): void {
    this.metrics.requestCount++;
  }

  public recordError(): void {
    this.metrics.errorCount++;
  }

  public recordResponseTime(duration: number): void {
    this.metrics.responseTime.push({
      timestamp: new Date(),
      value: duration
    });
  }

  private async collectMetrics(): Promise<void> {
    try {
      // Collect memory metrics
      const memUsage = process.memoryUsage();
      this.metrics.memoryUsage.push({
        timestamp: new Date(),
        value: memUsage.heapUsed
      });

      // Collect CPU metrics
      const cpuUsage = process.cpuUsage();
      this.metrics.cpuUsage.push({
        timestamp: new Date(),
        value: (cpuUsage.user + cpuUsage.system) / 1000000
      });

      this.logger.debug('Metrics collected successfully');
    } catch (error) {
      this.logger.error('Error collecting metrics:', error);
    }
  }

  private cleanOldMetrics(): void {
    const now = Date.now();
    const cutoff = now - this.retentionPeriod;

    // Clean up time-series metrics
    ['responseTime', 'memoryUsage', 'cpuUsage'].forEach((metric) => {
      this.metrics[metric as keyof Pick<ServiceMetrics, 'responseTime' | 'memoryUsage' | 'cpuUsage'>] = this.metrics[metric as keyof Pick<ServiceMetrics, 'responseTime' | 'memoryUsage' | 'cpuUsage'>].filter(
        (point: MetricPoint) => point.timestamp.getTime() > cutoff
      );
    });

    // Reset counters periodically
    if (now % (this.retentionPeriod) === 0) {
      this.metrics.requestCount = 0;
      this.metrics.errorCount = 0;
    }
  }
} 