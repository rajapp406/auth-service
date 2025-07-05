import { Request, Response } from 'express';
import { Config } from '../core/config/Config';
import { ILogger } from '../core/interfaces/ILogger';
import { AuthService } from '../services/auth.service';

export class AuthController {
  constructor(
    private readonly config: Config,
    private readonly logger: ILogger
  ) {}

  public async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, firstName, lastName } = req.body;
      const result = await AuthService.register(email, password, firstName, lastName);
      
      res.status(201).json({
        status: 'success',
        data: result
      });
    } catch (error) {
      this.logger.error('Registration failed:', error);
      throw error;
    }
  }

  public async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;
      const result = await AuthService.login(
        email,
        password,
        req.ip,
        req.headers['user-agent']
      );

      res.status(200).json({
        status: 'success',
        data: result
      });
    } catch (error) {
      this.logger.error('Login failed:', error);
      throw error;
    }
  }

  public async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;
      const tokens = await AuthService.refreshToken(refreshToken);

      res.status(200).json({
        status: 'success',
        data: tokens
      });
    } catch (error) {
      this.logger.error('Token refresh failed:', error);
      throw error;
    }
  }

  public async logout(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          status: 'error',
          message: 'Unauthorized'
        });
        return;
      }

      await AuthService.logout(userId, refreshToken);

      res.status(200).json({
        status: 'success',
        message: 'Logged out successfully'
      });
    } catch (error) {
      this.logger.error('Logout failed:', error);
      throw error;
    }
  }

  public async revokeAllSessions(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          status: 'error',
          message: 'Unauthorized'
        });
        return;
      }

      await AuthService.revokeAllSessions(userId);

      res.status(200).json({
        status: 'success',
        message: 'All sessions revoked successfully'
      });
    } catch (error) {
      this.logger.error('Session revocation failed:', error);
      throw error;
    }
  }
} 