//Path: frontend/src/pages/Usuario/Usuarios.jsx
//Esta es la página de gestión de usuarios

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
  Pagination,
  Dialog,
  DialogContent,
  TextField,
  InputAdornment
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Close as CloseIcon,
  Person,
  Search as SearchIcon
} from '@mui/icons-material';
import { usersService } from '@/core/api/users';
import { useTheme } from '@mui/material/styles';
import CrearUsuario from './CrearUsuario';
import EditarUsuario from './EditarUsuario';
import GroupIcon from '@mui/icons-material/Group';

export default function Usuarios() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]); // Todos los usuarios sin paginar
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [openModal, setOpenModal] = useState(false);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const pageSize = 6;
  const theme = useTheme();

  const rolesMap = {
    'ADMIN': 'Administrador',
    'COORDINADOR': 'Coordinador',
    'AGENTE': 'Agente',
    'JEFE_CAMPANA': 'Jefe de Campaña',
    'JEFE_CAMPAÑA': 'Jefe de Campaña',
    'JEFE_CENTRO': 'Jefe de Centro',
    'BACKOFFICE': 'Backoffice'
  };

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

  // Cargar todos los usuarios cuando hay búsqueda
  const fetchAllUsers = async () => {
    try {
      const data = await usersService.getUsers({ page: 1, page_size: 1000 }); // Cargar muchos
      setAllUsers(data.results || []);
    } catch (err) {
      console.error('Error al cargar todos los usuarios:', err);
      setAllUsers([]);
    }
  };

  const handleCreateUser = () => setOpenModal(true);
  const handleCloseModal = () => setOpenModal(false);
  const handlePageChange = (event, value) => setPage(value);

  const handleSearchChange = (event) => {
    const newSearch = event.target.value;
    setSearchTerm(newSearch);
    setPage(1);
    
    // Si hay búsqueda, cargar todos los usuarios
    if (newSearch && allUsers.length === 0) {
      fetchAllUsers();
    }
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setPage(1);
    setAllUsers([]);
  };

  // Cuando NO hay búsqueda, usar users del backend (con paginación)
  // Cuando SÍ hay búsqueda, filtrar allUsers y paginar localmente
  let usuariosMostrados = users;
  let totalPaginasActual = totalPages;
  
  if (searchTerm) {
    // Con búsqueda: filtrar allUsers
    const usuariosFiltrados = allUsers.filter(user => {
      const searchLower = searchTerm.toLowerCase();
      return (
        (user.first_name && user.first_name.toLowerCase().includes(searchLower)) ||
        (user.last_name && user.last_name.toLowerCase().includes(searchLower)) ||
        (user.email && user.email.toLowerCase().includes(searchLower)) ||
        (user.documento_id && user.documento_id.toLowerCase().includes(searchLower))
      );
    });
    
    // Paginar los resultados filtrados
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    usuariosMostrados = usuariosFiltrados.slice(startIndex, endIndex);
    totalPaginasActual = Math.ceil(usuariosFiltrados.length / pageSize);
  }

  const handleUserCreated = () => {
    setOpenModal(false);
    fetchUsers(1);
    setPage(1);
    setSuccessMessage('Usuario creado correctamente');
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setOpenEditModal(true);
  };

  const handleCloseEditModal = () => {
    setOpenEditModal(false);
    setSelectedUser(null);
  };

  const handleUserUpdated = () => {
    setOpenEditModal(false);
    setSelectedUser(null);
    fetchUsers(page); // Recargar la página actual
    setSuccessMessage('Datos actualizados correctamente');
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const getRoleColor = (role) => {
    const colors = {
      'ADMIN': theme.palette.error.main,
      'COORDINADOR': theme.palette.primary.main,
      'AGENTE': theme.palette.success.main,
      'JEFE_CAMPAÑA': theme.palette.warning.main,
      'JEFE_CENTRO': theme.palette.info.main,
      'BACKOFFICE': theme.palette.secondary.main
    };
    return colors[role] || theme.palette.text.primary;
  };

  // Gradientes según el tema
  const gradientBg = theme.palette.mode === 'light'
    ? 'linear-gradient(135deg, #2c86eeff 0%, #2a15e9ff 100%)'
    : 'linear-gradient(135deg, #0C155A 0%, #040c47ff 100%)';

  return (
    <MainLayout title="Usuarios">
      <Box sx={{ height: '100%', overflow: 'auto' }}>
        {showSuccess && (
          <Alert severity="success" sx={{ mb: 3 }}>
            {successMessage}
          </Alert>
        )}
        {/* Header con gradiente adaptivo */}
        <Box
          sx={{
            background: gradientBg,
            borderRadius: 3,
            p: 4,
            mb: 4,
            boxShadow: theme.palette.mode === 'light'
              ? '0 8px 32px rgba(102, 126, 234, 0.25)'
              : '0 8px 32px rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 2,
            transition: 'all 0.3s ease'
          }}
        >
          <Box sx={{ color: 'white' }}>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <GroupIcon sx={{ fontSize: '40px' }} />
              Usuarios
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.95 }}>
              Gestiona los usuarios de la plataforma
            </Typography>
          </Box>

          <Button
            variant="contained"
            size="large"
            startIcon={<AddIcon />}
            onClick={handleCreateUser}
            sx={{
              bgcolor: theme.palette.mode === 'light' ? 'white' : 'rgba(255, 255, 255, 0.1)',
              color: theme.palette.mode === 'light' ? 'primary.main' : 'white',
              fontWeight: 600,
              px: 4,
              py: 1.5,
              borderRadius: 2,
              border: theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.2)' : 'none',
              boxShadow: theme.palette.mode === 'light'
                ? '0 4px 12px rgba(0,0,0,0.15)'
                : '0 4px 12px rgba(0,0,0,0.3)',
              '&:hover': {
                bgcolor: theme.palette.mode === 'light' ? 'grey.100' : 'rgba(255, 255, 255, 0.15)',
                transform: 'translateY(-2px)',
                boxShadow: theme.palette.mode === 'light'
                  ? '0 6px 20px rgba(0,0,0,0.2)'
                  : '0 6px 20px rgba(0,0,0,0.4)',
              },
              transition: 'all 0.3s ease'
            }}
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

        {/* Buscador */}
        <Box sx={{ mb: 4 }}>
          <TextField
            fullWidth
            placeholder="Buscar por nombre, email o documento..."
            value={searchTerm}
            onChange={handleSearchChange}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: 'primary.main' }} />
                </InputAdornment>
              ),
            }}
            sx={{
              maxWidth: 600,
              '& .MuiOutlinedInput-root': {
                borderRadius: 3,
                bgcolor: 'background.paper',
                boxShadow: theme.palette.mode === 'light'
                  ? '0 2px 8px rgba(0,0,0,0.08)'
                  : '0 2px 8px rgba(0,0,0,0.3)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  boxShadow: theme.palette.mode === 'light'
                    ? '0 4px 12px rgba(0,0,0,0.12)'
                    : '0 4px 12px rgba(0,0,0,0.4)',
                },
                '&.Mui-focused': {
                  boxShadow: theme.palette.mode === 'light'
                    ? '0 4px 16px rgba(102, 126, 234, 0.25)'
                    : '0 4px 16px rgba(102, 126, 234, 0.15)',
                }
              }
            }}
          />
        </Box>

        <Paper elevation={0} sx={{ borderRadius: 2, overflow: 'hidden', backgroundColor: theme.palette.background.paper }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
              <CircularProgress sx={{ color: theme.palette.primary.main }} />
            </Box>
          ) : users.length === 0 ? (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: 400,
                gap: 2,
                backgroundColor: theme.palette.background.paper,
                borderRadius: 2,
              }}
            >
              <Typography variant="h6" color="text.secondary">
                No hay usuarios registrados
              </Typography>
              <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreateUser}>
                Crear Primer Usuario
              </Button>
            </Box>
          ) : usuariosMostrados.length === 0 ? (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: 400,
                gap: 2,
                backgroundColor: theme.palette.background.paper,
                borderRadius: 2,
              }}
            >
              <Typography variant="h6" color="text.secondary">
                No se encontraron usuarios con ese criterio de búsqueda
              </Typography>
              <Button variant="text" onClick={handleClearSearch}>
                Limpiar búsqueda
              </Button>
            </Box>
          ) : (
            <>
              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: theme.palette.mode === 'light' ? '#EBF5FE' : 'rgba(255,255,255,0.05)' }}>
                      <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.9rem', color: theme.palette.text.primary, borderBottom: `2px solid ${theme.palette.primary.main}`, py: 2, textAlign: 'center' }}>Documento</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.9rem', color: theme.palette.text.primary, borderBottom: `2px solid ${theme.palette.primary.main}`, py: 2, textAlign: 'center' }}>Nombre</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.9rem', color: theme.palette.text.primary, borderBottom: `2px solid ${theme.palette.primary.main}`, py: 2, textAlign: 'center' }}>Email</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.9rem', color: theme.palette.text.primary, borderBottom: `2px solid ${theme.palette.primary.main}`, py: 2, textAlign: 'center' }}>Teléfono</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.9rem', color: theme.palette.text.primary, borderBottom: `2px solid ${theme.palette.primary.main}`, py: 2, textAlign: 'center' }}>Rol</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.9rem', color: theme.palette.text.primary, borderBottom: `2px solid ${theme.palette.primary.main}`, py: 2, textAlign: 'center' }}>Estado</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.9rem', color: theme.palette.text.primary, borderBottom: `2px solid ${theme.palette.primary.main}`, py: 2, textAlign: 'center' }}>Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {usuariosMostrados.map((user, index) => (
                      <TableRow
                        key={user.id}
                        hover
                        sx={{
                          '&:hover': {
                            backgroundColor: theme.palette.mode === 'light' ? '#F8FBFF' : 'rgba(255, 255, 255, 0.05)',
                          },
                          backgroundColor: theme.palette.mode === 'light'
                            ? (index % 2 === 0 ? 'white' : '#FAFCFE')
                            : (index % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.02)'),
                          opacity: user.is_active ? 1 : 0.6,
                          transition: 'background-color 0.2s ease',
                        }}
                      >
                        <TableCell align="center" sx={{ color: theme.palette.text.primary, fontWeight: 600, fontSize: '0.85rem', borderBottom: theme.palette.mode === 'light' ? '1px solid rgba(12, 21, 90, 0.1)' : '1px solid rgba(255, 255, 255, 0.1)' }}>{user.documento_id || 'N/A'}</TableCell>
                        <TableCell align="center" sx={{ color: theme.palette.text.primary, fontWeight: 600, fontSize: '0.85rem', borderBottom: theme.palette.mode === 'light' ? '1px solid rgba(12, 21, 90, 0.1)' : '1px solid rgba(255, 255, 255, 0.1)' }}>{user.first_name} {user.last_name}</TableCell>
                        <TableCell align="center" sx={{ color: theme.palette.text.secondary, fontSize: '0.85rem', borderBottom: theme.palette.mode === 'light' ? '1px solid rgba(12, 21, 90, 0.1)' : '1px solid rgba(255, 255, 255, 0.1)' }}>{user.email}</TableCell>
                        <TableCell align="center" sx={{ color: theme.palette.text.primary, fontSize: '0.85rem', borderBottom: theme.palette.mode === 'light' ? '1px solid rgba(12, 21, 90, 0.1)' : '1px solid rgba(255, 255, 255, 0.1)' }}>{user.phone || 'N/A'}</TableCell>
                        <TableCell align="center" sx={{ borderBottom: theme.palette.mode === 'light' ? '1px solid rgba(12, 21, 90, 0.1)' : '1px solid rgba(255, 255, 255, 0.1)' }}>
                          <Chip
                            label={rolesMap[user.role] || rolesMap[user.rol?.valor] || user.role || user.rol?.valor || 'N/A'}
                            size="small"
                            sx={{
                              fontWeight: 'bold',
                              border: '2px solid',
                              borderColor: getRoleColor(user.role || user.rol?.valor),
                              color: getRoleColor(user.role || user.rol?.valor),
                              backgroundColor: 'transparent',
                            }}
                          />
                        </TableCell>
                        <TableCell align="center" sx={{ borderBottom: theme.palette.mode === 'light' ? '1px solid rgba(12, 21, 90, 0.1)' : '1px solid rgba(255, 255, 255, 0.1)' }}>
                          <Chip
                            label={user.is_active ? 'Activo' : 'Inactivo'}
                            size="small"
                            variant={user.is_active ? 'filled' : 'outlined'}
                            sx={{
                              borderColor: user.is_active ? theme.palette.success.main : theme.palette.error.main,
                              color: user.is_active ? theme.palette.success.main : theme.palette.error.main,
                              backgroundColor: user.is_active ? 'transparent' : 'transparent',
                              border: '2px solid',
                              fontWeight: 'bold',
                            }}
                          />
                        </TableCell>
                        <TableCell align="center" sx={{ borderBottom: theme.palette.mode === 'light' ? '1px solid rgba(12, 21, 90, 0.1)' : '1px solid rgba(255, 255, 255, 0.1)', textAlign: 'center' }}>
                          <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center' }}>
                            <Tooltip title="Editar">
                              <span>
                                <IconButton
                                  size="small"
                                  onClick={() => handleEditUser(user)}
                                  sx={{
                                    color: 'primary.main',
                                    '&:hover': {
                                      backgroundColor: 'rgba(47, 118, 230, 0.1)',
                                    },
                                  }}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>                 
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>

              {/* Paginación */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Mostrando {usuariosMostrados.length} de {searchTerm ? allUsers.filter(user => {
                    const searchLower = searchTerm.toLowerCase();
                    return (
                      (user.first_name && user.first_name.toLowerCase().includes(searchLower)) ||
                      (user.last_name && user.last_name.toLowerCase().includes(searchLower)) ||
                      (user.email && user.email.toLowerCase().includes(searchLower)) ||
                      (user.documento_id && user.documento_id.toLowerCase().includes(searchLower))
                    );
                  }).length : totalCount} usuarios
                </Typography>
                <Pagination
                  count={totalPaginasActual}
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

      {/* Modal para crear usuario */}
      <Dialog
        open={openModal}
        onClose={handleCloseModal}
        maxWidth="md"
        fullWidth
        sx={{
          '& .MuiDialog-paper': {
            borderRadius: 3,
          }
        }}
      >
        <Box sx={{ position: 'relative' }}>
          <IconButton
            onClick={handleCloseModal}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              zIndex: 1,
              backgroundColor: theme.palette.mode === 'light' ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.08)',
              '&:hover': {
                backgroundColor: theme.palette.mode === 'light' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.12)',
              }
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
        <DialogContent sx={{ p: 3, pt: 1 }}>
          <CrearUsuario isModal={true} onUserCreated={handleUserCreated} onCancel={handleCloseModal} />
        </DialogContent>
      </Dialog>

      {/* Modal para editar usuario */}
      <Dialog
        open={openEditModal}
        onClose={handleCloseEditModal}
        maxWidth="md"
        fullWidth
        sx={{
          '& .MuiDialog-paper': {
            borderRadius: 3,
          }
        }}
      >
        <Box sx={{ position: 'relative' }}>
          <IconButton
            onClick={handleCloseEditModal}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              zIndex: 1,
              backgroundColor: theme.palette.mode === 'light' ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.08)',
              '&:hover': {
                backgroundColor: theme.palette.mode === 'light' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.12)',
              }
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
        <DialogContent sx={{ p: 3, pt: 1 }}>
          <EditarUsuario 
            user={selectedUser} 
            onUserUpdated={handleUserUpdated} 
            onCancel={handleCloseEditModal} 
          />
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}