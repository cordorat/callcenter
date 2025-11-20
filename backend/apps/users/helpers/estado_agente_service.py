"""
Servicio centralizado para cambiar el estado de agentes.
Este servicio debe ser usado en TODOS los lugares donde se cambie el estado de un agente.
"""
from django.utils import timezone
from django.db import transaction
from datetime import date, timedelta
import logging

from apps.users.models import User, TiposParametros, EstadoAgenteDetalle, EstadoAgenteActual

logger = logging.getLogger(__name__)


def inicializar_estados_diarios(agente, fecha_actual):
    """
    Crea los 9 registros diarios para el agente si no existen.
    Se ejecuta automáticamente al primer cambio de estado del día.
    
    Args:
        agente: Usuario agente
        fecha_actual: Fecha del día (date object)
        
    Returns:
        list: Lista de valores de estados creados
    """
    estados = TiposParametros.objects.filter(nombre='ESTADO_AGENTE')
    
    registros_creados = []
    for estado in estados:
        detalle, created = EstadoAgenteDetalle.objects.get_or_create(
            agente_id=agente,
            estado_id=estado,
            fecha=fecha_actual,
            defaults={'tiempo': '00:00:00', 'cambios': ''}
        )
        if created:
            registros_creados.append(estado.valor)
    
    return registros_creados


def actualizar_tiempo_estado_anterior(agente, estado_anterior, duracion_segundos, usuario_cambio):
    """
    Actualiza el tiempo y agrega el cambio al historial del estado anterior.
    
    Args:
        agente: Usuario agente
        estado_anterior: TiposParametros del estado anterior
        duracion_segundos: Tiempo que estuvo en ese estado
        usuario_cambio: Usuario que realizó el cambio (puede ser el mismo agente u otro)
    """
    fecha_actual = date.today()
    
    # Obtener o crear el registro del día para ese estado
    detalle, created = EstadoAgenteDetalle.objects.get_or_create(
        agente_id=agente,
        estado_id=estado_anterior,
        fecha=fecha_actual,
        defaults={'tiempo': '00:00:00', 'cambios': ''}
    )
    
    # Agregar el cambio ANTES de actualizar el tiempo
    detalle.agregar_cambio(usuario_cambio.full_name)
    
    # Actualizar el tiempo acumulado
    detalle.agregar_tiempo(duracion_segundos)
    detalle.save()
    
    logger.info(f"Estado anterior actualizado: {agente.full_name} - {estado_anterior.valor} - {duracion_segundos}s")


def cambiar_estado_agente(agente, nuevo_estado_id, usuario_cambio=None):
    """
    Cambia el estado de un agente de forma centralizada.
    Esta es la ÚNICA función que debe usarse para cambiar el estado de un agente.
    
    Args:
        agente: Usuario (objeto User o documento_id)
        nuevo_estado_id: ID del nuevo estado (TiposParametros.parametros_id)
        usuario_cambio: Usuario que realiza el cambio (por defecto es el mismo agente)
        
    Returns:
        tuple: (success: bool, message: str, estado_actual: EstadoAgenteActual o None)
        
    Raises:
        ValueError: Si el agente o estado no existen
    """
    # Convertir agente a objeto User si es necesario
    if isinstance(agente, str):
        try:
            agente = User.objects.get(documento_id=agente)
        except User.DoesNotExist:
            raise ValueError(f'El agente con documento_id {agente} no existe')
    
    # Si no se especifica usuario_cambio, usar el mismo agente
    if usuario_cambio is None:
        usuario_cambio = agente
    
    # Validar el nuevo estado
    try:
        if isinstance(nuevo_estado_id, int):
            nuevo_estado = TiposParametros.objects.get(
                parametros_id=nuevo_estado_id,
                nombre='ESTADO_AGENTE'
            )
        else:
            # Si se pasa el objeto TiposParametros directamente
            nuevo_estado = nuevo_estado_id
            if nuevo_estado.nombre != 'ESTADO_AGENTE':
                raise ValueError('El estado proporcionado no es un ESTADO_AGENTE')
    except TiposParametros.DoesNotExist:
        raise ValueError(f'El estado con ID {nuevo_estado_id} no es válido')
    
    fecha_actual = date.today()
    
    try:
        with transaction.atomic():
            # Obtener o crear el estado actual del agente
            estado_actual, created = EstadoAgenteActual.objects.select_for_update().get_or_create(
                agente_id=agente,
                defaults={'estado_id': nuevo_estado}
            )
            
            # Inicializar los registros diarios si es necesario
            # inicializar_estados_diarios(agente, fecha_actual)
            
            if not created:
                # Verificar si es el mismo estado
                if estado_actual.estado_id.parametros_id == nuevo_estado.parametros_id:
                    logger.warning(f"Agente {agente.full_name} ya está en estado {nuevo_estado.valor}")
                    return (False, 'Ya se encuentra en ese estado', estado_actual)
                
                # Calcular duración en el estado anterior
                duracion_segundos = estado_actual.duracion_actual_segundos
                
                # Actualizar el tiempo del estado anterior
                actualizar_tiempo_estado_anterior(
                    agente,
                    estado_actual.estado_id,
                    duracion_segundos,
                    usuario_cambio
                )
                
                # Cambiar al nuevo estado
                estado_anterior_valor = estado_actual.estado_id.valor
                estado_actual.estado_id = nuevo_estado
                estado_actual.tiempo = timezone.now()
                estado_actual.save()
                
                logger.info(f"Estado cambiado: {agente.full_name} - {estado_anterior_valor} -> {nuevo_estado.valor}")
            else:
                # Primera vez que se establece el estado
                # Agregar el cambio inicial
                detalle_inicial = EstadoAgenteDetalle.objects.get(
                    agente_id=agente,
                    estado_id=nuevo_estado,
                    fecha=fecha_actual
                )
                detalle_inicial.agregar_cambio(usuario_cambio.full_name)
                detalle_inicial.save()
                
                logger.info(f"Estado inicial establecido: {agente.full_name} - {nuevo_estado.valor}")
            
            return (True, f'Estado cambiado a {nuevo_estado.valor}', estado_actual)
            
    except Exception as e:
        logger.error(f"Error al cambiar estado de {agente.full_name}: {str(e)}")
        raise


def cambiar_estado_agente_por_valor(agente, nuevo_estado_valor, usuario_cambio=None):
    """
    Cambia el estado de un agente usando el valor del estado (ej: 'Disponible', 'En_llamada').
    
    Args:
        agente: Usuario (objeto User o documento_id)
        nuevo_estado_valor: Valor del estado (str)
        usuario_cambio: Usuario que realiza el cambio (por defecto es el mismo agente)
        
    Returns:
        tuple: (success: bool, message: str, estado_actual: EstadoAgenteActual o None)
        
    Raises:
        ValueError: Si el estado no existe
    """
    try:
        nuevo_estado = TiposParametros.objects.get(
            nombre='ESTADO_AGENTE',
            valor=nuevo_estado_valor
        )
        return cambiar_estado_agente(agente, nuevo_estado, usuario_cambio)
    except TiposParametros.DoesNotExist:
        raise ValueError(f'El estado {nuevo_estado_valor} no existe')