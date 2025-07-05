import { AuthService } from '../services/auth.service';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';

// Mock PrismaClient
jest.mock('@prisma/client');

describe('AuthService', () => {
  let prisma: jest.Mocked<PrismaClient>;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        password: 'hashedPassword',
        firstName: 'Test',
        lastName: 'User',
        role: 'USER',
        isEmailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock the findUnique and create methods
      prisma.user.findUnique = jest.fn().mockResolvedValue(null);
      prisma.user.create = jest.fn().mockResolvedValue(mockUser);
      prisma.refreshToken.create = jest.fn().mockResolvedValue({});

      const result = await AuthService.register(
        'test@example.com',
        'password123',
        'Test',
        'User'
      );

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe('test@example.com');
      expect(result.tokens).toBeDefined();
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
    });

    it('should throw an error if email is already registered', async () => {
      const existingUser = {
        id: '1',
        email: 'test@example.com',
        password: 'hashedPassword',
      };

      prisma.user.findUnique = jest.fn().mockResolvedValue(existingUser);

      await expect(
        AuthService.register('test@example.com', 'password123')
      ).rejects.toThrow(AppError);
    });
  });

  describe('login', () => {
    it('should successfully login a user', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        password: 'hashedPassword',
        role: 'USER',
      };

      prisma.user.findUnique = jest.fn().mockResolvedValue(mockUser);
      prisma.refreshToken.create = jest.fn().mockResolvedValue({});
      prisma.session.create = jest.fn().mockResolvedValue({});
      prisma.user.update = jest.fn().mockResolvedValue(mockUser);

      const result = await AuthService.login('test@example.com', 'password123');

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe('test@example.com');
      expect(result.tokens).toBeDefined();
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
    });

    it('should throw an error if user is not found', async () => {
      prisma.user.findUnique = jest.fn().mockResolvedValue(null);

      await expect(
        AuthService.login('test@example.com', 'password123')
      ).rejects.toThrow(AppError);
    });
  });
}); 