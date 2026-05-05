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

export interface RegisterData {
  email: string;
  password: string;
  fullName: string;
  birthDate: string;
  organization?: string;
  phone: string;
  agreedToProcessing: boolean;
}

export const authService = {
  login: (email: string, password: string) =>
    api.post<AuthResponse>("/auth/login", { email, password }),

  register: (data: RegisterData) =>
    api.post<AuthResponse>("/auth/register", data),

  me: () => api.get<User>("/auth/me"),
};