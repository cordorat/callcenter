//Path: frontend/src/core/api/apiClient.js

import axios from "axios";
import { ENDPOINTS } from "@/core/api/endpoints";

// Usar la variable de entorno para la base URL
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

const apiClient = axios.create({
  baseURL: BASE_URL, 
  headers: { 
    "Content-Type": "application/json",
    // Header necesario para bypass de la página de advertencia de ngrok
    "ngrok-skip-browser-warning": "69420"
  },
});

// Refrescar token cuando expira
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

apiClient.interceptors.request.use((config) => {
  const storedUser = localStorage.getItem("user");
  if (storedUser) {
    const { access } = JSON.parse(storedUser);
    if (access) config.headers.Authorization = `Bearer ${access}`;
  }
  return config;
});

// Interceptor de respuesta: intenta refrescar token si expira
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const storedUser = localStorage.getItem("user");

    if (
      storedUser &&
      error.response &&
      error.response.status === 401 &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      if (isRefreshing) {
        // Espera mientras se refresca el token
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      isRefreshing = true;
      try {
        const { refresh } = JSON.parse(storedUser);
        // Usar la ruta relativa para refresh ya que apiClient tiene baseURL configurado
        const res = await axios.post(`${BASE_URL}/auth/refresh/`, { refresh }, {
          headers: {
            "Content-Type": "application/json",
            "ngrok-skip-browser-warning": "69420"
          }
        });

        const newAccess = res.data.access;
        const newUser = { ...JSON.parse(storedUser), access: newAccess };
        localStorage.setItem("user", JSON.stringify(newUser));

        apiClient.defaults.headers.Authorization = `Bearer ${newAccess}`;
        processQueue(null, newAccess);

        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        return apiClient(originalRequest);
      } catch (err) {
        processQueue(err, null);
        localStorage.removeItem("user");
        window.location.href = "/login";
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
