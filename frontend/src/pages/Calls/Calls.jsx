import * as React from 'react';
import MainLayout from '@/core/components/layout/MainLayout';
import { useAuth } from '@/core/context/AuthContext';
import { Box, Typography, Button, TextField } from '@mui/material';
import CallIcon from '@mui/icons-material/Call';
import CallEndIcon from '@mui/icons-material/CallEnd';
import BackspaceIcon from '@mui/icons-material/Backspace';
import MicOffIcon from '@mui/icons-material/MicOff';

const Calls = () => {
    const { user } = useAuth();
    const [phoneNumber, setPhoneNumber] = React.useState('');
    const [isInCall, setIsInCall] = React.useState(false);

    const handleKeyPress = (num) => {
        setPhoneNumber((prev) => prev + num);
    }

    const handleBackspace = () => {
        setPhoneNumber((prev) => prev.slice(0, -1));
    }

    const handleCall = () => {
        setIsInCall(true);
        // Aquí puedes agregar la lógica para iniciar la llamada
    }

    const handleEndCall = () => {
        setIsInCall(false);
        // Aquí puedes agregar la lógica para finalizar la llamada
    }

    const handleMute = () => {
        setIsMuted((prev) => !prev);
        // Aquí puedes agregar la lógica para silenciar el micrófono
    }

    return (
        <MainLayout title="Llamadas">
            <Box sx={{
                display: 'flex',
                gap: 2,
                height: 'calc(100vh - 150px)',
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
                        p={2} 
                        border="1.5px solid #0C155A" 
                        borderRadius={4} 
                        backgroundColor="#EBF5FE"
                        height="100%"
                    >
                            <TextField
                                fullWidth
                                value={phoneNumber}
                                disabled={isInCall}
                                placeholder="Ingrese número"
                                variant="outlined"
                                sx={{ mb: 2 }}
                                InputProps={{
                                    readOnly: true,
                                }}
                            />
                            
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
                                            variant="contained"
                                            color="secondary"
                                            onClick={handleMute}
                                            sx={{ 
                                                height: 60, 
                                                width: 60,
                                                minWidth: 60,
                                                borderRadius: '50%',
                                                padding: 0,
                                            }}
                                        >
                                            <MicOffIcon sx={{ fontSize: 24 }} />
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
                }}>
                    <Box 
                            border="1.5px solid #0C155A" 
                            borderRadius={4} 
                            p={2} 
                            width="100%"
                            height="100%"
                            display="flex"
                            flexDirection="column"
                            backgroundColor="#EBF5FE"
                        >
                            <Typography variant="h6" mb={2}>Información de la llamada</Typography>
                            
                            {isInCall ? (
                                <Box>
                                    <Typography variant="body1" color="success.main" fontWeight="bold">
                                        En llamada con: {phoneNumber}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" mt={1}>
                                        Usuario: {user?.first_name} {user?.last_name}
                                    </Typography>
                                </Box>
                            ) : (
                                <Typography variant="body2" color="text.secondary">
                                    {phoneNumber ? 
                                        `Número marcado: ${phoneNumber}` : 
                                        'Marque un número para iniciar la llamada'
                                    }
                                </Typography>
                            )}
                        </Box>
                </Box>
            </Box>
        </MainLayout>
    );
}

export default Calls;