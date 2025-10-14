// PATH: src/pages/Settings/Settings.jsx
// Pantalla para gestionar la configuración del usuario

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Switch,
  Divider,
  Avatar,
  Chip,
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import DescriptionIcon from "@mui/icons-material/Description";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import LogoutIcon from "@mui/icons-material/Logout";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import MainLayout from "@/core/components/layout/MainLayout";
import { useAuth } from "@/core/context/AuthContext";
import { useThemeMode } from "@/core/context/ThemeModeContext";
import ConfirmDialog from "@/components/forms/ConfirmDialog";

export default function Settings() {
  const { user, logout } = useAuth();
  const { mode, toggleMode } = useThemeMode();
  const navigate = useNavigate();
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  const darkMode = mode === "dark";

  const handleThemeToggle = () => toggleMode();
  const handleProfileClick = () => navigate("/perfil");
  const handleTermsClick = () =>
    window.open("/terminos-y-condiciones", "_blank");
  const handleSupportClick = () =>
    window.open("mailto:soporte@callcenter.com", "_blank");
  const handleLogoutClick = () => setLogoutDialogOpen(true);
  const handleConfirmLogout = () => logout();

  return (
    <MainLayout title="Configuración">
      <Box
        sx={{
          minHeight: "100vh",
          p: { xs: 2, md: 4 },
        }}
      >
        {/* Contenedor centrado con una sola columna */}
        <Box
          sx={{
            maxWidth: "70%",
            mx: "auto",
          }}
        >
          {/* Card del usuario */}
          <Paper
            elevation={0}
            sx={{
              p: 3,
              mb: 3,
              borderRadius: 3,
              background: "linear-gradient(135deg, #0C155A, #1E2B8B)",
              color: "white",
              boxShadow: "0px 2px 12px rgba(0,0,0,0.05)",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
              <Avatar
                sx={{
                  width: 80,
                  height: 80,
                  fontSize: "2rem",
                  bgcolor: "rgba(255,255,255,0.15)",
                  border: "2px solid rgba(255,255,255,0.3)",
                }}
              >
                {user?.first_name?.charAt(0).toUpperCase() || "?"}
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>
                  {user?.first_name} {user?.last_name}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
                  {user?.email}
                </Typography>
                <Chip
                  label={user?.role === "ADMIN" ? "Administrador" : "Agente"}
                  sx={{
                    bgcolor: "rgba(255,255,255,0.25)",
                    color: "white",
                    fontWeight: 500,
                  }}
                  size="small"
                />
              </Box>
            </Box>
          </Paper>

          {/* Sección Cuenta */}
          <Paper
            elevation={0}
            sx={{
              mb: 3,
              borderRadius: 3,
              backgroundColor: "white",
              boxShadow: "0px 2px 12px rgba(0,0,0,0.05)",
              overflow: "hidden",
            }}
          >
            <Box sx={{ p: 2.5 }}>
              <Typography
                variant="overline"
                sx={{
                  fontWeight: 600,
                  fontSize: "0.8rem",
                  color: "rgba(12,21,90,0.6)",
                  letterSpacing: 0.5,
                }}
              >
                Cuenta
              </Typography>
            </Box>
            <Divider />
            <List disablePadding>
              <ListItem disablePadding>
                <ListItemButton
                  onClick={handleProfileClick}
                  sx={{
                    py: 2,
                    "&:hover": {
                      bgcolor: "#F8FBFF",
                    },
                  }}
                >
                  <ListItemIcon>
                    <PersonIcon sx={{ color: "#0C155A" }} />
                  </ListItemIcon>
                  <ListItemText
                    primary="Editar perfil"
                    secondary="Actualiza tu información personal"
                    primaryTypographyProps={{
                      fontWeight: 500,
                      color: "#0C155A",
                    }}
                    secondaryTypographyProps={{ fontSize: "0.85rem" }}
                  />
                  <ChevronRightIcon sx={{ color: "rgba(12, 21, 90, 0.4)" }} />
                </ListItemButton>
              </ListItem>
            </List>
          </Paper>

          {/* Sección Apariencia */}
          <Paper
            elevation={0}
            sx={{
              mb: 3,
              borderRadius: 3,
              backgroundColor: "white",
              boxShadow: "0px 2px 12px rgba(0,0,0,0.05)",
              overflow: "hidden",
            }}
          >
            <Box sx={{ p: 2.5 }}>
              <Typography
                variant="overline"
                sx={{
                  fontWeight: 600,
                  fontSize: "0.8rem",
                  color: "rgba(12,21,90,0.6)",
                  letterSpacing: 0.5,
                }}
              >
                Apariencia
              </Typography>
            </Box>
            <Divider />
            <List disablePadding>
              <ListItem>
                <ListItemIcon sx={{ color: "#0C155A" }}>
                  {darkMode ? <Brightness7Icon /> : <Brightness4Icon />}
                </ListItemIcon>
                <ListItemText
                  primary="Modo oscuro"
                  secondary="Cambia entre tema claro y oscuro"
                  primaryTypographyProps={{
                    fontWeight: 500,
                    color: "#0C155A",
                  }}
                  secondaryTypographyProps={{ fontSize: "0.85rem" }}
                />
                <Switch
                  checked={darkMode}
                  onChange={handleThemeToggle}
                  sx={{
                    "& .MuiSwitch-switchBase.Mui-checked": {
                      color: "#0C155A",
                    },
                    "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                      backgroundColor: "#0C155A",
                    },
                  }}
                />
              </ListItem>
            </List>
          </Paper>

          {/* Sección Ayuda y soporte */}
          <Paper
            elevation={0}
            sx={{
              mb: 3,
              borderRadius: 3,
              backgroundColor: "white",
              boxShadow: "0px 2px 12px rgba(0,0,0,0.05)",
              overflow: "hidden",
            }}
          >
            <Box sx={{ p: 2.5 }}>
              <Typography
                variant="overline"
                sx={{
                  fontWeight: 600,
                  fontSize: "0.8rem",
                  color: "rgba(12,21,90,0.6)",
                  letterSpacing: 0.5,
                }}
              >
                Ayuda y soporte
              </Typography>
            </Box>
            <Divider />
            <List disablePadding>
              <ListItem disablePadding>
                <ListItemButton
                  onClick={handleTermsClick}
                  sx={{
                    py: 2,
                    "&:hover": {
                      bgcolor: "#F8FBFF",
                    },
                  }}
                >
                  <ListItemIcon>
                    <DescriptionIcon sx={{ color: "#0C155A" }} />
                  </ListItemIcon>
                  <ListItemText
                    primary="Términos y condiciones"
                    secondary="Lee nuestros términos de servicio"
                    primaryTypographyProps={{
                      fontWeight: 500,
                      color: "#0C155A",
                    }}
                    secondaryTypographyProps={{ fontSize: "0.85rem" }}
                  />
                  <ChevronRightIcon sx={{ color: "rgba(12, 21, 90, 0.4)" }} />
                </ListItemButton>
              </ListItem>
              <Divider />
              <ListItem disablePadding>
                <ListItemButton
                  onClick={handleSupportClick}
                  sx={{
                    py: 2,
                    "&:hover": {
                      bgcolor: "#F8FBFF",
                    },
                  }}
                >
                  <ListItemIcon>
                    <HelpOutlineIcon sx={{ color: "#0C155A" }} />
                  </ListItemIcon>
                  <ListItemText
                    primary="Soporte"
                    secondary="¿Necesitas ayuda? Contáctanos"
                    primaryTypographyProps={{
                      fontWeight: 500,
                      color: "#0C155A",
                    }}
                    secondaryTypographyProps={{ fontSize: "0.85rem" }}
                  />
                  <ChevronRightIcon sx={{ color: "rgba(12, 21, 90, 0.4)" }} />
                </ListItemButton>
              </ListItem>
            </List>
          </Paper>

          {/* Sección Sesión */}
          <Paper
            elevation={0}
            sx={{
              mb: 3,
              borderRadius: 3,
              backgroundColor: "white",
              boxShadow: "0px 2px 12px rgba(0,0,0,0.05)",
              overflow: "hidden",
            }}
          >
            <Box sx={{ p: 2.5 }}>
              <Typography
                variant="overline"
                sx={{
                  fontWeight: 600,
                  fontSize: "0.8rem",
                  color: "rgba(12,21,90,0.6)",
                  letterSpacing: 0.5,
                }}
              >
                Sesión
              </Typography>
            </Box>
            <Divider />
            <List disablePadding>
              <ListItem disablePadding>
                <ListItemButton
                  onClick={handleLogoutClick}
                  sx={{
                    py: 2,
                    "&:hover": {
                      bgcolor: "#F8FBFF",
                    },
                  }}
                >
                  <ListItemIcon>
                    <LogoutIcon sx={{ color: "#0C155A" }} />
                  </ListItemIcon>
                  <ListItemText
                    primary="Cerrar sesión"
                    secondary="Sal de tu cuenta de forma segura"
                    primaryTypographyProps={{
                      fontWeight: 500,
                      color: "#0C155A",
                    }}
                    secondaryTypographyProps={{ fontSize: "0.85rem" }}
                  />
                  <ChevronRightIcon sx={{ color: "rgba(12, 21, 90, 0.4)" }} />
                </ListItemButton>
              </ListItem>
            </List>
          </Paper>

          {/* Versión de la app */}
          <Box sx={{ textAlign: "center", py: 3 }}>
            <Typography
              variant="caption"
              sx={{ color: "rgba(12, 21, 90, 0.5)" }}
            >
              Call Center App v1.0.0
            </Typography>
          </Box>
        </Box>

        {/* Diálogo de confirmación de logout */}
        <ConfirmDialog
          open={logoutDialogOpen}
          onClose={() => setLogoutDialogOpen(false)}
          onConfirm={handleConfirmLogout}
          title="Confirmar cierre de sesión"
          message="¿Está seguro de que desea cerrar la sesión?"
          confirmText="Cerrar sesión"
          cancelText="Cancelar"
          confirmColor="#0dc3545"
        />
      </Box>
    </MainLayout>
  );
}
