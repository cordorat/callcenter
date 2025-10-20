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
  DialogContent
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { usersService } from '@/core/api/users';
import { useTheme } from '@mui/material/styles';
import CrearUsuario from './CrearUsuario';

export default function Usuarios() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [openModal, setOpenModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const pageSize = 10;
  const theme = useTheme();

  const rolesMap = {
    'ADMIN': 'Administrador',
    'COORDINADOR': 'Coordinador',
    'AGENTE': 'Agente',
    'JEFE DE CAMPAÑA': 'Jefe de Campaña',
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

  const handleCreateUser = () => setOpenModal(true);
  const handleCloseModal = () => setOpenModal(false);
  const handlePageChange = (event, value) => setPage(value);

  const handleUserCreated = () => {
    setOpenModal(false);
    fetchUsers(1);
    setPage(1);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

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
        {showSuccess && (
          <Alert severity="success" sx={{ mb: 3 }}>
            Usuario creado correctamente
          </Alert>
        )}
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <h2></h2>
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

        <Paper elevation={3} sx={{ borderRadius: 2, overflow: 'hidden', backgroundColor: theme.palette.background.paper }}>
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
          ) : (
            <>
              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: theme.palette.mode === 'light' ? '#EBF5FE' : 'rgba(255,255,255,0.05)' }}>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.9rem', color: theme.palette.text.primary, borderBottom: `2px solid ${theme.palette.primary.main}`, py: 2 }}>Documento</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.9rem', color: theme.palette.text.primary, borderBottom: `2px solid ${theme.palette.primary.main}`, py: 2 }}>Nombre</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.9rem', color: theme.palette.text.primary, borderBottom: `2px solid ${theme.palette.primary.main}`, py: 2 }}>Email</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.9rem', color: theme.palette.text.primary, borderBottom: `2px solid ${theme.palette.primary.main}`, py: 2 }}>Teléfono</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.9rem', color: theme.palette.text.primary, borderBottom: `2px solid ${theme.palette.primary.main}`, py: 2 }}>Rol</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.9rem', color: theme.palette.text.primary, borderBottom: `2px solid ${theme.palette.primary.main}`, py: 2 }}>Estado</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.9rem', color: theme.palette.text.primary, borderBottom: `2px solid ${theme.palette.primary.main}`, py: 2, textAlign: 'center' }}>Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {users.map((user, index) => (
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
                              borderColor: user.is_active ? theme.palette.success.main : theme.palette.grey[500],
                              color: user.is_active ? theme.palette.success.main : theme.palette.grey[500],
                              backgroundColor: 'transparent',
                              border: '2px solid',
                            }}
                          />
                        </TableCell>
                        <TableCell align="center" sx={{ borderBottom: theme.palette.mode === 'light' ? '1px solid rgba(12, 21, 90, 0.1)' : '1px solid rgba(255, 255, 255, 0.1)', textAlign: 'center' }}>
                          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                            <Tooltip title="Ver detalles">
                              <IconButton size="small" color="info">
                                <VisibilityIcon fontSize="small" color='primary' />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Editar">
                              <IconButton size="small" color="primary">
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Desactivar">
                              <IconButton
                                size="small"
                                color="primary"
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
              </Box>

              {/* Paginación */}
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
    </MainLayout>
  );
}