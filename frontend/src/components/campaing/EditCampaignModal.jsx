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
  Grid,
  Typography,
  Switch,
  FormControlLabel,
  Divider,
  Paper,
} from "@mui/material";
import { Autocomplete } from "@mui/material";

import {
  searchJefesCampana,
  getProductosActivos,
  updateCampaign,
  processCampaignError,
  getCampaignDetail,          
} from "@/core/api/campaigns";

const alphaRegex = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s]+$/;

export default function EditCampaignModal({
  open,
  onClose,
  campaign,
  onCampaignUpdated,
  maxWidth = "md", // Valores: "xs", "sm", "md", "lg", "xl"
}) {
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
  const [jefesLoaded, setJefesLoaded] = useState(false); // Track si ya cargamos jefes

  // Estado para productos
  const [productosOptions, setProductosOptions] = useState([]);
  const [productosLoading, setProductosLoading] = useState(false);

  // 🔹 Resetear estados cuando se cierra el modal
  useEffect(() => {
    if (!open) {
      // Resetear el flag de jefes cargados para que vuelva a cargar al abrir
      setJefesLoaded(false);
    }
  }, [open]);

  // 🔹 1) Al abrir el modal, cargamos el DETALLE completo de la campaña
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

  // 🔹 2) Cargar productos activos para el Autocomplete
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

  // 🔹 Cargar todos los jefes al abrir el dropdown
  const loadAllJefes = async () => {
    if (jefesLoaded) return; // No recargar si ya se cargaron
    
    try {
      setJefesLoading(true);
      // Llamar sin parámetro para obtener TODOS los jefes
      const data = await searchJefesCampana('');
      const results = Array.isArray(data) ? data : [];
      
      // Agregar el jefe actual si no está en los resultados
      const actual = formValues.jefeSeleccionado;
      if (actual && !results.some(j => j.id === actual.id)) {
        setJefesOptions([actual, ...results]);
      } else {
        setJefesOptions(results);
      }
      
      setJefesLoaded(true);
    } catch (e) {
      console.error("[EditCampaignModal] Error cargando jefes:", e);
    } finally {
      setJefesLoading(false);
    }
  };

  // 🔹 Búsqueda en tiempo real de jefes
  const handleJefeInputChange = async (_, value, reason) => {
    // Si se borró el texto (clear o user cleared input), recargar todos los jefes
    if (!value || value.trim().length === 0) {
      if (reason === 'clear' || reason === 'input') {
        try {
          setJefesLoading(true);
          const data = await searchJefesCampana('');
          const results = Array.isArray(data) ? data : [];
          setJefesOptions(results);
        } catch (e) {
          console.error("[EditCampaignModal] Error recargando jefes:", e);
        } finally {
          setJefesLoading(false);
        }
      }
      return;
    }

    // Si hay menos de 2 caracteres, no buscar aún
    if (value.trim().length < 2) {
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
    }

    const descripcion = formValues.descripcion?.trim() || "";
    if (descripcion && descripcion.length > 200) {
      newErrors.descripcion =
        "La descripción no puede superar los 200 caracteres.";
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
      jefe_campana: formValues.jefeSeleccionado?.id ?? null,
      estado: formValues.estadoActiva ? 14 : 15, // 14 = ACTIVA, 15 = INACTIVA
    };

    // Solo incluir productos_ids si hay productos seleccionados
    if (formValues.productosSeleccionados && formValues.productosSeleccionados.length > 0) {
      payload.productos_ids = formValues.productosSeleccionados.map((p) => p.id);
    }

    console.log('[EditCampaignModal] Payload a enviar:', payload);

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

  if (!open || !campaign) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={maxWidth}
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>Editar campaña</DialogTitle>

      <DialogContent dividers sx={{ py: 2 }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {apiError && (
            <Typography color="error" variant="body2">
              {apiError}
            </Typography>
          )}

          {/* SECCIÓN 1: Información general */}
          <Paper
            variant="outlined"
            sx={{
              p: 1.5,
              borderRadius: 2,
              display: "flex",
              flexDirection: "column",
              gap: 1,
            }}
          >
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 600,
                fontSize: "0.8rem",
                textTransform: "uppercase",
                letterSpacing: 0.5,
                color: "text.secondary",
              }}
            >
              Información general
            </Typography>
            <Divider />

            <Box sx={{ display: "flex", flexDirection: "column", gap: 3.51, mt: 1.5 }}>
              {/* 2.1.1 Jefe de campaña */}
              <Autocomplete
                fullWidth
                options={jefesOptions}
                value={formValues.jefeSeleccionado}
                onChange={handleChangeJefe}
                onInputChange={handleJefeInputChange}
                onOpen={loadAllJefes} // Cargar todos los jefes al abrir el dropdown
                loading={jefesLoading}
                isOptionEqualToValue={(option, value) =>
                  Boolean(option && value) && option.id === value.id
                }
                getOptionLabel={(option) =>
                  option
                    ? `${option.codigo ?? ""} - ${option.nombre ?? ""}`
                    : ""
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Jefe de campaña"
                    placeholder="Buscar por nombre o código"
                    error={Boolean(errors.jefeSeleccionado)}
                    helperText={errors.jefeSeleccionado}
                  />
                )}
              />

              {/* 2.1.2 Nombre de la campaña */}
              <TextField
                label="Nombre de la campaña"
                fullWidth
                value={formValues.nombre}
                onChange={handleChangeField("nombre")}
                error={Boolean(errors.nombre)}
                helperText={
                  errors.nombre || `${formValues.nombre.length}/50 caracteres`
                }
                inputProps={{ maxLength: 50 }}
              />

              {/* 2.1.3 Descripción */}
              <TextField
                label="Descripción"
                fullWidth
                multiline
                minRows={2}
                value={formValues.descripcion}
                onChange={handleChangeField("descripcion")}
                error={Boolean(errors.descripcion)}
                helperText={
                  errors.descripcion ||
                  `${formValues.descripcion.length}/200 caracteres`
                }
                inputProps={{ maxLength: 200 }}
                sx={{ mb: -1 }}
              />

              {/* 2.1.4 Estado inicial - Switch (solo visual por ahora) */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: -1 }}>
                <Switch
                  checked={formValues.estadoActiva}
                  onChange={handleToggleEstado}
                  color="primary"
                />
                <Typography>
                  {formValues.estadoActiva
                    ? "Estado: Activa"
                    : "Estado: Finalizada"}
                </Typography>
              </Box>
            </Box>
          </Paper>

          {/* SECCIÓN 2: Fechas de campaña */}
          <Paper
            variant="outlined"
            sx={{
              p: 1.5,
              borderRadius: 2,
              display: "flex",
              flexDirection: "column",
              gap: 1,
            }}
          >
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 600,
                fontSize: "0.8rem",
                textTransform: "uppercase",
                letterSpacing: 0.5,
                color: "text.secondary",
              }}
            >
              Fechas de campaña
            </Typography>
            <Divider sx={{ mb: 1.5 }} />

            <Grid container spacing={1.5} sx={{ mt: 0 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Fecha inicio"
                  type="date"
                  fullWidth
                  value={formValues.fecha_inicio}
                  onChange={handleChangeField("fecha_inicio")}
                  InputLabelProps={{ shrink: true }}
                  error={Boolean(errors.fecha_inicio)}
                  helperText={errors.fecha_inicio}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  label="Fecha fin"
                  type="date"
                  fullWidth
                  value={formValues.fecha_fin}
                  onChange={handleChangeField("fecha_fin")}
                  InputLabelProps={{ shrink: true }}
                  error={Boolean(errors.fecha_fin)}
                  helperText={errors.fecha_fin}
                />
              </Grid>
            </Grid>
          </Paper>

          {/* SECCIÓN 3: Servicios / productos */}
          <Paper
            variant="outlined"
            sx={{
              p: 1.5,
              borderRadius: 2,
              display: "flex",
              flexDirection: "column",
              gap: 1,
            }}
          >
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 600,
                fontSize: "0.8rem",
                textTransform: "uppercase",
                letterSpacing: 0.5,
                color: "text.secondary",
              }}
            >
              Servicios o productos a vender
            </Typography>
            <Divider sx={{ mb: 1.5 }} />

            <Autocomplete
              multiple
              fullWidth
              options={productosOptions}
              loading={productosLoading}
              value={formValues.productosSeleccionados}
              onChange={handleChangeProductos}
              isOptionEqualToValue={(option, value) =>
                option.id === value.id
              }
              getOptionLabel={(option) =>
                option ? `${option.nombre}` : ""
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Servicios o productos a vender"
                  placeholder="Selecciona uno o varios"
                  error={Boolean(errors.productosSeleccionados)}
                  helperText={errors.productosSeleccionados}
                />
              )}
            />
          </Paper>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button onClick={onClose} color="inherit" disabled={saving}>
          Cancelar
        </Button>
        <Button onClick={handleSave} variant="contained" disabled={saving}>
          {saving ? "Guardando..." : "Guardar cambios"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
