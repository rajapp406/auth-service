import { PrismaClient } from '@prisma/client';
import { PrismaClient as CustomPrismaClient } from './PrismaClient';
import { Logger } from '../../core/logger/Logger';
import { Config } from '../../core/config/Config';

// Use your custom PrismaClient wrapper for logging, etc.
const config = new Config();
const logger = new Logger(config);
const customPrismaClient = CustomPrismaClient.getInstance(logger);

// This is the actual Prisma client instance to use everywhere
const prisma = customPrismaClient.getClient();

export { prisma };
