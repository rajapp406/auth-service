import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { GoogleAuthController } from '../controllers/google-auth.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Public routes
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/refresh-token', AuthController.refreshToken);

// Google OAuth routes
router.get('/google', GoogleAuthController.initiateOAuth);
router.post('/google', GoogleAuthController.authenticate);
router.get('/google/callback', GoogleAuthController.handleCallback);
router.delete('/google/disconnect/:userId', authenticate, GoogleAuthController.disconnect);

// Protected routes
router.post('/logout', authenticate, AuthController.logout);
router.post('/revoke-all-sessions', authenticate, AuthController.revokeAllSessions);

export { router as authRoutes }; 