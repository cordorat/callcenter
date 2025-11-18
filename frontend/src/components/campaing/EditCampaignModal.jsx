// PATH: src/components/campaing/EditCampaignModal.jsx
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  Switch,
  FormControlLabel,
  Autocomplete,
} from "@mui/material";

import {
  searchJefesCampana,
  getProductosActivos,
  updateCampaign,
  processCampaignError,
  getCampaignDetail, // importante para prellenar
} from "@/core/api/campaigns";

const alphaRegex = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s]+$/;

export default function EditCampaignModal({
  open,
  onClose,
  campaign,
  onCampaignUpdated,
}) {
  if (!open || !campaign) return null;

  const [formValues, setFormValues] = useState({
    jefeSeleccionado: null,
    nombre: "",
    descripcion: "",
    estadoActiva: true,
    fecha_inicio: "",
    fecha_fin: "",
    productosSeleccionados: [],
  });

  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState(null);
  const [saving, setSaving] = useState(false);

  // Estado para jefes
  const [jefesOptions, setJefesOptions] = useState([]);
  const [jefesLoading, setJefesLoading] = useState(false);

  // Estado para productos
  const [productosOptions, setProductosOptions] = useState([]);
  const [productosLoading, setProductosLoading] = useState(false);

  // Al abrir el modal, cargamos el DETALLE completo de la campaña
  useEffect(() => {
    const loadDetalle = async () => {
      if (!open || !campaign?.id) return;

      try {
        setApiError(null);
        setErrors({});

        const detalle = await getCampaignDetail(campaign.id);
        // console.log("[EditCampaignModal] detalle campaña:", detalle);

        // Armamos el jefeSeleccionado a partir del detalle
        const jefeSeleccionado = detalle.jefe_campana
          ? {
              id: detalle.jefe_campana, // FK del usuario
              codigo:
                detalle.jefe_campana_codigo ||
                detalle.jefe_campana ||
                "",
              nombre: detalle.jefe_campana_nombre || "",
            }
          : null;

        // Lista de productos que ya tiene la campaña
        const productosSeleccionados = Array.isArray(detalle.productos)
          ? detalle.productos
          : [];

        setFormValues({
          jefeSeleccionado,
          nombre: detalle.nombre || "",
          descripcion: detalle.descripcion || "",
          // Solo visual; el back maneja el estado como FK
          estadoActiva:
            (detalle.estado_nombre || "").toUpperCase() === "ACTIVA",
          fecha_inicio: detalle.fecha_inicio || "",
          fecha_fin: detalle.fecha_fin || "",
          productosSeleccionados,
        });

        // Para que el Autocomplete muestre el jefe actual en la lista
        if (jefeSeleccionado) {
          setJefesOptions((prev) => {
            const existe = prev.some((j) => j.id === jefeSeleccionado.id);
            return existe ? prev : [jefeSeleccionado, ...prev];
          });
        }
      } catch (error) {
        console.error("[EditCampaignModal] Error cargando detalle:", error);
        setApiError("No se pudo cargar el detalle de la campaña.");
      }
    };

    loadDetalle();
  }, [open, campaign]);

  // Cargar productos activos para el Autocomplete
  useEffect(() => {
    const loadProductos = async () => {
      if (!open) return;
      try {
        setProductosLoading(true);
        const resp = await getProductosActivos();
        // tu API devuelve { success, productos }
        const productos = resp.productos || resp;
        setProductosOptions(Array.isArray(productos) ? productos : []);
      } catch (e) {
        console.error("[EditCampaignModal] Error al cargar productos:", e);
      } finally {
        setProductosLoading(false);
      }
    };

    loadProductos();
  }, [open]);

  const handleChangeField = (field) => (event) => {
    let value = event.target.value;

    if (field === "nombre" || field === "descripcion") {
      const maxLength = field === "nombre" ? 50 : 200;
      value = value.slice(0, maxLength);

      if (value !== "" && !alphaRegex.test(value)) {
        return;
      }
    }

    setFormValues((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleToggleEstado = (event) => {
    setFormValues((prev) => ({
      ...prev,
      estadoActiva: event.target.checked,
    }));
  };

  // Búsqueda en tiempo real de jefes
  const handleJefeInputChange = async (_, value) => {
    if (!value || value.trim().length < 2) {
      // Si se borra el texto, dejamos solo el jefe actual (si existe)
      setJefesOptions((prev) => {
        const actual = formValues.jefeSeleccionado;
        if (!actual) return [];
        return [actual];
      });
      return;
    }

    try {
      setJefesLoading(true);
      const data = await searchJefesCampana(value.trim());
      const results = Array.isArray(data) ? data : [];
      setJefesOptions(results);
    } catch (e) {
      console.error("[EditCampaignModal] Error buscando jefes:", e);
    } finally {
      setJefesLoading(false);
    }
  };

  const handleChangeJefe = (_, newValue) => {
    setFormValues((prev) => ({
      ...prev,
      jefeSeleccionado: newValue,
    }));
  };

  const handleChangeProductos = (_, newValue) => {
    setFormValues((prev) => ({
      ...prev,
      productosSeleccionados: newValue,
    }));
  };

  const validate = () => {
    const newErrors = {};

    if (!formValues.jefeSeleccionado) {
      newErrors.jefeSeleccionado = "Debes seleccionar un jefe de campaña.";
    }

    const nombre = formValues.nombre?.trim() || "";
    if (!nombre || nombre.length < 5) {
      newErrors.nombre = "El nombre debe tener al menos 5 caracteres.";
    } else if (nombre.length > 50) {
      newErrors.nombre = "El nombre no puede superar los 50 caracteres.";
    } else if (!alphaRegex.test(nombre)) {
      newErrors.nombre = "El nombre solo puede contener letras y espacios.";
    }

    const descripcion = formValues.descripcion?.trim() || "";
    if (descripcion) {
      if (descripcion.length > 200) {
        newErrors.descripcion =
          "La descripción no puede superar los 200 caracteres.";
      } else if (!alphaRegex.test(descripcion)) {
        newErrors.descripcion =
          "La descripción solo puede contener letras y espacios.";
      }
    }

    if (!formValues.fecha_inicio) {
      newErrors.fecha_inicio = "Debes seleccionar una fecha de inicio.";
    }
    if (!formValues.fecha_fin) {
      newErrors.fecha_fin = "Debes seleccionar una fecha de fin.";
    }
    if (formValues.fecha_inicio && formValues.fecha_fin) {
      const inicio = new Date(formValues.fecha_inicio);
      const fin = new Date(formValues.fecha_fin);
      if (fin <= inicio) {
        newErrors.fecha_fin =
          "La fecha de fin debe ser posterior a la fecha de inicio.";
      }
    }

    if (
      !formValues.productosSeleccionados ||
      formValues.productosSeleccionados.length === 0
    ) {
      newErrors.productosSeleccionados =
        "Debes seleccionar al menos un servicio o producto.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    setApiError(null);
    setErrors({});
    if (!campaign) return;
    if (!validate()) return;

    const payload = {
      nombre: formValues.nombre.trim(),
      descripcion: formValues.descripcion.trim(),
      fecha_inicio: formValues.fecha_inicio,
      fecha_fin: formValues.fecha_fin,
      // NO enviamos `estado` porque el backend espera un FK (ID), no "ACTIVA"/"INACTIVA"
      jefe_campana: formValues.jefeSeleccionado?.id ?? null,
      productos_ids: formValues.productosSeleccionados.map((p) => p.id),
    };

    try {
      setSaving(true);
      const resp = await updateCampaign(campaign.id, payload);
      const updated = resp.data || resp;

      if (onCampaignUpdated) {
        onCampaignUpdated(updated);
      }
      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error("[EditCampaignModal] Error actualizando campaña:", error);

      // Mostrar el detalle de validación del backend en los campos
      if (error.response?.data && typeof error.response.data === "object") {
        const backendData = error.response.data;
        const fieldErrors = {};

        Object.entries(backendData).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            fieldErrors[key] = value.join(" ");
          } else if (typeof value === "string") {
            fieldErrors[key] = value;
          }
        });

        setErrors((prev) => ({
          ...prev,
          ...fieldErrors,
        }));
      }

      const info = processCampaignError
        ? processCampaignError(error)
        : {
            mensaje: "Error al actualizar la campaña. Intenta de nuevo.",
          };
      setApiError(info.mensaje);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          backdropFilter: 'blur(4px)',
        },
      }}
    >
      <DialogTitle
        sx={{
          fontWeight: 700,
          fontSize: '1.25rem',
          background: (theme) =>
            theme.palette.mode === 'light'
              ? 'linear-gradient(135deg, #0C155A 0%, #1A2E7A 100%)'
              : 'linear-gradient(135deg, #1A2E7A 0%, #0F1F4A 100%)',
          color: 'white',
          borderRadius: '12px 12px 0 0',
        }}
      >
        Editar Campaña
      </DialogTitle>

      <DialogContent dividers sx={{ py: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {apiError && (
            <Box
              sx={{
                p: 2,
                bgcolor: 'error.light',
                borderLeft: '4px solid',
                borderColor: 'error.main',
                borderRadius: 1,
              }}
            >
              <Typography color="error" variant="body2">
                {apiError}
              </Typography>
            </Box>
          )}

          {/* Jefe de campaña */}
          <Box>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                color: 'text.secondary',
                mb: 2,
                display: 'block',
              }}
            >
              Jefe de Campaña
            </Typography>
            <Autocomplete
              fullWidth
              options={jefesOptions}
              value={formValues.jefeSeleccionado}
              onChange={handleChangeJefe}
              onInputChange={handleJefeInputChange}
              loading={jefesLoading}
              isOptionEqualToValue={(option, value) =>
                Boolean(option && value) && option.id === value.id
              }
              getOptionLabel={(option) =>
                option
                  ? `${option.codigo ?? ''} - ${option.nombre ?? ''}`
                  : ''
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Buscar por nombre o código"
                  error={Boolean(errors.jefeSeleccionado)}
                  helperText={errors.jefeSeleccionado}
                  variant="outlined"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '10px',
                      backgroundColor: (theme) =>
                        theme.palette.mode === 'light'
                          ? '#EBF5FE'
                          : 'rgba(255, 255, 255, 0.05)',
                      '& fieldset': {
                        borderColor: (theme) =>
                          theme.palette.mode === 'light'
                            ? 'rgba(12, 21, 90, 0.15)'
                            : 'rgba(255, 255, 255, 0.15)',
                        borderWidth: '1.5px',
                      },
                      '&:hover fieldset': {
                        borderColor: (theme) =>
                          theme.palette.mode === 'light'
                            ? 'rgba(12, 21, 90, 0.3)'
                            : 'rgba(255, 255, 255, 0.3)',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: (theme) => theme.palette.primary.main,
                        borderWidth: '2px',
                      },
                    },
                  }}
                />
              )}
            />
          </Box>

          {/* Nombre de la campaña */}
          <Box>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                color: 'text.secondary',
                mb: 2,
                display: 'block',
              }}
            >
              Nombre de la Campaña
            </Typography>
            <TextField
              label="Ej: Campaña de Telemarketing Q4"
              fullWidth
              value={formValues.nombre}
              onChange={handleChangeField('nombre')}
              error={Boolean(errors.nombre)}
              helperText={
                errors.nombre || `${formValues.nombre.length}/50 caracteres`
              }
              inputProps={{ maxLength: 50 }}
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '10px',
                  backgroundColor: (theme) =>
                    theme.palette.mode === 'light'
                      ? '#EBF5FE'
                      : 'rgba(255, 255, 255, 0.05)',
                  '& fieldset': {
                    borderColor: (theme) =>
                      theme.palette.mode === 'light'
                        ? 'rgba(12, 21, 90, 0.15)'
                        : 'rgba(255, 255, 255, 0.15)',
                    borderWidth: '1.5px',
                  },
                  '&:hover fieldset': {
                    borderColor: (theme) =>
                      theme.palette.mode === 'light'
                        ? 'rgba(12, 21, 90, 0.3)'
                        : 'rgba(255, 255, 255, 0.3)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: (theme) => theme.palette.primary.main,
                    borderWidth: '2px',
                  },
                },
              }}
            />
          </Box>

          {/* Descripción */}
          <Box>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                color: 'text.secondary',
                mb: 2,
                display: 'block',
              }}
            >
              Descripción
            </Typography>
            <TextField
              label="Describe el objetivo y alcance de la campaña"
              fullWidth
              multiline
              minRows={3}
              value={formValues.descripcion}
              onChange={handleChangeField('descripcion')}
              error={Boolean(errors.descripcion)}
              helperText={
                errors.descripcion ||
                `${formValues.descripcion.length}/200 caracteres`
              }
              inputProps={{ maxLength: 200 }}
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '10px',
                  backgroundColor: (theme) =>
                    theme.palette.mode === 'light'
                      ? '#EBF5FE'
                      : 'rgba(255, 255, 255, 0.05)',
                  '& fieldset': {
                    borderColor: (theme) =>
                      theme.palette.mode === 'light'
                        ? 'rgba(12, 21, 90, 0.15)'
                        : 'rgba(255, 255, 255, 0.15)',
                    borderWidth: '1.5px',
                  },
                  '&:hover fieldset': {
                    borderColor: (theme) =>
                      theme.palette.mode === 'light'
                        ? 'rgba(12, 21, 90, 0.3)'
                        : 'rgba(255, 255, 255, 0.3)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: (theme) => theme.palette.primary.main,
                    borderWidth: '2px',
                  },
                },
              }}
            />
          </Box>

          {/* Fecha de inicio */}
          <Box>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                color: 'text.secondary',
                mb: 2,
                display: 'block',
              }}
            >
              Fecha de Inicio
            </Typography>
            <TextField
              type="date"
              fullWidth
              value={formValues.fecha_inicio}
              onChange={handleChangeField('fecha_inicio')}
              InputLabelProps={{ shrink: true }}
              error={Boolean(errors.fecha_inicio)}
              helperText={errors.fecha_inicio}
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '10px',
                  backgroundColor: (theme) =>
                    theme.palette.mode === 'light'
                      ? '#EBF5FE'
                      : 'rgba(255, 255, 255, 0.05)',
                  '& fieldset': {
                    borderColor: (theme) =>
                      theme.palette.mode === 'light'
                        ? 'rgba(12, 21, 90, 0.15)'
                        : 'rgba(255, 255, 255, 0.15)',
                    borderWidth: '1.5px',
                  },
                  '&:hover fieldset': {
                    borderColor: (theme) =>
                      theme.palette.mode === 'light'
                        ? 'rgba(12, 21, 90, 0.3)'
                        : 'rgba(255, 255, 255, 0.3)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: (theme) => theme.palette.primary.main,
                    borderWidth: '2px',
                  },
                },
              }}
            />
          </Box>

          {/* Fecha de fin */}
          <Box>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                color: 'text.secondary',
                mb: 2,
                display: 'block',
              }}
            >
              Fecha de Fin
            </Typography>
            <TextField
              type="date"
              fullWidth
              value={formValues.fecha_fin}
              onChange={handleChangeField('fecha_fin')}
              InputLabelProps={{ shrink: true }}
              error={Boolean(errors.fecha_fin)}
              helperText={errors.fecha_fin}
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '10px',
                  backgroundColor: (theme) =>
                    theme.palette.mode === 'light'
                      ? '#EBF5FE'
                      : 'rgba(255, 255, 255, 0.05)',
                  '& fieldset': {
                    borderColor: (theme) =>
                      theme.palette.mode === 'light'
                        ? 'rgba(12, 21, 90, 0.15)'
                        : 'rgba(255, 255, 255, 0.15)',
                    borderWidth: '1.5px',
                  },
                  '&:hover fieldset': {
                    borderColor: (theme) =>
                      theme.palette.mode === 'light'
                        ? 'rgba(12, 21, 90, 0.3)'
                        : 'rgba(255, 255, 255, 0.3)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: (theme) => theme.palette.primary.main,
                    borderWidth: '2px',
                  },
                },
              }}
            />
          </Box>

          {/* Servicios o productos */}
          <Box>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                color: 'text.secondary',
                mb: 2,
                display: 'block',
              }}
            >
              Servicios o Productos a Vender
            </Typography>
            <Autocomplete
              multiple
              fullWidth
              options={productosOptions}
              loading={productosLoading}
              value={formValues.productosSeleccionados}
              onChange={handleChangeProductos}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              getOptionLabel={(option) => (option ? `${option.nombre}` : '')}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Selecciona uno o varios productos"
                  error={Boolean(errors.productosSeleccionados)}
                  helperText={errors.productosSeleccionados}
                  variant="outlined"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '10px',
                      backgroundColor: (theme) =>
                        theme.palette.mode === 'light'
                          ? '#EBF5FE'
                          : 'rgba(255, 255, 255, 0.05)',
                      '& fieldset': {
                        borderColor: (theme) =>
                          theme.palette.mode === 'light'
                            ? 'rgba(12, 21, 90, 0.15)'
                            : 'rgba(255, 255, 255, 0.15)',
                        borderWidth: '1.5px',
                      },
                      '&:hover fieldset': {
                        borderColor: (theme) =>
                          theme.palette.mode === 'light'
                            ? 'rgba(12, 21, 90, 0.3)'
                            : 'rgba(255, 255, 255, 0.3)',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: (theme) => theme.palette.primary.main,
                        borderWidth: '2px',
                      },
                    },
                  }}
                />
              )}
            />
          </Box>

          {/* Estado - Switch */}
          <Box
            sx={{
              p: 2,
              backgroundColor: (theme) =>
                theme.palette.mode === 'light'
                  ? 'rgba(12, 21, 90, 0.03)'
                  : 'rgba(255, 255, 255, 0.05)',
              borderRadius: '10px',
              border: '1.5px solid',
              borderColor: (theme) =>
                theme.palette.mode === 'light'
                  ? 'rgba(12, 21, 90, 0.1)'
                  : 'rgba(255, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Typography
              variant="body2"
              sx={{ fontWeight: 600, color: 'text.primary' }}
            >
              Estado de la Campaña
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={formValues.estadoActiva}
                  onChange={handleToggleEstado}
                  color="primary"
                />
              }
              label={
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 600,
                    color: formValues.estadoActiva
                      ? 'success.main'
                      : 'text.secondary',
                  }}
                >
                  {formValues.estadoActiva ? 'Activa' : 'Inactiva'}
                </Typography>
              }
              sx={{ m: 0 }}
            />
          </Box>
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          p: 2,
          gap: 1,
          backgroundColor: (theme) =>
            theme.palette.mode === 'light'
              ? 'rgba(0, 0, 0, 0.02)'
              : 'rgba(255, 255, 255, 0.02)',
        }}
      >
        <Button
          onClick={onClose}
          color="inherit"
          disabled={saving}
          sx={{
            textTransform: 'none',
            fontWeight: 600,
          }}
        >
          Cancelar
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={saving}
          sx={{
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: '8px',
            background: (theme) =>
              theme.palette.mode === 'light'
                ? 'linear-gradient(135deg, #0C155A 0%, #1A2E7A 100%)'
                : 'linear-gradient(135deg, #1A2E7A 0%, #0F1F4A 100%)',
            boxShadow: '0 4px 12px rgba(12, 21, 90, 0.25)',
            '&:hover': {
              boxShadow: '0 6px 16px rgba(12, 21, 90, 0.35)',
              transform: 'translateY(-2px)',
            },
          }}
        >
          {saving ? 'Guardando...' : 'Guardar Cambios'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
