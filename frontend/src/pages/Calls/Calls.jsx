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
            >
                <Alert 
                    severity="info" 
                    sx={{ width: '400px' }}
                    action={
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button 
                                color="success" 
                                size="small" 
                                variant="contained"
                                onClick={handleAcceptIncoming}
                            >
                                Aceptar
                            </Button>
                            <Button 
                                color="error" 
                                size="small" 
                                variant="outlined"
                                onClick={handleRejectIncoming}
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
                }}>
                    <Box 
                        display="flex" 
                        flexDirection="column" 
                        alignItems="center" 
                        justifyContent="center"
                        p={2} 
                        border="1.5px solid #0C155A" 
                        borderRadius={4} 
                        backgroundColor="#ebf5feff"
                        height="100%"
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
                            sx={{ mb: 2,
                                 textAlign: 'center',
                                '& input': {
                                textAlign: 'center',
                                fontSize: '0.875rem',
                                fontWeight: 600,
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
                        <Box display="grid" gridTemplateColumns="repeat(3, 60px)" gap={1} mb={2}>
                            {['1','2','3','4','5','6','7','8','9','*','0','#'].map((num) => (
                                <Button 
                                    key={num} 
                                    variant="outlined" 
                                    sx={{ height: 60, fontSize: '1.2rem', borderRadius: 8 }}
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
                        <Box display="flex" gap={1} width="100%" justifyContent={'center'}> 
                            {!isInCall ? (
                                <>
                                    <Button
                                        variant="contained"
                                        color="success"
                                        onClick={handleCall}
                                        disabled={!phoneNumber.trim() || !isReady || callStatus === 'connecting'}
                                        sx={{ 
                                            height: 60, 
                                            width: 60,
                                            minWidth: 60,
                                            borderRadius: '50%',
                                            padding: 0,
                                        }}
                                    >
                                        {callStatus === 'connecting' ? (
                                            <CircularProgress size={24} color="inherit" />
                                        ) : (
                                            <CallIcon sx={{ fontSize: 30 }} />
                                        )}
                                    </Button>
                                    <Button
                                        variant="none"
                                        color="secondary"
                                        onClick={handleBackspace}
                                        disabled={!phoneNumber.trim() || !isReady}
                                        sx={{ 
                                            height: 60, 
                                            width: 60,
                                            minWidth: 60,
                                            borderRadius: '50%',
                                            padding: 0,
                                        }}
                                    >
                                        <BackspaceIcon sx={{ fontSize: 24 }} />
                                    </Button>   
                                </>
                            ) : (
                                <>
                                    {/*<Button
                                        variant={isMuted ? "contained" : "outlined"}
                                        color={isMuted ? "warning" : "primary"}
                                        {/*onClick={handleHold}
                                        sx={{ 
                                            height: 60, 
                                            width: 60,
                                            minWidth: 60,
                                            borderRadius: '50%',
                                            padding: 0,
                                        }}
                                    >
                                        {isOnHold ? <BackHandIcon sx={{ fontSize: 24 }} /> : <BackHandIcon sx={{ fontSize: 24 }} />}
                                    </Button>*/}
                                    <Button
                                        variant="contained"
                                        color="error"
                                        onClick={handleEndCall}
                                        sx={{ 
                                            height: 60, 
                                            width: 60,
                                            minWidth: 60,
                                            borderRadius: '50%',
                                            padding: 0,
                                        }}
                                    >
                                        <CallEndIcon sx={{ fontSize: 30 }} />
                                    </Button>
                                    <Button
                                        variant={isMuted ? "contained" : "outlined"}
                                        color="primary"
                                        onClick={handleMute}
                                        sx={{ 
                                            height: 60, 
                                            width: 60,
                                            minWidth: 60,
                                            borderRadius: '50%',
                                            padding: 0,
                                        }}
                                    >
                                        {isMuted ? <MicOffIcon sx={{ fontSize: 24 }} /> : <KeyboardVoiceIcon sx={{ fontSize: 24 }} />}
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