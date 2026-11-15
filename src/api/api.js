import axios from "axios";
import { getToken } from "../utils/auth";
// Backend URL: set VITE_API_URL in .env.development / .env.production
export const API_URL = import.meta.env.VITE_API_URL || "https://bcknd.mathshouse.net";

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
