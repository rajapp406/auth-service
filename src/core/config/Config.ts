import dotenv from 'dotenv';
import os from 'os';

export interface SecurityConfig {
  corsOrigin: string | string[];
  jwtSecret: string;
  jwtExpiresIn: string;
}

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export interface LoggerConfig {
  level: string;
  filename?: string;
  stream?: NodeJS.WritableStream;
}

export interface ServerConfig {
  port: number;
  apiVersion: string;
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
}

export interface ScalingConfig {
  minWorkers?: number;
  maxWorkers?: number;
  workerRestartDelay?: number;
  healthCheckInterval?: number;
  loadBalancingStrategy?: 'round-robin' | 'least-connections';
}

export interface MetricsConfig {
  enabled: boolean;
  interval: number;
  retention: number;
}

export class Config {
  constructor() {
    dotenv.config();
  }

  public get(key: string): string | undefined {
    return process.env[key];
  }

  public getNumber(key: string, defaultValue?: number): number {
    const value = this.get(key);
    return value ? parseInt(value, 10) : (defaultValue || 0);
  }

  public getBoolean(key: string, defaultValue = false): boolean {
    const value = this.get(key);
    if (value === undefined) return defaultValue;
    return value.toLowerCase() === 'true';
  }

  public getArray(key: string, defaultValue: string[] = []): string[] {
    const value = this.get(key);
    return value ? value.split(',') : defaultValue;
  }

  public getSecurityConfig(): SecurityConfig {
    return {
      corsOrigin: this.getArray('CORS_ORIGIN', [
        'http://localhost:3101',
        'http://localhost:3000',
        'http://localhost:4001',
        'http://localhost:5173',
        'http://127.0.0.1:5173'
      ]),
      jwtSecret: this.get('JWT_SECRET') || 'your-super-secret-key-change-in-production',
      jwtExpiresIn: this.get('JWT_EXPIRES_IN') || '1d'
    };
  }

  public getRateLimitConfig(): RateLimitConfig {
    return {
      maxRequests: this.getNumber('RATE_LIMIT_MAX', 100),
      windowMs: this.getNumber('RATE_LIMIT_WINDOW', 900000)
    };
  }

  public getLoggerConfig(): LoggerConfig {
    return {
      level: this.get('LOG_LEVEL') || 'info',
      filename: this.get('LOG_FILE') || 'logs/app.log'
    };
  }

  public getServerConfig(): ServerConfig {
    return {
      port: this.getNumber('PORT', 3101),
      apiVersion: this.get('API_VERSION') || 'v2'
    };
  }

  public getRedisConfig(): RedisConfig {
    return {
      host: this.get('REDIS_HOST') || 'localhost',
      port: this.getNumber('REDIS_PORT', 6379),
      password: this.get('REDIS_PASSWORD'),
      db: this.getNumber('REDIS_DB', 0)
    };
  }

  public getScalingConfig(): ScalingConfig {
    return {
      minWorkers: this.getNumber('SCALING_MIN_WORKERS', 1),
      maxWorkers: this.getNumber('SCALING_MAX_WORKERS', os.cpus().length),
      workerRestartDelay: this.getNumber('SCALING_WORKER_RESTART_DELAY', 1000),
      healthCheckInterval: this.getNumber('SCALING_HEALTH_CHECK_INTERVAL', 30000),
      loadBalancingStrategy: (this.get('SCALING_LOAD_BALANCING_STRATEGY') || 'round-robin') as 'round-robin' | 'least-connections'
    };
  }

  public getMetricsConfig(): MetricsConfig {
    return {
      enabled: this.getBoolean('METRICS_ENABLED', true),
      interval: this.getNumber('METRICS_INTERVAL', 10000),
      retention: this.getNumber('METRICS_RETENTION', 24 * 60 * 60 * 1000) // 24 hours
    };
  }

  public getIsDevelopment(): boolean {
    return this.get('NODE_ENV') === 'development';
  }

  public getIsProduction(): boolean {
    return this.get('NODE_ENV') === 'production';
  }
} 