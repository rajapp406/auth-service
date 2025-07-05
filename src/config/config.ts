import { z } from 'zod';

const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3005'),
  API_VERSION: z.string().default('v1'),

  // Database
  DATABASE_URL: z.string(),

  // JWT
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRATION: z.string().default('15m'),
  JWT_REFRESH_EXPIRATION: z.string().default('7d'),

  // Redis
  REDIS_URL: z.string(),

  // Rate Limiting
  RATE_LIMIT_WINDOW: z.string().default('15m'),
  RATE_LIMIT_MAX_REQUESTS: z.string().default('100'),

  // Security
  BCRYPT_ROUNDS: z.string().default('12'),
  CORS_ORIGIN: z.string().default('http://localhost:3101'),
});

const parseEnv = () => {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ Invalid environment variables:', JSON.stringify(result.error.format(), null, 2));
    process.exit(1);
  }

  return result.data;
};

const env = parseEnv();

export const config = {
  env: env.NODE_ENV,
  isProduction: env.NODE_ENV === 'production',
  isDevelopment: env.NODE_ENV === 'development',
  isTest: env.NODE_ENV === 'test',
  
  server: {
    port: parseInt(env.PORT, 10),
    apiVersion: env.API_VERSION,
  },

  db: {
    url: env.DATABASE_URL,
  },

  jwt: {
    accessSecret: env.JWT_ACCESS_SECRET,
    refreshSecret: env.JWT_REFRESH_SECRET,
    accessExpirationInterval: env.JWT_ACCESS_EXPIRATION,
    refreshExpirationInterval: env.JWT_REFRESH_EXPIRATION,
  },

  redis: {
    url: env.REDIS_URL,
  },

  security: {
    bcryptRounds: parseInt(env.BCRYPT_ROUNDS, 10),
    corsOrigin: env.CORS_ORIGIN,
  },

  rateLimit: {
    window: env.RATE_LIMIT_WINDOW,
    maxRequests: parseInt(env.RATE_LIMIT_MAX_REQUESTS, 10),
  },
} as const; 