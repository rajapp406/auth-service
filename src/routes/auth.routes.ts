import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Public routes
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/refresh-token', AuthController.refreshToken);

// Protected routes
router.post('/logout', authenticate, AuthController.logout);
router.post('/revoke-all-sessions', authenticate, AuthController.revokeAllSessions);

export { router as authRoutes }; 