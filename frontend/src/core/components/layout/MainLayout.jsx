//Path: frontend/src/core/components/layout/MainLayout.jsx
import * as React from "react";
import { useMemo } from "react";
import { useAuth } from "@/core/context/AuthContext";               
import { getMenuForRole } from "@/core/navigation/menuConfig";        
import ModuleShell from "./ModuleShell";

/**
 * - Los módulos que hereden solo cambian el título y el contenido del sidebar.
 */
export default function MainLayout() {
  const { user } = useAuth();
  const menuItems = useMemo(() => getMenuForRole(user?.role), [user?.role]);

  return (
    <ModuleShell title={title} items={menuItems} />
  );
}


