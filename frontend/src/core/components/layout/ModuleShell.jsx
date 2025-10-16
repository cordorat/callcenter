// PATH: frontend/src/core/components/layout/ModuleShell.jsx
import * as React from "react";
import { useState } from "react";
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Tooltip,
  CircularProgress,
} from "@mui/material";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import UserMenuButton from "./UserMenuButton";
import AgentStatus from "@/components/agentStatus/AgentStatus";
import AgentMinutes from "@/components/agentStatus/AgentMinutes";

const expandedWidth = 240;
const collapsedWidth = 72;

export default function ModuleShell({ title, items, children }) {
  const [hovered, setHovered] = useState(false);
  const [agentStatus, setAgentStatus] = useState(''); // Estado actual del agente
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuth();

  const handleMouseEnter = () => setHovered(true);
  const handleMouseLeave = () => setHovered(false);

  return (
    <Box sx={{ display: "flex", width: "100%", height: "100vh", overflow: "hidden" }}>
      {/* Header */}
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer - 1,
          backgroundColor: (theme) => theme.palette.appBar.default,
          color: (theme) => theme.palette.appBar.text,
          ml: `${collapsedWidth}px`,
          width: `calc(100% - ${collapsedWidth}px)`,
        }}
      >
        <Toolbar>
          <Typography
            variant="h6"
            fontWeight={600}
            noWrap
            sx={{ flexGrow: 1 }}
          >
            {title}
          </Typography>
          
          {/* Estado y tiempo del agente - Para AGENT y AGENTE */}
          {(user?.role === "AGENTE") && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AgentMinutes userId={user.id} currentStatus={agentStatus} />
              <AgentStatus 
                onStatusChange={setAgentStatus}
                refreshInterval={30000}
              />
            </Box>
          )}

          <UserMenuButton />
        </Toolbar>
      </AppBar>      {/* Sidebar */}
      <Drawer
        variant="permanent"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        sx={{
          width: collapsedWidth,
          flexShrink: 0,
          whiteSpace: "nowrap",
          boxSizing: "border-box",
          "& .MuiDrawer-paper": {
            width: hovered ? expandedWidth : collapsedWidth,
            overflowX: "hidden",
            boxSizing: "border-box",
            transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            display: "flex",
            flexDirection: "column",
            backgroundColor: (theme) => theme.palette.appBar.default,
            borderRight: (theme) => theme.palette.mode === 'light'
              ? "1px solid rgba(12, 21, 90, 0.1)"
              : "1px solid rgba(255, 255, 255, 0.1)",
            boxShadow: (theme) => hovered 
              ? theme.palette.mode === 'light'
                ? "4px 0 24px rgba(12, 21, 90, 0.15)"
                : "4px 0 24px rgba(0, 0, 0, 0.5)"
              : theme.palette.mode === 'light'
                ? "4px 0 24px rgba(12, 21, 90, 0.08)"
                : "4px 0 24px rgba(0, 0, 0, 0.3)",
            zIndex: (theme) => theme.zIndex.drawer + 2,
          },
        }}
        open
      >

        <Box sx={{ flexGrow: 1, display: "flex", alignItems: "center", py: 2 }}>
          <List sx={{ width: "100%", px: 1.5 }}>
            {items.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <ListItem
                  key={item.id}
                  disablePadding
                  sx={{ mb: 0.5 }}
                >
                  <Tooltip
                    title={!hovered ? item.label : ""}
                    placement="right"
                    arrow
                    slotProps={{
                      tooltip: {
                        sx: {
                          bgcolor: (theme) => theme.palette.primary.main,
                          fontSize: '0.875rem',
                          fontWeight: 500,
                          py: 1,
                          px: 1.5,
                          borderRadius: '8px',
                          backdropFilter: 'blur(10px)',
                        }
                      },
                      arrow: {
                        sx: {
                          color: (theme) => theme.palette.primary.main,
                        }
                      }
                    }}
                  >
                    <ListItemButton
                      onClick={() => navigate(item.path)}
                      sx={{
                        borderRadius: '12px',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        justifyContent: hovered ? "initial" : "center",
                        px: hovered ? 2 : 1.5,
                        py: 1.5,
                        width: "100%",
                        position: 'relative',
                        overflow: 'hidden',
                        backgroundColor: (theme) => isActive 
                          ? theme.palette.mode === 'light'
                            ? "rgba(12, 21, 90, 0.12)"
                            : "rgba(255, 255, 255, 0.08)"
                          : "transparent",
                        backdropFilter: isActive ? 'blur(10px)' : 'none',
                        "&:hover": { 
                          backgroundColor: (theme) => isActive 
                            ? theme.palette.mode === 'light'
                              ? "rgba(12, 21, 90, 0.18)"
                              : "rgba(255, 255, 255, 0.12)"
                            : theme.palette.mode === 'light'
                              ? "rgba(12, 21, 90, 0.06)"
                              : "rgba(255, 255, 255, 0.04)",
                          transform: 'translateX(4px)',
                          boxShadow: (theme) => isActive 
                            ? theme.palette.mode === 'light'
                              ? '0 4px 20px rgba(12, 21, 90, 0.15)'
                              : '0 4px 20px rgba(0, 0, 0, 0.5)'
                            : theme.palette.mode === 'light'
                              ? '0 4px 12px rgba(12, 21, 90, 0.08)'
                              : '0 4px 12px rgba(0, 0, 0, 0.3)',
                        },
                        "&::before": isActive ? {
                          content: '""',
                          position: 'absolute',
                          left: 0,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: '4px',
                          height: '60%',
                          borderRadius: '0 4px 4px 0',
                        } : {},
                      }}
                    >
                      <ListItemIcon
                        sx={{
                          minWidth: 0,
                          mr: hovered ? 2 : "auto",
                          justifyContent: "center",
                          color: (theme) => isActive 
                            ? theme.palette.primary.main 
                            : theme.palette.text.secondary,
                          transition: 'all 0.3s ease',
                          transform: isActive ? 'scale(1.1)' : 'scale(1)',
                          filter: (theme) => isActive 
                            ? theme.palette.mode === 'light'
                              ? 'drop-shadow(0 2px 8px rgba(12, 21, 90, 0.3))'
                              : 'drop-shadow(0 2px 8px rgba(74, 143, 231, 0.4))'
                            : 'none',
                          '& svg': {
                            fontSize: '1.5rem',
                          }
                        }}
                      >
                        <item.icon />
                      </ListItemIcon>
                      {hovered && (
                        <ListItemText
                          primary={item.label}
                          sx={{
                            "& .MuiListItemText-primary": {
                              color: (theme) => isActive 
                                ? theme.palette.primary.main 
                                : theme.palette.text.secondary,
                              fontWeight: isActive ? 600 : 500,
                              fontSize: '0.95rem',
                              letterSpacing: '0.3px',
                              transition: 'all 0.3s ease',
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

        <Divider sx={{ 
          borderColor: (theme) => theme.palette.mode === 'light'
            ? 'rgba(12, 21, 90, 0.1)'
            : 'rgba(255, 255, 255, 0.1)', 
          mx: 2, 
          mb: 1 
        }} />
        <Box 
          sx={{ 
            p: 2, 
            textAlign: "center",
            background: themed => themed.palette.appBar.default,
            backdropFilter: 'blur(10px)',
          }}
        >
          <Typography 
            variant="caption" 
            sx={{
              color: (theme) => theme.palette.appBar.text,
              fontWeight: 500,
              letterSpacing: '0.5px',
            }}
          >
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
          minWidth: 0,
          height: "100vh",
          mt: 8,
          ml: 0,
          width: "100%",
          pl: `${collapsedWidth}px`,
          pr: 3,
          py: 3,
          overflow: "auto",
        }}
      >
        {children || <Outlet />}
      </Box>
    </Box>
  );
}
