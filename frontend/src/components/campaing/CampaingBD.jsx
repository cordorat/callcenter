//Path: src/components/campaing/CampaingBD.jsx
//Componente para mostrar y editar la información general de la campaña

import * as React from "react";
import { useEffect, useState, useCallback } from "react";
import { Box, Typography, Grid, Paper, Table, TableHead, TableRow, TableCell, TableBody, CircularProgress, Snackbar, Alert } from '@mui/material';
import apiClient from '@/core/api/apiClient';
import { ENDPOINTS } from '@/core/api/endpoints';

export default function Campaing({ selectedFile = null, onClearFile = null }) {
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
        <Alert onClose={() => setSnackOpen(false)} severity={snackSeverity} sx={{ width: '100%' }}>
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
        <Box sx={{ mt: 3 }}><CircularProgress /></Box>
      ) : (
        <Paper sx={{ mt: 2, p: 2, height: '50vh', overflow: 'auto' }}>
          {error && <Typography color="error">{error}</Typography>}

          <Box sx={{ minHeight: 200, display: 'flex', flexDirection: 'column' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Nombre</TableCell>
                  <TableCell>Campaña</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {bases.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 400px)' }}>
                        <Typography>No hay bases cargadas</Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  bases.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell>{b.id}</TableCell>
                      <TableCell>{b.nombre_bd}</TableCell>
                      <TableCell>{b.campana_id || '-'}</TableCell>
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
