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
  Tooltip,
  Pagination
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import { usersService } from '@/core/api/users';
import { useTheme } from '@mui/material/styles';

export default function Usuarios() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 10; // 👈 cantidad de registros por página
  const theme = useTheme();

  // Mapeo de roles para mostrar en español
  const rolesMap = {
    'ADMIN': 'ADMIN',
    'COORDINADOR': 'Coordinador',
    'AGENTE': 'AGENTE',
    'JEFE DE CAMPAÑA': 'Jefe de Campaña',
    'JEFE_CENTRO': 'JEFE DE CENTRO',
    'BACKOFFICE': 'Backoffice'
  };

  // Cargar usuarios al montar el componente o cambiar de página
  useEffect(() => {
    fetchUsers(page);
  }, [page]);

  const fetchUsers = async (pageNumber = 1) => {
    try {
      setLoading(true);
      setError('');
      const data = await usersService.getUsers({ page: pageNumber, page_size: pageSize });
      setUsers(data.results || []);
      setTotalCount(data.count || 0);
      setTotalPages(Math.ceil((data.count || 0) / pageSize));
    } catch (err) {
      console.error('Error al cargar usuarios:', err);
      setError('Error al cargar la lista de usuarios');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = () => navigate('/crear-usuario');
  const handlePageChange = (event, value) => setPage(value);

  const getRoleColor = (role) => {
    const colors = {
      'ADMIN': theme.palette.error.main,
      'COORDINADOR': theme.palette.primary.main,
      'AGENTE': theme.palette.success.main,
      'JEFE DE CAMPAÑA': theme.palette.warning.main,
      'JEFE DE CENTRO': theme.palette.info.main,
      'BACKOFFICE': theme.palette.secondary.main
    };
    return colors[role] || theme.palette.text.primary;
  };

  return (
    <MainLayout title="Usuarios">
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" fontWeight="bold">
            Gestión de Usuarios
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleCreateUser}
            sx={{ borderRadius: 2, px: 3, py: 1.5, textTransform: 'none', fontWeight: 'bold' }}
          >
            Crear Usuario
          </Button>
        </Box>

        {/* Error */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Tabla */}
        <Paper elevation={3} sx={{ borderRadius: 2, overflow: 'hidden' }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
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
              <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreateUser}>
                Crear Primer Usuario
              </Button>
            </Box>
          ) : (
            <>
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
                      <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>Acciones</TableCell>
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
                            label={
                            rolesMap[user.role] ||
                            rolesMap[user.rol?.valor] ||
                            user.role ||
                            user.rol?.valor ||
                            'N/A'
                            }
                            size="small"
                            sx={{
                            fontWeight: 'bold',
                            border: '2px solid',
                            borderColor: getRoleColor(user.role || user.rol?.valor),
                            color: getRoleColor(user.role || user.rol?.valor),
                            backgroundColor: 'transparent', // sin fondo
                            }}
                        />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={user.is_active ? 'Activo' : 'Inactivo'}
                            size="small"
                            variant={user.is_active ? 'filled' : 'outlined'}
                            sx={{borderColor: user.is_active ? theme.palette.success.main : theme.palette.grey[500],
                                color: user.is_active ? theme.palette.success.main : theme.palette.grey[500],
                                backgroundColor: 'transparent', border: '2px solid'
                             }}
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                            <Tooltip title="Ver detalles">
                              <IconButton size="small" color="info" onClick={() => handleViewUser(user.id)}>
                                <VisibilityIcon fontSize="small" color='primary' />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Editar">
                              <IconButton size="small" color="primary" onClick={() => handleEditUser(user.id)}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Desactivar">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => handleDeleteUser(user.id)}
                                disabled={!user.is_active}
                              >
                                <DeleteIcon fontSize="small" color='primary' />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* 🔹 Paginación */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Mostrando {users.length} de {totalCount} usuarios
                </Typography>
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={handlePageChange}
                  color="primary"
                  shape="rounded"
                  size="medium"
                />
              </Box>
            </>
          )}
        </Paper>
      </Box>
    </MainLayout>
  );
}
