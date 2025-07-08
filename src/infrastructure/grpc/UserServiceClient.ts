import * as grpc from '@grpc/grpc-js';
import { logger } from '../../utils/logger';

// Import generated protobuf types
import { UserServiceClient as GrpcUserServiceClient } from '../../generated/user_service_grpc_pb';
import { CreateUserRequest, GetUserRequest, UserResponse } from '../../generated/user_service_pb';

// Define the service client type
// (No need for type-only aliases)
type UserServiceClient = GrpcUserServiceClient;

// Simple directory resolution
const currentDir = process.cwd();


export class UserServiceGRPCClient {
  // Make client protected instead of private to allow access in tests
  protected client: UserServiceClient;
  private static instance: UserServiceGRPCClient;
  private static isShuttingDown = false;
  
  // Convert our internal types to protobuf types
  private static toCreateUserRequest(profileData: {
    userId: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    authProvider: string;
  }): CreateUserRequest {
    const request = new CreateUserRequest();
    request.setAuthId(profileData.userId);
    request.setEmail(profileData.email);
    request.setFirstName(profileData.firstName || '');
    request.setLastName(profileData.lastName || '');
    request.setAuthProvider(profileData.authProvider);
    return request;
  }

  private isConnected = false;
  private connectionPromise: Promise<void> | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 5000; // 5 seconds
  private reconnectTimer: NodeJS.Timeout | null = null;
  private serviceUrl: string;

  private constructor() {
    // Get the user service URL from environment variables
    this.serviceUrl = process.env.USER_SERVICE_GRPC_URL || 'user-service:50051';
    
    // Create a new gRPC client
    this.client = new GrpcUserServiceClient(
      this.serviceUrl,
      grpc.credentials.createInsecure(),
      {
        'grpc.keepalive_time_ms': 120000,
        'grpc.http2.min_time_between_pings_ms': 120000,
        'grpc.keepalive_timeout_ms': 20000,
        'grpc.http2.max_pings_without_data': 0,
        'grpc.keepalive_permit_without_calls': 1,
      }
    );

    // Set up connection state change handlers
    this.setupConnectionHandlers();
    
    // Start the connection process
    this.connect();
  }

  private setupConnectionHandlers(): void {
    const channel = this.client.getChannel();
    
    // Type assertion to access private channel state
    const channelState = (channel as any).channelState;
    
    // Handle connection state changes using the channel state
    if (channelState) {
      channelState.on('connect', () => {
        this.isConnected = true;
        this.reconnectAttempts = 0; // Reset reconnect attempts on successful connection
        logger.info(`Successfully connected to User Service gRPC server at ${this.serviceUrl}`);
      });

      channelState.on('error', (error: Error) => {
        logger.error('gRPC connection error:', { 
          error: error.message,
          stack: error.stack,
          serviceUrl: this.serviceUrl 
        });
        this.handleDisconnection();
      });

      channelState.on('close', () => {
        logger.warn('gRPC connection closed');
        this.handleDisconnection();
      });
    } else {
      logger.warn('Could not set up gRPC channel state listeners: channel state not available');
    }
  }

  private handleDisconnection(): void {
    if (this.isConnected) {
      this.isConnected = false;
      logger.warn('Disconnected from User Service gRPC server');
      this.scheduleReconnect();
    }
  }

  // Make connect public for testing
  public async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = new Promise<void>((resolve, reject) => {
      const deadline = new Date();
      deadline.setSeconds(deadline.getSeconds() + 5);

      this.client.waitForReady(deadline, (error) => {
        if (error) {
          this.connectionPromise = null;
          logger.error('Failed to connect to User Service gRPC server', {
            error: error.message,
            attempt: this.reconnectAttempts + 1,
            maxAttempts: this.maxReconnectAttempts,
            serviceUrl: this.serviceUrl
          });
          
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect();
          } else {
            logger.error('Max reconnection attempts reached. Giving up.');
          }
          
          reject(error);
        } else {
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.connectionPromise = null;
          logger.info(`Successfully connected to User Service gRPC server at ${this.serviceUrl}`);
          resolve();
        }
      });
    });

    return this.connectionPromise;
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('Maximum reconnection attempts reached. Please check the User Service.');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff
    
    logger.warn(`Attempting to reconnect to User Service in ${delay / 1000} seconds...`, {
      attempt: this.reconnectAttempts,
      maxAttempts: this.maxReconnectAttempts,
      serviceUrl: this.serviceUrl
    });

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(() => {
        // Errors are already logged in the connect method
      });
    }, Math.min(delay, 30000)); // Cap the delay at 30 seconds
  }

  public static getInstance(): UserServiceGRPCClient {
    if (!UserServiceGRPCClient.instance) {
      UserServiceGRPCClient.instance = new UserServiceGRPCClient();
    }
    return UserServiceGRPCClient.instance;
  }

  public async createUser(profileData: {
    userId: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    authProvider: string;
  }): Promise<UserResponse> {
    const request = UserServiceGRPCClient.toCreateUserRequest(profileData);
    
    return new Promise((resolve, reject) => {
      this.client.createUser(request, (error: grpc.ServiceError | null, response: UserResponse | undefined) => {
        if (error) {
          logger.error('gRPC call to create user failed', {
            error: error.message,
            code: error.code,
            details: error.details,
            userId: profileData.userId,
          });
          reject(error);
          return;
        }
        
        if (!response) {
          const error = new Error('No response received from user service');
          logger.error('gRPC call to create user failed', {
            error: error.message,
            userId: profileData.userId,
          });
          reject(error);
          return;
        }
        
        logger.info('Successfully created user via gRPC', {
          userId: profileData.userId,
          userEmail: response.getEmail(),
        });
        
        resolve(response);
      });
    });
  }

  // Get user by ID
  public async getUser(userId: string): Promise<UserResponse> {
    const request = new GetUserRequest();
    request.setId(userId);
    
    return new Promise((resolve, reject) => {
      this.client.getUser(request, (error: grpc.ServiceError | null, response: UserResponse | undefined) => {
        if (error) {
          logger.error('gRPC call to get user failed', {
            error: error.message,
            code: error.code,
            details: error.details,
            userId,
          });
          reject(error);
          return;
        }
        
        if (!response) {
          const error = new Error('No response received from user service');
          logger.error('gRPC call to get user failed', {
            error: error.message,
            userId,
          });
          reject(error);
          return;
        }
        
        resolve(response);
      });
    });
  }

  /**
   * Close the gRPC client connection
   * @param force Whether to force close the connection immediately
   * @param timeoutMs Timeout in milliseconds for graceful shutdown
   */
  public async close(force = false, timeoutMs = 5000): Promise<void> {
    if (UserServiceGRPCClient.isShuttingDown) {
      logger.debug('gRPC client is already shutting down');
      return;
    }
    
    UserServiceGRPCClient.isShuttingDown = true;
    
    // Clear any pending reconnection attempts
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (force) {
      logger.info('Force closing gRPC client');
      try {
        this.client.close();
      } catch (error) {
        logger.warn('Error during force close of gRPC client', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
      this.isConnected = false;
      return;
    }
    
    return new Promise<void>((resolve) => {
      let isResolved = false;
      
      const onClose = () => {
        if (isResolved) return;
        isResolved = true;
        
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        
        this.isConnected = false;
        logger.info('gRPC client connection closed gracefully');
        resolve();
      };
      
      // Set a timeout to force close if graceful shutdown takes too long
      const timeoutId = setTimeout(() => {
        if (!isResolved) {
          logger.warn('gRPC client graceful close timed out, forcing close');
          try {
            this.client.close();
          } catch (error) {
            logger.warn('Error during force close after timeout', {
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
          onClose();
        }
      }, timeoutMs);
      
      try {
        // Close the client gracefully
        // The close method doesn't accept a callback in @grpc/grpc-js
        this.client.close();
        onClose();
      } catch (error) {
        logger.error('Error during gRPC client close', { 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
        onClose();
      }
    });
  }
}

// Export a singleton instance
export const userServiceClient = UserServiceGRPCClient.getInstance();
