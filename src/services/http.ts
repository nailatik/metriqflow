import { api } from "./api";

export const http = {
  get: <T>(url: string) => api.get<T>(url),

  post: <T, D>(url: string, data: D) => api.post<T>(url, data),

  put: <T, D>(url: string, data: D) => api.put<T>(url, data),

  patch: <T, D>(url: string, data: D) => api.patch<T>(url, data),

  delete: <T>(url: string) => api.delete<T>(url),
};