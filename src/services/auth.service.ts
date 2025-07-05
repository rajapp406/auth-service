import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
const jwt = require('jsonwebtoken');
import { config } from '../config/config';
import { AppError } from '../middleware/errorHandler';
import { redisClient } from '../config/redis';

const prisma = new PrismaClient();

interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  private static generateTokens(payload: TokenPayload): AuthTokens {
    const accessToken = jwt.sign(payload, config.jwt.accessSecret, {
      expiresIn: config.jwt.accessExpirationInterval,
    });

    const refreshToken = jwt.sign(payload, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshExpirationInterval,
    });

    return { accessToken, refreshToken };
  }

  static async register(
    email: string,
    password: string,
    firstName?: string,
    lastName?: string
  ) {
    console.log(email, password, firstName, lastName);
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new AppError(409, 'Email already registered');
    }

    const hashedPassword = await bcrypt.hash(
      password,
      config.security.bcryptRounds
    );

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
      },
    });

    const tokens = this.generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    await prisma.refreshToken.create({
      data: {
        token: tokens.refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      tokens,
    };
  }

  static async login(email: string, password: string, ipAddress?: string, userAgent?: string) {
    console.log('Login attempt for email:', email);
    
    try {
      console.log('Looking up user in database...');
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        console.log('User not found for email:', email);
        throw new AppError(401, 'Invalid credentials');
      }
      console.log('User found, checking password...');

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        console.log('Invalid password for email:', email);
        throw new AppError(401, 'Invalid credentials');
      }
      console.log('Password valid, generating tokens...');

      const tokens = this.generateTokens({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      console.log('Creating refresh token in database...');
      // Create refresh token in database
      await prisma.refreshToken.create({
        data: {
          token: tokens.refreshToken,
          userId: user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
      });

      console.log('Updating user last login...');
      // Update user last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() },
      });

      // Store refresh token in Redis if available
      if (redisClient) {
        console.log('Storing refresh token in Redis...');
        try {
await redisClient.setEx(
            `refresh_token:${user.id}:${tokens.refreshToken}`,
            7 * 24 * 60 * 60, // 7 days in seconds
            '1'
          );
          console.log('Successfully stored refresh token in Redis');
        } catch (redisError) {
          console.error('Error storing refresh token in Redis:', redisError);
          // Continue even if Redis fails
        }
      } else {
        console.log('Redis client not available, skipping Redis storage');
      }

      console.log('Creating session...');
      // Create session
      await prisma.session.create({
        data: {
          userId: user.id,
          ipAddress,
          userAgent,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        },
      });

      console.log('Login successful for user:', user.id);
      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
        tokens,
      };
    } catch (error) {
      console.error('Error in AuthService.login:', error);
      if (error instanceof AppError) {
        throw error; // Re-throw AppError as is
      }
      // Wrap other errors in AppError
      const errorMessage = error instanceof Error ? error.message : 'Internal server error during login';
      throw new AppError(500, errorMessage);
    }
  }

  static async refreshToken(token: string) {
    const refreshTokenRecord = await prisma.refreshToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!refreshTokenRecord || refreshTokenRecord.revokedAt) {
      throw new AppError(401, 'Invalid refresh token');
    }

    if (new Date() > refreshTokenRecord.expiresAt) {
      throw new AppError(401, 'Refresh token expired');
    }

    const tokens = this.generateTokens({
      userId: refreshTokenRecord.user.id,
      email: refreshTokenRecord.user.email,
      role: refreshTokenRecord.user.role,
    });

    // Revoke old refresh token
    await prisma.refreshToken.update({
      where: { id: refreshTokenRecord.id },
      data: { revokedAt: new Date() },
    });

    // Create new refresh token
    await prisma.refreshToken.create({
      data: {
        token: tokens.refreshToken,
        userId: refreshTokenRecord.user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return tokens;
  }

  static async logout(userId: string, refreshToken: string) {
    await prisma.refreshToken.updateMany({
      where: {
        userId,
        token: refreshToken,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });

    await prisma.session.deleteMany({
      where: { userId },
    });
  }

  static async revokeAllSessions(userId: string) {
    await prisma.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });

    await prisma.session.deleteMany({
      where: { userId },
    });
  }
} 