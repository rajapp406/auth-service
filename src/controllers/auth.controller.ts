import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthService } from '../services/auth.service';
import { AppError } from '../middleware/errorHandler';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string(),
});

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, firstName, lastName } = registerSchema.parse(req.body);

      const result = await AuthService.register(email, password, firstName, lastName);

      res.status(201).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = loginSchema.parse(req.body);
      const ipAddress = req.ip;
      const userAgent = req.get('user-agent');

      const result = await AuthService.login(email, password, ipAddress, userAgent);

      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = refreshTokenSchema.parse(req.body);

      const tokens = await AuthService.refreshToken(refreshToken);

      res.status(200).json({
        status: 'success',
        data: tokens,
      });
    } catch (error) {
      next(error);
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const refreshToken = req.body.refreshToken;

      if (!userId || !refreshToken) {
        throw new AppError(400, 'User ID and refresh token are required');
      }

      await AuthService.logout(userId, refreshToken);

      res.status(200).json({
        status: 'success',
        message: 'Successfully logged out',
      });
    } catch (error) {
      next(error);
    }
  }

  static async revokeAllSessions(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError(400, 'User ID is required');
      }

      await AuthService.revokeAllSessions(userId);

      res.status(200).json({
        status: 'success',
        message: 'Successfully revoked all sessions',
      });
    } catch (error) {
      next(error);
    }
  }
} 