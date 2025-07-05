import dotenv from 'dotenv';

// Load environment variables
dotenv.config({
  path: '.env.test',
});

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '3006';
process.env.DATABASE_URL = 'mysql://root:root@localhost:3306/fitness_auth_test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-that-is-long-enough-for-testing';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-that-is-long-enough-for-testing';
process.env.REDIS_URL = 'redis://localhost:6379/1';

// Global test setup
beforeAll(async () => {
  // Add any global setup here
});

// Global test teardown
afterAll(async () => {
  // Add any global teardown here
}); 