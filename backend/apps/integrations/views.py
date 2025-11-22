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
        
        # Validar parámetros
        if not to_number or not agent_id or not campaign_id:
            logger.error("Parámetros incompletos en voice request")
            return HttpResponse('<Response><Say language="es-MX">Error: Parámetros incompletos</Say></Response>', content_type='text/xml')
        
        # Obtener agente y campaña
        try:
            # Buscar agente por ID (pk), no por documento_id
            agent = User.objects.get(pk=agent_id)
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
                # Buscar por cliente_id y campaña
                cliente = Cliente.objects.get(cliente_id=client_id, campana=campaign)
            else:
                # Si no hay client_id, crear uno nuevo con teléfono
                cliente, created = Cliente.objects.get_or_create(
                    telefono=to_number,
                    campana=campaign,
                    defaults={
                        'nombre': 'Cliente Nuevo',
                        'otros_datos': {'origen': 'llamada_saliente'}
                    }
                )
        except Cliente.DoesNotExist:
            logger.error(f"Cliente {client_id} no encontrado en campaña {campaign_id}")
            return HttpResponse('<Response><Say language="es-MX">Error: Cliente no encontrado</Say></Response>', content_type='text/xml')
        except Cliente.MultipleObjectsReturned:
            logger.error(f"Múltiples clientes encontrados con teléfono {to_number} en campaña {campaign_id}")
            # En caso de duplicados, tomar el primero
            cliente = Cliente.objects.filter(telefono=to_number, campana=campaign).first()
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
            
            logger.info(f"Llamada {llamada.id} creada con CallSid={call_sid}")
            
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
        except Exception as e:
            logger.error(f"Error creando llamada: {str(e)}", exc_info=True)
            return HttpResponse('<Response><Say language="es-MX">Error al crear registro de llamada</Say></Response>', content_type='text/xml')
        
        # Generar TwiML para realizar la llamada
        try:
            # URLs para callbacks
            status_callback_url = request.build_absolute_uri('/api/webhooks/twilio/call-status/')
            recording_callback_url = request.build_absolute_uri('/api/webhooks/twilio/recording/')
            
            twiml = twilio_client.generate_twiml_for_browser_call(
                to_number=to_number,
                caller_id=twilio_client.phone_number,
                status_callback_url=status_callback_url,
                recording_callback_url=recording_callback_url
            )
            
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
    - CallSid: ID de la llamada (puede ser parent o child)
    - ParentCallSid: ID del parent call (si este es un child call)
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
        parent_call_sid = params.get('ParentCallSid')  # 🆕 Detectar si es child call
        call_status = params.get('CallStatus')
        call_duration = params.get('CallDuration', 0)
        recording_url = params.get('RecordingUrl', '')
        recording_sid = params.get('RecordingSid', '')
        
        # Log solo para estados importantes
        if call_status not in ['ringing', 'in-progress']:
            logger.info(f"[WEBHOOK] {call_status}: CallSid={call_sid}, Duration={call_duration}s")
        
        if not call_sid and not llamada_id:
            logger.error("[WEBHOOK STATUS] No se proporcionó CallSid ni llamada_id")
            return HttpResponse(status=200)  # Siempre devolver 200, aunque haya error
        
        try:
            # 🔍 Buscar llamada por SID o ID
            if llamada_id:
                llamada = Llamada.objects.get(id=llamada_id)
            elif parent_call_sid:
                llamada = Llamada.objects.get(twilio_call_sid=parent_call_sid)
                if not llamada.twilio_child_call_sid:
                    llamada.twilio_child_call_sid = call_sid
                    llamada.save(update_fields=['twilio_child_call_sid'])
            else:
                from django.db.models import Q
                llamada = Llamada.objects.filter(
                    Q(twilio_call_sid=call_sid) | Q(twilio_child_call_sid=call_sid)
                ).first()
                if not llamada:
                    raise Llamada.DoesNotExist
            


            
            # Actualizar estado de Twilio
            llamada.twilio_status = call_status
            from common.estados_helper import get_estado
            
            # 🔍 Detectar si la llamada fue contestada usando DialBridged
            dial_bridged = params.get('DialBridged', '').lower() == 'true'
            dial_call_duration = params.get('DialCallDuration', '0')
            
            # Mapear estados de Twilio a nuestros estados
            if call_status == 'ringing':
                estado_timbrado = get_estado('ESTADO_LLAMADA', 'TIMBRADO')
                llamada.estado_llamada = estado_timbrado
            elif call_status in ['in-progress', 'answered']:
                estado_en_curso = get_estado('ESTADO_LLAMADA', 'EN_CURSO')
                llamada.estado_llamada = estado_en_curso
                
                # 🔍 DETECTAR TIPO DE LLAMADA:
                # - Llamada MANUAL (desde navegador): NO tiene child CallSid
                # - Llamada AUTOMÁTICA (desde backend): SÍ tiene child CallSid
                is_automatic_call = bool(llamada.twilio_child_call_sid)
                
                if call_status == 'answered':
                    if not llamada.fue_contestada:
                        llamada.fue_contestada = True
                        logger.info(f"[WEBHOOK] Llamada {llamada.id} contestada")
                elif call_status == 'in-progress':
                    if not is_automatic_call and not llamada.fue_contestada:
                        llamada.fue_contestada = True
                        logger.info(f"[WEBHOOK] Llamada manual {llamada.id} contestada")
                
                # Asegurar que el agente se mantenga EN_LLAMADA
                estado_en_llamada = get_estado('ESTADO_AGENTE', 'EN_LLAMADA')
                try:
                    estado_actual = EstadoAgenteActual.objects.filter(agente_id=llamada.agente).first()
                    if estado_actual and estado_actual.estado_id != estado_en_llamada:
                        EstadoAgenteActual.objects.filter(agente_id=llamada.agente).update(
                            estado_id=estado_en_llamada,
                            tiempo=timezone.now()
                        )
                except Exception as e:
                    logger.error(f"[WEBHOOK] Error estado agente: {str(e)}")
            elif call_status == 'completed':
                if dial_bridged and not llamada.fue_contestada:
                    llamada.fue_contestada = True
                    logger.info(f"[WEBHOOK] Llamada {llamada.id} completada y contestada")
                elif not llamada.fue_contestada:
                    logger.info(f"[WEBHOOK] Llamada {llamada.id} completada sin contestar")
                
                estado_completada = get_estado('ESTADO_LLAMADA', 'COMPLETADA')
                llamada.estado_llamada = estado_completada
                if not llamada.fecha_hora_fin:
                    llamada.fecha_hora_fin = timezone.now()
                if call_duration:
                    llamada.duracion = int(call_duration)
                
                if llamada.fue_contestada:
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
                else:
                    # Llamada NO contestada - volver agente a DISPONIBLE
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
                                'cambios': f'Llamada completada sin contestar'
                            }
                        )
                        
                        # Si ya existía, agregar el cambio al historial
                        if not created:
                            if detalle.cambios:
                                detalle.cambios += f', Llamada completada sin contestar'
                            else:
                                detalle.cambios = f'Llamada completada sin contestar'
                            detalle.save()
                        
                        # Actualizar estado actual
                        EstadoAgenteActual.objects.filter(agente_id=llamada.agente).update(
                            estado_id=estado_disponible,
                            tiempo=timezone.now()
                        )
                    except Exception as e:
                        logger.error(f"Error actualizando estado del agente: {str(e)}")
                    
            elif call_status in ['busy', 'failed', 'no-answer', 'canceled']:
                estado_no_contestada = get_estado('ESTADO_LLAMADA', 'NO_CONTESTADA')
                llamada.estado_llamada = estado_no_contestada
                llamada.fecha_hora_fin = timezone.now()
                logger.info(f"[WEBHOOK] Llamada {llamada.id} no contestada: {call_status}")
                
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
            
            # ⚠️ NO reproducir mensaje de bienvenida
            # Conectar DIRECTAMENTE al agente para que escuche el ringing
            
            # Conectar al agente usando Twilio Client
            client_identity = f"agent_{agente.pk}"
            
            # 🆕 Usar 'statusCallback' + 'statusCallbackEvent' para capturar el DialCallSid EN TIEMPO REAL
            # Esto se ejecuta cuando el agente se CONECTA, no cuando termina
            dial_status_url = request.build_absolute_uri('/api/webhooks/twilio/dial-status/')
            
            dial = Dial(
                action=dial_status_url,  # Se ejecuta cuando el Dial termina (backup)
                statusCallback=dial_status_url,  # 🔥 Se ejecuta en eventos en tiempo real (camelCase!)
                statusCallbackEvent='initiated answered completed',  # 🔥 String separado por espacios
                statusCallbackMethod='POST',  # Usar POST para consistencia
                timeout=30,  # Tiempo de espera para que el agente conteste
                record='record-from-answer',  # Grabar desde que se contesta
                recordingStatusCallback=request.build_absolute_uri('/api/webhooks/twilio/recording/'),
                recordingStatusCallbackMethod='POST'  # Cambiar a POST para consistencia
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
            logger.debug(f"TwiML completo: {twiml_str}")
            
            # 🔍 DEBUGGING: Verificar que los parámetros camelCase están en el TwiML
            if 'statusCallback' in twiml_str:
                logger.info(f"[TwiML] ✅ 'statusCallback' presente en TwiML")
            else:
                logger.warning(f"[TwiML] ⚠️ 'statusCallback' NO encontrado en TwiML")
            
            if 'statusCallbackEvent' in twiml_str:
                logger.info(f"[TwiML] ✅ 'statusCallbackEvent' presente en TwiML")
            else:
                logger.warning(f"[TwiML] ⚠️ 'statusCallbackEvent' NO encontrado en TwiML")
            
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
@require_http_methods(["GET", "POST"])
def twilio_recording_webhook(request):
    """
    Webhook para recibir notificaciones de grabaciones.
    
    IMPORTANTE: Este endpoint NO debe devolver TwiML, solo HTTP 200.
    """
    try:
        # Twilio puede enviar GET o POST
        params = request.GET if request.method == 'GET' else request.POST
        
        recording_sid = params.get('RecordingSid')
        recording_url = params.get('RecordingUrl')
        call_sid = params.get('CallSid')
        recording_status = params.get('RecordingStatus')
        recording_duration = params.get('RecordingDuration')
        
        # Log solo si hay grabación completada
        if recording_status == 'completed':
            logger.info(f"[RECORDING] Grabación {recording_duration}s guardada para CallSid={call_sid}")
        
        if not call_sid:
            return HttpResponse(status=200)
        
        try:
            # Buscar por parent o child CallSid
            from django.db.models import Q
            llamada = Llamada.objects.filter(
                Q(twilio_call_sid=call_sid) | Q(twilio_child_call_sid=call_sid)
            ).first()
            
            if llamada:
                if recording_status in ['completed', 'absent']:
                    llamada.twilio_recording_sid = recording_sid
                    llamada.twilio_recording_url = recording_url
                    llamada.grabacion_url = recording_url
                    llamada.save(update_fields=['twilio_recording_sid', 'twilio_recording_url', 'grabacion_url'])
            else:
                logger.error(f"[RECORDING] Llamada no encontrada - CallSID={call_sid}")
                
        except Exception as e:
            logger.error(f"[RECORDING] Error guardando grabación: {str(e)}")
        
        # SIEMPRE devolver 200
        return HttpResponse(status=200)
        
    except Exception as e:
        # Capturar CUALQUIER error no manejado y devolver 200
        logger.error(f"Error crítico en webhook de grabación: {str(e)}", exc_info=True)
        return HttpResponse(status=200)


@csrf_exempt
@require_http_methods(["GET", "POST"])
def twilio_dial_status_webhook(request):
    """
    Webhook para capturar el CallSid del child call generado por <Dial>.
    
    Este webhook se llama en TIEMPO REAL cuando:
    - 'initiated': El Dial comienza (se crea el child call)
    - 'answered': El agente contesta
    - 'completed': El Dial termina
    
    Twilio envía:
    - CallSid: Parent call SID (la llamada principal al cliente)
    - DialCallSid: Child call SID (la conexión del agente vía WebRTC)  
    - DialCallStatus: Estado del dial (initiated, answered, completed, busy, no-answer, failed)
    - CallStatus: Estado de la llamada principal
    
    Este webhook es CRUCIAL para llamadas automáticas porque necesitamos el
    DialCallSid ANTES de que el frontend busque la llamada.
    
    IMPORTANTE: Este endpoint NO debe devolver TwiML, solo HTTP 200.
    """
    try:
        # Twilio puede enviar GET o POST
        params = request.GET if request.method == 'GET' else request.POST
        
        parent_call_sid = params.get('CallSid')
        child_call_sid = params.get('DialCallSid')
        dial_status = params.get('DialCallStatus')
        status_callback_event = params.get('StatusCallbackEvent')

        
        if not parent_call_sid:
            return HttpResponse(status=200)
        
        try:
            # Buscar la llamada por el parent CallSid
            llamada = Llamada.objects.select_related('agente').get(twilio_call_sid=parent_call_sid)
            
            if child_call_sid and not llamada.twilio_child_call_sid:
                llamada.twilio_child_call_sid = child_call_sid
                llamada.save(update_fields=['twilio_child_call_sid'])
            
            if dial_status == 'answered' or status_callback_event == 'answered':
                from common.estados_helper import get_estado
                from datetime import date
                
                estado_en_llamada = get_estado('ESTADO_AGENTE', 'EN_LLAMADA')
                estado_actual = EstadoAgenteActual.objects.filter(agente_id=llamada.agente).first()
                
                if estado_actual and estado_actual.estado_id != estado_en_llamada:
                    logger.info(f"[DIAL] Agente {llamada.agente.email} contestó llamada {llamada.id}")
                    
                    # Actualizar detalle del día
                    detalle, created = EstadoAgenteDetalle.objects.get_or_create(
                        agente_id=llamada.agente,
                        estado_id=estado_en_llamada,
                        fecha=date.today(),
                        defaults={
                            'tiempo': '00:00:00',
                            'cambios': f'Llamada automática contestada - Cliente: {llamada.cliente.telefono}'
                        }
                    )
                    
                    if not created:
                        if detalle.cambios:
                            detalle.cambios += f', Llamada automática contestada - Cliente: {llamada.cliente.telefono}'
                        else:
                            detalle.cambios = f'Llamada automática contestada - Cliente: {llamada.cliente.telefono}'
                        detalle.save()
                    
                    EstadoAgenteActual.objects.filter(agente_id=llamada.agente).update(
                        estado_id=estado_en_llamada,
                        tiempo=timezone.now()
                    )
            
        except Llamada.DoesNotExist:
            logger.error(f"[DIAL] Llamada no encontrada: {parent_call_sid}")
        except Exception as e:
            logger.error(f"[DIAL] Error: {str(e)}")
        
        # SIEMPRE devolver 200
        return HttpResponse(status=200)
        
    except Exception as e:
        logger.error(f"[DIAL] Error crítico: {str(e)}")
        return HttpResponse(status=200)
