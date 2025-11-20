import * as React from "react";
import {
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  Divider,
  Tooltip,
} from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuth } from "@/core/context/AuthContext";
import { useNavigate } from "react-router-dom";
import ConfirmDialog from "@/components/forms/ConfirmDialog";

export default function UserMenuButton() {
  const { user, logout } = useAuth();
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const open = Boolean(anchorEl);
  const navigate = useNavigate();

  // Generar iniciales del nombre completo
  const getInitials = () => {
    if (!user) return "?";
    const firstName = user?.first_name || "";
    const lastName = user?.last_name || "";
    const initials = (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
    return initials || "?";
  };

  const handleMenu = (event) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const handleProfile = () => {
    handleClose();
    navigate("/perfil"); // futura ruta del perfil
  };
  
  const handleLogoutClick = () => {
    handleClose();
    setDialogOpen(true);
  };

  const handleConfirmLogout = () => {
    logout();
  };

  return (
    <>
      <Tooltip title="Menú de usuario">
        <IconButton onClick={handleMenu} size="small" sx={{ ml: 2 }}>
          <Avatar 
            sx={{ 
              width: 32, 
              height: 32,
              backgroundColor: (theme) => theme.palette.primary.main,
              color: "white",
              fontWeight: 700,
              fontSize: "0.875rem",
            }}
            src={user?.foto_perfil || undefined}
          >
            {getInitials()}
          </Avatar>
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        onClick={handleClose}
        PaperProps={{
          elevation: 3,
          sx: { mt: 1.5 },
        }}
      >
        <MenuItem onClick={handleProfile}>
          <ListItemIcon>
            <AccountCircleIcon fontSize="small" />
          </ListItemIcon>
          Editar perfil
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogoutClick}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          Cerrar sesión
        </MenuItem>
      </Menu>

      <ConfirmDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onConfirm={handleConfirmLogout}
        title="Confirmar cierre de sesión"
        message="¿Está seguro de que desea cerrar la sesión?"
        confirmText="Cerrar sesión"
        cancelText="Cancelar"
      />
    </>
  );
}
