import { PrismaClient, User, Role, RefreshToken, Session, Prisma } from '@prisma/client';
import { compare, hash } from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/config';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { userServiceClient } from '../infrastructure/grpc/UserServiceClient';
import { redis } from '../utils/redis';
import type { RedisService } from '../utils/redis';
import { 
  generateAccessToken, 
  generateRefreshToken, 
  verifyToken, 
  TokenPayload 
} from '../utils/jwt';

// Extend the Prisma User model to include our custom fields
export type UserWithRelations = User & {
  refreshTokens: RefreshToken[];
  sessions: Session[];
  googleId?: string | null;
  avatar?: string | null;
  authProvider?: string | null;
  isEmailVerified: boolean;
  firstName: string | null;
  lastName: string | null;
  lastLogin: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

// Token response type
export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
}

// User response type (sanitized)
interface SanitizedUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: Role;
  isEmailVerified: boolean;
  avatar: string | null;
  authProvider?: string | null;
  lastLogin: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// Initialize Prisma client
const prisma = new PrismaClient();

// JWT payload type
interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  type: 'access' | 'refresh';
  iat: number;
  exp: number;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}
export class AuthService {
  /**
   * Generate access and refresh tokens for a user
   */
  public static generateTokens(user: { id: string; email: string; role: string }): TokenResponse {
    const accessToken = generateAccessToken(user.id, user.email, user.role);
    const refreshToken = generateRefreshToken(user.id, user.email, user.role);
    return { accessToken, refreshToken };
  }

  /**
   * Create a refresh token in the database
   */
  private static async createRefreshToken(userId: string, token: string): Promise<RefreshToken> {
    // Parse the refresh expiration interval (e.g., '7d' -> 7 days)
    const refreshExpirationMs = this.parseDurationToMs(config.jwt.refreshExpirationInterval);
    
    return prisma.refreshToken.create({
      data: {
        token,
        userId,
        expiresAt: new Date(Date.now() + refreshExpirationMs),
      },
    });
  }

  /**
   * Parse a duration string (e.g., '7d', '24h', '30m') to milliseconds
   */
  private static parseDurationToMs(duration: string): number {
    const value = parseInt(duration);
    if (duration.endsWith('d')) return value * 24 * 60 * 60 * 1000; // days
    if (duration.endsWith('h')) return value * 60 * 60 * 1000;      // hours
    if (duration.endsWith('m')) return value * 60 * 1000;           // minutes
    return value * 1000;                                            // default to seconds
  }

  /**
   * Update user's last login timestamp
   */
  private static async updateLastLogin(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { lastLogin: new Date() },
    });
  }

  /**
   * Create a new user session
   */
  private static async createSession(
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<Session> {
    return prisma.session.create({
      data: {
        userId,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });
  }

  /**
   * Store refresh token in Redis
   */
  /**
   * Store refresh token in Redis with proper error handling
   */
  /**
   * Store refresh token in Redis
   */
  private static async storeRefreshTokenInRedis(userId: string, token: string): Promise<void> {
    if (!redis) {
      logger.warn('Redis client not available, skipping token storage');
      return;
    }

    try {
      await redis.setRefreshToken(userId, token);
      logger.debug(`Refresh token stored in Redis for user ${userId}`);
    } catch (error) {
      logger.error('Failed to store refresh token in Redis:', error);
      // Don't throw error to allow login to continue without Redis
      // The system will still work with database tokens, just without Redis caching
    }
  }

  /**
   * Remove refresh token from Redis
   */
  /**
   * Remove refresh token from Redis
   */
  private static async removeRefreshTokenFromRedis(userId: string): Promise<void> {
    if (!redis) {
      logger.warn('Redis client not available, skipping token removal');
      return;
    }

    try {
      await redis.deleteRefreshToken(userId);
      logger.debug(`Refresh token removed from Redis for user ${userId}`);
    } catch (error) {
      logger.error('Failed to remove refresh token from Redis:', error);
      // Continue execution even if Redis operation fails
    }
  }

  /**
   * Find or create a user (for OAuth providers)
   */
  /**
   * Find or create a user with proper type handling
   */
  public static async findOrCreateUser(data: {
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    googleId?: string;
    avatar?: string | null;
    isEmailVerified?: boolean;
    authProvider: 'google' | 'email';
    password?: string;
  }): Promise<UserWithRelations> {
    const { email, googleId, authProvider } = data;

    // Build the where clause based on auth provider
    const whereClause: any = {
      email,
      authProvider: authProvider === 'google' ? 'GOOGLE' : 'EMAIL' as const
    };

    // Add googleId to where clause if provided for google auth
    if (authProvider === 'google' && googleId) {
      whereClause.googleId = googleId;
    }

    // Try to find existing user
    const existingUser = await prisma.user.findFirst({
      where: whereClause,
      include: { refreshTokens: true, sessions: true },
    }) as UserWithRelations | null;

    if (existingUser) {
      // If user exists, update any missing fields
      const updateData: Partial<User> = {};
      
      if (authProvider === 'google') {
        if (googleId && !('googleId' in existingUser ? existingUser.googleId : undefined)) {
          updateData.googleId = googleId;
        }
        if (data.avatar && !('avatar' in existingUser ? existingUser.avatar : undefined)) {
          updateData.avatar = data.avatar;
        }
        if (data.isEmailVerified !== undefined) {
          updateData.isEmailVerified = data.isEmailVerified;
        }
      }

      if (Object.keys(updateData).length > 0) {
        const updatedUser = await prisma.user.update({
          where: { id: existingUser.id },
          data: updateData,
          include: { refreshTokens: true, sessions: true },
        });
        return updatedUser as UserWithRelations;
      }
      
      return existingUser as UserWithRelations;
    }

    // Create new user
    const userData: any = {
      email,
      firstName: data.firstName || null,
      lastName: data.lastName || null,
      isEmailVerified: data.isEmailVerified ?? false,
      role: 'USER',
      authProvider: authProvider === 'google' ? 'GOOGLE' : 'EMAIL',
      refreshTokens: { create: [] },
      sessions: { create: [] },
    };

    // Add optional fields if provided
    if (googleId) userData.googleId = googleId;
    if (data.avatar) userData.avatar = data.avatar;
    if (data.password) {
      userData.password = await hash(data.password, config.security.bcryptRounds);
    }

    const user = await prisma.user.create({
      data: userData,
      include: { refreshTokens: true, sessions: true },
    });

    return user as UserWithRelations;
  }

  /**
   * Register a new user
   */
  /**
   * Register a new user
   * @param email User's email
   * @param password User's password
   * @param firstName User's first name
   * @param lastName User's last name
   * @returns Object containing sanitized user and auth tokens
   */
  public static async register(
    email: string,
    password: string,
    firstName?: string,
    lastName?: string
  ): Promise<{ user: SanitizedUser; tokens: TokenResponse }> {
    // Input validation
    if (!email || !password) {
      throw new AppError(400, 'Email and password are required');
    }
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new AppError(409, 'Email already registered');
    }

    // Hash the password
    const hashedPassword = await hash(password, config.security.bcryptRounds);

    // Create the user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName: firstName || null,
        lastName: lastName || null,
        role: 'USER',
        isEmailVerified: false,
        authProvider: 'EMAIL',
        refreshTokens: {
          create: [],
        },
        sessions: {
          create: [],
        },
        lastLogin: null,
        avatar: null,
      },
      include: {
        refreshTokens: true,
        sessions: true,
      },
    });

    // Generate tokens
    const tokens = this.generateTokens({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    // Create refresh token
    await prisma.refreshToken.create({
      data: {
        token: tokens.refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // Sanitize user data before returning
    const sanitizedUser = this.sanitizeUser(user as UserWithRelations);
    if (!sanitizedUser) {
      throw new AppError(500, 'Failed to process user data');
    }

    // Create user profile in the user service via gRPC (fire and forget)
    AuthService.createUserProfileInBackground({
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      authProvider: 'EMAIL',
    }).catch((error: unknown) => {
      // This catch is just to prevent unhandled promise rejections
      // Errors are already logged in the createUserProfileInBackground method
      logger.debug('Background user profile creation completed with error', {
        userId: user.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    });

    return {
      user: sanitizedUser,
      tokens,
    };
  }
  /**
   * Create user profile in the background without blocking the registration flow
   * @param profileData User profile data
   */
  private static async createUserProfileInBackground(profileData: {
    userId: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    authProvider: string;
  }): Promise<void> {
    try {
      logger.info('Starting background user profile creation', {
        userId: profileData.userId,
        email: profileData.email,
      });

      // Add a small delay to ensure the main registration flow completes
      await new Promise(resolve => setTimeout(resolve, 1000));

      await userServiceClient.createUser({
        userId: profileData.userId,
        email: profileData.email,
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        authProvider: profileData.authProvider,
      });

      logger.info('Successfully created user profile in user service via gRPC', { 
        userId: profileData.userId,
        email: profileData.email
      });
    } catch (error) {
      // Log the error but don't throw to avoid unhandled rejections
      logger.error('Failed to create user profile in user service via gRPC', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: profileData.userId,
        email: profileData.email,
        stack: error instanceof Error ? error.stack : undefined,
      });
      
      // Re-throw to allow the caller to handle the error if needed
      throw error;
    }
  }

  /**
   * Sanitize user data before sending to client
   */
  public static sanitizeUser(user: UserWithRelations | null): SanitizedUser | null {
    if (!user) return null;
    
    // Safely access optional fields with type guards
    const isEmailVerified = 'isEmailVerified' in user ? user.isEmailVerified : false;
    const avatar = 'avatar' in user ? user.avatar : null;
    const authProvider = 'authProvider' in user ? user.authProvider : null;
    const lastLogin = 'lastLogin' in user ? user.lastLogin : null;
    
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isEmailVerified,
      avatar,
      authProvider,
      lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Login a user with email and password
   * @param email User's email
   * @param password User's password
   * @param ipAddress Optional IP address for session tracking
   * @param userAgent Optional user agent string for session tracking
   * @returns Object containing sanitized user and auth tokens
   */
  public static async login(
    email: string, 
    password: string, 
    ipAddress?: string, 
    userAgent?: string
  ): Promise<{ user: SanitizedUser; tokens: TokenResponse }> {
    if (!email || !password) {
      throw new AppError(400, 'Email and password are required');
    }
    try {
      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email },
        include: { refreshTokens: true, sessions: true },
      }) as UserWithRelations;

      // Check if user exists and has a password
      if (!user || !user.password) {
        logger.warn(`Login attempt failed for non-existent user: ${email}`);
        throw new AppError(401, 'Invalid credentials');
      }

      // Verify password
      const isPasswordValid = await compare(password, user.password);
      if (!isPasswordValid) {
        logger.warn(`Invalid password attempt for user: ${email}`);
        throw new AppError(401, 'Invalid credentials');
      }

      // Generate tokens
      const tokens = this.generateTokens({
        id: user.id,
        email: user.email,
        role: user.role
      });

      // Create refresh token in database
      await this.createRefreshToken(user.id, tokens.refreshToken);
      
      // Update last login timestamp
      await this.updateLastLogin(user.id);

      // Create session if IP or user agent is provided
      if (ipAddress || userAgent) {
        await this.createSession(user.id, ipAddress, userAgent);
      }

      try {
        // Store refresh token in Redis
        await this.storeRefreshTokenInRedis(user.id, tokens.refreshToken);
      } catch (redisError) {
        logger.error('Error storing refresh token in Redis:', redisError);
        // Continue even if Redis fails
      }

      // Sanitize user data before returning
      const sanitizedUser = this.sanitizeUser(user);
      if (!sanitizedUser) {
        throw new AppError(500, 'Failed to process user data');
      }

      logger.info(`User logged in successfully: ${user.id}`);
      return { user: sanitizedUser, tokens };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Error in AuthService.login:', error);
      throw new AppError(500, 'Login failed');
    }
  }

  /**
   * Refresh access token using a refresh token
   * @param token Refresh token
   * @returns New access and refresh tokens with user data
   */
  public static async refreshToken(token: string): Promise<{ user: SanitizedUser; tokens: TokenResponse }> {
    try {
      // Find the refresh token with user data
      const refreshTokenRecord = await prisma.refreshToken.findUnique({
        where: { token },
        include: { 
          user: {
            include: {
              refreshTokens: true,
              sessions: true,
            },
          },
        },
      });

      // Validate refresh token
      if (!refreshTokenRecord || refreshTokenRecord.revokedAt) {
        throw new AppError(401, 'Invalid refresh token');
      }

      if (new Date() > refreshTokenRecord.expiresAt) {
        throw new AppError(401, 'Refresh token expired');
      }

      // Get user data
      const user = refreshTokenRecord.user as UserWithRelations;
      if (!user) {
        throw new AppError(404, 'User not found');
      }

      // Generate new tokens
      const tokens = this.generateTokens({
        id: user.id,
        email: user.email,
        role: user.role
      });

      // Create new refresh token
      await this.createRefreshToken(user.id, tokens.refreshToken);

      // Update Redis with new refresh token
      try {
        await this.storeRefreshTokenInRedis(user.id, tokens.refreshToken);
      } catch (redisError) {
        logger.error('Error updating refresh token in Redis:', redisError);
        // Continue even if Redis update fails
      }

      // Revoke the old refresh token
      await prisma.refreshToken.update({
        where: { id: refreshTokenRecord.id },
        data: { revokedAt: new Date() },
      });

      // Sanitize user data
      const sanitizedUser = this.sanitizeUser(user);
      if (!sanitizedUser) {
        throw new AppError(500, 'Failed to process user data');
      }

      return { user: sanitizedUser, tokens };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Error in AuthService.refreshToken:', error);
      throw new AppError(500, 'Failed to refresh token');
    }
  }

  /**
   * Logout a user by revoking their refresh token
   * @param userId ID of the user to logout
   * @param refreshToken Optional specific refresh token to revoke
   */
  /**
   * Logout a user by revoking their refresh token
   * @param userId ID of the user to logout
   * @param refreshToken Optional specific refresh token to revoke
   */
  public static async logout(userId: string, refreshToken?: string): Promise<void> {
    try {
      // Validate user exists
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        logger.warn(`Logout attempt for non-existent user: ${userId}`);
        return; // Don't throw error for non-existent user
      }

      // Revoke the specific refresh token if provided, otherwise revoke all
      const whereClause = refreshToken 
        ? { token: refreshToken, userId, revokedAt: null }
        : { userId, revokedAt: null };
      
      const updateResult = await prisma.refreshToken.updateMany({
        where: whereClause,
        data: { revokedAt: new Date() }
      });

      logger.info(`Revoked ${updateResult.count} refresh tokens for user: ${userId}`);

      // Remove refresh token from Redis
      await this.removeRefreshTokenFromRedis(userId);

      logger.info(`User logged out: ${userId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Error in AuthService.logout for user ${userId}: ${errorMessage}`, { error });
      throw new AppError(500, 'Failed to complete logout process');
    }
  }

  /**
   * Revoke all active sessions and refresh tokens for a user
   * @param userId ID of the user
   */
  /**
   * Revoke all active sessions and refresh tokens for a user
   * @param userId ID of the user
   */
  public static async revokeAllSessions(userId: string): Promise<void> {
    try {
      // Validate user exists
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        logger.warn(`Revoke sessions attempt for non-existent user: ${userId}`);
        return; // Don't throw error for non-existent user
      }

      // Use a transaction to ensure both operations succeed or fail together
      await prisma.$transaction([
        // Revoke all refresh tokens
        prisma.refreshToken.updateMany({
          where: { 
            userId,
            revokedAt: null
          },
          data: { revokedAt: new Date() }
        }),
        
        // End all active sessions
        prisma.session.updateMany({
          where: { 
            userId,
            expiresAt: { gt: new Date() }
          },
          data: { expiresAt: new Date() } // Set to current time to expire immediately
        })
      ]);

      // Remove refresh token from Redis
      await this.removeRefreshTokenFromRedis(userId);

      logger.info(`All sessions and tokens revoked for user: ${userId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Error in AuthService.revokeAllSessions: ${errorMessage}`);
      throw new AppError(500, 'Failed to revoke all sessions');
    }
  }
}