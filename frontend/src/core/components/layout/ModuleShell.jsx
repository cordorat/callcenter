//Path: frontend/src/core/components/layout/ModuleShell.jsx
import * as React from "react";
import { useState } from "react";
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Tooltip,
} from "@mui/material";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import UserMenuButton from "./UserMenuButton";

const expandedWidth = 240;
const collapsedWidth = 72;

/**
 * Sidebar colapsable 
 * @param {string} title - Título del AppBar
 * @param {Array} items - Items del menú de navegación
 * @param {React.ReactNode} children - Contenido opcional (alternativa a Outlet)
 */
export default function ModuleShell({ title, items, children }) {
  const [hovered, setHovered] = useState(false);
  const navigate = useNavigate();
  const location = useLocation(); // obtener la ruta actual

  const handleMouseEnter = () => setHovered(true); 
  const handleMouseLeave = () => setHovered(false);

  return (
    <Box sx={{ display: "flex" }}>
      {/* Header */}
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          backgroundColor: "#EBF5FE", 
        }}
      >
        <Toolbar>
          <Typography variant="h6" fontFamily={"Poppins, sans-serif"} fontWeight={600} noWrap sx={{ flexGrow: 1, color: "#0C155A" }}>
            {title}
          </Typography>
          <UserMenuButton />
        </Toolbar>
      </AppBar>

      {/* Sidebar */}
      <Drawer
        variant="permanent"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        sx={{
          width: hovered ? expandedWidth : collapsedWidth,
          flexShrink: 0,
          whiteSpace: "nowrap",
          boxSizing: "border-box",
          transition: "width 0.3s ease",
          "& .MuiDrawer-paper": {
            width: hovered ? expandedWidth : collapsedWidth,
            overflowX: "hidden",
            boxSizing: "border-box",
            transition: "width 0.3s ease",
            display: "flex", 
            flexDirection: "column", 
          },
        }}
        open
      >
        {/* Logo / título */}
        <Toolbar sx={{ justifyContent: "center" }}>
          {hovered ? (
            <Typography variant="h6" noWrap>
              Call Center
            </Typography>
          ) : (
            <Typography variant="h6">CC</Typography>
          )}
        </Toolbar>
        <Divider />

        {/* Lista de menú - Centrada verticalmente */}
        <Box sx={{ flexGrow: 1, display: "flex", alignItems: "center" }}> 
          <List sx={{ width: "100%" }}>
            {items.map((item) => {
            const isActive = location.pathname === item.path; // Detecta si la ruta actual coincide
            
            return (
              <Tooltip
                key={item.id}
                title={!hovered ? item.label : ""}
                placement="right"
                arrow
              >
                <ListItem
                  button
                  onClick={() => navigate(item.path)}
                  sx={{
                    "&:hover": { backgroundColor: "action.hover" },
                    justifyContent: hovered ? "initial" : "center",
                    px: 2.5,
                    backgroundColor: isActive ? "rgba(33, 150, 243, 0.12)" : "transparent", // Fondo azul claro si activo
                    borderLeft: isActive ? "4px solid #0C155A" : "4px solid transparent", // azul lateral
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 0,
                      mr: hovered ? 2 : "auto",
                      justifyContent: "center",
                      color: isActive ? "#0C155A" : "inherit", 
                    }}
                  >
                    <item.icon />
                  </ListItemIcon>
                  {hovered && (
                    <ListItemText 
                      primary={item.label}
                      sx={{
                        "& .MuiListItemText-primary": {
                          color: isActive ? "#0C155A" : "inherit", // Texto azul si activo
                          fontWeight: isActive ? 600 : 400, 
                        }
                      }}
                    />
                  )}
                </ListItem>
              </Tooltip>
            );
          })}
        </List>
        </Box> 

        {/* Pie del sidebar */}
        <Divider />
        <Box sx={{ p: 2, textAlign: "center" }}>
          {hovered ? (
            <Typography variant="caption" color="text.secondary">
              v1.0.0
            </Typography>
          ) : (
            <Typography variant="caption" color="text.secondary">
              v1
            </Typography>
          )}
        </Box>
      </Drawer>

      {/* Contenido principal */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          mt: 8,
          width: `calc(100% - ${hovered ? expandedWidth : collapsedWidth}px)`,
          transition: "width 0.3s ease",
        }}
      >
        {children || <Outlet />}
      </Box>
    </Box>
  );
}
