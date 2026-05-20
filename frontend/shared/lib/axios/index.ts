import axios, { type AxiosRequestConfig, type InternalAxiosRequestConfig } from "axios";
import { getRootStore } from "@/shared/store/RootStore";
import { routing } from "@/i18n/routing";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function currentLocale(): string {
  if (typeof window === "undefined") return routing.defaultLocale;
  const first = window.location.pathname.split("/").filter(Boolean)[0];
  return (routing.locales as readonly string[]).includes(first) ? first : routing.defaultLocale;
}

function redirectToLogin(): void {
  if (typeof window === "undefined") return;
  window.location.href = `/${currentLocale()}/login`;
}

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

let pendingRequests = 0;

function incLoading() {
  pendingRequests++;
  getRootStore().uiStore.setLoading(true);
}

function decLoading() {
  pendingRequests = Math.max(0, pendingRequests - 1);
  if (pendingRequests === 0) getRootStore().uiStore.setLoading(false);
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  incLoading();

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
    decLoading();
    return response;
  },
  async (error) => {
    decLoading();

    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const status: number | undefined = error.response?.status;
    const message: string | undefined = error.response?.data?.message;

    const isRefreshEndpoint = originalRequest?.url?.includes("/auth/refresh");
    const isAuthEndpoint = originalRequest?.url?.includes("/auth/login") ||
                           originalRequest?.url?.includes("/auth/register");
    // These endpoints handle their own errors inline — no global modal
    const isSilentEndpoint = originalRequest?.url?.includes("/auth/verify-email") ||
                             originalRequest?.url?.includes("/auth/account/confirm");

    if (status === 401 && !originalRequest._retry && !isRefreshEndpoint && !isAuthEndpoint) {
      originalRequest._retry = true;
      try {
        const res = await api.post<{ accessToken: string }>("/auth/refresh");
        const newToken = res.data.accessToken;
        // setToken persists in both localStorage and cookie (cookie needed for proxy.ts middleware)
        getRootStore().userStore.setToken(newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch {
        getRootStore().userStore.logout();
        redirectToLogin();
        return Promise.reject(error);
      }
    }

    if (status === 401) {
      // Refresh itself failed — force logout without showing error modal
      if (isRefreshEndpoint || originalRequest._retry) {
        getRootStore().userStore.logout();
        redirectToLogin();
      }
      return Promise.reject(error);
    }

    if (!isSilentEndpoint) {
      if (status === 409) {
        getRootStore().uiStore.setError(message ?? "User already exists");
      } else if (status) {
        getRootStore().uiStore.setError(message ?? "Request error");
      }
    }

    return Promise.reject(error);
  }
);

type HttpConfig = Pick<AxiosRequestConfig, "signal" | "headers" | "params">;

export const http = {
  get: <T>(url: string, config?: HttpConfig) => api.get<T>(url, config),
  post: <T, D = unknown>(url: string, data?: D, config?: HttpConfig) => api.post<T>(url, data, config),
  put: <T, D = unknown>(url: string, data?: D, config?: HttpConfig) => api.put<T>(url, data, config),
  patch: <T, D = unknown>(url: string, data?: D, config?: HttpConfig) => api.patch<T>(url, data, config),
  delete: <T = unknown>(url: string, config?: HttpConfig & { data?: unknown }) => api.delete<T>(url, config),
};
