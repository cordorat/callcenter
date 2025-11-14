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
  useTheme,
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
  const theme = useTheme();
  const navigate = useNavigate();
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  const darkMode = mode === "dark";

  // Generar iniciales del nombre completo
  const getInitials = () => {
    if (!user) return "?";
    const firstName = user?.first_name || "";
    const lastName = user?.last_name || "";
    const initials = (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
    return initials || "?";
  };

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
              background: (theme) =>
                theme.palette.mode === "light"
                  ? "linear-gradient(135deg, #0C155A, #1E2B8B)"
                  : `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
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
                  bgcolor: "rgba(255,255,255,0.25)",
                  border: "2px solid rgba(255,255,255,0.3)",
                  fontWeight: 700,
                  color: "white",
                }}
                src={user?.foto_perfil || undefined}
              >
                {getInitials()}
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>
                  {user?.first_name} {user?.last_name}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
                  {user?.email}
                </Typography>
                <Chip
                  label={
                    user?.role === "ADMIN" 
                      ? "Administrador" 
                      : user?.role === "COORDINADOR" 
                      ? "Coordinador" 
                      : user?.role === "JEFE_CAMPANA"
                      ? "Jefe de Campaña"
                      : user?.role === "JEFE_CENTRO"
                      ? "Jefe de Centro"
                      : "Agente"
                  }
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
              bgcolor: "background.paper",
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
                  color: "text.secondary",
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
                      bgcolor: (theme) =>
                        theme.palette.mode === "light"
                          ? "#eaf3ffff"
                          : "rgba(255,255,255,0.05)",
                    },
                  }}
                >
                  <ListItemIcon>
                    <PersonIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Editar perfil"
                    secondary="Actualiza tu información personal"
                    primaryTypographyProps={{
                      fontWeight: 500,
                      color: "text.primary",
                    }}
                    secondaryTypographyProps={{ fontSize: "0.85rem" }}
                  />
                  <ChevronRightIcon sx={{ color: "text.secondary" }} />
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
              bgcolor: "background.paper",
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
                  color: "text.secondary",
                  letterSpacing: 0.5,
                }}
              >
                Apariencia
              </Typography>
            </Box>
            <Divider />
            <List disablePadding>
              <ListItem>
                <ListItemIcon>
                  {darkMode ? (
                    <Brightness7Icon color="primary" />
                  ) : (
                    <Brightness4Icon color="primary" />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary="Modo oscuro"
                  secondary="Cambia entre tema claro y oscuro"
                  primaryTypographyProps={{
                    fontWeight: 500,
                    color: "text.primary",
                  }}
                  secondaryTypographyProps={{ fontSize: "0.85rem" }}
                />
                <Switch
                  checked={darkMode}
                  onChange={handleThemeToggle}
                  color="primary"
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
              bgcolor: "background.paper",
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
                  color: "text.secondary",
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
                      bgcolor: (theme) =>
                        theme.palette.mode === "light"
                          ? "#eaf3ffff"
                          : "rgba(255,255,255,0.05)",
                    },
                  }}
                >
                  <ListItemIcon>
                    <DescriptionIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Términos y condiciones"
                    secondary="Lee nuestros términos de servicio"
                    primaryTypographyProps={{
                      fontWeight: 500,
                      color: "text.primary",
                    }}
                    secondaryTypographyProps={{ fontSize: "0.85rem" }}
                  />
                  <ChevronRightIcon sx={{ color: "text.secondary" }} />
                </ListItemButton>
              </ListItem>
              <Divider />
              <ListItem disablePadding>
                <ListItemButton
                  onClick={handleSupportClick}
                  sx={{
                    py: 2,
                    "&:hover": {
                      bgcolor: (theme) =>
                        theme.palette.mode === "light"
                          ? "#eaf3ffff"
                          : "rgba(255,255,255,0.05)",
                    },
                  }}
                >
                  <ListItemIcon>
                    <HelpOutlineIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Soporte"
                    secondary="¿Necesitas ayuda? Contáctanos"
                    primaryTypographyProps={{
                      fontWeight: 500,
                      color: "text.primary",
                    }}
                    secondaryTypographyProps={{ fontSize: "0.85rem" }}
                  />
                  <ChevronRightIcon sx={{ color: "text.secondary" }} />
                </ListItemButton>
              </ListItem>
            </List>
          </Paper>

          {/* Sección Sesión */}
          <Paper
            elevation={0}
            sx={{
              mb: 8,
              borderRadius: 3,
              bgcolor: "background.paper",
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
                  color: "text.secondary",
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
                      bgcolor: (theme) =>
                        theme.palette.mode === "light"
                          ? "#eaf3ffff"
                          : "rgba(255,255,255,0.05)",
                    },
                  }}
                >
                  <ListItemIcon>
                    <LogoutIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Cerrar sesión"
                    secondary="Sal de tu cuenta de forma segura"
                    primaryTypographyProps={{
                      fontWeight: 500,
                      color: "text.primary",
                    }}
                    secondaryTypographyProps={{ fontSize: "0.85rem" }}
                  />
                  <ChevronRightIcon sx={{ color: "text.secondary" }} />
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
          confirmColor={theme.palette.primary.main}
        />
      </Box>
    </MainLayout>
  );
}
