import { Role } from '@prisma/client';

/**
 * Base user interface that matches the Prisma User model
 * This can be extended as needed for frontend-specific requirements
 */
export interface IUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: Role;
  isEmailVerified: boolean;
  avatar: string | null;
  authProvider?: 'email' | 'google' | string;
  lastLogin: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Authentication tokens returned by the API
 */
export interface IAuthTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Standard API response format for authentication endpoints
 */
export interface IAuthResponse {
  success: boolean;
  data: {
    user: IUser;
    tokens: IAuthTokens;
  };
}

/**
 * Error response format
 */
export interface IApiError {
  status: 'error';
  message: string;
  code?: string | number;
  details?: Record<string, unknown>;
}

/**
 * Google authentication request payload
 */
export interface IGoogleAuthRequest {
  idToken: string;
}

/**
 * Login request payload
 */
export interface ILoginRequest {
  email: string;
  password: string;
}

/**
 * Registration request payload
 */
export interface IRegisterRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

/**
 * Refresh token request payload
 */
export interface IRefreshTokenRequest {
  refreshToken: string;
}

/**
 * Common API response type that can be used with fetch/axios
 */
export type ApiResponse<T> = 
  | { success: true; data: T }
  | { success: false; error: IApiError };

/**
 * Type guard to check if a response is successful
 */
export function isSuccessResponse<T>(
  response: ApiResponse<T>
): response is { success: true; data: T } {
  return response.success === true;
}

/**
 * Type guard to check if a response is an error
 */
export function isErrorResponse<T>(
  response: ApiResponse<T>
): response is { success: false; error: IApiError } {
  return response.success === false;
}

// Re-export commonly used types for convenience
export type { Role } from '@prisma/client';
