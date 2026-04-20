import { http } from "./http";
import type { AuthResponse, LoginPayload } from "../types/user";

export const authService = {
  login: (data: LoginPayload) =>
    http.post<AuthResponse, LoginPayload>("/auth/login", data),

  register: (data: LoginPayload) =>
    http.post<AuthResponse, LoginPayload>("/auth/register", data),
};