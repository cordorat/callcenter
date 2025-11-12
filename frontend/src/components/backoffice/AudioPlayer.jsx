import React, { useState, useRef, useEffect } from "react";
import {
  Box,
  Button,
  LinearProgress,
  Typography,
  IconButton,
  useTheme,
  Tooltip,
} from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import StopIcon from "@mui/icons-material/Stop";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import DownloadIcon from "@mui/icons-material/Download";

/**
 * AudioPlayer Component
 * Reproduce archivos de audio de grabaciones de llamadas
 * @param {string} src - URL del archivo de audio
 * @param {string} fileName - Nombre del archivo (para descargas)
 * @param {boolean} autoplay - Reproducción automática (default: false)
 */
export default function AudioPlayer({ src, fileName = "recording", autoplay = false }) {
  const theme = useTheme();
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadStart = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);
    const handleDurationChange = () => setDuration(audio.duration);
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener("loadstart", handleLoadStart);
    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("durationchange", handleDurationChange);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);

    if (autoplay) {
      audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }

    return () => {
      audio.removeEventListener("loadstart", handleLoadStart);
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("durationchange", handleDurationChange);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [autoplay, src]);

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
    if (src) {
      const link = document.createElement("a");
      link.href = src;
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

  if (!src) {
    return (
      <Box
        sx={{
          p: 3,
          textAlign: "center",
          backgroundColor: theme.palette.action.hover,
          borderRadius: 1,
        }}
      >
        <Typography color="text.secondary">
          No hay archivo de audio disponible
        </Typography>
      </Box>
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
      <audio ref={audioRef} src={src} />

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
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 150 }}>
          <Tooltip title={isMuted ? "Activar sonido" : "Silenciar"}>
            <IconButton size="small" onClick={handleToggleMute}>
              {isMuted ? <VolumeOffIcon /> : <VolumeUpIcon />}
            </IconButton>
          </Tooltip>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            style={{
              width: "100%",
              cursor: "pointer",
              accentColor: theme.palette.primary.main,
            }}
          />
        </Box>

        {/* Botón Descargar */}
        <Tooltip title="Descargar archivo">
          <IconButton
            onClick={handleDownload}
            size="small"
            color="primary"
            sx={{ ml: "auto" }}
          >
            <DownloadIcon />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
}
