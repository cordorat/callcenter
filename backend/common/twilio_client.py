"""
Cliente Twilio compartido para toda la aplicación.
Centraliza la configuración y provee métodos helper para llamadas VoIP.
"""
from twilio.rest import Client
from twilio.twiml.voice_response import VoiceResponse, Dial
from django.conf import settings
from typing import Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)


class TwilioClient:
    """
    Wrapper del cliente de Twilio con métodos específicos para el call center.
    Soporta llamadas tradicionales y WebRTC (Twilio Client).
    """
    
    def __init__(self):
        """Inicializa el cliente con las credenciales del settings."""
        self.account_sid = settings.TWILIO_ACCOUNT_SID
        self.auth_token = settings.TWILIO_AUTH_TOKEN
        self.phone_number = settings.TWILIO_PHONE_NUMBER
        self.api_key = settings.TWILIO_API_KEY
        self.api_secret = settings.TWILIO_API_SECRET
        self.twiml_app_sid = settings.TWILIO_TWIML_APP_SID
        
        if not self.account_sid or not self.auth_token:
            logger.warning("Twilio no está configurado. Verifica las variables de entorno.")
            self.client = None
        else:
            self.client = Client(self.account_sid, self.auth_token)
    
    def is_configured(self) -> bool:
        """Verifica si Twilio está correctamente configurado."""
        return self.client is not None
    
    def make_call(
        self, 
        to: str, 
        from_: Optional[str] = None,
        url: Optional[str] = None,
        status_callback: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Realiza una llamada saliente tradicional (teléfono físico).
        
        Args:
            to: Número de teléfono destino en formato E.164 (+573001234567)
            from_: Número de origen (usa el configurado si no se especifica)
            url: URL del TwiML que maneja la llamada
            status_callback: URL para callbacks de estado
            **kwargs: Parámetros adicionales de Twilio
        
        Returns:
            Dict con información de la llamada creada
        
        Raises:
            TwilioException: Si hay error en la llamada
        """
        if not self.is_configured():
            raise ValueError("Twilio no está configurado")
        
        from_ = from_ or self.phone_number
        
        try:
            call = self.client.calls.create(
                to=to,
                from_=from_,
                url=url,
                status_callback=status_callback,
                status_callback_event=['initiated', 'ringing', 'answered', 'completed'],
                status_callback_method='POST',
                **kwargs
            )
            
            logger.info(f"✅ Llamada creada: {call.sid}")
            
            return {
                'sid': call.sid,
                'status': call.status,
                'to': call.to,
                'from': from_,  # Usar el parámetro from_ directamente
                'direction': call.direction,
                'date_created': call.date_created,
            }
        except Exception as e:
            logger.error(f"Error al crear llamada: {str(e)}")
            raise
            raise
    
    def get_call_details(self, call_sid: str) -> Dict[str, Any]:
        """
        Obtiene detalles de una llamada específica.
        
        Args:
            call_sid: SID de la llamada
        
        Returns:
            Dict con detalles de la llamada
        """
        if not self.is_configured():
            raise ValueError("Twilio no está configurado")
        
        try:
            call = self.client.calls(call_sid).fetch()
            
            return {
                'sid': call.sid,
                'status': call.status,
                'duration': call.duration,
                'price': call.price,
                'price_unit': call.price_unit,
                'direction': call.direction,
                'answered_by': call.answered_by,
                'start_time': call.start_time,
                'end_time': call.end_time,
                'parent_call_sid': call.parent_call_sid,  # 🔥 CRÍTICO: Para detectar child calls
            }
        except Exception as e:
            logger.error(f"Error al obtener detalles de llamada {call_sid}: {str(e)}")
            raise
    
    def update_call(self, call_sid: str, status: str, **kwargs) -> Dict[str, Any]:
        """
        Actualiza el estado de una llamada (ej: colgar).
        
        Args:
            call_sid: SID de la llamada
            status: Nuevo estado ('completed' para colgar)
            **kwargs: Parámetros adicionales
        
        Returns:
            Dict con información actualizada
        """
        if not self.is_configured():
            raise ValueError("Twilio no está configurado")
        
        try:
            call = self.client.calls(call_sid).update(
                status=status,
                **kwargs
            )
            
            return {
                'sid': call.sid,
                'status': call.status,
            }
        except Exception as e:
            logger.error(f"Error al actualizar llamada {call_sid}: {str(e)}")
            raise
    
    def hangup_call(self, call_sid: str) -> Dict[str, Any]:
        """
        Cuelga una llamada activa.
        
        Args:
            call_sid: SID de la llamada
        
        Returns:
            Dict con confirmación
        """
        return self.update_call(call_sid, status='completed')
    
    def generate_twiml_for_browser_call(
        self, 
        to_number: str,
        caller_id: Optional[str] = None,
        status_callback_url: Optional[str] = None
    ) -> str:
        """
        Genera TwiML para realizar una llamada desde el navegador (Twilio Client).
        
        Args:
            to_number: Número al que se llama
            caller_id: Caller ID que se mostrará (opcional)
            status_callback_url: URL para recibir actualizaciones de estado (opcional)
        
        Returns:
            String con XML de TwiML
        """
        response = VoiceResponse()
        
        # Mensaje inicial
        response.say(
            'Conectando tu llamada, por favor espera.',
            voice='Google.es-ES-Standard-A',
            language='es-ES'
        )
        
        # Realizar la llamada
        dial = Dial(
            caller_id=caller_id or self.phone_number,
            timeout=30,
            action=status_callback_url,  # URL a llamar después del dial
            method='POST'
        )
        dial.number(to_number)
        response.append(dial)
        
        # Mensaje si la llamada no se conecta
        response.say(
            'No fue posible conectar la llamada. Por favor intenta de nuevo.',
            voice='Google.es-ES-Standard-A',
            language='es-ES'
        )
        
        return str(response)
    
    def generate_twiml_connect_agent(
        self, 
        agent_phone: str,
        caller_id: Optional[str] = None
    ) -> str:
        """
        Genera TwiML para conectar una llamada a un agente (teléfono físico).
        
        Args:
            agent_phone: Teléfono del agente en formato E.164
            caller_id: Número que se mostrará al agente (opcional)
        
        Returns:
            String con XML de TwiML
        """
        response = VoiceResponse()
        response.say(
            'Conectando con un agente, por favor espera.',
            voice='Google.es-ES-Standard-A',
            language='es-ES'
        )
        
        dial = Dial(
            caller_id=caller_id or self.phone_number,
            timeout=30,
            record='record-from-answer-dual'
        )
        dial.number(agent_phone)
        response.append(dial)
        
        return str(response)
    
    def generate_twiml_connect_client(
        self, 
        client_identity: str,
        caller_id: Optional[str] = None
    ) -> str:
        """
        Genera TwiML para conectar una llamada a un agente usando Twilio Client (WebRTC).
        
        Args:
            client_identity: Identity del cliente Twilio (ej: 'agent_123')
            caller_id: Caller ID que se mostrará (opcional)
        
        Returns:
            String con XML de TwiML
        """
        response = VoiceResponse()
        response.say(
            'Conectando con un agente, por favor espera.',
            voice='Google.es-ES-Standard-A',
            language='es-ES'
        )
        
        dial = Dial(
            caller_id=caller_id or self.phone_number,
            timeout=30,
            record='record-from-answer-dual'
        )
        # En lugar de dial.number(), usamos dial.client() para WebRTC
        dial.client(client_identity)
        response.append(dial)
        
        return str(response)
    
    def generate_twiml_voicemail(self, recording_url: str) -> str:
        """
        Genera TwiML para buzón de voz.
        
        Args:
            recording_url: URL donde se guardará la grabación
        
        Returns:
            String con XML de TwiML
        """
        response = VoiceResponse()
        response.say(
            'Lo sentimos, todos nuestros agentes están ocupados. '
            'Por favor deja tu mensaje después del tono.',
            voice='Google.es-ES-Standard-A',
            language='es-ES'
        )
        response.record(
            max_length=120,
            recording_status_callback=recording_url,
            recording_status_callback_method='POST',
            play_beep=True
        )
        response.say('Gracias por tu mensaje. Adiós.', voice='Google.es-ES-Standard-A', language='es-ES')
        
        return str(response)


# Instancia única compartida
twilio_client = TwilioClient()
