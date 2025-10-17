import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/core/components/layout/MainLayout';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  CircularProgress,
  Alert,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import { usersService } from '@/core/api/users';

export default function Usuarios() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Mapeo de roles para mostrar en español
  const rolesMap = {
    'ADMIN': 'Administrador',
    'COORDINADOR': 'Coordinador',
    'AGENTE': 'Agente',
    'JEFE DE CAMPAÑA': 'Jefe de Campaña',
    'JEFE DE CENTRO': 'Jefe de Centro',
    'BACKOFFICE': 'Backoffice'
  };

  // Cargar usuarios al montar el componente
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await usersService.getUsers();
      setUsers(data.results || data);
    } catch (err) {
      console.error('Error al cargar usuarios:', err);
      setError('Error al cargar la lista de usuarios');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = () => {
    navigate('/crear-usuario');
  };

  const getRoleColor = (role) => {
    const colors = {
      'ADMIN': 'error',
      'COORDINADOR': 'primary',
      'AGENTE': 'success',
      'JEFE DE CAMPAÑA': 'warning',
      'JEFE DE CENTRO': 'info',
      'BACKOFFICE': 'secondary'
    };
    return colors[role] || 'default';
  };

  return (
    <MainLayout title="Usuarios">
      <Box sx={{ p: 3 }}>
        {/* Header con título y botón */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 3
          }}
        >
          <Typography variant="h4" fontWeight="bold">
            Gestión de Usuarios
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleCreateUser}
            sx={{
              borderRadius: 2,
              px: 3,
              py: 1.5,
              textTransform: 'none',
              fontWeight: 'bold'
            }}
          >
            Crear Usuario
          </Button>
        </Box>

        {/* Mensaje de error */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Tabla de usuarios */}
        <Paper elevation={3} sx={{ borderRadius: 2, overflow: 'hidden' }}>
          {loading ? (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: 400
              }}
            >
              <CircularProgress />
            </Box>
          ) : users.length === 0 ? (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: 400,
                gap: 2
              }}
            >
              <Typography variant="h6" color="text.secondary">
                No hay usuarios registrados
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleCreateUser}
              >
                Crear Primer Usuario
              </Button>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                    <TableCell sx={{ fontWeight: 'bold' }}>Documento</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Nombre</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Email</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Teléfono</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Rol</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Estado</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>
                      Acciones
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((user) => (
                    <TableRow
                      key={user.id}
                      hover
                      sx={{
                        '&:hover': { backgroundColor: '#f9f9f9' },
                        opacity: user.is_active ? 1 : 0.6
                      }}
                    >
                      <TableCell>{user.documento_id || 'N/A'}</TableCell>
                      <TableCell>
                        {user.first_name} {user.last_name}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.phone || 'N/A'}</TableCell>
                      <TableCell>
                        <Chip
                          label={rolesMap[user.role] || rolesMap[user.rol?.valor] || user.role || user.rol?.valor || 'N/A'}
                          color={getRoleColor(user.role || user.rol?.valor)}
                          size="small"
                          sx={{ fontWeight: 'bold' }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={user.is_active ? 'Activo' : 'Inactivo'}
                          color={user.is_active ? 'success' : 'default'}
                          size="small"
                          variant={user.is_active ? 'filled' : 'outlined'}
                        />
                      </TableCell>
                      <TableCell>
                        <Box
                          sx={{
                            display: 'flex',
                            gap: 1,
                            justifyContent: 'center'
                          }}
                        >
                          <Tooltip title="Ver detalles">
                            <IconButton
                              size="small"
                              color="info"
                              onClick={() => handleViewUser(user.id)}
                            >
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Editar">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleEditUser(user.id)}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Desactivar">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteUser(user.id)}
                              disabled={!user.is_active}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>

        {/* Footer con información */}
        {!loading && users.length > 0 && (
          <Box sx={{ mt: 2, textAlign: 'right' }}>
            <Typography variant="body2" color="text.secondary">
              Total de usuarios: {users.length}
            </Typography>
          </Box>
        )}
      </Box>
    </MainLayout>
  );
}
