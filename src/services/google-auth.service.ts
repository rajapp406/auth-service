import { OAuth2Client, TokenPayload } from 'google-auth-library';
import { AuthService, type UserWithRelations, type TokenResponse } from './auth.service';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { config } from '../config/config';
import { redis } from '../utils/redis';
import axios from 'axios';

interface GoogleUser {
  id: string;
  email: string;
  name?: string;
  picture?: string;
  verified_email: boolean;
}

export class GoogleAuthService {
  private static instance: GoogleAuthService;
  private client: OAuth2Client;

  private constructor() {
    this.client = new OAuth2Client(config.google.clientId);
  }

  public static getInstance(): GoogleAuthService {
    if (!GoogleAuthService.instance) {
      GoogleAuthService.instance = new GoogleAuthService();
    }
    return GoogleAuthService.instance;
  }

  /**
   * Generate Google OAuth URL for authentication
   */
  public generateAuthUrl(state?: string): string {
    return this.client.generateAuthUrl({
      access_type: 'offline', // Request refresh token
      scope: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email',
      ],
      prompt: 'consent', // Force consent screen to get refresh token every time
      state: state || 'state_parameter_passthrough_value',
      redirect_uri: config.google.callbackUrl,
    });
  }

  /**
   * Exchange authorization code for OAuth tokens
   */
  public async getOAuthTokens(
    code: string
  ): Promise<{
    access_token: string;
    expires_in: number;
    refresh_token?: string;
    scope: string;
    token_type: string;
    id_token: string;
  }> {
    try {
      const { data } = await axios.post('https://oauth2.googleapis.com/token', {
        client_id: config.google.clientId,
        client_secret: config.google.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: `${config.server.url}/api/auth/google/callback`,
      });

      return data;
    } catch (error: any) {
      logger.error('Failed to get OAuth tokens:', error);
      throw new AppError(401, 'Failed to authenticate with Google');
    }
  }

  /**
   * Refresh Google OAuth tokens
   */
  public async refreshAccessToken(refreshToken: string): Promise<{
    access_token: string;
    expires_in: number;
    scope: string;
    token_type: string;
    id_token?: string;
  }> {
    try {
      const { data } = await axios.post('https://oauth2.googleapis.com/token', {
        client_id: config.google.clientId,
        client_secret: config.google.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      });

      return data;
    } catch (error: any) {
      logger.error('Failed to refresh Google access token:', error);
      throw new AppError(401, 'Failed to refresh Google access token');
    }
  }

  /**
   * Revoke a Google OAuth token
   */
  public async revokeToken(token: string): Promise<boolean> {
    try {
      await axios.get('https://oauth2.googleapis.com/revoke', {
        params: {
          token,
          client_id: config.google.clientId,
          client_secret: config.google.clientSecret,
        },
      });
      return true;
    } catch (error) {
      logger.error('Failed to revoke Google token:', error);
      return false;
    }
  }

  /**
   * Get Google user info from ID token
   */
  public async getGoogleUser(idToken: string): Promise<TokenPayload> {
    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: config.google.clientId,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new AppError(401, 'Invalid token: No payload');
      }

      return payload;
    } catch (error) {
      logger.error('Failed to verify Google ID token:', error);
      throw new AppError(401, 'Invalid Google ID token');
    }
  }

  /**
   * Process Google user and return user data with JWT tokens
   */
  public async processGoogleUser(googleUser: TokenPayload): Promise<{
    user: UserWithRelations;
    tokens: TokenResponse;
  }> {
    try {
      // Find or create user in database
      const user = await AuthService.findOrCreateUser({
        email: googleUser.email || '',
        firstName: googleUser.given_name || null,
        lastName: googleUser.family_name || null,
        googleId: googleUser.sub,
        avatar: googleUser.picture || null,
        isEmailVerified: googleUser.email_verified || false,
        authProvider: 'google',
      });

      if (!user) {
        throw new AppError(500, 'Failed to create or find user');
      }

      // Update user's avatar if it's not set
      if (!user.avatar && googleUser.picture) {
        await prisma.user.update({
          where: { id: user.id },
          data: { avatar: googleUser.picture },
        });
        user.avatar = googleUser.picture;
      }

      // Generate JWT tokens
      const tokens = AuthService.generateTokens({
        id: user.id,
        email: user.email,
        role: user.role,
      });

      return { user, tokens };
    } catch (error) {
      logger.error('Failed to process Google user:', error);
      throw new AppError(500, 'Failed to process user authentication');
    }
  }

  /**
   * Verify Google ID token and return the payload
   */
  private async verifyIdToken(idToken: string): Promise<GoogleUser> {
    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: config.google.clientId,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new AppError(401, 'Invalid token: No payload');
      }

      return {
        id: payload.sub,
        email: payload.email || '',
        name: payload.name,
        picture: payload.picture,
        verified_email: payload.email_verified || false,
      };
    } catch (error) {
      logger.error('Google token verification error:', error);
      throw new AppError(401, 'Invalid Google token');
    }
  }

  /**
   * Authenticate or create user using Google ID token
   */
  public async authenticateWithGoogle(idToken: string): Promise<{
    user: any;
    tokens: TokenResponse;
  }> {
    try {
      logger.info('Verifying Google ID token');
      
      // Verify the ID token
      const googleUser = await this.verifyIdToken(idToken);

      if (!googleUser.email) {
        logger.warn('Google authentication failed: No email in token');
        throw new AppError(400, 'Google account email not found');
      }

      logger.info(`Processing Google authentication for email: ${googleUser.email}`);
      
      // Find or create user in the database
      const user = await AuthService.findOrCreateUser({
        email: googleUser.email,
        firstName: googleUser.name?.split(' ')[0] || '',
        lastName: googleUser.name?.split(' ').slice(1).join(' ') || '',
        googleId: googleUser.id,
        avatar: googleUser.picture,
        isEmailVerified: googleUser.verified_email,
        authProvider: 'google',
      });

      logger.info(`User ${user.id} authenticated with Google`);
      
      // Generate tokens using the AuthService
      const tokens = AuthService.generateTokens({
        id: user.id,
        email: user.email,
        role: user.role
      });

      // Store refresh token in Redis if available
      if (redis) {
        try {
          await redis.setRefreshToken(user.id, tokens.refreshToken);
          logger.debug(`Stored refresh token in Redis for user ${user.id}`);
        } catch (error) {
          logger.error('Failed to store refresh token in Redis:', error);
          // Continue without Redis
        }
      }

      // Update last login by fetching the user again to ensure we have the latest data
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() },
      });

      // Sanitize user data
      const sanitizedUser = AuthService.sanitizeUser(user);
      if (!sanitizedUser) {
        throw new AppError(500, 'Failed to process user data');
      }

      return {
        user: sanitizedUser,
        tokens,
      };
    } catch (error) {
      logger.error('Google authentication error:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(500, 'Failed to authenticate with Google');
    }
  }
}

export const googleAuthService = GoogleAuthService.getInstance();
