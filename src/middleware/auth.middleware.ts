import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../infrastructure/database/prisma';
import { config } from '../config/config';
import { AppError } from './errorHandler';
import { type User as PrismaUser, Role } from '@prisma/client';

declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      firstName: string | null;
      lastName: string | null;
      role: string;
      accessToken: string;
    }
    
    interface Request {
      user?: User;
    }
  }
}

export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    console.log(req.headers);
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError(401, 'No token provided');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.accessSecret) as {
      userId: string;
      email: string;
      role: Role;
    };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      throw new AppError(401, 'User no longer exists');
    }

    // Create a user object with only the necessary fields
    req.user = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role as string,
      accessToken: token,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new AppError(401, 'Invalid or expired token'));
    } else {
      next(error);
    }
  }
};

export const authorize = (...allowedRoles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AppError(401, 'Not authenticated');
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new AppError(403, 'Not authorized to access this resource');
    }

    next();
  };
}; 