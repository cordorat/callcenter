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
import { useNavigate, Outlet } from "react-router-dom";
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

  const handleMouseEnter = () => setHovered(true);
  const handleMouseLeave = () => setHovered(false);

  return (
    <Box sx={{ display: "flex" }}>
      {/* Header */}
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          backgroundColor: "primary.main",
        }}
      >
        <Toolbar>
          <Typography variant="h6" noWrap sx={{ flexGrow: 1 }}>
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
          },
        }}
        open
      >
        {/* Logo / título */}
        <Toolbar sx={{ justifyContent: hovered ? "center" : "center" }}>
          {hovered ? (
            <Typography variant="h6" noWrap>
              Call Center
            </Typography>
          ) : (
            <Typography variant="h6">CC</Typography>
          )}
        </Toolbar>
        <Divider />

        {/* Lista de menú */}
        <List>
          {items.map((item) => (
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
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    mr: hovered ? 2 : "auto",
                    justifyContent: "center",
                  }}
                >
                  <item.icon />
                </ListItemIcon>
                {hovered && <ListItemText primary={item.label} />}
              </ListItem>
            </Tooltip>
          ))}
        </List>

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
