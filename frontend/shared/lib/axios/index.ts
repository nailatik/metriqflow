import axios, { type InternalAxiosRequestConfig } from "axios";
import { getRootStore } from "@/shared/store/RootStore";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  getRootStore().uiStore.setLoading(true);

  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  return config;
});

api.interceptors.response.use(
  (response) => {
    getRootStore().uiStore.setLoading(false);
    return response;
  },
  async (error) => {
    getRootStore().uiStore.setLoading(false);

    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const status: number | undefined = error.response?.status;
    const message: string | undefined = error.response?.data?.message;

    if (status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const res = await api.post<{ accessToken: string }>("/auth/refresh");
        const newToken = res.data.accessToken;
        localStorage.setItem("token", newToken);
        document.cookie = `token=${newToken}; path=/; max-age=86400`;
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch {
        getRootStore().userStore.logout();
        window.location.href = "/login";
        return Promise.reject(error);
      }
    }

    if (status === 409) {
      getRootStore().uiStore.setError(message ?? "User already exists");
    } else if (status !== 401) {
      getRootStore().uiStore.setError(message ?? "Request error");
    }

    return Promise.reject(error);
  }
);

export const http = {
  get: <T>(url: string) => api.get<T>(url),
  post: <T, D = unknown>(url: string, data?: D) => api.post<T>(url, data),
  put: <T, D = unknown>(url: string, data?: D) => api.put<T>(url, data),
  patch: <T, D = unknown>(url: string, data?: D) => api.patch<T>(url, data),
  delete: <T = unknown>(url: string) => api.delete<T>(url),
};
