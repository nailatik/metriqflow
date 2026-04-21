import { api } from "./api";

export interface AuthResponse {
  token: string;
}

export const authService = {
  login: (email: string, password: string) =>
    api.post<AuthResponse>("/auth/login", { email, password }),

  register: (email: string, password: string) =>
    api.post("/auth/register", { email, password }),

  me: () => api.get("/auth/me"),
};