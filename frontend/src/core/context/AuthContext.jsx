//Path: frontend/src/core/context/AuthContext.jsx

import { createContext, useContext, useState, useEffect } from "react";
import apiClient from "@/core/api/apiClient";
import { ENDPOINTS } from "@/core/api/endpoints";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Login con JWT
  const login = async (email, password) => {
    try {
      // El endpoint /api/auth/login/ devuelve {user: {...}, tokens: {access, refresh}}
      const response = await apiClient.post(ENDPOINTS.LOGIN, { email, password });
      const { user: userData, tokens } = response.data;

      // Combinar datos del usuario con los tokens
      const fullUserData = { ...userData, ...tokens };

      setUser(fullUserData);
      localStorage.setItem("user", JSON.stringify(fullUserData));
    } catch (err) {
      console.error("Error al iniciar sesión:", err);
      throw err;
    }
  };

  // Logout
  const logout = async () => {
    try {
      // Intentar hacer logout en el backend (blacklist del refresh token)
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const { refresh } = JSON.parse(storedUser);
        if (refresh) {
          await apiClient.post(ENDPOINTS.LOGOUT, { refresh });
        }
      }
    } catch (err) {
      console.error("Error al cerrar sesión en el backend:", err);
    } finally {
      // Limpiar estado local siempre
      setUser(null);
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
  };

  // Refrescar datos del usuario actual
  const refreshUser = async () => {
    try {
      // Consultar el endpoint /api/users/me/ para obtener datos actualizados
      const response = await apiClient.get(ENDPOINTS.USER_ME);
      const updatedUserData = response.data;

      // Obtener los tokens actuales del estado (no vienen en la respuesta)
      const currentUser = user;

      // Combinar datos actualizados con tokens existentes
      const fullUserData = {
        ...updatedUserData,
        access: currentUser?.access,
        refresh: currentUser?.refresh
      };

      // Actualizar estado y localStorage
      setUser(fullUserData);
      localStorage.setItem("user", JSON.stringify(fullUserData));

      return fullUserData;
    } catch (err) {
      console.error("Error al refrescar datos del usuario:", err);
      throw err;
    }
  };

  // Cargar sesión guardada
  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) setUser(JSON.parse(stored));
    setLoading(false);
  }, []);

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated, loading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
