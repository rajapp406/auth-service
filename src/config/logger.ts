import winston from 'winston';
import { config } from './config';

const formatConfig = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const developmentFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.simple()
);

export const logger = winston.createLogger({
  level: config.isProduction ? 'info' : 'debug',
  format: config.isProduction ? formatConfig : developmentFormat,
  transports: [
    new winston.transports.Console({
      stderrLevels: ['error'],
    }),
  ],
});

if (config.isProduction) {
  logger.add(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: formatConfig,
    })
  );
  logger.add(
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: formatConfig,
    })
  );
}

export const stream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
}; 