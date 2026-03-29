import axios from "axios";
import { getAuthToken, triggerSessionClear } from "./authSession.js";

const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "",
  headers: { "Content-Type": "application/json" },
});

http.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      triggerSessionClear();
    }
    return Promise.reject(error);
  }
);

export default http;
