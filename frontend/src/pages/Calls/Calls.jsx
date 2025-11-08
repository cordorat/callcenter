import { useAgentState } from '@/hooks/useAgentState';
import * as React from 'react';
import MainLayout from '@/core/components/layout/MainLayout';
import { useAuth } from '@/core/context/AuthContext';
import { Box, Typography, Button, TextField, Snackbar, Alert, CircularProgress} from '@mui/material';
import {
    Call as CallIcon, CallEnd as CallEndIcon, Backspace as BackspaceIcon, MicOff as MicOffIcon, KeyboardVoice as KeyboardVoiceIcon, BackHand as BackHandIcon, CloseFullscreen as CloseFullscreenIcon, OpenInFull as OpenInFullIcon, PhoneInTalk as PhoneInTalkIcon
} from '@mui/icons-material';
import useTwilioCall from '@/hooks/useTwilioCall';
import twilioClient from '@/services/twilioClient';
import apiClient from '@/core/api/apiClient';
import { motion, AnimatePresence } from "framer-motion";
import ClientInfoSection from '@/components/sales/ClientInfoSection';
import SaleInfoSection from '@/components/sales/SaleInfoSection';

const Calls = () => {
    // Exponer twilioClient globalmente para debugging
    React.useEffect(() => {
        window.twilioClient = twilioClient;
        console.log('[Calls.jsx] twilioClient expuesto en window.twilioClient para debugging');
        return () => {
            delete window.twilioClient;
        };
    }, []);

    const { frontendState, currentState } = useAgentState({ autoLoad: true, refreshInterval: 5000 });
    const { user } = useAuth();
    const [phoneNumber, setPhoneNumber] = React.useState('');
    const [isExpanded, setIsExpanded] = React.useState(false); 
    const [showIncomingAlert, setShowIncomingAlert] = React.useState(false);
    const [currentCallSid, setCurrentCallSid] = React.useState(null);
    const [fullCallInfo, setFullCallInfo] = React.useState(null);
    const [AfterfullCallInfo, setAfterfullCallInfo] = React.useState(null);
    const campana_id = currentState?.campana_actual_id || null;
    
    const [cliente, setCliente] = React.useState({
        id: null,
        nombre: "",
        documento: "",
        telefono: "",
        direccion: "",
        correo: "",
        ciudad: "",
    });

    const [venta, setVenta] = React.useState({
        producto: "",
        valor: "",
    });
    const handleClienteChange = React.useCallback((nuevoCliente) => {
        console.log('[Calls.jsx] 📥 Cliente actualizado recibido:', nuevoCliente);
        
        setCliente({
            id: nuevoCliente.id || null,
            nombre: nuevoCliente.nombre || "",
            documento: nuevoCliente.documento_id || nuevoCliente.documento || "",
            telefono: nuevoCliente.telefono || "",
            direccion: nuevoCliente.direccion || "",
            correo: nuevoCliente.email || nuevoCliente.correo || "",
            ciudad: nuevoCliente.ciudad || "",
        });
    }, []);
    const toggleExpand = () => setIsExpanded((prev) => !prev);
    
    // Helper: Elimina prefijo +57 del número de teléfono para mostrar en el teclado
    const removePhonePrefix = (phone) => {
        if (!phone) return '';
        // Eliminar +57 si existe al inicio
        return phone.replace(/^\+57/, '');
    };
    
    // Configuración de espaciado vertical del contenedor del teclado
    const keypadVerticalPadding = 10; 
    
    // Hook de Twilio con toda la lógica de llamadas
    const {
        isReady,
        isInCall,
        isRinging,
        isMuted,
        callDuration,
        callStatus,
        error,
        incomingCall,
        makeCall,
        hangup,
        toggleMute,
        acceptIncomingCall,
        rejectIncomingCall,
        sendDigit,
        formatDuration,
        currentCallInfo,
    } = useTwilioCall();
    
    // Debug: Log para ver qué está devolviendo el hook
    React.useEffect(() => {
        console.log('[Calls.jsx][DEBUG] Hook useTwilioCall cambió:');
        console.log('[Calls.jsx][DEBUG] - isInCall:', isInCall);
        console.log('[Calls.jsx][DEBUG] - currentCallInfo:', currentCallInfo);
        console.log('[Calls.jsx][DEBUG] - callStatus:', callStatus);
    }, [isInCall, currentCallInfo, callStatus]);
    
    React.useEffect(() => {
        const isEnLlamadaOAfterCall = frontendState === 'CALL' || frontendState === 'AFTERCALL' || frontendState === 'EN_LLAMADA';
        
        console.log('[Calls.jsx][PHONE] 📞 Actualizando desde currentCallInfo:');
        console.log('[Calls.jsx][PHONE] - frontendState:', frontendState);
        console.log('[Calls.jsx][PHONE] - isEnLlamadaOAfterCall:', isEnLlamadaOAfterCall);
        console.log('[Calls.jsx][PHONE] - currentCallInfo:', currentCallInfo);
        console.log('[Calls.jsx][PHONE] - telefono original:', currentCallInfo?.telefono);
        
        // Solo actualizar si hay currentCallInfo disponible Y estamos en llamada
        if (currentCallInfo && isEnLlamadaOAfterCall) {
            // Eliminar prefijo +57 del número para el teclado numérico
            const cleanNumber = removePhonePrefix(currentCallInfo.telefono);
            console.log('[Calls.jsx][PHONE] ✅ Actualizando phoneNumber a:', cleanNumber);
            setPhoneNumber(cleanNumber);
            setCliente(prev => ({
                ...prev, // Mantener datos anteriores por si acaso
                id: currentCallInfo.cliente_id || prev.id, 
                nombre: currentCallInfo.nombre || prev.nombre,
                documento: currentCallInfo.documento || prev.documento,
                telefono: currentCallInfo.telefono || prev.telefono,
                direccion: currentCallInfo.direccion || prev.direccion,
                correo: currentCallInfo.correo || prev.correo,
                ciudad: currentCallInfo.ciudad || prev.ciudad,
            }));
        }
    }, [currentCallInfo, frontendState]);


    React.useEffect(() => {

        if (fullCallInfo && fullCallInfo.id !== AfterfullCallInfo?.id) {
            setAfterfullCallInfo(fullCallInfo);
        }
        
        const isEnFlujoLlamada = frontendState === 'AFTERCALL' || frontendState === 'CALL' || frontendState === 'EN_LLAMADA';
        
        if (!isEnFlujoLlamada && (AfterfullCallInfo || cliente.id)) {
            setAfterfullCallInfo(null);
            setCliente({
                id: null,
                nombre: '',
                documento: '',
                telefono: '',
                direccion: '',
                correo: '',
                ciudad: '',
            });
            setPhoneNumber('');
        }
    }, [frontendState, fullCallInfo, AfterfullCallInfo, cliente.id]);

    
    // Obtener información completa de la llamada usando el CallSid cuando hay una llamada activa
    React.useEffect(() => {
        const fetchFullCallInfo = async () => {
            console.log('[Calls.jsx][FETCH] isInCall:', isInCall, '| currentCallInfo:', currentCallInfo);
            
            // Si estamos en llamada
            if (isInCall) {
                // Intentar obtener el CallSid desde múltiples fuentes
                let callSid = null;
                
                // Opción 1: Desde currentCallInfo (viene del hook useTwilioCall)
                if (currentCallInfo?.twilio_call_sid) {
                    callSid = currentCallInfo.twilio_call_sid;
                }
                
                // Opción 2: Desde twilioClient.activeCall directamente
                if (!callSid && twilioClient.activeCall) {
                    callSid = twilioClient.activeCall.parameters?.CallSid;
                }
                
                // Opción 3: Desde twilioClient.getCallInfo()
                if (!callSid) {
                    const callInfo = twilioClient.getCallInfo();
                    if (callInfo?.parameters?.CallSid) {
                        callSid = callInfo.parameters.CallSid;
                    }
                }
                
                
                if (callSid && callSid !== currentCallSid) {
                    setCurrentCallSid(callSid);
                    
                    // Función auxiliar para intentar obtener la llamada con retries
                    const fetchWithRetry = async (attempt = 1, maxAttempts = 5) => {
                        try {
                            // Añadir delay antes del primer intento para dar tiempo al webhook
                            if (attempt === 1) {
                                console.log('[Calls.jsx][FETCH] ⏳ Esperando 2s para que el webhook cree la llamada...');
                                await new Promise(resolve => setTimeout(resolve, 2000));
                            }
                            
                            const response = await apiClient.get(`/calls/llamadas/by-sid/${callSid}/`);
                            console.log(`[Calls.jsx][FETCH] ✓ Información completa obtenida (intento ${attempt}):`, response.data);
                            setFullCallInfo(response.data);
                            
                            if (response.data.cliente_nombre) {
                                console.log('[Calls.jsx][FETCH] 📝 Actualizando cliente con fullCallInfo');
                                console.log('[Calls.jsx][FETCH] 🔍 cliente_otros_datos recibido:', response.data.cliente_otros_datos);
                                
                                // Manejar cliente_otros_datos que puede ser string JSON o objeto
                                let otrosDatos = {};
                                if (response.data.cliente_otros_datos) {
                                    if (typeof response.data.cliente_otros_datos === 'string') {
                                        try {
                                            otrosDatos = JSON.parse(response.data.cliente_otros_datos);
                                        } catch (err) {
                                            console.error('[Calls.jsx][FETCH] Error parseando cliente_otros_datos:', err);
                                            otrosDatos = {};
                                        }
                                    } else if (typeof response.data.cliente_otros_datos === 'object') {
                                        otrosDatos = response.data.cliente_otros_datos;
                                    }
                                }
                                
                                console.log('[Calls.jsx][FETCH] 📦 otrosDatos procesado:', otrosDatos);
                                console.log('[Calls.jsx][FETCH] 🔑 documento_id:', otrosDatos.documento_id);
                                console.log('[Calls.jsx][FETCH] 📧 email:', otrosDatos.email);
                                console.log('[Calls.jsx][FETCH] 🏠 direccion:', otrosDatos.direccion);
                                
                                // Actualizar también phoneNumber sin prefijo +57
                                if (response.data.cliente_telefono) {
                                    const cleanNumber = removePhonePrefix(response.data.cliente_telefono);
                                    console.log('[Calls.jsx][FETCH] 📞 Actualizando phoneNumber desde fullCallInfo:', cleanNumber);
                                    setPhoneNumber(cleanNumber);
                                }
                                
                                setCliente(prev => ({
                                    ...prev,
                                    id: response.data.cliente || prev.id,
                                    nombre: response.data.cliente_nombre || prev.nombre,
                                    telefono: response.data.cliente_telefono || prev.telefono,
                                    documento: otrosDatos.documento_id || otrosDatos.documento || prev.documento,
                                    direccion: otrosDatos.direccion || otrosDatos.dirección || prev.direccion,
                                    correo: otrosDatos.email || otrosDatos.correo || otrosDatos['correo electrónico'] || prev.correo,
                                    ciudad: otrosDatos.ciudad || prev.ciudad,
                                }));
                            }
                        } catch (err) {
                            if (err.response?.status === 404 && attempt < maxAttempts) {
                                // Race condition: el webhook aún no creó la llamada, reintentar
                                const delayMs = attempt * 1500; // 1.5s, 3s, 4.5s, 6s
                                console.warn(`[Calls.jsx][FETCH] ⏳ Llamada no encontrada (intento ${attempt}/${maxAttempts}). Reintentando en ${delayMs}ms...`);
                                await new Promise(resolve => setTimeout(resolve, delayMs));
                                return fetchWithRetry(attempt + 1, maxAttempts);
                            } else {
                                console.error(`[Calls.jsx][FETCH] ✗ Error después de ${attempt} intentos:`, err);
                                console.error('[Calls.jsx][FETCH] Error details:', err.response?.data);
                            }
                        }
                    };
                    
                    // Iniciar el proceso de obtención con retries
                    await fetchWithRetry();
                    
                } else if (!callSid) {
                    console.warn('[Calls.jsx][FETCH] ⚠️ No se pudo obtener CallSid de ninguna fuente');
                    console.warn('[Calls.jsx][FETCH] currentCallInfo:', currentCallInfo);
                    console.warn('[Calls.jsx][FETCH] twilioClient.activeCall:', twilioClient.activeCall);
                    console.warn('[Calls.jsx][FETCH] twilioClient.getCallInfo():', twilioClient.getCallInfo());
                }
            } else if (!isInCall) {
                // Limpiar cuando no hay llamada
                if (currentCallSid || fullCallInfo) {
                    console.log('[Calls.jsx][FETCH] Limpiando CallSid y fullCallInfo');
                    setCurrentCallSid(null);
                    setFullCallInfo(null);
                }
            }
        };
        
        fetchFullCallInfo();
    }, [isInCall, currentCallInfo, currentCallSid]);

    // Mostrar alerta cuando hay llamada entrante
    React.useEffect(() => {
        // Solo mostrar alerta si hay llamada entrante Y el estado del agente NO es EN_LLAMADA/CALL/AFTERCALL
        const isEnLlamada = frontendState === 'CALL' || frontendState === 'AFTERCALL' || frontendState === 'EN_LLAMADA';
        if (incomingCall && !isEnLlamada) {
            setShowIncomingAlert(true);
        } else {
            setShowIncomingAlert(false);
        }
    }, [incomingCall, frontendState]);

    // Resetear estado expandido cuando termina la llamada
    React.useEffect(() => {
        if (!isInCall && isExpanded) {
            setIsExpanded(false);
        }
    }, [isInCall, isExpanded]);

    const handleKeyPress = (num) => {
        if (isInCall) {
            // Durante la llamada, envía dígitos DTMF
            sendDigit(num);
        } else {
            // Antes de la llamada, agrega al número
            setPhoneNumber((prev) => prev + num);
        }
    }

    const handleBackspace = () => {
        setPhoneNumber((prev) => prev.slice(0, -1));
    }

    const handleCall = async () => {
        if (!phoneNumber.trim()) {
            return;
        }
        
        // ⭐ MODIFICADO: Pasar campana_id al makeCall para llamadas manuales
        const success = await makeCall(phoneNumber, campana_id);
        if (!success) {
            console.error('No se pudo iniciar la llamada');
        }
    }

    const handleEndCall = () => {
        hangup();
        // No limpiar el número para poder rellamar fácilmente
    }

    const handleHold = () => {
        toggleHold();
    }

    const handleMute = () => {
        toggleMute();
    }

    const handleAcceptIncoming = () => {
        acceptIncomingCall();
        setShowIncomingAlert(false);
    }

    const handleRejectIncoming = () => {
        rejectIncomingCall();
        setShowIncomingAlert(false);
    }

    return (
        <MainLayout title="Llamadas">
            {/* Alerta de llamada entrante */}
            <Snackbar
                open={showIncomingAlert}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
                sx={{ mt: 8 }}
            >
                <Alert 
                    severity="info" 
                    variant="filled"
                    sx={{ 
                        width: '420px',
                        borderRadius: '12px',
                        boxShadow: '0 6px 20px rgba(12, 21, 90, 0.25)',
                        '& .MuiAlert-icon': {
                            fontSize: '1.5rem',
                        },
                        '& .MuiAlert-message': {
                            fontSize: '0.95rem',
                            fontWeight: 600,
                        },
                    }}
                    action={
                        <Box sx={{ display: 'flex', gap: 1.5 }}>
                            <Button 
                                size="small" 
                                variant="contained"
                                onClick={handleAcceptIncoming}
                                sx={{
                                    backgroundColor: '#0f9d58',
                                    color: 'white',
                                    borderRadius: '8px',
                                    fontWeight: 600,
                                    px: 2,
                                    '&:hover': {
                                        backgroundColor: '#0a7d45',
                                    }
                                }}
                            >
                                Aceptar
                            </Button>
                            <Button 
                                size="small" 
                                variant="outlined"
                                onClick={handleRejectIncoming}
                                sx={{
                                    borderColor: 'white',
                                    color: 'white',
                                    borderRadius: '8px',
                                    fontWeight: 600,
                                    px: 2,
                                    borderWidth: '2px',
                                    '&:hover': {
                                        borderColor: 'white',
                                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                        borderWidth: '2px',
                                    }
                                }}
                            >
                                Rechazar
                            </Button>
                        </Box>
                    }
                >
                    📞 Llamada entrante de: {incomingCall?.parameters?.From || 'Desconocido'}
                </Alert>
            </Snackbar>

            <Box
                sx={{
                    display: "flex",
                    flexDirection: isExpanded ? "column" : "row",
                    gap: 2,
                    height: "calc(100vh - 120px)",
                    width: "100%",
                    position: "relative",
                    overflow: "auto",
                }}
            >
                {/* Sección del teléfono */}
                <motion.div
                    layout
                    transition={{ duration: 0.5, type: "spring", stiffness: 300, damping: 30 }}
                    style={{
                        flex: isExpanded ? "0 0 auto" : "0 0 auto",
                        minWidth: isExpanded ? "100%" : "300px",
                        maxWidth: isExpanded ? "100%" : "400px",
                        width: isExpanded ? "100%" : "fit-content",
                        height: isExpanded ? "auto" : "fit-content",
                        display: "flex",
                        alignItems: isExpanded ? "stretch" : "center",
                        alignSelf: isExpanded ? "stretch" : "center",
                        position: "relative",
                    }}
                >
                    <Box 
                        sx={{
                            width: "100%",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: isExpanded ? "center" : "flex-start",
                            px: 3,
                            py: isExpanded ? 2 : keypadVerticalPadding,
                            borderRadius: 3, 
                            backgroundColor: (theme) => theme.palette.background.paper,
                            position: "relative",
                            boxShadow: (theme) => theme.palette.mode === 'light'
                                ? '0 2px 8px rgba(12, 21, 90, 0.08)'
                                : '0 2px 8px rgba(0, 0, 0, 0.3)',
                            transition: 'all 0.3s ease',
                            '&:hover': {
                                boxShadow: (theme) => theme.palette.mode === 'light'
                                    ? '0 4px 12px rgba(12, 21, 90, 0.12)'
                                    : '0 4px 12px rgba(0, 0, 0, 0.5)',
                            }
                        }}
                    >
                        {/* Botón de expandir/contraer - Solo visible durante llamada */}
                        {isInCall && (
                            <Box
                                sx={{
                                    position: "absolute",
                                    top: 12,
                                    right: 12,
                                    cursor: "pointer",
                                    color: (theme) => theme.palette.primary.main,
                                    backgroundColor: (theme) => theme.palette.appBar.default,
                                    borderRadius: "50%",
                                    width: 36,
                                    height: 36,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    transition: "all 0.2s ease",
                                    zIndex: 10,
                                    "&:hover": {
                                        backgroundColor: (theme) => theme.palette.mode === 'light'
                                            ? '#D3E8FB'
                                            : 'rgba(255, 255, 255, 0.1)',
                                        transform: "scale(1.1)",
                                    },
                                    "&:active": {
                                        transform: "scale(0.95)",
                                    },
                                }}
                                onClick={toggleExpand}
                            >
                                {isExpanded ? <OpenInFullIcon fontSize="small" /> : <CloseFullscreenIcon fontSize="small" />}
                            </Box>
                        )}

                        {/* Vista contraída - Solo barra horizontal */}
                        {isExpanded ? (
                            <Box 
                                sx={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: 3,
                                    width: '100%',
                                    justifyContent: 'center',
                                }}
                            >
                                {/* Estado de conexión compacto */}
                                {!isReady && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <CircularProgress size={20} />
                                        <Typography variant="body2" color="text.secondary">
                                            Conectando...
                                        </Typography>
                                    </Box>
                                )}

                                {/* Número de teléfono */}
                                <TextField
                                    value={phoneNumber}
                                    disabled={isInCall || !isReady}
                                    variant="outlined"
                                    placeholder="+57 300 123 4567"
                                    sx={{ 
                                        width: '350px',
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: '10px',
                                            backgroundColor: (theme) => theme.palette.mode === 'light'
                                                ? '#EBF5FE'
                                                : 'rgba(255, 255, 255, 0.05)',
                                            height: '48px',
                                            '& fieldset': {
                                                borderColor: (theme) => theme.palette.mode === 'light'
                                                    ? 'rgba(12, 21, 90, 0.2)'
                                                    : 'rgba(255, 255, 255, 0.2)',
                                                borderWidth: '2px',
                                            },
                                            '&:hover fieldset': {
                                                borderColor: (theme) => theme.palette.mode === 'light'
                                                    ? 'rgba(12, 21, 90, 0.3)'
                                                    : 'rgba(255, 255, 255, 0.3)',
                                            },
                                            '&.Mui-focused fieldset': {
                                                borderColor: (theme) => theme.palette.primary.main,
                                            },
                                        },
                                        '& input': {
                                            textAlign: 'center',
                                            fontSize: '1rem',
                                            fontWeight: 600,
                                            color: (theme) => theme.palette.text.primary,
                                            letterSpacing: '1px',
                                        },
                                    }}
                                    InputProps={{
                                        readOnly: true,
                                    }}
                                />

                                {/* Duración de llamada */}
                                {isInCall && (
                                    <Typography
                                        variant="subtitle1"
                                        color="text.secondary"
                                        sx={{ fontWeight: 500, minWidth: '80px' }}
                                    >
                                        {formatDuration(callDuration)}
                                    </Typography>
                                )}

                                {/* Botones de acción compactos */}
                                <Box display="flex" gap={1.5}>
                                    {!isInCall ? (
                                        <>
                                            <Button
                                                variant="contained"
                                                onClick={handleCall}
                                                disabled={!phoneNumber.trim() || !isReady || callStatus === 'connecting'}
                                                sx={{ 
                                                    height: 48, 
                                                    width: 48,
                                                    minWidth: 48,
                                                    borderRadius: '50%',
                                                    padding: 0,
                                                    backgroundColor: '#0f9d58',
                                                    boxShadow: '0 3px 8px rgba(15, 157, 88, 0.3)',
                                                    '&:hover': {
                                                        backgroundColor: '#0a7d45',
                                                        transform: 'scale(1.05)',
                                                    },
                                                }}
                                            >
                                                {callStatus === 'connecting' ? (
                                                    <CircularProgress size={24} color="inherit" />
                                                ) : (
                                                    <CallIcon sx={{ fontSize: 24 }} />
                                                )}
                                            </Button>
                                            <Button
                                                variant="outlined"
                                                onClick={handleBackspace}
                                                disabled={!phoneNumber.trim() || !isReady}
                                                sx={{ 
                                                    height: 48, 
                                                    width: 48,
                                                    minWidth: 48,
                                                    borderRadius: '50%',
                                                    padding: 0,
                                                    borderWidth: '2px',
                                                    borderColor: (theme) => theme.palette.mode === 'light'
                                                        ? 'rgba(12, 21, 90, 0.2)'
                                                        : 'rgba(255, 255, 255, 0.2)',
                                                    color: (theme) => theme.palette.primary.main,
                                                    backgroundColor: (theme) => theme.palette.appBar.default,
                                                    '&:hover': {
                                                        borderColor: (theme) => theme.palette.primary.main,
                                                        backgroundColor: (theme) => theme.palette.mode === 'light'
                                                            ? '#D3E8FB'
                                                            : 'rgba(255, 255, 255, 0.1)',
                                                        transform: 'scale(1.05)',
                                                    },
                                                }}
                                            >
                                                <BackspaceIcon sx={{ fontSize: 20 }} />
                                            </Button>
                                        </>
                                    ) : (
                                        <>
                                            <Button
                                                variant="contained"
                                                onClick={handleEndCall}
                                                sx={{ 
                                                    height: 48, 
                                                    width: 48,
                                                    minWidth: 48,
                                                    borderRadius: '50%',
                                                    padding: 0,
                                                    backgroundColor: '#d32f2f',
                                                    boxShadow: '0 3px 8px rgba(211, 47, 47, 0.3)',
                                                    '&:hover': {
                                                        backgroundColor: '#b71c1c',
                                                        transform: 'scale(1.05)',
                                                    },
                                                }}
                                            >
                                                <CallEndIcon sx={{ fontSize: 24 }} />
                                            </Button>
                                            <Button
                                                variant={isMuted ? "contained" : "outlined"}
                                                onClick={handleMute}
                                                sx={{ 
                                                    height: 48, 
                                                    width: 48,
                                                    minWidth: 48,
                                                    borderRadius: '50%',
                                                    padding: 0,
                                                    borderWidth: '2px',
                                                    borderColor: (theme) => isMuted ? 'transparent' : theme.palette.mode === 'light'
                                                        ? 'rgba(12, 21, 90, 0.2)'
                                                        : 'rgba(255, 255, 255, 0.2)',
                                                    backgroundColor: isMuted ? '#f57c00' : (theme) => theme.palette.appBar.default,
                                                    color: (theme) => isMuted ? 'white' : theme.palette.primary.main,
                                                    '&:hover': {
                                                        backgroundColor: (theme) => isMuted ? '#e65100' : theme.palette.mode === 'light'
                                                            ? '#D3E8FB'
                                                            : 'rgba(255, 255, 255, 0.1)',
                                                        transform: 'scale(1.05)',
                                                    },
                                                }}
                                            >
                                                {isMuted ? <MicOffIcon sx={{ fontSize: 20 }} /> : <KeyboardVoiceIcon sx={{ fontSize: 20 }} />}
                                            </Button>
                                        </>
                                    )}
                                </Box>
                            </Box>
                        ) : (
                            /* Vista expandida - Teclado completo */
                            <>
                                {/* Estado de conexión */}
                                {!isReady && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                        <CircularProgress size={20} />
                                        <Typography variant="body2" color="text.secondary">
                                            Conectando con Twilio...
                                        </Typography>
                                    </Box>
                                )}

                                {error && (
                                    <Alert severity="error" sx={{ mb: 2, width: '100%' }}>
                                        {error}
                                    </Alert>
                                )}

                                {/* Estado de llamada */}
                                {callStatus === 'ringing' && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                        <PhoneInTalkIcon color="primary" />
                                        <Typography variant="body2" color="primary">
                                            Llamando...
                                        </Typography>
                                    </Box>
                                )}

                                <TextField
                                    fullWidth
                                    value={phoneNumber}
                                    disabled={isInCall || !isReady}
                                    variant="outlined"
                                    placeholder="+57 300 123 4567"
                                    sx={{ 
                                        mb: 4,
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: '10px',
                                            backgroundColor: (theme) => theme.palette.mode === 'light'
                                                ? '#EBF5FE'
                                                : 'rgba(255, 255, 255, 0.05)',
                                            '& fieldset': {
                                                borderColor: (theme) => theme.palette.mode === 'light'
                                                    ? 'rgba(12, 21, 90, 0.2)'
                                                    : 'rgba(255, 255, 255, 0.2)',
                                                borderWidth: '2px',
                                            },
                                            '&:hover fieldset': {
                                                borderColor: (theme) => theme.palette.mode === 'light'
                                                    ? 'rgba(12, 21, 90, 0.3)'
                                                    : 'rgba(255, 255, 255, 0.3)',
                                            },
                                            '&.Mui-focused fieldset': {
                                                borderColor: (theme) => theme.palette.primary.main,
                                            },
                                        },
                                        '& input': {
                                            textAlign: 'center',
                                            fontSize: '1.1rem',
                                            fontWeight: 600,
                                            color: (theme) => theme.palette.text.primary,
                                            letterSpacing: '1px',
                                        },
                                    }}
                                    InputProps={{
                                        readOnly: true,
                                    }}
                                />

                                {isInCall && (
                                    <Typography
                                        variant="subtitle1"
                                        color="text.secondary"
                                        sx={{ mb: 2, fontWeight: 500, textAlign: 'center' }}
                                    >
                                        Duración: {formatDuration(callDuration)}
                                    </Typography>
                                )}
                                    
                                {/* Teclado numérico */}
                                <Box display="grid" gridTemplateColumns="repeat(3, 60px)" gap={1.5} mb={2} justifyContent="center">
                                    {['1','2','3','4','5','6','7','8','9','*','0','#'].map((num) => (
                                        <Button 
                                            key={num} 
                                            variant="outlined" 
                                            sx={{ 
                                                height: 63, 
                                                fontSize: '1.3rem', 
                                                fontWeight: 700,
                                                borderRadius: '50%',
                                                borderWidth: '2px',
                                                borderColor: (theme) => theme.palette.mode === 'light'
                                                    ? 'rgba(12, 21, 90, 0.15)'
                                                    : 'rgba(255, 255, 255, 0.15)',
                                                color: (theme) => theme.palette.primary.main,
                                                backgroundColor: (theme) => theme.palette.appBar.default,
                                                transition: 'all 0.2s ease',
                                                '&:hover': {
                                                    borderColor: (theme) => theme.palette.primary.main,
                                                    backgroundColor: (theme) => theme.palette.mode === 'light'
                                                        ? '#D3E8FB'
                                                        : 'rgba(255, 255, 255, 0.1)',
                                                    transform: 'translateY(-2px)',
                                                    boxShadow: '0 4px 8px rgba(12, 21, 90, 0.15)',
                                                },
                                                '&:active': {
                                                    transform: 'translateY(0)',
                                                },
                                                '&.Mui-disabled': {
                                                    opacity: 0.5,
                                                }
                                            }}
                                            onClick={() => handleKeyPress(num)}
                                            disabled={!isReady}
                                        >
                                            {num}
                                        </Button>
                                    ))}
                                </Box>

                                {/* Información del teclado durante llamada */}
                                {isInCall && (
                                    <Typography variant="caption" color="text.secondary" sx={{ mb: 1, textAlign: 'center' }}>
                                        Presiona los números para enviar tonos DTMF
                                    </Typography>
                                )}

                                {/* Botones de acción */}
                                <Box display="flex" gap={2} width="100%" justifyContent={'center'}> 
                                    {!isInCall ? (
                                        <>
                                            <Button
                                                variant="contained"
                                                onClick={handleCall}
                                                disabled={!phoneNumber.trim() || !isReady || callStatus === 'connecting'}
                                                sx={{ 
                                                    height: 64, 
                                                    width: 64,
                                                    minWidth: 64,
                                                    borderRadius: '50%',
                                                    padding: 0,
                                                    backgroundColor: '#0f9d58',
                                                    boxShadow: '0 4px 12px rgba(15, 157, 88, 0.3)',
                                                    transition: 'all 0.2s ease',
                                                    '&:hover': {
                                                        backgroundColor: '#0a7d45',
                                                        boxShadow: '0 6px 16px rgba(15, 157, 88, 0.4)',
                                                        transform: 'scale(1.05)',
                                                    },
                                                    '&:active': {
                                                        transform: 'scale(0.95)',
                                                    },
                                                }}
                                            >
                                                {callStatus === 'connecting' ? (
                                                    <CircularProgress size={28} color="inherit" />
                                                ) : (
                                                    <CallIcon sx={{ fontSize: 32 }} />
                                                )}
                                            </Button>
                                            <Button
                                                variant="outlined"
                                                onClick={handleBackspace}
                                                disabled={!phoneNumber.trim() || !isReady}
                                                sx={{ 
                                                    height: 64, 
                                                    width: 64,
                                                    minWidth: 64,
                                                    borderRadius: '50%',
                                                    padding: 0,
                                                    borderWidth: '2px',
                                                    borderColor: (theme) => theme.palette.mode === 'light'
                                                        ? 'rgba(12, 21, 90, 0.2)'
                                                        : 'rgba(255, 255, 255, 0.2)',
                                                    color: (theme) => theme.palette.primary.main,
                                                    backgroundColor: (theme) => theme.palette.appBar.default,
                                                    transition: 'all 0.2s ease',
                                                    '&:hover': {
                                                        borderColor: (theme) => theme.palette.primary.main,
                                                        backgroundColor: (theme) => theme.palette.mode === 'light'
                                                            ? '#D3E8FB'
                                                            : 'rgba(255, 255, 255, 0.1)',
                                                        transform: 'scale(1.05)',
                                                    },
                                                    '&:active': {
                                                        transform: 'scale(0.95)',
                                                    },
                                                }}
                                            >
                                                <BackspaceIcon sx={{ fontSize: 26 }} />
                                            </Button>   
                                        </>
                                    ) : (
                                        <>
                                            <Button
                                                variant="contained"
                                                onClick={handleEndCall}
                                                sx={{ 
                                                    height: 64, 
                                                    width: 64,
                                                    minWidth: 64,
                                                    borderRadius: '50%',
                                                    padding: 0,
                                                    backgroundColor: '#d32f2f',
                                                    boxShadow: '0 4px 12px rgba(211, 47, 47, 0.3)',
                                                    transition: 'all 0.2s ease',
                                                    '&:hover': {
                                                        backgroundColor: '#b71c1c',
                                                        boxShadow: '0 6px 16px rgba(211, 47, 47, 0.4)',
                                                        transform: 'scale(1.05)',
                                                    },
                                                    '&:active': {
                                                        transform: 'scale(0.95)',
                                                    },
                                                }}
                                            >
                                                <CallEndIcon sx={{ fontSize: 32 }} />
                                            </Button>
                                            <Button
                                                variant={isMuted ? "contained" : "outlined"}
                                                onClick={handleMute}
                                                sx={{ 
                                                    height: 64, 
                                                    width: 64,
                                                    minWidth: 64,
                                                    borderRadius: '50%',
                                                    padding: 0,
                                                    borderWidth: '2px',
                                                    borderColor: (theme) => isMuted ? 'transparent' : theme.palette.mode === 'light'
                                                        ? 'rgba(12, 21, 90, 0.2)'
                                                        : 'rgba(255, 255, 255, 0.2)',
                                                    backgroundColor: isMuted ? '#f57c00' : (theme) => theme.palette.appBar.default,
                                                    color: (theme) => isMuted ? 'white' : theme.palette.primary.main,
                                                    boxShadow: isMuted ? '0 4px 12px rgba(245, 124, 0, 0.3)' : 'none',
                                                    transition: 'all 0.2s ease',
                                                    '&:hover': {
                                                        borderColor: (theme) => isMuted ? 'transparent' : theme.palette.primary.main,
                                                        backgroundColor: (theme) => isMuted ? '#e65100' : theme.palette.mode === 'light'
                                                            ? '#D3E8FB'
                                                            : 'rgba(255, 255, 255, 0.1)',
                                                        transform: 'scale(1.05)',
                                                        boxShadow: isMuted ? '0 6px 16px rgba(245, 124, 0, 0.4)' : '0 4px 8px rgba(12, 21, 90, 0.15)',
                                                    },
                                                    '&:active': {
                                                        transform: 'scale(0.95)',
                                                    },
                                                }}
                                            >
                                                {isMuted ? <MicOffIcon sx={{ fontSize: 26 }} /> : <KeyboardVoiceIcon sx={{ fontSize: 26 }} />}
                                            </Button>  
                                        </> 
                                    )}
                                </Box>
                            </>
                        )}
                    </Box>
                </motion.div>

                {/* Secciones de Cliente y Venta - Animaciones independientes cuando está contraído */}
                {isExpanded ? (
                    /* Modo contraído: dos columnas lado a lado */
                    <Box sx={{ 
                        flex: 1, 
                        display: 'flex', 
                        gap: 2,
                        minWidth: 0,
                    }}>
                        <motion.div
                            layout
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.4, delay: 0.1 }}
                            style={{
                                flex: 1,
                                minWidth: 0,
                                display: 'flex',
                            }}
                        >
                            <ClientInfoSection 
                                cliente={{
                                    ...cliente,
                                    documento_id: cliente.documento || cliente.documento_id,
                                    email: cliente.correo || cliente.email
                                }} 
                                handleChange={handleClienteChange} 
                            />
                        </motion.div>

                        <motion.div
                            layout
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.4, delay: 0.2 }}
                            style={{
                                flex: 1,
                                minWidth: 0,
                                display: 'flex',
                            }}
                        >
                            <SaleInfoSection 
                                cliente={{
                                    ...cliente,
                                    documento_id: cliente.documento || cliente.documento_id,
                                    email: cliente.correo || cliente.email
                                }} 
                                llamada_id={fullCallInfo?.id || AfterfullCallInfo?.id || null}
                                campana_id={campana_id}
                                onVentaChange={setVenta}
                            />
                        </motion.div>
                    </Box>
                ) : (
                    /* Modo normal: columna única */
                    <motion.div
                        layout
                        transition={{ duration: 0.5, type: "spring", stiffness: 300, damping: 30 }}
                        style={{
                            flex: 1,
                            minWidth: 0,
                            display: 'flex',
                            flexDirection: 'column',
                        }}
                    >
                        <Box sx={{
                            flex: '1', 
                            minWidth: 0, 
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 2,
                        }}>
                            <ClientInfoSection 
                                cliente={{
                                    ...cliente,
                                    documento_id: cliente.documento || cliente.documento_id,
                                    email: cliente.correo || cliente.email
                                }} 
                                handleChange={handleClienteChange} 
                            />
                            <SaleInfoSection 
                                cliente={{
                                    ...cliente,
                                    documento_id: cliente.documento || cliente.documento_id,
                                    email: cliente.correo || cliente.email
                                }} 
                                llamada_id={fullCallInfo?.id || AfterfullCallInfo?.id || null}
                                campana_id={campana_id}
                                onVentaChange={setVenta}
                            />
                        </Box>
                    </motion.div>
                )}
            </Box>
        </MainLayout>
    );
}

export default Calls;