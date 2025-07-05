import { Router } from 'express';
import { AuthController } from '../../controllers/AuthController';
import { authenticate } from '../../middleware/auth.middleware';
import { IRouteFactory } from '../interfaces/IRouteFactory';

export class AuthRouteFactory implements IRouteFactory {
  constructor(private readonly controller: AuthController) {}

  public createRouter(version: string): Router {
    const router = Router();

    switch (version) {
      case 'v1':
        this.setupV1Routes(router);
        break;
      case 'v2':
        this.setupV2Routes(router);
        break;
      default:
        throw new Error(`Unsupported version: ${version}`);
    }

    return router;
  }

  private setupV1Routes(router: Router): void {
    router.post('/register', (req, res, next) => 
      this.controller.register(req, res).catch(next));
    
    router.post('/login', (req, res, next) => 
      this.controller.login(req, res).catch(next));
    
    router.post('/refresh-token', (req, res, next) => 
      this.controller.refreshToken(req, res).catch(next));
    
    router.post('/logout', (req, res, next) => 
      this.controller.logout(req, res).catch(next));
    router.get('/test', (req, res, next) => 
      this.controller.test(req, res).catch(next));
  }

  private setupV2Routes(router: Router): void {
    this.setupV1Routes(router); // V2 includes all V1 routes
    
    // Additional V2 routes
    router.post('/revoke-all', authenticate, (req, res, next) => 
      this.controller.revokeAllSessions(req, res).catch(next));
  }
} 