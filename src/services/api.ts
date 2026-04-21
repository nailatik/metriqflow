import axios from "axios";
import { store } from "../app/store";
import { setLoading, setError } from "../store/settingsSlice";

export const api = axios.create({
  baseURL: "http://localhost:8000",
});

export const apiMethods = {
  get: api.get,
  post: api.post,
  put: api.put,
  delete: api.delete,
  patch: api.patch,
};

api.interceptors.request.use((config) => {
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
  (error) => {
    store.dispatch(setLoading(false));

    store.dispatch(
      setError(
        error?.response?.data?.message ||
          "Ошибка запроса к серверу"
      )
    );

    return Promise.reject(error);
  }
);