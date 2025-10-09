// PATH: frontend/src/core/components/layout/ModuleShell.jsx
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
  ListItemButton,
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
 * Layout con AppBar y sidebar colapsable.
 */
export default function ModuleShell({ title, items, children }) {
  const [hovered, setHovered] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleMouseEnter = () => setHovered(true);
  const handleMouseLeave = () => setHovered(false);

  return (
    <Box
      sx={{
        display: "flex",
        width: "100%",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          backgroundColor: "#EBF5FE",
          color: "#0C155A",
        }}
      >
        <Toolbar>
          <Typography
            variant="h6"
            fontFamily={"Poppins, sans-serif"}
            fontWeight={600}
            noWrap
            sx={{ flexGrow: 1 }}
          >
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

        <Box sx={{ flexGrow: 1, display: "flex", alignItems: "center" }}>
          <List sx={{ width: "100%" }}>
            {items.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <ListItem
                  key={item.id}
                  disablePadding
                  sx={{
                    backgroundColor: isActive
                      ? "rgba(33, 150, 243, 0.12)"
                      : "transparent",
                    borderLeft: isActive
                      ? "4px solid #0C155A"
                      : "4px solid transparent",
                  }}
                >
                  <Tooltip
                    title={!hovered ? item.label : ""}
                    placement="right"
                    arrow
                  >
                    <ListItemButton
                      onClick={() => navigate(item.path)}
                      sx={{
                        "&:hover": { backgroundColor: "action.hover" },
                        justifyContent: hovered ? "initial" : "center",
                        px: 2.5,
                        width: "100%",
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
                              color: isActive ? "#0C155A" : "inherit",
                              fontWeight: isActive ? 600 : 400,
                            },
                          }}
                        />
                      )}
                    </ListItemButton>
                  </Tooltip>
                </ListItem>
              );
            })}
          </List>
        </Box>

        <Divider />
        <Box sx={{ p: 2, textAlign: "center" }}>
          <Typography variant="caption" color="text.secondary">
            {hovered ? "v1.0.0" : "v1"}
          </Typography>
        </Box>
      </Drawer>

      {/* Contenido principal */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0, // Permite que flex funcione correctamente
          height: "100vh",
          mt: 8, // espacio para AppBar
          p: 3,
          overflow: "auto",
          transition: "all 0.3s ease",
        }}
      >
        {children || <Outlet />}
      </Box>
    </Box>
  );
}
