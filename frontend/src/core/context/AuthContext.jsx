//Path: frontend/src/core/context/AuthContext.jsx

import { createContext, useContext, useState, useEffect } from "react";
import apiClient from "@/core/api/apiClient";
import { ENDPOINTS } from "@/core/api/endpoints";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  // Login con JWT
  const login = async (email, password) => {
    try {
      // Obtener tokens
      const tokenRes = await apiClient.post(ENDPOINTS.LOGIN, { email, password });
      const tokens = tokenRes.data;

      // Obtener info del usuario autenticado
      const userRes = await apiClient.get(ENDPOINTS.USER_ME, {
        headers: { Authorization: `Bearer ${tokens.access}` },
      });

      const userData = { ...userRes.data, ...tokens };

      setUser(userData);
      localStorage.setItem("user", JSON.stringify(userData));
    } catch (err) {
      console.error("Error al iniciar sesión:", err);
      throw err;
    }
  };

  // Logout
  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  // Cargar sesión guardada
  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) setUser(JSON.parse(stored));
  }, []);

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
