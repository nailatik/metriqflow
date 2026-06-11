import { JwtPayload } from "jsonwebtoken";
import { type Request } from 'express';
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload & { id: number };
    }
  }
}

export interface AuthRequest extends Request {
  user?: {
    id: number;
  };
}

type UserRow = {
  id: number;
  email: string;
  full_name?: string;
  birth_date?: string;
  organization?: string;
  phone?: string;
  email_verified?: boolean;
};

type UserDB = {
  id: number;
  email: string;
  password: string;
  created_at: string;
  is_profile_completed: boolean;
  email_verified: boolean;
  full_name?: string;
  birth_date?: string;
  organization?: string;
  phone?: string;
  password_length?: number;
  plan?: string;
  plan_expires_at?: string | null;
};