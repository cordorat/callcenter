import * as React from 'react';
import MainLayout from '@/core/components/layout/MainLayout';
import { useAuth } from '@/core/context/AuthContext';
import { Box, Typography, Button, TextField, Snackbar, Alert, CircularProgress} from '@mui/material';
import {
    Call as CallIcon, CallEnd as CallEndIcon, Backspace as BackspaceIcon, MicOff as MicOffIcon, KeyboardVoice as KeyboardVoiceIcon, BackHand as BackHandIcon, CloseFullscreen as CloseFullscreenIcon, OpenInFull as OpenInFullIcon, PhoneInTalk as PhoneInTalkIcon
} from '@mui/icons-material';
import SalesSection from '@/components/sales/SalesSection';
import useTwilioCall from '@/hooks/useTwilioCall';

const Calls = () => {
    const { user } = useAuth();
    const [phoneNumber, setPhoneNumber] = React.useState('');
    const [showIncomingAlert, setShowIncomingAlert] = React.useState(false);
    
    // Configuración de espaciado vertical del contenedor del teclado
    const keypadVerticalPadding = 10; // Ajusta este valor para más o menos espacio (en unidades de 8px)
    
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
    } = useTwilioCall();

    // Mostrar alerta cuando hay llamada entrante
    React.useEffect(() => {
        if (incomingCall) {
            setShowIncomingAlert(true);
        } else {
            setShowIncomingAlert(false);
        }
    }, [incomingCall]);

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
        
        const success = await makeCall(phoneNumber);
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

            <Box sx={{
                display: 'flex',
                gap: 2,
                height: 'calc(100vh - 120px)',
                width: '100%',
            }}>
                {/* Columna izquierda: teclado */}
                <Box sx={{
                    flex: '0 0 20%', 
                    minWidth: '300px', 
                    maxWidth: '400px', 
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                }}>
                    <Box 
                        display="flex" 
                        flexDirection="column" 
                        alignItems="center" 
                        justifyContent="flex-start"
                        px={3}
                        py={keypadVerticalPadding}
                        borderRadius={3} 
                        backgroundColor="#F8FAFB"
                        sx={{
                            boxShadow: '0 2px 8px rgba(12, 21, 90, 0.08)',
                            transition: 'box-shadow 0.2s ease',
                            '&:hover': {
                                boxShadow: '0 4px 12px rgba(12, 21, 90, 0.12)',
                            }
                        }}
                    >
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
                                    backgroundColor: '#EBF5FE',
                                    '& fieldset': {
                                        borderColor: 'rgba(12, 21, 90, 0.2)',
                                        borderWidth: '2px',
                                    },
                                    '&:hover fieldset': {
                                        borderColor: 'rgba(12, 21, 90, 0.3)',
                                    },
                                    '&.Mui-focused fieldset': {
                                        borderColor: '#0C155A',
                                    },
                                },
                                '& input': {
                                    textAlign: 'center',
                                    fontSize: '1.1rem',
                                    fontWeight: 600,
                                    color: '#0C155A',
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
                                sx={{ mb: 2, fontWeight: 500 }}
                            >
                                Duración: {formatDuration(callDuration)}
                            </Typography>
                        )}
                            
                        {/* Teclado numérico */}
                        <Box display="grid" gridTemplateColumns="repeat(3, 60px)" gap={1.5} mb={2}>
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
                                        borderColor: 'rgba(12, 21, 90, 0.15)',
                                        color: '#0C155A',
                                        backgroundColor: '#EBF5FE',
                                        transition: 'all 0.2s ease',
                                        '&:hover': {
                                            borderColor: '#0C155A',
                                            backgroundColor: '#D3E8FB',
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
                                            borderColor: 'rgba(12, 21, 90, 0.2)',
                                            color: '#0C155A',
                                            backgroundColor: '#EBF5FE',
                                            transition: 'all 0.2s ease',
                                            '&:hover': {
                                                borderColor: '#0C155A',
                                                backgroundColor: '#D3E8FB',
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
                                            borderColor: isMuted ? 'transparent' : 'rgba(12, 21, 90, 0.2)',
                                            backgroundColor: isMuted ? '#f57c00' : '#EBF5FE',
                                            color: isMuted ? 'white' : '#0C155A',
                                            boxShadow: isMuted ? '0 4px 12px rgba(245, 124, 0, 0.3)' : 'none',
                                            transition: 'all 0.2s ease',
                                            '&:hover': {
                                                borderColor: isMuted ? 'transparent' : '#0C155A',
                                                backgroundColor: isMuted ? '#e65100' : '#D3E8FB',
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
                    </Box>
                </Box>

                {/* Columna derecha: información */}
                <Box sx={{
                    flex: '1', 
                    minWidth: 0, 
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                }}>
                    <SalesSection user={user} />
                </Box>
            </Box>
        </MainLayout>
    );
}

export default Calls;