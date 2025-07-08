import { userServiceClient } from '../src/infrastructure/grpc/UserServiceClient';
import * as userServicePb from '../src/generated/user_service_pb';
import * as userServiceGrpcPb from '../src/generated/user_service_grpc_pb';
import * as grpc from '@grpc/grpc-js';

const { CreateUserRequest, GetUserRequest, UserResponse } = userServicePb;
const { UserServiceClient } = userServiceGrpcPb;

// Extend the userServiceClient type to access protected members
type UserServiceClientWithAccess = typeof userServiceClient & {
  client: InstanceType<typeof UserServiceClient>;
};

describe('UserServiceGRPCClient', () => {
  const testEmail = `test-${Date.now()}@example.com`;
  let testUserId: string;

  beforeAll(() => {
    // Create a new client for testing
    const client = new UserServiceClient(
      'localhost:50051',
      grpc.credentials.createInsecure()
    );
    
    // Cast to access protected member
    (userServiceClient as UserServiceClientWithAccess).client = client;
  });

  afterAll(() => {
    // Clean up the client connection
    const client = (userServiceClient as UserServiceClientWithAccess).client;
    if (client) {
      client.close();
    }
  });

  describe('createUser', () => {
    it('should create a new user', async () => {
      const request = new CreateUserRequest();
      request.setEmail(testEmail);
      request.setFirstName('Test');
      request.setLastName('User');
      request.setAuthId(`auth|${Date.now()}`);
      request.setAuthProvider('test-provider');

      const response = await new Promise<userServicePb.UserResponse>((resolve, reject) => {
        const client = (userServiceClient as UserServiceClientWithAccess).client;
        client.createUser(request, (error: grpc.ServiceError | null, user?: userServicePb.UserResponse) => {
          if (error) {
            reject(error);
          } else if (user) {
            resolve(user);
          } else {
            reject(new Error('No user received'));
          }
        });
      });

      expect(response).toBeDefined();
      expect(response.getEmail()).toBe(testEmail);
      expect(response.getFirstName()).toBe('Test');
      expect(response.getLastName()).toBe('User');
      
      // Save the user ID for the next test
      testUserId = response.getId();
    });
  });

  describe('getUser', () => {
    it('should retrieve a user by ID', async () => {
      // Skip if the previous test didn't create a user
      if (!testUserId) {
        console.warn('Skipping getUser test: No user ID available');
        return;
      }

      const request = new GetUserRequest();
      request.setId(testUserId);

      const user = await new Promise<userServicePb.UserResponse>((resolve, reject) => {
        const client = (userServiceClient as UserServiceClientWithAccess).client;
        client.getUser(request, (error: grpc.ServiceError | null, user?: userServicePb.UserResponse) => {
          if (error) {
            reject(error);
          } else if (user) {
            resolve(user);
          } else {
            reject(new Error('No user received'));
          }
        });
      });

      expect(user).toBeDefined();
      expect(user.getId()).toBe(testUserId);
      expect(user.getEmail()).toBe(testEmail);
    });
  });

  describe('getUser by email', () => {
    it('should retrieve a user by email', async () => {
      const request = new GetUserRequest();
      request.setEmail(testEmail);

      const user = await new Promise<userServicePb.UserResponse>((resolve, reject) => {
        const client = (userServiceClient as UserServiceClientWithAccess).client;
        client.getUser(request, (error: grpc.ServiceError | null, user?: userServicePb.UserResponse) => {
          if (error) {
            reject(error);
          } else if (user) {
            resolve(user);
          } else {
            reject(new Error('No user received'));
          }
        });
      });

      expect(user).toBeDefined();
      expect(user.getEmail()).toBe(testEmail);
    });
  });
});
