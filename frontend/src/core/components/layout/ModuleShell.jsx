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
          backgroundColor: "#EBF5FE",
          color: "#0C155A",
          ml: `${collapsedWidth}px`,
          width: `calc(100% - ${collapsedWidth}px)`,
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
            backgroundColor: "#EBF5FE",
            borderRight: "1px solid rgba(12, 21, 90, 0.1)",
            boxShadow: hovered ? "4px 0 24px rgba(12, 21, 90, 0.15)" : "4px 0 24px rgba(12, 21, 90, 0.08)",
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
                          bgcolor: '#0C155A',
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
                          color: '#0C155A',
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
                        backgroundColor: isActive 
                          ? "rgba(12, 21, 90, 0.12)" 
                          : "transparent",
                        backdropFilter: isActive ? 'blur(10px)' : 'none',
                        "&:hover": { 
                          backgroundColor: isActive 
                            ? "rgba(12, 21, 90, 0.18)" 
                            : "rgba(12, 21, 90, 0.06)",
                          transform: 'translateX(4px)',
                          boxShadow: isActive 
                            ? '0 4px 20px rgba(12, 21, 90, 0.15)'
                            : '0 4px 12px rgba(12, 21, 90, 0.08)',
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
                          color: isActive ? "#0C155A" : "rgba(12, 21, 90, 0.6)",
                          transition: 'all 0.3s ease',
                          transform: isActive ? 'scale(1.1)' : 'scale(1)',
                          filter: isActive 
                            ? 'drop-shadow(0 2px 8px rgba(12, 21, 90, 0.3))'
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
                              color: isActive ? "#0C155A" : "rgba(12, 21, 90, 0.75)",
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

        <Divider sx={{ borderColor: 'rgba(12, 21, 90, 0.1)', mx: 2, mb: 1 }} />
        <Box 
          sx={{ 
            p: 2, 
            textAlign: "center",
            background: 'linear-gradient(135deg, rgba(12, 21, 90, 0.05) 0%, rgba(12, 21, 90, 0.02) 100%)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <Typography 
            variant="caption" 
            sx={{
              color: 'rgba(12, 21, 90, 0.5)',
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
