/**
 * Hook personalizado para manejar llamadas con Twilio
 * Encapsula toda la lógica de estado y eventos de llamadas
 * Cambia automáticamente el estado del agente a EN_LLAMADA cuando se conecta
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import twilioClient from '@/services/twilioClient';
import { useAuth } from '@/core/context/AuthContext';
import { changeState, mapFrontendToBackend } from '@/core/api/agentStates';

// Variable global para notificar cambios de estado
let stateChangeListeners = [];

const useTwilioCall = () => {
  const { user } = useAuth();
  const [isReady, setIsReady] = useState(false);
  const [isInCall, setIsInCall] = useState(false);
  const [isRinging, setIsRinging] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [error, setError] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [callStatus, setCallStatus] = useState('idle'); // idle, connecting, ringing, in-call
  const [currentCallInfo, setCurrentCallInfo] = useState(null); // Información de la llamada activa (registro del backend)
  
  const timerRef = useRef(null);

  /**
   * Inicializar Twilio Device al montar el componente
   */
  useEffect(() => {
    const initTwilio = async () => {
      try {
        console.log('[useTwilioCall] Inicializando Twilio...');
        
        // Configurar callbacks
        twilioClient.onReady(() => {
          console.log('[useTwilioCall] Device listo');
          setIsReady(true);
          setError(null);
        });

        twilioClient.onError((err) => {
          console.error('[useTwilioCall] Error:', err);
          setError(err.message || 'Error en Twilio');
          setIsReady(false);
        });

        twilioClient.onIncoming((call) => {
          console.log('[useTwilioCall] Llamada entrante - Auto-aceptando para llamadas automáticas');
          setIncomingCall(call);
          setCallStatus('ringing');
          setIsRinging(true);
          
          // AUTO-ACEPTAR llamadas entrantes (para llamadas automáticas)
          // El sistema de llamadas automáticas ya conectó al cliente,
          // solo falta que el agente acepte para unirse a la conversación
          setTimeout(() => {
            console.log('[useTwilioCall] Auto-aceptando llamada entrante');
            twilioClient.acceptIncomingCall();
          }, 100); // Pequeño delay para que los eventos se registren correctamente
        });

        twilioClient.onRinging(() => {
          console.log('[useTwilioCall] Llamada sonando');
          setCallStatus('ringing');
          setIsRinging(true);
        });

        twilioClient.onConnect(async (call) => {
          console.log('[useTwilioCall] Llamada conectada');
          console.log('[useTwilioCall] Call parameters:', call.parameters);
          
          setIsInCall(true);
          setIsRinging(false);
          setCallStatus('in-call');
          setIncomingCall(null);
          
          // Obtener información de la llamada del backend (si es llamada automática)
          try {
            const callSid = call.parameters.CallSid;
            if (callSid) {
              console.log('[useTwilioCall] Obteniendo información de llamada con CallSid:', callSid);
              
              // TODO: Hacer request al backend para obtener registro de Llamada
              // const response = await apiClient.get(`/api/calls/by-sid/${callSid}/`);
              // setCurrentCallInfo(response.data);
              // console.log('[useTwilioCall] Información de llamada obtenida:', response.data);
            }
          } catch (err) {
            console.error('[useTwilioCall] Error obteniendo información de llamada:', err);
          }
          
          // Iniciar contador de duración
          startCallTimer();
          
          // NO cambiar estado aquí para llamadas automáticas
          // El backend ya cambió el estado a EN_LLAMADA cuando inició la llamada
          // Solo notificar a los listeners para refrescar UI
          console.log('[useTwilioCall] Llamada conectada, notificando listeners para refrescar UI...');
          stateChangeListeners.forEach(listener => {
            try {
              listener();
            } catch (err) {
              console.error('[useTwilioCall] Error en listener:', err);
            }
          });
        });

        twilioClient.onDisconnect(async (call) => {
          console.log('[useTwilioCall] Llamada desconectada');
          console.log('[useTwilioCall] Call info:', call);
          console.log('[useTwilioCall] Was in call:', isInCall);
          console.log('[useTwilioCall] Call duration:', callDuration);
          
          setIsInCall(false);
          setIsRinging(false);
          setCallStatus('idle');
          setIsMuted(false);
          setIncomingCall(null);
          setCurrentCallInfo(null); // Limpiar información de llamada
          
          // Detener contador de duración primero
          stopCallTimer();
          
          // Cambiar automáticamente el estado del agente a AFTERCALL (After Call)
          try {
            console.log('[useTwilioCall] Cambiando estado del agente a AFTERCALL');
            const backendState = mapFrontendToBackend('AFTERCALL');
            
            // Esperamos la respuesta del servidor antes de notificar
            const response = await changeState(backendState, 'Llamada finalizada, en proceso after call');
            
            console.log('[useTwilioCall] Estado cambiado exitosamente a AFTERCALL:', response);
            console.log('[useTwilioCall] Notificando listeners con la respuesta del servidor...');
            
            // Notificar a los listeners DESPUÉS de que el cambio fue exitoso
            // Pasamos la respuesta para que puedan usarla directamente
            stateChangeListeners.forEach(listener => {
              try {
                listener(response);
              } catch (err) {
                console.error('[useTwilioCall] Error en listener:', err);
              }
            });
          } catch (err) {
            console.error('[useTwilioCall] Error al cambiar estado del agente:', err);
            // Aún así notificar para que intenten refrescar
            stateChangeListeners.forEach(listener => {
              try {
                listener(null);
              } catch (listenerErr) {
                console.error('[useTwilioCall] Error en listener:', listenerErr);
              }
            });
          }
        });

        // Inicializar
        await twilioClient.initialize();
      } catch (err) {
        console.error('[useTwilioCall] Error inicializando:', err);
        setError('No se pudo conectar con Twilio. Verifica tu conexión.');
        setIsReady(false);
      }
    };

    initTwilio();

    // Limpiar al desmontar
    return () => {
      console.log('[useTwilioCall] Limpiando...');
      stopCallTimer();
      twilioClient.destroy();
    };
  }, []);

  /**
   * Inicia el contador de duración de llamada
   */
  const startCallTimer = useCallback(() => {
    setCallDuration(0);
    timerRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
  }, []);

  /**
   * Detiene el contador de duración de llamada
   */
  const stopCallTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setCallDuration(0);
  }, []);

  /**
   * Realiza una llamada saliente
   * @param {string} phoneNumber - Número a llamar (formato E.164: +573001234567)
   */
  const makeCall = useCallback(async (phoneNumber) => {
    if (!isReady) {
      setError('Twilio no está listo. Espera un momento.');
      return false;
    }

    if (!phoneNumber || phoneNumber.trim() === '') {
      setError('Ingresa un número de teléfono');
      return false;
    }

    try {
      setCallStatus('connecting');
      setError(null);

      // Formatear número a E.164 si no lo está
      let formattedNumber = phoneNumber.trim();
      if (!formattedNumber.startsWith('+')) {
        // Asume que es Colombia si no tiene código de país
        formattedNumber = `+57${formattedNumber}`;
      }

      console.log('[useTwilioCall] Llamando a:', formattedNumber);

      // Parámetros adicionales para el backend
      const params = {
        agentId: user?.id,
        campaignId: 1, // TODO: Permitir seleccionar campaña
      };

      await twilioClient.makeCall(formattedNumber, params);
      return true;
    } catch (err) {
      console.error('[useTwilioCall] Error al llamar:', err);
      setError('No se pudo realizar la llamada. Intenta nuevamente.');
      setCallStatus('idle');
      return false;
    }
  }, [isReady, user]);

  /**
   * Cuelga la llamada activa
   */
  const hangup = useCallback(() => {
    console.log('[useTwilioCall] Colgando...');
    twilioClient.hangup();
    setCallStatus('idle');
    setIsInCall(false);
    setIsRinging(false);
    stopCallTimer();
  }, [stopCallTimer]);

  /**
   * Silencia/desilencia el micrófono
   */
  const toggleMute = useCallback(() => {
    const muted = twilioClient.toggleMute();
    setIsMuted(muted);
    return muted;
  }, []);

  /**
   * Acepta una llamada entrante
   */
  const acceptIncomingCall = useCallback(() => {
    console.log('[useTwilioCall] Aceptando llamada entrante');
    twilioClient.acceptIncomingCall();
  }, []);

  /**
   * Rechaza una llamada entrante
   */
  const rejectIncomingCall = useCallback(() => {
    console.log('[useTwilioCall] Rechazando llamada entrante');
    twilioClient.rejectIncomingCall();
    setIncomingCall(null);
    setCallStatus('idle');
    setIsRinging(false);
  }, []);

  /**
   * Envía dígitos DTMF durante una llamada
   * @param {string} digit - Dígito a enviar (0-9, *, #)
   */
  const sendDigit = useCallback((digit) => {
    if (isInCall) {
      console.log('[useTwilioCall] Enviando dígito:', digit);
      twilioClient.sendDigits(digit);
    }
  }, [isInCall]);

  /**
   * Formatea la duración en MM:SS
   */
  const formatDuration = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  }, []);

  /**
   * Suscribe un listener para recibir notificaciones de cambios de estado
   */
  const subscribeToStateChanges = useCallback((listener) => {
    stateChangeListeners.push(listener);
    return () => {
      stateChangeListeners = stateChangeListeners.filter(l => l !== listener);
    };
  }, []);

  return {
    // Estado
    isReady,
    isInCall,
    isRinging,
    isMuted,
    callDuration,
    callStatus,
    error,
    incomingCall,
    currentCallInfo, // Información de la llamada activa
    
    // Acciones
    makeCall,
    hangup,
    toggleMute,
    acceptIncomingCall,
    rejectIncomingCall,
    sendDigit,
    subscribeToStateChanges,
    
    // Utilidades
    formatDuration,
  };
};

export default useTwilioCall;

// Exportar también la función para suscribirse desde fuera del hook
export const subscribeToAgentStateChanges = (listener) => {
  stateChangeListeners.push(listener);
  return () => {
    stateChangeListeners = stateChangeListeners.filter(l => l !== listener);
  };
};
