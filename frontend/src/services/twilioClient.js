/**
 * Servicio de Twilio Client para llamadas WebRTC
 * Encapsula toda la lógica de Twilio Device
 */
import { Device } from '@twilio/voice-sdk';
import apiClient from '@/core/api/apiClient';

class TwilioClientService {
  constructor() {
    this.device = null;
    this.activeCall = null;
    this.token = null;
    this.isReady = false;
    this.processedCallSids = new Set(); // Para deduplicar llamadas
    
    // Callbacks para eventos
    this.onReadyCallback = null;
    this.onErrorCallback = null;
    this.onIncomingCallback = null;
    this.onConnectCallback = null;
    this.onDisconnectCallback = null;
    this.onRingingCallback = null;
  }

  /**
   * Inicializa el Device de Twilio con un token JWT
   */
  async initialize() {
    try {
      console.log('[Twilio] Inicializando Device...');
      
      // Obtener token del backend
      const response = await apiClient.post('integrations/twilio-client-token/');
      this.token = response.data.token;
      
      console.log('[Twilio] Token obtenido correctamente');

      // Crear Device con el token
      this.device = new Device(this.token, {
        logLevel: 0, // 🔥 0=trace (máximo detalle), 1=debug, 2=info, 3=warn, 4=error
        codecPreferences: ['opus', 'pcmu'], // Codecs de audio
        // edge: 'ashburn', // 🔥 Comentado para que Twilio elija automáticamente
      });

      // Registrar event listeners
      this._registerEventListeners();

      // Registrar el device
      await this.device.register();
      
      this.isReady = true;
      console.log('[Twilio] Device registrado y listo');
      
      return true;
    } catch (error) {
      console.error('[Twilio] Error inicializando Device:', error);
      if (this.onErrorCallback) {
        this.onErrorCallback(error);
      }
      throw error;
    }
  }

  /**
   * Registra los event listeners del Device
   */
  _registerEventListeners() {
    if (!this.device) return;

    // Device está listo
    this.device.on('registered', () => {
      console.log('[Twilio] Device registrado correctamente');
      if (this.onReadyCallback) {
        this.onReadyCallback();
      }
    });

    // Error en el Device
    this.device.on('error', (error) => {
      console.error('[Twilio] Error en Device:', error);
      if (this.onErrorCallback) {
        this.onErrorCallback(error);
      }
    });

    // Llamada entrante
    this.device.on('incoming', (call) => {
      const callSid = call.parameters.CallSid;
      console.log('[Twilio] Llamada entrante:', call.parameters);
      
      // Deduplicar: Ignorar si ya procesamos esta llamada
      if (this.processedCallSids.has(callSid)) {
        console.log('[Twilio] ⚠️ Llamada duplicada detectada, ignorando:', callSid);
        return;
      }
      
      // Marcar como procesada
      this.processedCallSids.add(callSid);
      console.log('[Twilio] ✓ Primera vez que recibimos esta llamada:', callSid);
      
      this.activeCall = call;
      
      // Registrar listeners de la llamada
      this._registerCallListeners(call);
      
      if (this.onIncomingCallback) {
        this.onIncomingCallback(call);
      }
    });

    // Token a punto de expirar (renovar)
    this.device.on('tokenWillExpire', async () => {
      console.log('[Twilio] Token por expirar, renovando...');
      try {
        const response = await apiClient.post('/integrations/twilio-client-token/');
        this.device.updateToken(response.data.token);
        console.log('[Twilio] Token renovado correctamente');
      } catch (error) {
        console.error('[Twilio] Error renovando token:', error);
      }
    });

    // Device desregistrado
    this.device.on('unregistered', () => {
      console.log('[Twilio] Device desregistrado');
      this.isReady = false;
    });
  }

  /**
   * Registra los event listeners de una llamada específica
   */
  _registerCallListeners(call) {
    // Llamada sonando (ringing)
    call.on('ringing', () => {
      console.log('[Twilio] Llamada sonando...');
      if (this.onRingingCallback) {
        this.onRingingCallback(call);
      }
    });

    // Llamada aceptada/conectada
    call.on('accept', () => {
      console.log('[Twilio] Llamada conectada');
      if (this.onConnectCallback) {
        this.onConnectCallback(call);
      }
    });

    // Llamada desconectada
    call.on('disconnect', () => {
      console.log('[Twilio] Llamada desconectada');
      
      // Limpiar del Set de llamadas procesadas
      const callSid = call.parameters?.CallSid;
      if (callSid) {
        this.processedCallSids.delete(callSid);
        console.log('[Twilio] ✓ CallSid removido del Set:', callSid);
      }
      
      this.activeCall = null;
      if (this.onDisconnectCallback) {
        this.onDisconnectCallback(call);
      }
    });

    // Llamada cancelada
    call.on('cancel', () => {
      console.log('[Twilio] Llamada cancelada');
      
      // Limpiar del Set de llamadas procesadas
      const callSid = call.parameters?.CallSid;
      if (callSid) {
        this.processedCallSids.delete(callSid);
        console.log('[Twilio] ✓ CallSid removido del Set (cancelado):', callSid);
      }
      
      this.activeCall = null;
      if (this.onDisconnectCallback) {
        this.onDisconnectCallback(call);
      }
    });

    // Llamada rechazada
    call.on('reject', () => {
      console.log('[Twilio] Llamada rechazada');
      
      // Limpiar del Set de llamadas procesadas
      const callSid = call.parameters?.CallSid;
      if (callSid) {
        this.processedCallSids.delete(callSid);
        console.log('[Twilio] ✓ CallSid removido del Set (rechazado):', callSid);
      }
      
      this.activeCall = null;
      if (this.onDisconnectCallback) {
        this.onDisconnectCallback(call);
      }
    });

    // Error en la llamada
    call.on('error', (error) => {
      console.error('[Twilio] Error en llamada:', error);
      this.activeCall = null;
      if (this.onErrorCallback) {
        this.onErrorCallback(error);
      }
    });
  }

  /**
   * Realiza una llamada saliente
   * @param {string} phoneNumber - Número en formato E.164 (+573001234567)
   * @param {object} params - Parámetros adicionales (agentId, campaignId, clientId)
   */
  async makeCall(phoneNumber, params = {}) {
    if (!this.isReady) {
      throw new Error('Device no está listo. Llama a initialize() primero.');
    }

    try {
      const callParams = {
        To: phoneNumber,
        ...params // agentId, campaignId, clientId
      };

      console.log('[Twilio] Iniciando llamada a:', phoneNumber, callParams);
      
      const call = await this.device.connect({
        params: callParams
      });

      this.activeCall = call;
      this._registerCallListeners(call);
      
      return call;
    } catch (error) {
      console.error('[Twilio] Error al realizar llamada:', error);
      throw error;
    }
  }

  /**
   * Acepta una llamada entrante
   */
  acceptIncomingCall() {
    if (this.activeCall) {
      console.log('[Twilio] Aceptando llamada entrante');
      this.activeCall.accept();
    }
  }

  /**
   * Rechaza una llamada entrante
   */
  rejectIncomingCall() {
    if (this.activeCall) {
      console.log('[Twilio] Rechazando llamada entrante');
      this.activeCall.reject();
      this.activeCall = null;
    }
  }

  /**
   * Cuelga la llamada activa
   */
  hangup() {
    if (this.activeCall) {
      console.log('[Twilio] Colgando llamada');
      this.activeCall.disconnect();
      this.activeCall = null;
    }
  }

  /**
   * Silencia/desilencia el micrófono
   * @returns {boolean} Estado actual de mute (true = silenciado)
   */
  toggleMute() {
    if (this.activeCall) {
      const isMuted = this.activeCall.isMuted();
      this.activeCall.mute(!isMuted);
      console.log('[Twilio] Mute:', !isMuted);
      return !isMuted;
    }
    return false;
  }

  /**
   * Obtiene el estado actual de mute
   * @returns {boolean} true si está silenciado
   */
  isMuted() {
    if (this.activeCall) {
      return this.activeCall.isMuted();
    }
    return false;
  }

  /**
   * Envía dígitos DTMF durante la llamada
   * @param {string} digits - Dígitos a enviar (0-9, *, #)
   */
  sendDigits(digits) {
    if (this.activeCall) {
      console.log('[Twilio] Enviando dígitos:', digits);
      this.activeCall.sendDigits(digits);
    }
  }

  /**
   * Desconecta y limpia el Device
   */
  destroy() {
    if (this.device) {
      console.log('[Twilio] Destruyendo Device');
      this.device.destroy();
      this.device = null;
      this.activeCall = null;
      this.isReady = false;
    }
  }

  /**
   * Obtiene información de la llamada activa
   */
  getCallInfo() {
    if (this.activeCall) {
      return {
        status: this.activeCall.status(),
        direction: this.activeCall.direction,
        parameters: this.activeCall.parameters,
        isMuted: this.activeCall.isMuted(),
      };
    }
    return null;
  }

  // Setters para callbacks
  onReady(callback) {
    this.onReadyCallback = callback;
  }

  onError(callback) {
    this.onErrorCallback = callback;
  }

  onIncoming(callback) {
    this.onIncomingCallback = callback;
  }

  onConnect(callback) {
    this.onConnectCallback = callback;
  }

  onDisconnect(callback) {
    this.onDisconnectCallback = callback;
  }

  onRinging(callback) {
    this.onRingingCallback = callback;
  }
}

// Singleton
const twilioClient = new TwilioClientService();
export default twilioClient;
