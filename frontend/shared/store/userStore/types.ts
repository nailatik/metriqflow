import type { User } from "@/entities/user/types";

export interface UserState {
  user: User | null;
  token: string | null;
  isAuth: boolean;
}

export interface ActionResult {
  success: boolean;
  error?: string;
}
