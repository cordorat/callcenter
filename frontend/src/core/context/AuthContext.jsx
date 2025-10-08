//Path: frontend/src/core/context/AuthContext.jsx

import { createContext, useContext, useState, useEffect } from "react";
import apiClient from "@/core/api/apiClient";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  // Iniciar sesión
  const login = async (username, password) => {
    const res = await apiClient.post("/bff/login", { username, password }); // Ajustar la URL
    const data = res.data;

    // Guarda el usuario con rol
    setUser(data);
    localStorage.setItem("user", JSON.stringify(data));
  };

  // Cerrar sesión
  const logout = async () => {
    await apiClient.post("/bff/logout");
    setUser(null);
    localStorage.removeItem("user");
  };

  // Mantener sesión si hay datos guardados
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
