import axios from "axios";
import { store } from "../app/store";
import { setLoading, setError } from "../store/settingsSlice";
import { logout } from "../store/userSlice"; 

export const api = axios.create({
  baseURL: "http://localhost:8000",
  withCredentials: true,
});

export const apiMethods = {
  get: api.get,
  post: api.post,
  put: api.put,
  delete: api.delete,
  patch: api.patch,
};

api.interceptors.request.use((config) => {
  store.dispatch(setLoading(true));

  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => {
    store.dispatch(setLoading(false));
    return response;
  },
  async (error) => {
    store.dispatch(setLoading(false));

    const originalRequest = error.config;
    const status = error.response?.status;
    const message = error.response?.data?.message;

    if (status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const res = await api.post("/auth/refresh");
        const newToken = res.data.accessToken;
        localStorage.setItem("token", newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch {
        store.dispatch(logout());
        window.location.href = "/login";
        return Promise.reject(error);
      }
    }

    if (status === 409) {
      store.dispatch(setError(message || "User already exists"));
    } else {
      store.dispatch(setError(message || "Ошибка запроса к серверу"));
    }

    return Promise.reject(error);
  }
);