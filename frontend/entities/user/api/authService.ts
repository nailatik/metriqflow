import { http } from "@/shared/lib/axios";
import type { AuthResponse, RegisterData, User } from "../types";

export const authService = {
  login: (email: string, password: string) =>
    http.post<AuthResponse, { email: string; password: string }>("/auth/login", { email, password }),

  register: (data: RegisterData) =>
    http.post<AuthResponse, RegisterData>("/auth/register", data),

  me: () => http.get<User>("/auth/me"),

  refresh: () => http.post<{ accessToken: string }>("/auth/refresh"),

  updateProfile: (data: { fullName: string; birthDate: string; organization: string | null; phone: string; agreedToProcessing: boolean }) =>
    http.patch<User>("/auth/profile", data),

  changePassword: (currentPassword: string, newPassword: string) =>
    http.patch<{ message: string }>("/auth/password", { currentPassword, newPassword }),

  requestDeleteAccount: (locale: string) =>
    http.post<{ message: string }>("/auth/delete-request", { locale }),

  deleteAccount: (token: string) =>
    http.delete<{ message: string }>("/auth/account", { data: { token } }),

  verifyEmail: (token: string) =>
    http.get<{ message: string }>(`/auth/verify-email?token=${token}`),

  resendVerification: (locale = "ru") =>
    http.post<{ message: string }>("/auth/resend-verification", { locale }),
};
