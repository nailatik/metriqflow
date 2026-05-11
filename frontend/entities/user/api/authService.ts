import { http } from "@/shared/lib/axios";
import type { AuthResponse, RegisterData, User } from "../types";

export const authService = {
  login: (email: string, password: string) =>
    http.post<AuthResponse, { email: string; password: string }>("/auth/login", { email, password }),

  register: (data: RegisterData) =>
    http.post<AuthResponse, RegisterData>("/auth/register", data),

  me: () => http.get<User>("/auth/me"),

  refresh: () => http.post<{ accessToken: string }>("/auth/refresh"),
};
