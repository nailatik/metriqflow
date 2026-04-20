import axios from "axios";
import { store } from "../app/store";
import { setLoading, setError } from "../store/settingsSlice";

export const api = axios.create({
  baseURL: "http://localhost:8000",
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    store.dispatch(setLoading(true));
    return config;
  },
  (error) => {
    store.dispatch(setLoading(false));
    return Promise.reject(error);
  }
);

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