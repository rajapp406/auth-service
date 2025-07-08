import { Request, Response, NextFunction } from 'express';
import { googleAuthService } from '../services/google-auth.service';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../config/logger';
import { prisma } from '../utils/prisma';
import { AuthProvider } from '@prisma/client';

// Re-export the User type from auth middleware
declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      firstName: string | null;
      lastName: string | null;
      role: string;
      accessToken: string;
    }
  }
}

export class GoogleAuthController {
  /**
   * Initiate Google OAuth flow
   */
  public static initiateOAuth = (req: Request, res: Response): void => {
    try {
      const { state, redirect_uri } = req.query;
      
      // Generate Google OAuth URL
      const authUrl = googleAuthService.generateAuthUrl(
        state ? state.toString() : undefined
      );
      
      // If a redirect_uri is provided, use it instead of the default
      if (redirect_uri) {
        const url = new URL(authUrl);
        url.searchParams.set('redirect_uri', redirect_uri.toString());
        res.redirect(url.toString());
      } else {
        res.redirect(authUrl);
      }
    } catch (error) {
      logger.error('Error initiating Google OAuth:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to initiate Google OAuth',
      });
    }
  };

  /**
   * Handle Google authentication with ID token
   */
  public static authenticate = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { idToken } = req.body as { idToken: string };

      if (!idToken) {
        throw new AppError(400, 'ID token is required');
      }

      logger.info('Google authentication attempt');
      
      const result = await googleAuthService.authenticateWithGoogle(idToken);

      logger.info(`Google authentication successful for user: ${result.user.id}`);
      
      res.status(200).json({
        success: true,
        data: {
          user: result.user,
          tokens: {
            accessToken: result.tokens.accessToken,
            refreshToken: result.tokens.refreshToken,
          },
        },
      });
    } catch (error) {
      logger.error('Google authentication error:', error);
      next(error);
    }
  };

  /**
   * Handle Google OAuth callback
   */
  public static handleCallback = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { code, state, error: oauthError } = req.query;
      
      // Handle OAuth errors
      if (oauthError) {
        throw new AppError(400, `OAuth error: ${oauthError}`);
      }
      
      if (!code) {
        throw new AppError(400, 'Authorization code is required');
      }

      logger.info('Processing Google OAuth callback');
      
      // Exchange the authorization code for tokens
      const { id_token, access_token, refresh_token } = await googleAuthService.getOAuthTokens(code as string);
      
      if (!id_token) {
        throw new AppError(400, 'No ID token received from Google');
      }
      
      // Verify and get user info from the ID token
      const userInfo = await googleAuthService.getGoogleUser(id_token);
      
      // Process the user and get JWT tokens
      const result = await googleAuthService.processGoogleUser(userInfo);
      
      // Determine redirect URL based on state or default
      const frontendUrl = state && typeof state === 'string' 
        ? decodeURIComponent(state)
        : process.env.FRONTEND_REDIRECT_URI || 'http://localhost:3000/auth/callback';

      // Create response with tokens
      const responseData = {
        access_token: result.tokens.accessToken,
        refresh_token: result.tokens.refreshToken,
        expires_in: 3600, // 1 hour
        token_type: 'Bearer',
        user: result.user
      };
      
      logger.info(`Google OAuth callback successful for user: ${result.user.id}`);
      
      // If this is an API request, return JSON
      if (req.get('Accept')?.includes('application/json')) {
        res.json(responseData);
        return;
      }
      
      // Otherwise redirect with tokens in URL hash
      const redirectUrl = new URL(frontendUrl);
      const params = new URLSearchParams();
      
      Object.entries(responseData).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
        }
      });
      
      redirectUrl.hash = params.toString();
      res.redirect(redirectUrl.toString());
    } catch (error) {
      logger.error('Google OAuth callback error:', error);
      next(error);
    }
  };

  /**
   * Disconnect user's Google account
   */
  public static disconnect = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { userId } = req.params;
      const user = req.user;
      
      if (!user || user.id !== userId) {
        throw new AppError(403, 'Not authorized to disconnect this account');
      }
      
      // Revoke the Google OAuth token
      const revoked = await googleAuthService.revokeToken(user.accessToken);
      
      if (!revoked) {
        logger.warn(`Failed to revoke Google token for user ${userId}, but continuing with account update`);
      }
      
      // Remove Google ID from user account
      await prisma.user.update({
        where: { id: userId },
        data: { 
          googleId: null,
          authProvider: AuthProvider.EMAIL // Default back to email/password
        },
      });
      
      res.status(200).json({
        success: true,
        message: 'Google account disconnected successfully',
      });
    } catch (error) {
      next(error);
    }
  };
}
