import { Role } from "@prisma/client";

declare namespace Express {
  interface Request {
    apiVersion: string;
    user?: {
      id: string;
      email: string;
      role: Role[];
    };
  }
} 