import { Role } from '@prisma/client';

declare global {
  namespace Express {
    export interface User {
      id: string;
      email: string;
      firstName: string | null;
      lastName: string | null;
      role: string;
      accessToken: string;
    } // Profile fields removed, only identity fields kept.

    export interface Request {
      user?: User;
    }
  }
}

export {};
