import React, { useState, useRef, useEffect } from "react";
import {
  Box,
  Button,
  LinearProgress,
  Typography,
  IconButton,
  useTheme,
  Tooltip,
  Alert,
  CircularProgress,
} from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import StopIcon from "@mui/icons-material/Stop";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import DownloadIcon from "@mui/icons-material/Download";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";

/**
 * AudioPlayer Component
 * Reproduce archivos de audio de grabaciones de llamadas con autenticación
 * @param {string} audioUrl - URL del endpoint proxy de audio
 * @param {number} callDuration - Duración de la llamada en segundos
 * @param {string} fileName - Nombre del archivo (para descargas)
 * @param {boolean} autoplay - Reproducción automática (default: false)
 */
export default function AudioPlayer({ audioUrl, callDuration = 0, fileName = "recording", autoplay = false }) {
  const theme = useTheme();
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [audioSrc, setAudioSrc] = useState(null);

  // Cargar el audio con autenticación
  useEffect(() => {
    if (!audioUrl) return;

    const loadAudio = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Obtener el token de autenticación del localStorage
        const storedUser = localStorage.getItem("user");
        
        if (!storedUser) {
          setError("No hay sesión activa. Por favor inicia sesión nuevamente.");
          setIsLoading(false);
          return;
        }

        const { access } = JSON.parse(storedUser);
        
        if (!access) {
          setError("Token de acceso no disponible. Por favor inicia sesión nuevamente.");
          setIsLoading(false);
          return;
        }

        // Hacer fetch con el token de autenticación
        const response = await fetch(audioUrl, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${access}`,
            "ngrok-skip-browser-warning": "69420",
          },
        });

        if (!response.ok) {
          if (response.status === 401) {
            setError("Sesión expirada. Por favor inicia sesión nuevamente.");
          } else if (response.status === 403) {
            setError("No tienes permisos para acceder a esta grabación.");
          } else if (response.status === 404) {
            setError("No se encontró la grabación de esta llamada.");
          } else {
            setError(`Error al cargar el audio: ${response.status}`);
          }
          setIsLoading(false);
          return;
        }

        // Convertir la respuesta a blob y crear URL
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        
        setAudioSrc(url);
        setIsLoading(false);

      } catch (err) {
        console.error("[AudioPlayer] Error al cargar audio:", err);
        setError("No se pudo cargar la grabación. Por favor intenta nuevamente.");
        setIsLoading(false);
      }
    };

    loadAudio();

    // Cleanup: liberar el objeto URL cuando el componente se desmonte
    return () => {
      if (audioSrc) {
        URL.revokeObjectURL(audioSrc);
      }
    };
  }, [audioUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioSrc) return;

    const handleCanPlay = () => setIsLoading(false);
    const handleDurationChange = () => setDuration(audio.duration);
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleEnded = () => setIsPlaying(false);
    const handleError = () => {
      setError("Error al reproducir el audio");
      setIsLoading(false);
    };

    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("durationchange", handleDurationChange);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    if (autoplay) {
      audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }

    return () => {
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("durationchange", handleDurationChange);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
    };
  }, [autoplay, audioSrc]);

  const handlePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  };

  const handleStop = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleSeek = (newTime) => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const handleToggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isMuted) {
      audio.volume = volume;
      setIsMuted(false);
    } else {
      audio.volume = 0;
      setIsMuted(true);
    }
  };

  const handleDownload = () => {
    if (audioSrc) {
      const link = document.createElement("a");
      link.href = audioSrc;
      link.download = `${fileName}.mp3`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Mostrar error si existe
  if (error) {
    return (
      <Alert 
        severity="error" 
        icon={<ErrorOutlineIcon />}
        sx={{ mb: 3 }}
      >
        {error}
      </Alert>
    );
  }

  // Mostrar estado de carga
  if (isLoading) {
    return (
      <Box
        sx={{
          p: 3,
          textAlign: "center",
          backgroundColor: theme.palette.action.hover,
          borderRadius: 2,
          border: `1px solid ${theme.palette.divider}`,
        }}
      >
        <CircularProgress size={40} sx={{ mb: 2 }} />
        <Typography color="text.secondary">
          Cargando grabación...
        </Typography>
      </Box>
    );
  }

  if (!audioUrl) {
    return (
      <Alert severity="info" sx={{ mb: 3 }}>
        No hay archivo de audio disponible
      </Alert>
    );
  }

  return (
    <Box
      sx={{
        p: 3,
        backgroundColor:
          theme.palette.mode === "light"
            ? theme.palette.grey[50]
            : "rgba(255,255,255,0.05)",
        borderRadius: 2,
        border: `1px solid ${theme.palette.divider}`,
      }}
    >
      <audio ref={audioRef} src={audioSrc} />

      {/* Controles Principales */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
        <Tooltip title={isPlaying ? "Pausar" : "Reproducir"}>
          <IconButton
            color="primary"
            onClick={handlePlayPause}
            size="medium"
            sx={{
              bgcolor: "primary.main",
              color: "white",
              "&:hover": { bgcolor: "primary.dark" },
            }}
          >
            {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
          </IconButton>
        </Tooltip>

        <Tooltip title="Detener">
          <IconButton onClick={handleStop} size="small">
            <StopIcon />
          </IconButton>
        </Tooltip>

        {isLoading && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <CircularProgress size={20} />
            <Typography variant="caption" color="text.secondary">
              Cargando...
            </Typography>
          </Box>
        )}
      </Box>

      {/* Barra de Progreso */}
      <Box sx={{ mb: 2 }}>
        <LinearProgress
          variant="determinate"
          value={(currentTime / duration) * 100 || 0}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            handleSeek(percent * duration);
          }}
          sx={{
            height: 6,
            borderRadius: 1,
            cursor: "pointer",
            backgroundColor: theme.palette.action.hover,
            "& .MuiLinearProgress-bar": {
              borderRadius: 1,
              transition: "width 0.1s linear",
            },
          }}
        />
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            mt: 1,
            px: 1,
          }}
        >
          <Typography variant="caption" color="text.secondary">
            {formatTime(currentTime)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {formatTime(duration)}
          </Typography>
        </Box>
      </Box>

      {/* Controles Secundarios */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        {/* Volumen */}
        <Box sx={{ 
          display: "flex", 
          alignItems: "center", 
          gap: 1, 
          minWidth: 150,
          px: 1.5,
          py: 0.5,
          borderRadius: 2,
          bgcolor: theme.palette.mode === "light" 
            ? "rgba(0,0,0,0.03)" 
            : "rgba(255,255,255,0.05)",
          border: `1px solid ${theme.palette.divider}`,
          transition: "all 0.2s ease",
          "&:hover": {
            bgcolor: theme.palette.mode === "light" 
              ? "rgba(0,0,0,0.05)" 
              : "rgba(255,255,255,0.08)",
            borderColor: theme.palette.primary.main,
          }
        }}>
          <Tooltip title={isMuted ? "Activar sonido" : "Silenciar"}>
            <IconButton 
              size="small" 
              onClick={handleToggleMute}
              sx={{
                transition: "all 0.2s ease",
                "&:hover": {
                  color: theme.palette.primary.main,
                  transform: "scale(1.1)",
                }
              }}
            >
              {isMuted ? (
                <VolumeOffIcon fontSize="small" />
              ) : volume > 0.5 ? (
                <VolumeUpIcon fontSize="small" />
              ) : (
                <VolumeUpIcon fontSize="small" sx={{ opacity: 0.7 }} />
              )}
            </IconButton>
          </Tooltip>
          <Box sx={{ 
            position: "relative", 
            flex: 1,
            height: 24,
            display: "flex",
            alignItems: "center",
          }}>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              style={{
                width: "100%",
                height: "4px",
                cursor: "pointer",
                appearance: "none",
                WebkitAppearance: "none",
                background: `linear-gradient(to right, ${theme.palette.primary.main} 0%, ${theme.palette.primary.main} ${(isMuted ? 0 : volume) * 100}%, ${theme.palette.action.hover} ${(isMuted ? 0 : volume) * 100}%, ${theme.palette.action.hover} 100%)`,
                borderRadius: "2px",
                outline: "none",
                transition: "all 0.2s ease",
              }}
              onInput={(e) => {
                e.target.style.background = `linear-gradient(to right, ${theme.palette.primary.main} 0%, ${theme.palette.primary.main} ${e.target.value * 100}%, ${theme.palette.action.hover} ${e.target.value * 100}%, ${theme.palette.action.hover} 100%)`;
              }}
            />
            <style>
              {`
                input[type="range"]::-webkit-slider-thumb {
                  appearance: none;
                  -webkit-appearance: none;
                  width: 14px;
                  height: 14px;
                  background: ${theme.palette.primary.main};
                  border: 2px solid ${theme.palette.background.paper};
                  border-radius: 50%;
                  cursor: pointer;
                  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                  transition: all 0.2s ease;
                }
                input[type="range"]::-webkit-slider-thumb:hover {
                  transform: scale(1.2);
                  box-shadow: 0 3px 6px rgba(0,0,0,0.3);
                }
                input[type="range"]::-moz-range-thumb {
                  width: 14px;
                  height: 14px;
                  background: ${theme.palette.primary.main};
                  border: 2px solid ${theme.palette.background.paper};
                  border-radius: 50%;
                  cursor: pointer;
                  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                  transition: all 0.2s ease;
                }
                input[type="range"]::-moz-range-thumb:hover {
                  transform: scale(1.2);
                  box-shadow: 0 3px 6px rgba(0,0,0,0.3);
                }
              `}
            </style>
          </Box>
          <Typography 
            variant="caption" 
            sx={{ 
              minWidth: 35,
              textAlign: "right",
              color: "text.secondary",
              fontWeight: 600,
              fontSize: "0.7rem",
            }}
          >
            {Math.round((isMuted ? 0 : volume) * 100)}%
          </Typography>
        </Box>

        {/* Botón Descargar */}
        <Tooltip title="Descargar grabación">
          <IconButton
            onClick={handleDownload}
            size="small"
            color="primary"
            disabled={!audioSrc}
            sx={{ 
              ml: "auto",
              transition: "all 0.2s ease",
              "&:hover": {
                transform: "scale(1.1)",
                bgcolor: theme.palette.mode === "light" 
                  ? "rgba(33,150,243,0.1)" 
                  : "rgba(33,150,243,0.2)",
              }
            }}
          >
            <DownloadIcon />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
}
