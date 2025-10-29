"""
Views para integración con Twilio.
Incluye endpoints para generar tokens de acceso, TwiML y webhooks.
"""
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from twilio.jwt.access_token import AccessToken
from twilio.jwt.access_token.grants import VoiceGrant
from twilio.request_validator import RequestValidator
from django.conf import settings
from django.utils import timezone
import logging

from apps.calls.models import Llamada
from apps.campaigns.models import Cliente, Campana
from apps.users.models import EstadoAgenteDetalle, EstadoAgenteActual, User
from common.twilio_client import twilio_client

logger = logging.getLogger(__name__)


# ============================================================================
# Token de Acceso para Twilio Client (WebRTC)
# ============================================================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_twilio_client_token(request):
    """
    Genera un token JWT para que el agente use Twilio Client (WebRTC) en el navegador.
    
    El token permite al agente:
    - Recibir llamadas entrantes directamente en el navegador
    - Realizar llamadas salientes desde el navegador
    - No requiere teléfono físico
    
    Request Body: {} (vacío, usa el usuario autenticado)
    
    Response:
    {
        "token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
        "identity": "agent_123",
        "expires_in": 3600
    }
    """
    user = request.user
    
    # Verificar configuración de Twilio
    if not twilio_client.is_configured():
        return Response({
            'error': 'Twilio no está configurado. Contacta al administrador.'
        }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    
    try:
        # Identity única del agente (usar pk que funciona con cualquier primary key)
        identity = f"agent_{user.pk}"
        
        # Crear token de acceso
        token = AccessToken(
            twilio_client.account_sid, 
            twilio_client.api_key, 
            twilio_client.api_secret, 
            identity=identity,
            ttl=3600  # 1 hora
        )
        
        # Agregar capacidad de voz (Voice Grant)
        voice_grant = VoiceGrant(
            outgoing_application_sid=twilio_client.twiml_app_sid,
            incoming_allow=True  # Permitir llamadas entrantes
        )
        token.add_grant(voice_grant)
        
        logger.info(f"Token generado para agente {user.email} (identity: {identity})")
        
        return Response({
            'token': token.to_jwt(),
            'identity': identity,
            'expires_in': 3600,
            'account_sid': twilio_client.account_sid,
            'twiml_app_sid': twilio_client.twiml_app_sid
        })
        
    except Exception as e:
        logger.error(f"Error generando token para {user.email}: {str(e)}")
        return Response({
            'error': f'Error al generar token: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================================================
# Endpoints TwiML para Llamadas
# ============================================================================

@csrf_exempt
@require_http_methods(["POST"])
def twilio_voice_request(request):
    """
    Endpoint que maneja las llamadas salientes desde Twilio Client (navegador).
    
    Cuando el agente hace una llamada desde el navegador, Twilio hace POST a este
    endpoint para obtener las instrucciones TwiML de cómo manejar la llamada.
    
    Parámetros POST enviados por Twilio Client:
    - To: Número al que se llama (enviado desde el frontend)
    - From: Identity del cliente (agent_123)
    - agentId: ID del agente (parámetro custom del frontend)
    - campaignId: ID de la campaña (parámetro custom del frontend)
    - clientId: ID del cliente (opcional, parámetro custom del frontend)
    """
    try:
        # Parámetros enviados por Twilio
        call_sid = request.POST.get('CallSid')  # ID único de Twilio
        to_number = request.POST.get('To')
        from_identity = request.POST.get('From')  # agent_123
        
        # Parámetros custom enviados desde el frontend
        agent_id = request.POST.get('agentId')
        campaign_id = request.POST.get('campaignId')
        client_id = request.POST.get('clientId')
        
        logger.info(f"Voice request: CallSid={call_sid}, From={from_identity}, To={to_number}, Agent={agent_id}, Campaign={campaign_id}")
        
        # Validar parámetros
        if not to_number or not agent_id or not campaign_id:
            logger.error("Parámetros incompletos en voice request")
            return HttpResponse('<Response><Say language="es-MX">Error: Parámetros incompletos</Say></Response>', content_type='text/xml')
        
        # Obtener agente y campaña
        try:
            agent = User.objects.get(documento_id=agent_id)
            if not agent.is_agent():
                logger.error(f"Usuario {agent_id} no es un agente")
                return HttpResponse('<Response><Say language="es-MX">Error: Usuario no es agente</Say></Response>', content_type='text/xml')
        except User.DoesNotExist:
            logger.error(f"Agente {agent_id} no encontrado")
            return HttpResponse('<Response><Say language="es-MX">Error: Agente no encontrado</Say></Response>', content_type='text/xml')
        
        try:
            from common.estados_helper import get_estado
            estado_activa = get_estado('ESTADO_CAMPANA', 'ACTIVA')
            campaign = Campana.objects.get(id=campaign_id, estado=estado_activa)
        except Campana.DoesNotExist:
            logger.error(f"Campaña {campaign_id} no encontrada o no está activa")
            return HttpResponse('<Response><Say language="es-MX">Error: Campaña no encontrada</Say></Response>', content_type='text/xml')
        
        # Obtener o crear cliente
        try:
            if client_id:
                cliente = Cliente.objects.get(cliente_id=client_id)
            else:
                # Buscar por teléfono y campaña, o crear nuevo
                cliente, created = Cliente.objects.get_or_create(
                    telefono=to_number,
                    campana=campaign,
                    defaults={
                        'nombre': 'Cliente Nuevo',
                        'otros_datos': {'origen': 'llamada_saliente'}
                    }
                )
        except Exception as e:
            logger.error(f"Error obteniendo/creando cliente: {str(e)}")
            return HttpResponse('<Response><Say language="es-MX">Error al procesar cliente</Say></Response>', content_type='text/xml')
        
        # Crear registro de llamada en la BD
        try:
            from common.estados_helper import get_estado
            estado_timbrado = get_estado('ESTADO_LLAMADA', 'TIMBRADO')
            estado_no_venta = get_estado('ESTADO_VENTA', 'NO_VENTA')
            estado_no_reportada = get_estado('ESTADO_REPORTE', 'NO_REPORTADA')
            
            # Validar que los estados existan
            if not estado_timbrado:
                logger.error("Estado TIMBRADO no encontrado en ESTADO_LLAMADA")
                return HttpResponse('<Response><Say language="es-MX">Error de configuración: Estado de llamada no encontrado</Say></Response>', content_type='text/xml')
            if not estado_no_venta:
                logger.error("Estado NO_VENTA no encontrado en ESTADO_VENTA")
                return HttpResponse('<Response><Say language="es-MX">Error de configuración: Estado de venta no encontrado</Say></Response>', content_type='text/xml')
            if not estado_no_reportada:
                logger.error("Estado NO_REPORTADA no encontrado en ESTADO_REPORTE")
                return HttpResponse('<Response><Say language="es-MX">Error de configuración: Estado de reporte no encontrado</Say></Response>', content_type='text/xml')
            
            llamada = Llamada.objects.create(
                agente=agent,
                cliente=cliente,
                twilio_call_sid=call_sid,
                telefono_origen=twilio_client.phone_number,
                telefono_destino=to_number,
                estado_llamada=estado_timbrado,
                estado_venta=estado_no_venta,
                estado_reportada=estado_no_reportada,
                fecha_hora_inicio=timezone.now()
            )
            
            # Cambiar estado del agente a EN_LLAMADA
            estado_en_llamada = get_estado('ESTADO_AGENTE', 'EN_LLAMADA')
            
            # Obtener o crear el registro de detalle para hoy
            from datetime import date
            detalle, created = EstadoAgenteDetalle.objects.get_or_create(
                agente_id=agent,
                estado_id=estado_en_llamada,
                fecha=date.today(),
                defaults={
                    'tiempo': '00:00:00',
                    'cambios': f'Llamada saliente a {to_number}'
                }
            )
            
            # Si ya existía, agregar el cambio al historial
            if not created:
                if detalle.cambios:
                    detalle.cambios += f', Llamada saliente a {to_number}'
                else:
                    detalle.cambios = f'Llamada saliente a {to_number}'
                detalle.save()
            
            # Actualizar estado actual
            EstadoAgenteActual.objects.filter(agente_id=agent).update(
                estado_id=estado_en_llamada,
                tiempo=timezone.now()
            )
            
            logger.info(f"Llamada {llamada.id} creada exitosamente con CallSid={call_sid}")
        except Exception as e:
            logger.error(f"Error creando llamada: {str(e)}", exc_info=True)
            return HttpResponse('<Response><Say language="es-MX">Error al crear registro de llamada</Say></Response>', content_type='text/xml')
        
        # Generar TwiML para realizar la llamada
        try:
            # URL para recibir callback después del Dial
            status_callback_url = request.build_absolute_uri('/api/webhooks/twilio/call-status/')
            
            twiml = twilio_client.generate_twiml_for_browser_call(
                to_number=to_number,
                caller_id=twilio_client.phone_number,
                status_callback_url=status_callback_url
            )
            
            logger.info(f"TwiML generado exitosamente para llamada {llamada.id}")
            logger.debug(f"TwiML: {twiml}")
            return HttpResponse(twiml, content_type='text/xml')
        except Exception as e:
            logger.error(f"Error generando TwiML: {str(e)}")
            return HttpResponse('<Response><Say language="es-MX">Error al generar instrucciones de llamada</Say></Response>', content_type='text/xml')
        
    except Exception as e:
        # Capturar CUALQUIER error no manejado y devolver TwiML válido
        logger.error(f"Error crítico en voice request: {str(e)}", exc_info=True)
        return HttpResponse('<Response><Say language="es-MX">Error al procesar la llamada</Say></Response>', content_type='text/xml')


@csrf_exempt
@require_http_methods(["POST"])
def twilio_incoming_call(request):
    """
    Endpoint para manejar llamadas ENTRANTES al número de Twilio.
    
    Cuando un cliente llama al número de Twilio, este endpoint:
    1. Busca un agente disponible
    2. Crea el registro de la llamada
    3. Conecta la llamada al agente (usando WebRTC o teléfono físico)
    
    Parámetros POST enviados por Twilio:
    - CallSid: ID único de la llamada
    - From: Número del que llama
    - To: Número al que llamó (tu número de Twilio)
    - CallStatus: Estado de la llamada
    """
    try:
        call_sid = request.POST.get('CallSid')
        from_number = request.POST.get('From')
        to_number = request.POST.get('To')
        
        logger.info(f"Llamada entrante: SID={call_sid}, From={from_number}, To={to_number}")
        
        # Buscar un agente disponible
        try:
            from common.estados_helper import get_estado
            estado_disp = get_estado('ESTADO_AGENTE', 'DISPONIBLE')
            estado_agente = EstadoAgenteActual.objects.filter(
                estado_id=estado_disp
            ).select_related('agente_id').first()
            
            if not estado_agente:
                logger.warning("No hay agentes disponibles para llamada entrante")
                # Buzón de voz
                twiml = twilio_client.generate_twiml_voicemail(
                    recording_url=request.build_absolute_uri('/api/webhooks/twilio/recording/')
                )
                return HttpResponse(twiml, content_type='text/xml')
            
            agente = estado_agente.agente_id
        except Exception as e:
            logger.error(f"Error buscando agente disponible: {str(e)}")
            return HttpResponse('<Response><Say language="es-MX">No hay agentes disponibles. Por favor intente más tarde</Say></Response>', content_type='text/xml')
        
        # Buscar campaña activa (necesaria para el cliente y la llamada)
        try:
            from common.estados_helper import get_estado
            estado_activa = get_estado('ESTADO_CAMPANA', 'ACTIVA')
            campaign = Campana.objects.filter(estado=estado_activa).first()
            if not campaign:
                logger.error("No hay campañas activas")
                return HttpResponse('<Response><Say language="es-MX">Error de configuración. Contacte al administrador</Say></Response>', content_type='text/xml')
        except Exception as e:
            logger.error(f"Error buscando campaña: {str(e)}")
            return HttpResponse('<Response><Say language="es-MX">Error al procesar campaña</Say></Response>', content_type='text/xml')
        
        # Obtener o crear cliente
        try:
            # Buscar o crear cliente con la campaña
            cliente, created = Cliente.objects.get_or_create(
                telefono=from_number,
                campana=campaign,
                defaults={
                    'nombre': 'Cliente Entrante',
                    'otros_datos': {'origen': 'llamada_entrante'}
                }
            )
            if created:
                logger.info(f"Cliente nuevo creado: {cliente.cliente_id} - {from_number}")
        except Exception as e:
            logger.error(f"Error creando cliente: {str(e)}")
            return HttpResponse('<Response><Say language="es-MX">Error al procesar datos del cliente</Say></Response>', content_type='text/xml')
        
        # Crear registro de llamada
        try:
            from common.estados_helper import get_estado
            estado_timbrado = get_estado('ESTADO_LLAMADA', 'TIMBRADO')
            estado_no_venta = get_estado('ESTADO_VENTA', 'NO_VENTA')
            estado_no_reportada = get_estado('ESTADO_REPORTE', 'NO_REPORTADA')
            
            llamada = Llamada.objects.create(
                agente=agente,
                cliente=cliente,
                twilio_call_sid=call_sid,
                telefono_origen=from_number,
                telefono_destino=to_number,
                estado_llamada=estado_timbrado,
                estado_venta=estado_no_venta,
                estado_reportada=estado_no_reportada,
                fecha_hora_inicio=timezone.now()
            )
            
            # Cambiar estado del agente a EN_LLAMADA
            estado_en_llamada = get_estado('ESTADO_AGENTE', 'EN_LLAMADA')
            
            # Obtener o crear el registro de detalle para hoy
            from datetime import date
            detalle, created = EstadoAgenteDetalle.objects.get_or_create(
                agente_id=agente,
                estado_id=estado_en_llamada,
                fecha=date.today(),
                defaults={
                    'tiempo': '00:00:00',
                    'cambios': f'Llamada entrante de {from_number}'
                }
            )
            
            # Si ya existía, agregar el cambio al historial
            if not created:
                if detalle.cambios:
                    detalle.cambios += f', Llamada entrante de {from_number}'
                else:
                    detalle.cambios = f'Llamada entrante de {from_number}'
                detalle.save()
            
            # Actualizar estado actual
            EstadoAgenteActual.objects.filter(agente_id=agente).update(
                estado_id=estado_en_llamada,
                tiempo=timezone.now()
            )
            
            logger.info(f"Llamada entrante {llamada.id} creada exitosamente")
        except Exception as e:
            logger.error(f"Error creando registro de llamada: {str(e)}")
            return HttpResponse('<Response><Say language="es-MX">Error al registrar la llamada</Say></Response>', content_type='text/xml')
        
        # Generar TwiML para conectar con el agente usando Twilio Client (WebRTC)
        try:
            client_identity = f"agent_{agente.id}"
            twiml = twilio_client.generate_twiml_connect_client(
                client_identity=client_identity,
                caller_id=from_number
            )
            
            logger.info(f"Llamada entrante {llamada.id} asignada a agente {agente.email}")
            return HttpResponse(twiml, content_type='text/xml')
        except Exception as e:
            logger.error(f"Error generando TwiML: {str(e)}")
            return HttpResponse('<Response><Say language="es-MX">Error al conectar la llamada</Say></Response>', content_type='text/xml')
        
    except Exception as e:
        # Capturar CUALQUIER error no manejado y devolver TwiML válido
        logger.error(f"Error crítico en llamada entrante: {str(e)}", exc_info=True)
        return HttpResponse('<Response><Say language="es-MX">Error al procesar la llamada</Say></Response>', content_type='text/xml')


# ============================================================================
# Webhooks de Estado de Llamadas
# ============================================================================

def validate_twilio_request(f):
    """
    Decorador para validar que el request viene realmente de Twilio.
    """
    def decorated_function(request, *args, **kwargs):
        # En desarrollo, skip validation
        if settings.DEBUG:
            return f(request, *args, **kwargs)
        
        validator = RequestValidator(settings.TWILIO_AUTH_TOKEN)
        
        # Obtener URL completa
        url = request.build_absolute_uri()
        
        # Obtener firma de Twilio
        signature = request.META.get('HTTP_X_TWILIO_SIGNATURE', '')
        
        # Validar
        if not validator.validate(url, request.POST, signature):
            logger.warning(f"Request no válido de Twilio desde {request.META.get('REMOTE_ADDR')}")
            return HttpResponse('Forbidden', status=403)
        
        return f(request, *args, **kwargs)
    return decorated_function


@csrf_exempt
@require_http_methods(["GET", "POST"])
@validate_twilio_request
def twilio_call_status_webhook(request, llamada_id=None):
    """
    Webhook para recibir actualizaciones de estado de llamadas desde Twilio.
    
    Twilio envía POST con:
    - CallSid: ID de la llamada
    - CallStatus: queued, ringing, in-progress, completed, busy, failed, no-answer
    - CallDuration: Duración en segundos
    - RecordingUrl: URL de la grabación (si hay)
    - RecordingSid: SID de la grabación
    
    IMPORTANTE: Este endpoint NO debe devolver TwiML, solo HTTP 200.
    Twilio no espera respuesta XML de los webhooks de estado.
    """
    try:
        # Twilio puede enviar GET o POST dependiendo de la configuración
        params = request.GET if request.method == 'GET' else request.POST
        
        call_sid = params.get('CallSid')
        call_status = params.get('CallStatus')
        call_duration = params.get('CallDuration', 0)
        recording_url = params.get('RecordingUrl', '')
        recording_sid = params.get('RecordingSid', '')
        
        logger.info(f"[WEBHOOK STATUS] SID={call_sid}, Status={call_status}, Duration={call_duration}")
        
        if not call_sid and not llamada_id:
            logger.error("[WEBHOOK STATUS] No se proporcionó CallSid ni llamada_id")
            return HttpResponse(status=200)  # Siempre devolver 200, aunque haya error
        
        try:
            # Buscar llamada por SID o ID
            if llamada_id:
                llamada = Llamada.objects.get(id=llamada_id)
            else:
                # Buscar por twilio_call_sid
                llamada = Llamada.objects.get(twilio_call_sid=call_sid)
            
            logger.info(f"[WEBHOOK STATUS] Llamada {llamada.id} encontrada - Agente: {llamada.agente.email}, Estado actual agente: {llamada.agente.estado_actual.estado_id.descripcion if hasattr(llamada.agente, 'estado_actual') else 'N/A'}")
            
            # Actualizar estado de Twilio
            llamada.twilio_status = call_status
            from common.estados_helper import get_estado
            
            # Mapear estados de Twilio a nuestros estados
            if call_status == 'ringing':
                estado_timbrado = get_estado('ESTADO_LLAMADA', 'TIMBRADO')
                llamada.estado_llamada = estado_timbrado
                logger.info(f"[WEBHOOK STATUS] Llamada {llamada.id} -> TIMBRADO (no cambia estado agente)")
            elif call_status == 'in-progress':
                estado_en_curso = get_estado('ESTADO_LLAMADA', 'EN_CURSO')
                llamada.estado_llamada = estado_en_curso
                llamada.fue_contestada = True  # ✅ MARCAMOS QUE FUE CONTESTADA
                logger.info(f"[WEBHOOK STATUS] Llamada {llamada.id} -> EN_CURSO (CONTESTADA)")
                
                # Asegurar que el agente se mantenga EN_LLAMADA (no cambiar a AFTERCALL todavía)
                estado_en_llamada = get_estado('ESTADO_AGENTE', 'EN_LLAMADA')
                try:
                    # Verificar que el agente esté EN_LLAMADA
                    estado_actual = EstadoAgenteActual.objects.filter(agente_id=llamada.agente).first()
                    if estado_actual and estado_actual.estado_id != estado_en_llamada:
                        logger.warning(f"[WEBHOOK STATUS] ⚠️ Agente {llamada.agente.email} estaba en {estado_actual.estado_id.descripcion}, corrigiendo a EN_LLAMADA")
                        EstadoAgenteActual.objects.filter(agente_id=llamada.agente).update(
                            estado_id=estado_en_llamada,
                            tiempo=timezone.now()
                        )
                    else:
                        logger.info(f"[WEBHOOK STATUS] ✓ Agente {llamada.agente.email} ya está EN_LLAMADA (correcto)")
                except Exception as e:
                    logger.error(f"[WEBHOOK STATUS] Error verificando estado del agente: {str(e)}")
            elif call_status == 'completed':
                estado_completada = get_estado('ESTADO_LLAMADA', 'COMPLETADA')
                llamada.estado_llamada = estado_completada
                if not llamada.fecha_hora_fin:
                    llamada.fecha_hora_fin = timezone.now()
                if call_duration:
                    llamada.duracion = int(call_duration)
                
                logger.info(f"[WEBHOOK STATUS] Llamada {llamada.id} -> COMPLETADA, cambiando agente a AFTERCALL")
                
                # Cambiar estado del agente a AFTERCALL (post llamada)
                try:
                    estado_aftercall = get_estado('ESTADO_AGENTE', 'AFTERCALL')
                    
                    # Obtener o crear el registro de detalle para hoy
                    from datetime import date
                    detalle, created = EstadoAgenteDetalle.objects.get_or_create(
                        agente_id=llamada.agente,
                        estado_id=estado_aftercall,
                        fecha=date.today(),
                        defaults={
                            'tiempo': '00:00:00',
                            'cambios': f'Llamada completada - Duración: {call_duration}s'
                        }
                    )
                    
                    # Si ya existía, agregar el cambio al historial
                    if not created:
                        if detalle.cambios:
                            detalle.cambios += f', Llamada completada - Duración: {call_duration}s'
                        else:
                            detalle.cambios = f'Llamada completada - Duración: {call_duration}s'
                        detalle.save()
                    
                    # Actualizar estado actual
                    EstadoAgenteActual.objects.filter(agente_id=llamada.agente).update(
                        estado_id=estado_aftercall,
                        tiempo=timezone.now()
                    )
                except Exception as e:
                    logger.error(f"Error actualizando estado del agente: {str(e)}")
                    
            elif call_status in ['busy', 'failed', 'no-answer', 'canceled']:
                estado_no_contestada = get_estado('ESTADO_LLAMADA', 'NO_CONTESTADA')
                llamada.estado_llamada = estado_no_contestada
                llamada.fecha_hora_fin = timezone.now()
                
                logger.info(f"[WEBHOOK STATUS] Llamada {llamada.id} -> NO_CONTESTADA ({call_status}), volviendo agente a DISPONIBLE")
                
                # Volver agente a DISPONIBLE
                try:
                    estado_disponible = get_estado('ESTADO_AGENTE', 'DISPONIBLE')
                    
                    # Obtener o crear el registro de detalle para hoy
                    from datetime import date
                    detalle, created = EstadoAgenteDetalle.objects.get_or_create(
                        agente_id=llamada.agente,
                        estado_id=estado_disponible,
                        fecha=date.today(),
                        defaults={
                            'tiempo': '00:00:00',
                            'cambios': f'Llamada no contestada - {call_status}'
                        }
                    )
                    
                    # Si ya existía, agregar el cambio al historial
                    if not created:
                        if detalle.cambios:
                            detalle.cambios += f', Llamada no contestada - {call_status}'
                        else:
                            detalle.cambios = f'Llamada no contestada - {call_status}'
                        detalle.save()
                    
                    # Actualizar estado actual
                    EstadoAgenteActual.objects.filter(agente_id=llamada.agente).update(
                        estado_id=estado_disponible,
                        tiempo=timezone.now()
                    )
                except Exception as e:
                    logger.error(f"Error actualizando estado del agente: {str(e)}")
            
            # Guardar URL de grabación si existe
            if recording_url:
                llamada.twilio_recording_url = recording_url
                llamada.grabacion_url = recording_url
            if recording_sid:
                llamada.twilio_recording_sid = recording_sid
            
            llamada.save()
            
            logger.info(f"Llamada {llamada.id} actualizada a estado {call_status} (Twilio: {llamada.twilio_status})")
            logger.info(f"Llamada {llamada.id} - Inicio: {llamada.fecha_hora_inicio}, Duración: {llamada.duracion}s")
            
        except Llamada.DoesNotExist:
            logger.error(f"Llamada no encontrada: SID={call_sid}, ID={llamada_id}. Puede que la llamada no se haya creado correctamente en voice-request.")
        except Exception as e:
            logger.error(f"Error procesando webhook de estado: {str(e)}", exc_info=True)
        
        # SIEMPRE devolver 200, nunca devolver error a Twilio
        return HttpResponse(status=200)
        
    except Exception as e:
        # Capturar CUALQUIER error no manejado y devolver 200
        logger.error(f"Error crítico en webhook de estado: {str(e)}", exc_info=True)
        return HttpResponse(status=200)


@csrf_exempt
@require_http_methods(["POST"])
def twilio_automated_call_handler(request):
    """
    Webhook para manejar llamadas AUTOMATICAS salientes.
    
    Cuando el cliente contesta la llamada automática, Twilio hace POST a este
    endpoint para obtener las instrucciones TwiML de cómo proceder.
    
    Este endpoint:
    1. Busca la llamada en la BD usando el CallSid
    2. Reproduce un mensaje de bienvenida al cliente
    3. Conecta al cliente con el agente asignado (usando WebRTC)
    
    Parámetros POST enviados por Twilio:
    - CallSid: ID único de la llamada
    - From: Número del que llama (tu número de Twilio)
    - To: Número al que se llamó (el cliente)
    - CallStatus: Estado de la llamada (in-progress cuando contesta)
    """
    try:
        call_sid = request.POST.get('CallSid')
        to_number = request.POST.get('To')  # Cliente
        from_number = request.POST.get('From')  # Tu número de Twilio
        
        logger.info(f"Handle-call automática: CallSid={call_sid}, To={to_number}")
        
        # Buscar la llamada en la BD usando el CallSid
        try:
            llamada = Llamada.objects.select_related('agente', 'cliente').get(twilio_call_sid=call_sid)
            agente = llamada.agente
            
            logger.info(f"Llamada encontrada: ID={llamada.id}, Agente={agente.get_full_name()}, Cliente={llamada.cliente.nombre}")
            
        except Llamada.DoesNotExist:
            logger.error(f"Llamada no encontrada con CallSid={call_sid}")
            return HttpResponse('<Response><Say language="es-MX">Error: No se encontró el registro de la llamada</Say></Response>', content_type='text/xml')
        
        try:
            # Para llamadas AUTOMATICAS:
            # El backend inició la llamada al cliente.
            # Cuando el cliente contesta, conectamos al agente usando Twilio Client (WebRTC).
            
            from twilio.twiml.voice_response import VoiceResponse, Dial
            
            response = VoiceResponse()
            
            # Mensaje de bienvenida al cliente
            response.say(
                'Hola, gracias por atender. Te comunicaremos con tu asesor.',
                language='es-MX',
                voice='Polly.Mia'
            )
            
            # Conectar al agente usando Twilio Client
            client_identity = f"agent_{agente.pk}"
            
            # NO usar 'action' aquí porque se ejecuta cuando el Dial termina,
            # no cuando la llamada principal termina.
            # El webhook de estado principal (status_callback en make_call) manejará el estado.
            dial = Dial(
                timeout=30,  # Tiempo de espera para que el agente conteste
                record='record-from-answer',  # Grabar desde que se contesta
                recording_status_callback=request.build_absolute_uri('/api/webhooks/twilio/recording/')
            )
            dial.client(client_identity)
            response.append(dial)
            
            # Si el agente no contesta en 30 segundos
            response.say(
                'Lo sentimos, el asesor no está disponible en este momento. Por favor intenta más tarde.',
                language='es-MX',
                voice='Polly.Mia'
            )
            
            twiml_str = str(response)
            logger.info(f"TwiML generado para llamada automática {call_sid}")
            logger.debug(f"TwiML: {twiml_str}")
            
            return HttpResponse(twiml_str, content_type='text/xml')
            
        except Exception as e:
            logger.error(f"Error en handle-call: {str(e)}", exc_info=True)
            return HttpResponse('<Response><Say language="es-MX">Error al procesar la llamada</Say></Response>', content_type='text/xml')
        
    except Exception as e:
        logger.error(f"Error crítico en handle-call: {str(e)}", exc_info=True)
        return HttpResponse('<Response><Say language="es-MX">Error al conectar la llamada</Say></Response>', content_type='text/xml')


@csrf_exempt
@require_http_methods(["POST", "GET"])
def twilio_agent_wait_conference(request):
    """
    Endpoint para que el agente espere en silencio en la conferencia.
    El agente entra esperando a que el cliente se una.
    Cuando el cliente entra, automáticamente empiezan a hablar.
    """
    try:
        conference_name = request.GET.get('conference')
        
        logger.info(f"Agente uniéndose a conferencia de espera: {conference_name}")
        
        from twilio.twiml.voice_response import VoiceResponse, Dial
        
        response = VoiceResponse()
        
        # Unir al agente a la conferencia
        dial = Dial()
        dial.conference(
            conference_name,
            start_conference_on_enter=False,  # NO inicia hasta que llegue el cliente
            end_conference_on_exit=False,     # NO termina si el agente sale
            beep=False,                       # Sin beep
            wait_url='',                      # Sin música, silencio total
            muted=False                       # El agente puede hablar cuando cliente entre
        )
        response.append(dial)
        
        logger.info(f"Agente esperando en conferencia: {conference_name}")
        
        return HttpResponse(str(response), content_type='text/xml')
        
    except Exception as e:
        logger.error(f"Error preparando agente en conferencia: {str(e)}", exc_info=True)
        return HttpResponse('<Response><Say language="es-MX">Error</Say></Response>', content_type='text/xml')


@csrf_exempt
@require_http_methods(["POST"])
def twilio_join_conference(request):
    """
    Endpoint para unir al agente a una conferencia existente.
    Este endpoint es llamado automáticamente cuando el agente recibe la llamada de conferencia.
    """
    try:
        conference_name = request.GET.get('conference')
        
        logger.info(f"Uniendo agente a conferencia: {conference_name}")
        
        from twilio.twiml.voice_response import VoiceResponse, Dial
        
        response = VoiceResponse()
        
        # Unir al agente a la conferencia SIN música de espera
        dial = Dial()
        dial.conference(
            conference_name,
            start_conference_on_enter=True,
            end_conference_on_exit=True,
            beep=False
        )
        response.append(dial)
        
        return HttpResponse(str(response), content_type='text/xml')
        
    except Exception as e:
        logger.error(f"Error uniendo agente a conferencia: {str(e)}", exc_info=True)
        return HttpResponse('<Response><Say language="es-MX">Error al conectar</Say></Response>', content_type='text/xml')


@csrf_exempt
@require_http_methods(["POST"])
def twilio_recording_webhook(request):
    """
    Webhook para recibir notificaciones de grabaciones.
    
    IMPORTANTE: Este endpoint NO debe devolver TwiML, solo HTTP 200.
    """
    try:
        recording_sid = request.POST.get('RecordingSid')
        recording_url = request.POST.get('RecordingUrl')
        call_sid = request.POST.get('CallSid')
        
        logger.info(f"Grabación recibida: SID={recording_sid}, CallSID={call_sid}")
        
        if not call_sid:
            logger.error("No se proporcionó CallSid en webhook de grabación")
            return HttpResponse(status=200)
        
        try:
            llamada = Llamada.objects.get(llamada_sid=call_sid)
            llamada.twilio_recording_sid = recording_sid
            llamada.twilio_recording_url = recording_url
            llamada.grabacion_url = recording_url
            llamada.save()
            
            logger.info(f"Grabación guardada para llamada {llamada.id}")
        except Llamada.DoesNotExist:
            logger.error(f"Llamada no encontrada para grabación: CallSID={call_sid}")
        except Exception as e:
            logger.error(f"Error guardando grabación: {str(e)}", exc_info=True)
        
        # SIEMPRE devolver 200
        return HttpResponse(status=200)
        
    except Exception as e:
        # Capturar CUALQUIER error no manejado y devolver 200
        logger.error(f"Error crítico en webhook de grabación: {str(e)}", exc_info=True)
        return HttpResponse(status=200)
