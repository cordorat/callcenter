//Path: frontend/src/core/components/layout/MainLayout.jsx
import * as React from "react";
import { useMemo } from "react";
import { useAuth } from "@/core/context/AuthContext";               
import { getMenuForRole } from "@/core/navigation/menuConfig";        
import ModuleShell from "./ModuleShell";

/**
 * Layout principal que envuelve todas las páginas protegidas
 * Proporciona el sidebar con navegación basada en roles
 * 
 * @param {string} title - Título que aparece en el AppBar superior
 * @param {React.ReactNode} children - Contenido de la página
 */
export default function MainLayout({ title = "Call Center", children }) {
  const { user } = useAuth();
  const menuItems = useMemo(() => getMenuForRole(user?.role), [user?.role]);

  return (
    <ModuleShell title={title} items={menuItems}>
      {children}
    </ModuleShell>
  );
}


