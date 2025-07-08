import * as jwt from 'jsonwebtoken';
import type { SignOptions, VerifyOptions, JwtPayload, Algorithm } from 'jsonwebtoken';
import { config } from '../config/config';
import { logger } from './logger';

// Extend SignOptions to allow string for expiresIn
type CustomSignOptions = Omit<SignOptions, 'expiresIn'> & {
  expiresIn?: string | number;
};

// Define our custom token payload
export interface TokenPayload extends JwtPayload {
  userId: string;
  email: string;
  role: string;
  type: 'access' | 'refresh';
}

// Base sign options
const signOptions: CustomSignOptions = {
  algorithm: 'HS256' as Algorithm,
  allowInsecureKeySizes: false,
  allowInvalidAsymmetricKeyTypes: false,
  expiresIn: undefined, // Will be set per token type
};

const verifyOptions: VerifyOptions = {
  algorithms: ['HS256'],
  ignoreExpiration: false,
  ignoreNotBefore: false,
};

/**
 * Generates a JWT access token
 */
export const generateAccessToken = (userId: string, email: string, role: string): string => {
  const payload: Omit<TokenPayload, keyof JwtPayload> = {
    userId,
    email,
    role,
    type: 'access',
    iat: Math.floor(Date.now() / 1000), // Issued at
  };

    // Convert string expiration to number of seconds if needed
  const expiresIn = config.jwt.accessExpirationInterval;
  const expiresInSeconds = typeof expiresIn === 'string' 
    ? (parseInt(expiresIn) * 60) // Convert '15m' to seconds
    : expiresIn;

  const options: SignOptions = {
    ...signOptions,
    expiresIn: expiresInSeconds
  };

  return jwt.sign(payload, config.jwt.accessSecret, options);
};

/**
 * Generates a JWT refresh token
 */
export const generateRefreshToken = (userId: string, email: string, role: string): string => {
  const payload: Omit<TokenPayload, keyof JwtPayload> = {
    userId,
    email,
    role,
    type: 'refresh',
    iat: Math.floor(Date.now() / 1000), // Issued at
  };

  // Convert string expiration to number of seconds if needed
  const expiresIn = config.jwt.refreshExpirationInterval;
  const expiresInSeconds = typeof expiresIn === 'string' 
    ? (parseInt(expiresIn) * 24 * 60 * 60) // Convert '7d' to seconds
    : expiresIn;

  const options: SignOptions = {
    ...signOptions,
    expiresIn: expiresInSeconds
  };

  return jwt.sign(payload, config.jwt.refreshSecret, options);
};

/**
 * Verifies a JWT token and returns its payload
 * @throws {Error} If token verification fails
 */
export const verifyToken = (token: string, type: 'access' | 'refresh'): TokenPayload => {
  try {
    const secret = type === 'access' ? config.jwt.accessSecret : config.jwt.refreshSecret;
    
    // Verify the token
    const decoded = jwt.verify(token, secret, {
      ...verifyOptions,
      complete: false,
    }) as unknown as TokenPayload;
    
    // Type guard to ensure the decoded token has the expected shape
    if (!decoded || typeof decoded !== 'object') {
      throw new Error('Invalid token: malformed payload');
    }
    
    // Verify token type matches expected
    if (decoded.type !== type) {
      throw new Error(`Invalid token type: expected ${type} but got ${decoded.type}`);
    }
    
    // Verify required fields exist
    if (!decoded.userId || !decoded.email || !decoded.role) {
      throw new Error('Invalid token payload: missing required fields');
    }
    
    return {
      ...decoded,
      userId: String(decoded.userId),
      email: String(decoded.email),
      role: String(decoded.role),
      type: decoded.type as 'access' | 'refresh',
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Token verification failed';
    logger.error('Token verification failed:', { error: errorMessage, tokenType: type });
    throw new Error(errorMessage);
  }
};

/**
 * Decodes a JWT token without verification
 * @returns Decoded token payload or null if invalid
 */
export const decodeToken = (token: string): TokenPayload | null => {
  try {
    const decoded = jwt.decode(token, { json: true });
    
    if (!decoded || typeof decoded !== 'object') {
      return null;
    }
    
    // Type guard to ensure the decoded token has the expected shape
    const payload = decoded as Record<string, unknown>;
    if (!payload.userId || !payload.email || !payload.role || !payload.type) {
      return null;
    }
    
    return {
      ...payload,
      userId: String(payload.userId),
      email: String(payload.email),
      role: String(payload.role),
      type: payload.type as 'access' | 'refresh',
    };
  } catch (error) {
    logger.error('Failed to decode token:', error);
    return null;
  }
};

/**
 * Extracts the token from the Authorization header
 * Format: 'Bearer <token>'
 */
export const extractTokenFromHeader = (authHeader: string | undefined): string | null => {
  if (!authHeader) return null;
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return null;
  }
  
  return parts[1];
};
