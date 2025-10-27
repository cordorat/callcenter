import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  Alert,
  Stack,
  IconButton,
  Tooltip
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Edit as EditIcon } from '@mui/icons-material';
import { getCampaings } from '@/core/api/Campaings';

export default function CampaignsComponent({ onEditTeam, showActions = false }) {
  const theme = useTheme();
  const [campanas, setCampanas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadCampanas();
  }, []);

  const loadCampanas = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getCampaings();

      if (response.success) {
        setCampanas(response.campanas || []);
      } else {
        setError('No se pudieron cargar las campañas');
      }
    } catch (err) {
      console.error('Error cargando las campañas:', err);
      setError(err.response?.data?.message || 'Error al cargar las campañas');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Stack alignItems="center" sx={{ py: 5 }}>
        <CircularProgress />
      </Stack>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Box sx={{ mt: 4 }}>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow
              sx={{
                backgroundColor:
                  theme.palette.mode === 'light'
                    ? '#EBF5FE'
                    : 'rgba(255,255,255,0.05)',
              }}
            >
              {[
                'Nombre de la campaña',
                'Jefe de Campaña',
                'Estado',
                'Descripción'
              ].map((header, idx) => (
                <TableCell
                  key={idx}
                  sx={{
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    color: theme.palette.text.primary,
                    borderBottom: `2px solid ${theme.palette.primary.main}`,
                    py: 2,
                  }}
                >
                  {header}
                </TableCell>
              ))}

              {showActions && (
                <TableCell
                  sx={{
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    color: theme.palette.text.primary,
                    borderBottom: `2px solid ${theme.palette.primary.main}`,
                    py: 2,
                    width: 80,
                    textAlign: 'center',
                  }}
                >
                  Acción
                </TableCell>
              )}
            </TableRow>
          </TableHead>

          <TableBody>
            {campanas.map((campana, index) => (
              <TableRow
                key={campana.campana_id}
                sx={{
                  '&:hover': {
                    backgroundColor:
                      theme.palette.mode === 'light'
                        ? '#F8FBFF'
                        : 'rgba(255, 255, 255, 0.05)',
                  },
                  backgroundColor:
                    theme.palette.mode === 'light'
                      ? index % 2 === 0
                        ? 'white'
                        : '#FAFCFE'
                      : index % 2 === 0
                        ? 'transparent'
                        : 'rgba(255, 255, 255, 0.02)',
                  transition: 'background-color 0.2s ease',
                }}
              >
                <TableCell>{campana.nombre}</TableCell>
                <TableCell>{campana.jefe_campana?.nombre || '-'}</TableCell>
                <TableCell>
                  <Chip
                    label={campana.estado}
                    color={campana.estado === 'Activa' ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>{campana.descripcion || '-'}</TableCell>

                {showActions && (
                  <TableCell align="center">
                    <Tooltip title="Editar campaña" arrow>
                      <IconButton
                        size="small"
                        onClick={() => onEditTeam && onEditTeam(campana)}
                        sx={{
                          bgcolor: 'action.hover',
                          '&:hover': {
                            bgcolor: 'primary.main',
                            color: 'white',
                          },
                          transition: 'all 0.2s',
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
