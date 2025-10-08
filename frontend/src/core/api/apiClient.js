//Path: frontend/src/core/api/apiClient.js

import axios from "axios";

const apiClient = axios.create({
  baseURL: "http://localhost:8000", // tu backend o BFF en Django
  withCredentials: true, // si manejas cookies de sesión
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptores opcionales (para tokens o logs)
apiClient.interceptors.request.use((config) => {
  // console.log("[API Request]", config.method, config.url);
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("[API Error]", error.response || error.message);
    throw error;
  }
);

export default apiClient;
