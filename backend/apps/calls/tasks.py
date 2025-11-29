"""
Tareas asíncronas de Celery para el módulo de llamadas.
"""
from celery import shared_task
from django.conf import settings
import logging
import requests
import time
from .models import Llamada

logger = logging.getLogger(__name__)


@shared_task(bind=True, name='apps.calls.tasks.generar_transcripcion')
def generar_transcripcion(self, llamada_id: int):
    """
    Genera transcripción de una llamada usando AssemblyAI.
    
    Se ejecuta automáticamente después de que se guarda la grabación en Twilio.
    
    Args:
        llamada_id: ID de la llamada a transcribir
    
    Returns:
        dict: Resultado de la operación con success, mensaje y datos
    
    Workflow:
        1. Valida que la llamada tenga URL de grabación
        2. Descarga el audio de Twilio (autenticado)
        3. Sube el audio a AssemblyAI
        4. Espera a que AssemblyAI procese la transcripción
        5. Guarda el resultado en la BD
    """
    try:
        # Obtener la llamada
        llamada = Llamada.objects.get(id=llamada_id)
        
        # Validar que hay URL de grabación
        if not llamada.twilio_recording_url:
            logger.warning(f"[TRANSCRIPCIÓN] Llamada {llamada_id} no tiene URL de grabación")
            return {
                'success': False,
                'error': 'No hay grabación disponible',
                'llamada_id': llamada_id
            }
        
        # Validar que no está ya transcrita (evitar reprocesar)
        if llamada.transcipcion:
            logger.info(f"[TRANSCRIPCIÓN] Llamada {llamada_id} ya tiene transcripción")
            return {
                'success': True,
                'message': 'Ya existe transcripción',
                'llamada_id': llamada_id
            }
        
        logger.info(f"[TRANSCRIPCIÓN] Iniciando transcripción para llamada {llamada_id}")
        
        # Validar API Key
        assemblyai_api_key = getattr(settings, 'ASSEMBLYAI_API_KEY', None)
        if not assemblyai_api_key:
            logger.error("[TRANSCRIPCIÓN] ASSEMBLYAI_API_KEY no configurada en settings")
            return {
                'success': False,
                'error': 'API key de AssemblyAI no configurada',
                'llamada_id': llamada_id
            }
        
        # Headers para AssemblyAI
        headers = {
            'authorization': assemblyai_api_key,
            'content-type': 'application/json'
        }
        
        # PASO 1: Descargar audio de Twilio
        logger.info(f"[TRANSCRIPCIÓN] Descargando audio de Twilio para llamada {llamada_id}")
        
        # Twilio requiere agregar .mp3 a la URL
        recording_url = f"{llamada.twilio_recording_url}.mp3"
        
        # Descargar con autenticación de Twilio
        audio_response = requests.get(
            recording_url,
            auth=(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN),
            timeout=60
        )
        
        if audio_response.status_code != 200:
            raise Exception(f"Error descargando audio de Twilio: {audio_response.status_code}")
        
        audio_data = audio_response.content
        logger.info(f"[TRANSCRIPCIÓN] Audio descargado: {len(audio_data)} bytes")
        
        # PASO 2: Subir audio a AssemblyAI
        logger.info(f"[TRANSCRIPCIÓN] Subiendo audio a AssemblyAI")
        
        upload_response = requests.post(
            'https://api.assemblyai.com/v2/upload',
            headers=headers,
            data=audio_data,
            timeout=120
        )
        
        if upload_response.status_code != 200:
            raise Exception(f"Error subiendo audio a AssemblyAI: {upload_response.text}")
        
        upload_url = upload_response.json().get('upload_url')
        logger.info(f"[TRANSCRIPCIÓN] Audio subido exitosamente: {upload_url}")
        
        # PASO 3: Iniciar transcripción
        logger.info(f"[TRANSCRIPCIÓN] Iniciando proceso de transcripción")
        
        transcript_request = {
            'audio_url': upload_url,
            'language_code': 'es',  # Español
            'speaker_labels': False,  # Desactivado - solo texto plano
            'punctuate': True,       # Agregar puntuación
            'format_text': True,     # Formatear texto correctamente
        }
        
        transcript_response = requests.post(
            'https://api.assemblyai.com/v2/transcript',
            headers=headers,
            json=transcript_request,
            timeout=30
        )
        
        if transcript_response.status_code != 200:
            raise Exception(f"Error creando transcripción: {transcript_response.text}")
        
        transcript_id = transcript_response.json().get('id')
        logger.info(f"[TRANSCRIPCIÓN] Transcripción iniciada con ID: {transcript_id}")
        
        # PASO 4: Esperar a que AssemblyAI procese (polling)
        max_attempts = 60  # Máximo 5 minutos (5s x 60 = 300s)
        attempt = 0
        
        while attempt < max_attempts:
            attempt += 1
            time.sleep(5)  # Esperar 5 segundos entre intentos
            
            # Consultar estado
            status_response = requests.get(
                f'https://api.assemblyai.com/v2/transcript/{transcript_id}',
                headers=headers,
                timeout=10
            )
            
            if status_response.status_code != 200:
                raise Exception(f"Error consultando estado: {status_response.text}")
            
            result = status_response.json()
            status = result.get('status')
            
            logger.info(f"[TRANSCRIPCIÓN] Estado de transcripción: {status} (intento {attempt}/{max_attempts})")
            
            if status == 'completed':
                # Transcripción exitosa - Solo texto plano
                transcription_text = result.get('text', '')
                
                # Guardar en BD
                llamada.transcipcion = transcription_text
                llamada.save(update_fields=['transcipcion'])
                
                logger.info(
                    f"[TRANSCRIPCIÓN] ✅ Transcripción guardada para llamada {llamada_id} "
                    f"({len(transcription_text)} caracteres)"
                )
                
                return {
                    'success': True,
                    'llamada_id': llamada_id,
                    'transcript_id': transcript_id,
                    'transcription_length': len(transcription_text)
                }
            
            elif status == 'error':
                # Error en la transcripción
                error_msg = result.get('error', 'Error desconocido')
                raise Exception(f"AssemblyAI reportó error: {error_msg}")
            
            # Si no está completo ni en error, continuar esperando
            # Estados posibles: 'queued', 'processing'
        
        # Si llegamos aquí, se agotó el tiempo de espera
        raise Exception(f"Timeout esperando transcripción después de {max_attempts} intentos")
        
    except Llamada.DoesNotExist:
        logger.error(f"[TRANSCRIPCIÓN] Llamada {llamada_id} no encontrada")
        return {
            'success': False,
            'error': 'Llamada no encontrada',
            'llamada_id': llamada_id
        }
    
    except Exception as e:
        error_msg = str(e)
        logger.error(f"[TRANSCRIPCIÓN] Error procesando llamada {llamada_id}: {error_msg}")
        
        # Reintentar hasta 3 veces con backoff exponencial
        if self.request.retries < 3:
            countdown = 60 * (2 ** self.request.retries)  # 60s, 120s, 240s
            logger.info(f"[TRANSCRIPCIÓN] Reintentando en {countdown}s (intento {self.request.retries + 1}/3)")
            raise self.retry(exc=e, countdown=countdown)
        
        return {
            'success': False,
            'error': error_msg,
            'llamada_id': llamada_id
        }
