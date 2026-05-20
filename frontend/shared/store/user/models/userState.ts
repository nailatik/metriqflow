import type { User } from "@/entities/user/types";

export interface UserState {
  user: User | null;
  token: string | null;
  isAuth: boolean;
}

export const initialUserState: UserState = {
  user: null,
  token: null,
  isAuth: false,
};
