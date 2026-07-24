import axios from "axios";

// A single axios instance for the whole app. It automatically attaches the
// saved JWT (if any) to every request, so individual pages don't need to
// repeat the Authorization header every time.
const api = axios.create({
  baseURL: "http://localhost:5000/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;