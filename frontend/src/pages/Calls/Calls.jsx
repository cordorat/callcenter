import * as React from 'react';
import MainLayout from '@/core/components/layout/MainLayout';
import { useAuth } from '@/core/context/AuthContext';
import { Box, Typography, Button, TextField} from '@mui/material';
import {
    Call as CallIcon, CallEnd as CallEndIcon, Backspace as BackspaceIcon, MicOff as MicOffIcon, KeyboardVoice as KeyboardVoiceIcon, BackHand as BackHandIcon, CloseFullscreen as CloseFullscreenIcon, OpenInFull as OpenInFullIcon,
} from '@mui/icons-material';
import SalesSection from '@/components/sales/SalesSection';

const Calls = () => {
    const { user } = useAuth();
    const [phoneNumber, setPhoneNumber] = React.useState('');
    const [isInCall, setIsInCall] = React.useState(false);
    const [isMuted, setIsMuted] = React.useState(false);
    const [isHold, setIsHold] = React.useState(false);
    const [callDuration, setCallDuration] = React.useState(0);
    const [timerId, setTimerId] = React.useState(null);

    const handleKeyPress = (num) => {
        setPhoneNumber((prev) => prev + num);
    }

    const handleBackspace = () => {
        setPhoneNumber((prev) => prev.slice(0, -1));
    }

    const handleCall = () => {
        setIsInCall(true);
        setCallDuration(0);

        // Inicia el contador (1 segundo)
        const id = setInterval(() => {
            setCallDuration((prev) => prev + 1);
        }, 1000);

        setTimerId(id);
        // Aquí puedes agregar la lógica para iniciar la llamada
    }

    const handleEndCall = () => {
        setIsInCall(false);
        clearInterval(timerId);
        setTimerId(null);
        // Aquí puedes agregar la lógica para finalizar la llamada
    }

    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60).toString().padStart(2, "0");
        const secs = (seconds % 60).toString().padStart(2, "0");
        return `${mins}:${secs}`;
    };

    const handleMute = () => {
        setIsMuted((prev) => !prev);
        // Aquí puedes agregar la lógica para silenciar el micrófono
    }

    const handleHold = () => {
        setIsHold((prev) => !prev);
        // Aquí puedes agregar la lógica para poner la llamada en espera
    }

    return (
        <MainLayout title="Llamadas">
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

                        <TextField
                            fullWidth
                            value={phoneNumber}
                            disabled={isInCall}
                            variant="outlined"
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
                                    disabled={isInCall}
                                >
                                    {num}
                                </Button>
                            ))}
                        </Box>

                        {/* Botones de acción */}
                        <Box display="flex" gap={1} width="100%" justifyContent={'center'}> 
                            {!isInCall ? (
                                <>
                                    <Button
                                        variant="contained"
                                        color="success"
                                        onClick={handleCall}
                                        disabled={!phoneNumber.trim()}
                                        sx={{ 
                                            height: 60, 
                                            width: 60,
                                            minWidth: 60,
                                            borderRadius: '50%',
                                            padding: 0,
                                        }}
                                    >
                                        <CallIcon sx={{ fontSize: 30 }} />
                                    </Button>
                                    <Button
                                        variant="none"
                                        color="secondary"
                                        onClick={handleBackspace}
                                        disabled={!phoneNumber.trim()}
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
                                    <Button
                                        variant={isHold ? "contained" : "outlined"}
                                        color="primary"
                                        onClick={handleHold}
                                        sx={{ 
                                            height: 60, 
                                            width: 60,
                                            minWidth: 60,
                                            borderRadius: '50%',
                                            padding: 0,
                                        }}
                                    >
                                        <BackHandIcon sx={{ fontSize: 24 }} />
                                    </Button>
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