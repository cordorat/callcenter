//Path: src/components/campaing/CampaingBD.jsx
//Componente para mostrar y editar la información general de la campaña

import * as React from "react";
import { useEffect, useState, useCallback } from "react";
import { Box, Typography, Grid, Paper, Table, TableHead, TableRow, TableCell, TableBody, CircularProgress, Snackbar, Alert } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import apiClient from '@/core/api/apiClient';
import { ENDPOINTS } from '@/core/api/endpoints';

export default function Campaing({ selectedFile = null, onClearFile = null }) {
  const theme = useTheme();
  const [bases, setBases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [snackOpen, setSnackOpen] = useState(false);
  const [snackMessage, setSnackMessage] = useState('');
  const [snackSeverity, setSnackSeverity] = useState('success');

  const fetchBases = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const { data } = await apiClient.get(ENDPOINTS.CAMPAIGNS_LIST, { params: { page } });
      setBases(data.results || []);
    } catch (err) {
      console.error('Error fetching bases:', err);
      setError('No se pudieron obtener las bases de datos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBases();
  }, [fetchBases]);

  const handleFileSelect = async (file) => {
    const campanaId = 1;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('campana_id', campanaId);

    try {
      setUploading(true);
      setError(null);
      const res = await apiClient.post(ENDPOINTS.CAMPAIGNS_UPLOAD, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      console.info('Upload response:', res.data);
      await fetchBases();
      setSnackMessage('Base de datos subida correctamente');
      setSnackSeverity('success');
      setSnackOpen(true);
    } catch (err) {
      console.error('Upload error', err);
      setError('Error al subir la base de datos');
      setSnackMessage('Error al subir la base de datos');
      setSnackSeverity('error');
      setSnackOpen(true);
    } finally {
      setUploading(false);
    }
  };

  // Cuando el padre pasa `selectedFile`, iniciamos la subida automáticamente
  useEffect(() => {
    if (selectedFile) {
      handleFileSelect(selectedFile).then(() => {
        if (typeof onClearFile === 'function') onClearFile();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFile]);

  return (
    <Box sx={{ p: 2 }}>
      <Snackbar
        open={snackOpen}
        autoHideDuration={4000}
        onClose={() => setSnackOpen(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{ mt: 8 }}
      >
        <Alert
          onClose={() => setSnackOpen(false)}
          severity={snackSeverity}
          variant="outlined"
          sx={{
            width: '100%',
            minWidth: '320px',
            borderRadius: '10px',
            backgroundColor: theme.palette.mode === 'light' ? '#EBF5FE' : 'rgba(255,255,255,0.05)',
            borderWidth: '2px',
            borderColor: snackSeverity === 'success' ? '#0f9d58' :
              snackSeverity === 'error' ? '#d32f2f' :
                snackSeverity === 'warning' ? '#f57c00' : theme.palette.primary.main,
            boxShadow: theme.palette.mode === 'light'
              ? '0 4px 12px rgba(12, 21, 90, 0.15)'
              : '0 4px 12px rgba(0, 0, 0, 0.5)',
            '& .MuiAlert-icon': {
              fontSize: '1.3rem',
              color: snackSeverity === 'success' ? '#0f9d58' :
                snackSeverity === 'error' ? '#d32f2f' :
                  snackSeverity === 'warning' ? '#f57c00' : theme.palette.primary.main,
            },
            '& .MuiAlert-message': {
              fontSize: '0.9rem',
              fontWeight: 500,
              color: theme.palette.text.primary,
            },
          }}
        >
          {snackMessage}
        </Alert>
      </Snackbar>
      {uploading && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2">Subiendo archivo...</Typography>
          <CircularProgress size={20} />
        </Box>
      )}

      {loading && !uploading ? (
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress sx={{ color: theme.palette.primary.main }} />
        </Box>
      ) : (
        <Paper
          elevation={0}
          sx={{
            backgroundColor: theme.palette.background.paper,
            borderRadius: 2,
            overflow: 'hidden', // Importante para que las esquinas se vean redondeadas
          }}
        >
          {error && (
            <Box sx={{ p: 2 }}>
              <Typography color="error" sx={{ fontWeight: 500 }}>{error}</Typography>
            </Box>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: theme.palette.mode === 'light' ? '#EBF5FE' : 'rgba(255,255,255,0.05)' }}>
                  <TableCell
                    sx={{
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      color: theme.palette.text.primary,
                      borderBottom: `2px solid ${theme.palette.primary.main}`,
                      py: 2,
                    }}
                  >
                    ID
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      color: theme.palette.text.primary,
                      borderBottom: `2px solid ${theme.palette.primary.main}`,
                      py: 2,
                    }}
                  >
                    Nombre
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      color: theme.palette.text.primary,
                      borderBottom: `2px solid ${theme.palette.primary.main}`,
                      py: 2,
                    }}
                  >
                    Campaña
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {bases.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} sx={{ border: 'none' }}>
                      <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        py: 8,
                        flexDirection: 'column',
                        gap: 2,
                      }}>
                        <Typography
                          sx={{
                            color: theme.palette.mode === 'light'
                              ? 'rgba(12, 21, 90, 0.5)'
                              : 'rgba(255, 255, 255, 0.5)',
                            fontSize: '1.1rem',
                            fontWeight: 500,
                          }}
                        >
                          No hay bases cargadas
                        </Typography>
                        <Typography
                          sx={{
                            color: theme.palette.mode === 'light'
                              ? 'rgba(12, 21, 90, 0.4)'
                              : 'rgba(255, 255, 255, 0.4)',
                            fontSize: '0.9rem',
                          }}
                        >
                          Sube una base de datos para comenzar
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  bases.map((b, index) => (
                    <TableRow
                      key={b.id}
                      sx={{
                        '&:hover': {
                          backgroundColor: theme.palette.mode === 'light'
                            ? '#F8FBFF'
                            : 'rgba(255, 255, 255, 0.05)',
                        },
                        backgroundColor: theme.palette.mode === 'light'
                          ? (index % 2 === 0 ? 'white' : '#FAFCFE')
                          : (index % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.02)'),
                        transition: 'background-color 0.2s ease',
                      }}
                    >
                      <TableCell
                        sx={{
                          color: theme.palette.text.primary,
                          fontWeight: 600,
                          fontSize: '0.85rem',
                          borderBottom: theme.palette.mode === 'light'
                            ? '1px solid rgba(12, 21, 90, 0.1)'
                            : '1px solid rgba(255, 255, 255, 0.1)',
                        }}
                      >
                        {b.id}
                      </TableCell>
                      <TableCell
                        sx={{
                          color: theme.palette.text.primary,
                          fontSize: '0.85rem',
                          borderBottom: theme.palette.mode === 'light'
                            ? '1px solid rgba(12, 21, 90, 0.1)'
                            : '1px solid rgba(255, 255, 255, 0.1)',
                        }}
                      >
                        {b.nombre_bd}
                      </TableCell>
                      <TableCell
                        sx={{
                          color: theme.palette.text.secondary,
                          fontSize: '0.85rem',
                          borderBottom: theme.palette.mode === 'light'
                            ? '1px solid rgba(12, 21, 90, 0.1)'
                            : '1px solid rgba(255, 255, 255, 0.1)',
                        }}
                      >
                        {b.campana || '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Box>
        </Paper>
      )}
    </Box>
  );
}
