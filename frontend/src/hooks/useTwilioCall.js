/**
 * Hook personalizado para manejar llamadas con Twilio
 * 
 * Encapsula toda la lógica de estado y eventos de llamadas, incluyendo:
 * - Inicialización de Twilio Device
 * - Manejo de llamadas entrantes y salientes
 * - Gestión de estado del agente (EN_LLAMADA → AFTERCALL → DISPONIBLE)
 * - Persistencia de llamada_id durante AFTERCALL para registro de ventas
 * 
 * FLUJO DE ESTADOS:
 * 1. DISPONIBLE → makeCall() → EN_LLAMADA
 * 2. EN_LLAMADA → hangup() / cliente cuelga → AFTERCALL (datos persisten)
 * 3. AFTERCALL → agente completa after-call → DISPONIBLE (clearCallData() limpia)
 * 
 * PERSISTENCIA DE DATOS:
 * - Durante la llamada: currentCallInfo, currentClientInfo
 * - Durante AFTERCALL: persistedCallData mantiene llamada_id y datos del cliente
 * - Solo se limpian cuando el agente vuelve a DISPONIBLE mediante clearCallData()
 * 
 * RECUPERACIÓN DE DATOS:
 * - Si se pierde el estado (refresh, etc.), usar recuperarLlamadaId() para restaurar
 * 
 * @returns {Object} Estado y funciones para manejar llamadas
 * 
 * @example
 * // Uso básico en componente
 * const {
 *   isInCall,
 *   llamadaId,
 *   persistedCallData,
 *   makeCall,
 *   hangup,
 *   clearCallData,
 *   recuperarLlamadaId
 * } = useTwilioCall();
 * 
 * // Limpiar datos cuando el agente vuelve a DISPONIBLE
 * useEffect(() => {
 *   if (frontendState === 'DISPONIBLE') {
 *     clearCallData();
 *   }
 * }, [frontendState, clearCallData]);
 * 
 * // Recuperar llamada_id si se pierde el estado
 * useEffect(() => {
 *   if (frontendState === 'AFTERCALL' && !llamadaId) {
 *     recuperarLlamadaId();
 *   }
 * }, [frontendState, llamadaId, recuperarLlamadaId]);
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import twilioClient from '@/services/twilioClient';
import apiClient from '@/core/api/apiClient';
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
  const [currentClientInfo, setCurrentClientInfo] = useState(null); // Información del cliente activo
  
  /**
   * ⭐ NUEVO: Estado persistente para mantener llamada_id durante AFTERCALL
   * Este estado NO se limpia al desconectar la llamada, se mantiene hasta que
   * el agente vuelva a estado DISPONIBLE
   * 
   * Estructura:
   * {
   *   llamada_id: number,          // ID del backend (CRÍTICO para registrar ventas)
   *   cliente_id: number | null,   // ID del cliente si existe
   *   telefono: string,            // Teléfono del cliente
   *   nombre: string | null,       // Nombre del cliente
   *   documento: string | null,    // Documento del cliente
   *   direccion: string | null,    // Dirección del cliente
   *   correo: string | null,       // Correo del cliente
   *   ciudad: string | null,       // Ciudad del cliente
   *   campana_id: number | null,   // ID de la campaña
   *   call_sid: string | null,     // SID de Twilio
   *   timestamp: string            // Timestamp de la llamada
   * }
   */
  const [persistedCallData, setPersistedCallData] = useState(null);
  
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
          
          // ⭐ CRÍTICO: Limpiar datos de llamada anterior (por si es llamada automática)
          console.log('[useTwilioCall] 🧹 Limpiando datos de llamada anterior en onConnect');
          setPersistedCallData(null);
          setCurrentCallInfo(null);
          setCurrentClientInfo(null);
          
          // Obtener información de la llamada y del cliente del backend (si es llamada automática)
          try {
            const callSid = call.parameters.CallSid;
            if (callSid) {
              console.log('[useTwilioCall] Obteniendo información de llamada con CallSid:', callSid);
              const response = await apiClient.get(`/api/calls/llamadas/by-sid/${callSid}/`);
              setCurrentCallInfo(response.data);
              console.log('[useTwilioCall] Información de llamada obtenida:', response.data);

              // Información del cliente viene en response.data.cliente_expandido
              const clienteExpandido = response.data.cliente_expandido;
              if (clienteExpandido) {
                setCurrentClientInfo(clienteExpandido);
                console.log('[useTwilioCall] Información de cliente obtenida:', clienteExpandido);
              } else {
                setCurrentClientInfo(null);
                console.log('[useTwilioCall] No hay información de cliente asociada');
              }

              // ⭐ NUEVO: Guardar en estado persistente para mantener durante AFTERCALL
              const persistedData = {
                llamada_id: response.data.id, // ⭐ CRÍTICO: ID del backend
                cliente_id: clienteExpandido?.id || null,
                telefono: response.data.telefono_destino || response.data.telefono_origen,
                nombre: clienteExpandido?.nombre || null,
                documento: clienteExpandido?.documento || null,
                direccion: clienteExpandido?.direccion || null,
                correo: clienteExpandido?.correo || null,
                ciudad: clienteExpandido?.ciudad || null,
                campana_id: response.data.campana_id || null,
                call_sid: callSid,
                timestamp: new Date().toISOString()
              };
              
              setPersistedCallData(persistedData);
              console.log('[useTwilioCall] ✅ Datos persistidos para AFTERCALL:', persistedData);
            }
          } catch (err) {
            console.error('[useTwilioCall] Error obteniendo información de llamada:', err);
            setCurrentCallInfo(null);
            setCurrentClientInfo(null);
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
          
          // ⭐ MODIFICADO: NO limpiar estos estados inmediatamente
          // Se mantienen para poder usarlos durante AFTERCALL
          // setCurrentCallInfo(null); // ❌ NO limpiar
          // setCurrentClientInfo(null); // ❌ NO limpiar
          // setPersistedCallData(null); // ❌ NO limpiar
          
          console.log('[useTwilioCall] ℹ️ Manteniendo datos de llamada para AFTERCALL');
          console.log('[useTwilioCall] - currentCallInfo:', currentCallInfo);
          console.log('[useTwilioCall] - currentClientInfo:', currentClientInfo);
          console.log('[useTwilioCall] - persistedCallData:', persistedCallData);
          
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
   * @param {number|null} campana_id - ID de la campaña (opcional)
   */
  const makeCall = useCallback(async (phoneNumber, campana_id = null) => {
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

      // ⭐ CRÍTICO: Limpiar datos de llamada anterior ANTES de iniciar nueva llamada
      console.log('[useTwilioCall] 🧹 Limpiando datos de llamada anterior antes de nueva llamada');
      setPersistedCallData(null);
      setCurrentCallInfo(null);
      setCurrentClientInfo(null);

      // Formatear número a E.164 si no lo está
      let formattedNumber = phoneNumber.trim();
      if (!formattedNumber.startsWith('+')) {
        // Asume que es Colombia si no tiene código de país
        formattedNumber = `+57${formattedNumber}`;
      }

      console.log('[useTwilioCall] Llamando a:', formattedNumber);

      // ⭐ NUEVO: Crear registro de llamada en backend ANTES de llamar con Twilio
      // Esto nos permite capturar el llamada_id para llamadas MANUALES
      try {
        console.log('[useTwilioCall] Creando registro de llamada en backend...');
        const createResponse = await apiClient.post('/api/calls/llamadas/create/', {
          telefono_destino: formattedNumber,
          campana_id: campana_id,
          agente_id: user?.id,
          tipo: 'saliente'
        });

        const llamadaData = createResponse.data;
        console.log('[useTwilioCall] ✅ Llamada creada en backend:', llamadaData);

        // ⭐ Guardar en estado persistente INMEDIATAMENTE
        const persistedData = {
          llamada_id: llamadaData.id, // ⭐ CRÍTICO: ID del backend
          cliente_id: null, // Se actualizará si hay cliente asociado
          telefono: formattedNumber,
          nombre: null,
          documento: null,
          direccion: null,
          correo: null,
          ciudad: null,
          campana_id: campana_id,
          call_sid: null, // Se actualizará cuando Twilio conecte
          timestamp: new Date().toISOString()
        };

        setPersistedCallData(persistedData);
        console.log('[useTwilioCall] ✅ Datos persistidos para llamada manual - llamada_id:', persistedData.llamada_id);
        console.log('[useTwilioCall] ✅ persistedData completo:', JSON.stringify(persistedData, null, 2));

        // Parámetros adicionales para el backend incluyendo el llamada_id
        const params = {
          agentId: user?.id,
          campaignId: campana_id,
          llamada_id: llamadaData.id, // ⭐ Pasar el ID al backend
        };

        await twilioClient.makeCall(formattedNumber, params);
        return true;
      } catch (backendErr) {
        console.error('[useTwilioCall] ❌ Error creando llamada en backend:', backendErr);
        // Si falla la creación en backend, intentamos llamar igual (modo degradado)
        console.warn('[useTwilioCall] ⚠️ Continuando con llamada sin registro previo en backend');
        
        const params = {
          agentId: user?.id,
          campaignId: campana_id,
        };

        await twilioClient.makeCall(formattedNumber, params);
        return true;
      }
    } catch (err) {
      console.error('[useTwilioCall] Error al llamar:', err);
      setError('No se pudo realizar la llamada. Intenta nuevamente.');
      setCallStatus('idle');
      return false;
    }
  }, [isReady, user, persistedCallData]);

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
   * ⭐ NUEVO: Limpia todos los datos de la llamada
   * Solo debe llamarse cuando el agente vuelve a estado DISPONIBLE
   * 
   * @example
   * // En el componente cuando el agente cambia a DISPONIBLE:
   * useEffect(() => {
   *   if (frontendState === 'DISPONIBLE') {
   *     clearCallData();
   *   }
   * }, [frontendState, clearCallData]);
   */
  const clearCallData = useCallback(() => {
    console.log('[useTwilioCall] 🧹 Limpiando todos los datos de llamada');
    console.log('[useTwilioCall] - Limpiando currentCallInfo:', currentCallInfo);
    console.log('[useTwilioCall] - Limpiando currentClientInfo:', currentClientInfo);
    console.log('[useTwilioCall] - Limpiando persistedCallData:', persistedCallData);
    
    setCurrentCallInfo(null);
    setCurrentClientInfo(null);
    setPersistedCallData(null);
    setCallDuration(0);
    
    console.log('[useTwilioCall] ✅ Datos de llamada limpiados correctamente');
  }, [currentCallInfo, currentClientInfo, persistedCallData]);

  /**
   * ⭐ NUEVO: Recupera el llamada_id de la última llamada del agente desde el backend
   * Útil como fallback si se pierde el estado (por ejemplo, después de un refresh)
   * 
   * @returns {Promise<number|null>} El llamada_id recuperado o null si no se encuentra
   * 
   * @example
   * // En el componente si persistedCallData es null pero el agente está en AFTERCALL:
   * useEffect(() => {
   *   if (frontendState === 'AFTERCALL' && !persistedCallData?.llamada_id) {
   *     recuperarLlamadaId();
   *   }
   * }, [frontendState, persistedCallData, recuperarLlamadaId]);
   */
  const recuperarLlamadaId = useCallback(async () => {
    try {
      console.log('[useTwilioCall] 🔄 Recuperando llamada_id del backend...');
      
      // Endpoint que devuelve la última llamada del agente que está disponible para registrar venta
      const response = await apiClient.get('/api/calls/llamadas/disponible-venta/');
      
      if (response.data?.llamada) {
        const llamadaData = response.data.llamada;
        const clienteData = response.data.cliente || null;
        
        console.log('[useTwilioCall] ✅ Llamada recuperada del backend:', llamadaData);
        console.log('[useTwilioCall] ✅ Cliente recuperado:', clienteData);

        // Reconstruir el estado persistente
        const persistedData = {
          llamada_id: llamadaData.id,
          cliente_id: clienteData?.id || null,
          telefono: llamadaData.telefono_destino || llamadaData.telefono_origen,
          nombre: clienteData?.nombre || null,
          documento: clienteData?.documento || null,
          direccion: clienteData?.direccion || null,
          correo: clienteData?.correo || null,
          ciudad: clienteData?.ciudad || null,
          campana_id: llamadaData.campana_id || null,
          call_sid: llamadaData.sid || null,
          timestamp: llamadaData.fecha_inicio || new Date().toISOString()
        };

        setPersistedCallData(persistedData);
        setCurrentCallInfo(llamadaData);
        if (clienteData) {
          setCurrentClientInfo(clienteData);
        }

        console.log('[useTwilioCall] ✅ Estado persistente restaurado:', persistedData);
        return llamadaData.id;
      } else {
        console.log('[useTwilioCall] ℹ️ No hay llamada disponible para recuperar');
        return null;
      }
    } catch (error) {
      console.error('[useTwilioCall] ❌ Error recuperando llamada_id:', error);
      
      // Agregar más contexto al error
      if (error.response) {
        console.error('[useTwilioCall] - Status:', error.response.status);
        console.error('[useTwilioCall] - Data:', error.response.data);
      }
      
      return null;
    }
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
    currentCallInfo, // Información de la llamada activa (se mantiene durante AFTERCALL)
    currentClientInfo, // Información del cliente activo (se mantiene durante AFTERCALL)

    // ⭐ NUEVO: Estados persistentes para AFTERCALL
    persistedCallData, // Objeto completo con llamada_id y toda la información del cliente
    llamadaId: persistedCallData?.llamada_id || null, // Acceso directo al llamada_id

    // Acciones
    makeCall,
    hangup,
    toggleMute,
    acceptIncomingCall,
    rejectIncomingCall,
    sendDigit,
    subscribeToStateChanges,

    // ⭐ NUEVO: Gestión de datos persistentes
    clearCallData, // Limpia datos cuando el agente vuelve a DISPONIBLE
    recuperarLlamadaId, // Recupera llamada_id del backend si se pierde el estado

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
