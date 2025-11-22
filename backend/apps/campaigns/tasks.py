"""
Tareas asíncronas de Celery para gestión de campañas y llamadas automáticas.
"""
from celery import shared_task
from celery.exceptions import Retry
from django.utils import timezone
from django.conf import settings
from apps.campaigns.models import BaseDatosCargada
from apps.campaigns.services import IteracionService
from apps.calls.models import IteracionCliente, Llamada
from apps.users.models import EstadoAgenteActual
from common.estados_helper import get_estado
from common.twilio_client import TwilioClient
import logging

logger = logging.getLogger(__name__)

# Constantes desde settings.py (configurables vía .env)
MAX_INTENTOS = getattr(settings, 'MAX_INTENTOS', 1)
TIEMPO_ESPERA_REASIGNACION = getattr(settings, 'TIEMPO_ESPERA_REASIGNACION', 30)


@shared_task(bind=True, name='apps.campaigns.tasks.verificar_bases_programadas')
def verificar_bases_programadas(self):
    """
    Tarea periódica (cada 1 minuto) que verifica si hay bases de datos
    programadas que deben iniciar su iteración.
    """
    try:
        ahora = timezone.now()
        
        # Buscar bases programadas que deben iniciar
        bases_programadas = BaseDatosCargada.objects.filter(
            iteracion_activa=False,
            fecha_hora_inicio_iteracion__lte=ahora,
            fecha_hora_inicio_iteracion__isnull=False
        )
        
        for base in bases_programadas:
            logger.info(f"Iniciando iteración programada para base {base.id} - {base.nombre_bd}")
            
            # Lanzar tarea de inicio de iteración
            iniciar_iteracion_base.delay(base.id)
        
        return {
            'bases_iniciadas': bases_programadas.count(),
            'timestamp': str(ahora)
        }
        
    except Retry:
        raise
    except Exception as e:
        logger.error(f"Error en verificar_bases_programadas: {str(e)}")
        raise self.retry(exc=e, countdown=60, max_retries=3)


@shared_task(bind=True, name='apps.campaigns.tasks.iniciar_iteracion_base')
def iniciar_iteracion_base(self, base_datos_id: int):
    """
    Inicia el proceso de iteración de una base de datos.
    Prepara todos los clientes y lanza la asignación de llamadas.
    
    Args:
        base_datos_id: ID de la base de datos
    """
    try:
        logger.info(f"Iniciando iteración de base {base_datos_id}")
        
        # Iniciar iteración usando el servicio
        resultado = IteracionService.iniciar_iteracion(base_datos_id)
        
        if not resultado.get('success'):
            logger.error(f"Error al iniciar iteración: {resultado.get('error')}")
            return resultado
        
        # Lanzar tarea de asignación de llamadas
        asignar_llamadas_pendientes.delay(base_datos_id)
        
        return resultado
        
    except Retry:
        raise
    except Exception as e:
        logger.error(f"Error en iniciar_iteracion_base: {str(e)}")
        raise self.retry(exc=e, countdown=60, max_retries=3)


@shared_task(bind=True, name='apps.campaigns.tasks.asignar_llamadas_pendientes')
def asignar_llamadas_pendientes(self, base_datos_id: int):
    """
    Asigna clientes pendientes a agentes disponibles y lanza llamadas.
    Esta tarea se ejecuta en bucle hasta que no haya más clientes pendientes
    o no haya agentes disponibles.
    
    Args:
        base_datos_id: ID de la base de datos
    """
    try:
        base = BaseDatosCargada.objects.select_related('campana').get(id=base_datos_id)
        
        # Verificar que la iteración siga activa
        if not base.iteracion_activa:
            logger.info(f"Iteración de base {base_datos_id} ya no está activa. Deteniendo asignación.")
            return {'mensaje': 'Iteración detenida'}
        
        # Obtener agentes disponibles
        agentes_disponibles = IteracionService.obtener_agentes_disponibles(base.campana.id)
        
        if not agentes_disponibles:
            logger.info(f"No hay agentes disponibles para base {base_datos_id}. Reintentando en {TIEMPO_ESPERA_REASIGNACION}s")
            # Reintentar en 30 segundos
            raise self.retry(countdown=TIEMPO_ESPERA_REASIGNACION, max_retries=100)
        
        # Obtener clientes pendientes
        clientes_pendientes = IteracionService.obtener_clientes_pendientes(base_datos_id, MAX_INTENTOS)
        
        if not clientes_pendientes:
            # No hay más clientes pendientes, finalizar iteración
            logger.info(f"No hay más clientes pendientes en base {base_datos_id}. Finalizando iteración.")
            IteracionService.finalizar_iteracion(base_datos_id)
            return {'mensaje': 'Iteración completada'}
        
        # Asignar clientes a agentes
        asignaciones = 0
        for agente in agentes_disponibles:
            if asignaciones >= len(clientes_pendientes):
                break
            
            cliente, iteracion = clientes_pendientes[asignaciones]
            
            # Lanzar tarea de llamada automática
            procesar_llamada_automatica.delay(
                cliente_id=cliente.cliente_id,
                agente_id=agente.documento_id,
                base_datos_id=base_datos_id,
                iteracion_id=iteracion.id
            )
            
            asignaciones += 1
        
        logger.info(f"Asignadas {asignaciones} llamadas en base {base_datos_id}")
        
        # Si quedan más clientes pendientes, reprogramar esta tarea
        if len(clientes_pendientes) > asignaciones:
            logger.info(f"Quedan clientes pendientes en base {base_datos_id}. Reprogramando asignación.")
            raise self.retry(countdown=TIEMPO_ESPERA_REASIGNACION, max_retries=100)
        
        return {
            'asignaciones': asignaciones,
            'clientes_restantes': len(clientes_pendientes) - asignaciones
        }
        
    except Retry:
        # Re-lanzar excepciones de Retry sin capturarlas
        raise
    except BaseDatosCargada.DoesNotExist:
        logger.error(f"Base de datos {base_datos_id} no encontrada")
        return {'error': 'Base de datos no encontrada'}
    except Exception as e:
        logger.error(f"Error en asignar_llamadas_pendientes: {str(e)}")
        # No hacer retry infinito en caso de error
        if self.request.retries < 3:
            raise self.retry(exc=e, countdown=60, max_retries=3)
        return {'error': str(e)}


@shared_task(bind=True, name='apps.campaigns.tasks.procesar_llamada_automatica')
def procesar_llamada_automatica(self, cliente_id: int, agente_id: str, base_datos_id: int, iteracion_id: int):
    """
    Procesa una llamada automática individual.
    Llama al cliente vía Twilio y conecta con el agente.
    
    Args:
        cliente_id: ID del cliente
        agente_id: Documento ID del agente
        base_datos_id: ID de la base de datos
        iteracion_id: ID de la iteración
    """
    try:
        from apps.campaigns.models import Cliente
        from apps.users.models import User
        
        # Obtener datos
        cliente = Cliente.objects.get(cliente_id=cliente_id)
        agente = User.objects.get(documento_id=agente_id)
        iteracion = IteracionCliente.objects.get(id=iteracion_id)
        base = BaseDatosCargada.objects.get(id=base_datos_id)
        
        # Incrementar intento
        iteracion.intento += 1
        iteracion.save()
        
        # Iniciar llamada con Twilio
        twilio_client = TwilioClient()
        
        if not twilio_client.is_configured():
            logger.error("Twilio no configurado. No se puede procesar la llamada.")
            
            # Marcar como NO_CONTACTADO por falta de configuración
            estado_no_contactado = get_estado('ESTADO_INTERACION_LLAMADA', 'NO_CONTACTADO')
            iteracion.estado_iteracion = estado_no_contactado
            iteracion.save()
            
            # Cambiar estado del agente a AFTERCALL
            IteracionService.cambiar_estado_agente(agente_id, 'AFTERCALL')
            
            return {
                'success': False,
                'error': 'Twilio no configurado',
                'cliente_id': cliente_id,
                'agente_id': agente_id
            }
        
        # LLAMADA REAL con Twilio
        try:
            # Preparar estados
            estado_llamada_timbrado = get_estado('ESTADO_LLAMADA', 'TIMBRADO')
            estado_venta = get_estado('ESTADO_VENTA', 'NO_VENTA')
            estado_reportada = get_estado('ESTADO_REPORTE', 'NO_REPORTADA')
            
            # Crear registro de llamada ANTES de hacer la llamada
            # Twilio puede llamar al webhook muy rápido
            llamada = Llamada.objects.create(
                agente=agente,
                cliente=cliente,
                estado_llamada=estado_llamada_timbrado,
                estado_venta=estado_venta,
                estado_reportada=estado_reportada,
                telefono_origen=twilio_client.phone_number,
                telefono_destino=cliente.telefono,
                twilio_call_sid='pending',  # Temporal
                twilio_status='pending'
            )
            
            # ⚠️ NO cambiar estado del agente a EN_LLAMADA todavía
            # El agente se cambiará a EN_LLAMADA cuando CONTESTE la llamada (webhook answered del child call)
            # Por ahora el agente está DISPONIBLE y recibirá la llamada entrante
            
            # URL del webhook que manejará la llamada cuando el cliente conteste
            webhook_url = f"{settings.SITE_URL}/api/webhooks/twilio/handle-call/"
            
            # Hacer la llamada real
            call_result = twilio_client.make_call(
                to=cliente.telefono,
                url=webhook_url,
                status_callback=f"{settings.SITE_URL}/api/webhooks/twilio/call-status/"
            )
            
            # Actualizar con el CallSid real de Twilio
            llamada.twilio_call_sid = call_result['sid']
            llamada.twilio_status = call_result['status']
            llamada.save()
            
            # El webhook de Twilio actualizará el estado del agente cuando la llamada termine
            # NO cambiar a AFTERCALL aquí, el agente sigue EN_LLAMADA
            
        except Exception as e:
            logger.error(f"Error al hacer llamada con Twilio: {str(e)}")
            # Marcar como no contactado
            estado_no_contactado = get_estado('ESTADO_INTERACION_LLAMADA', 'NO_CONTACTADO')
            iteracion.estado_iteracion = estado_no_contactado
            iteracion.save()
            
            # Solo cambiar a AFTERCALL si hubo error
            IteracionService.cambiar_estado_agente(agente_id, 'AFTERCALL')
        
        return {
            'success': True,
            'cliente_id': cliente_id,
            'agente_id': agente_id,
            'intento': iteracion.intento
        }
        
    except Retry:
        raise
    except Exception as e:
        logger.error(f"Error en procesar_llamada_automatica: {str(e)}")
        
        # Liberar agente en caso de error, poniéndolo en AFTERCALL
        try:
            IteracionService.cambiar_estado_agente(agente_id, 'AFTERCALL')
        except:
            pass
        
        raise self.retry(exc=e, countdown=30, max_retries=2)


@shared_task(bind=True, name='apps.campaigns.tasks.procesar_llamadas_pendientes_continuo')
def procesar_llamadas_pendientes_continuo(self):
    """
    Tarea que se ejecuta continuamente (cada 30 segundos) para buscar y procesar
    clientes pendientes en TODAS las bases de datos activas.
    
    Esta tarea NO espera a que se active una base, sino que busca constantemente
    si hay trabajo por hacer.
    """
    try:
        from apps.campaigns.models import BaseDatosCargada
        
        logger.info("Buscando clientes pendientes para procesar...")
        
        # Buscar TODAS las bases de datos activas
        bases_activas = BaseDatosCargada.objects.filter(iteracion_activa=True)
        
        if not bases_activas.exists():
            return {'mensaje': 'Sin bases activas', 'bases': 0}
        
        total_asignaciones = 0
        agentes_ya_asignados = set()  # 🔒 Mantener track de agentes ya asignados en ESTA ejecución
        
        # Para cada base activa, intentar asignar llamadas
        for base in bases_activas:
            try:
                # Obtener agentes disponibles
                agentes_disponibles = IteracionService.obtener_agentes_disponibles(base.campana.id)
                
                if not agentes_disponibles:
                    continue
                
                # 🔒 Filtrar agentes que ya fueron asignados en esta ejecución
                agentes_disponibles = [
                    agente for agente in agentes_disponibles 
                    if agente.documento_id not in agentes_ya_asignados
                ]
                
                if not agentes_disponibles:
                    continue
                
                # Obtener clientes pendientes
                clientes_pendientes = IteracionService.obtener_clientes_pendientes(base.id, MAX_INTENTOS)
                
                if not clientes_pendientes:
                    # Si no hay más clientes, finalizar iteración
                    IteracionService.finalizar_iteracion(base.id)
                    continue
                
                # Asignar clientes a agentes (máximo un cliente por agente disponible)
                asignaciones_base = 0
                for i, agente in enumerate(agentes_disponibles):
                    if i >= len(clientes_pendientes):
                        break
                    
                    cliente, iteracion = clientes_pendientes[i]
                    
                    # 🔒 Marcar agente como asignado ANTES de lanzar la tarea
                    agentes_ya_asignados.add(agente.documento_id)
                    
                    # Lanzar tarea de llamada
                    procesar_llamada_automatica.delay(
                        cliente_id=cliente.cliente_id,
                        agente_id=agente.documento_id,
                        base_datos_id=base.id,
                        iteracion_id=iteracion.id
                    )
                    
                    asignaciones_base += 1
                    total_asignaciones += 1
                
                logger.info(f"Asignadas {asignaciones_base} llamadas en base {base.id}")
                
            except Exception as e:
                logger.error(f"Error procesando base {base.id}: {str(e)}")
                continue
        
        return {
            'mensaje': 'Procesamiento completado',
            'bases_activas': bases_activas.count(),
            'asignaciones': total_asignaciones
        }
        
    except Exception as e:
        logger.error(f"Error en procesar_llamadas_pendientes_continuo: {str(e)}")
        return {'error': str(e)}
