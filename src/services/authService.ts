import { api } from "./api";

export interface User {
  id: number;
  email: string;
  full_name?: string;
  birth_date?: string;
  organization?: string;
  phone?: string;
  is_profile_completed?: boolean;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export interface ProfileData {
  fullName: string;
  birthDate: string | null;
  organization: string | null;
  phone: string | null;
  agreedToProcessing: boolean;
}

export const authService = {
  login: (email: string, password: string) =>
    api.post<AuthResponse>("/auth/login", { email, password }),

  register: (email: string, password: string) =>
    api.post<AuthResponse>("/auth/register", { email, password }),

  completeProfile: (data: ProfileData) =>
    api.patch<User>("/auth/profile", data),

  me: () => api.get<User>("/auth/me"),
};