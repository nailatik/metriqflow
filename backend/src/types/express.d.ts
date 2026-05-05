import { JwtPayload } from "jsonwebtoken";
import { type Request } from 'express';
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
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
};

type UserDB = {
  id: number;
  email: string;
  password: string;
  created_at: string;
  is_profile_completed: boolean;
};