"""
Servicio para gestionar la iteración automática de bases de datos.
"""
from django.utils import timezone
from django.db.models import Q
from apps.campaigns.models import BaseDatosCargada, Cliente, Equipo
from apps.calls.models import IteracionCliente, Llamada
from apps.users.models import User, EstadoAgenteActual
from common.estados_helper import get_estado
from common.twilio_client import TwilioClient
from apps.users.helpers.estado_agente_service import cambiar_estado_agente_por_valor
import logging

logger = logging.getLogger(__name__)

# Constante para máximo de intentos
MAX_INTENTOS = 3


class IteracionService:
    """Servicio para manejar la lógica de iteración de bases de datos."""
    
    @staticmethod
    def iniciar_iteracion(base_datos_id: int) -> dict:
        """
        Inicia el proceso de iteración de una base de datos.
        Crea registros IteracionCliente para todos los clientes que necesitan ser contactados.
        
        Args:
            base_datos_id: ID de la base de datos
            
        Returns:
            dict con información del resultado
        """
        try:
            base = BaseDatosCargada.objects.select_related('campana').get(id=base_datos_id)
            
            # Marcar como activa
            base.iteracion_activa = True
            if not base.fecha_hora_inicio_iteracion:
                base.fecha_hora_inicio_iteracion = timezone.now()
            base.save()
            
            # Obtener clientes de esta base
            clientes = Cliente.objects.filter(base_datos=base)
            
            # Estado para nuevas iteraciones
            estado_no_contactado = get_estado('ESTADO_INTERACION_LLAMADA', 'NO_CONTACTADO')
            
            # Crear iteraciones para clientes que:
            # 1. No tienen ninguna iteración (primera vez)
            # 2. Tienen iteraciones pero todas con intento < MAX_INTENTOS
            iteraciones_creadas = 0
            
            for cliente in clientes:
                # Verificar si ya tiene iteraciones
                iteraciones_existentes = IteracionCliente.objects.filter(
                    cliente=cliente,
                    campana=base.campana
                )
                
                if not iteraciones_existentes.exists():
                    # Primera vez, crear iteración
                    IteracionCliente.objects.create(
                        campana=base.campana,
                        cliente=cliente,
                        estado_iteracion=estado_no_contactado,
                        intento=0  # Se incrementará al hacer la llamada
                    )
                    iteraciones_creadas += 1
            
            logger.info(f"Iteración iniciada para base {base_datos_id}. {iteraciones_creadas} clientes preparados.")
            
            return {
                'success': True,
                'mensaje': f'Iteración iniciada. {iteraciones_creadas} clientes preparados.',
                'base_datos_id': base_datos_id,
                'clientes_preparados': iteraciones_creadas
            }
            
        except BaseDatosCargada.DoesNotExist:
            logger.error(f"Base de datos {base_datos_id} no encontrada")
            return {
                'success': False,
                'error': 'Base de datos no encontrada'
            }
        except Exception as e:
            logger.error(f"Error al iniciar iteración de base {base_datos_id}: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    @staticmethod
    def obtener_agentes_disponibles(campana_id: int) -> list:
        """
        Obtiene agentes disponibles de los equipos de una campaña.
        
        Args:
            campana_id: ID de la campaña
            
        Returns:
            Lista de User (agentes) disponibles
        """
        try:
            # Obtener equipos de la campaña
            equipos = Equipo.objects.filter(campana_id=campana_id, is_active=True)
            
            if not equipos.exists():
                logger.warning(f"No hay equipos activos en campaña {campana_id}")
                return []
            
            # Obtener agentes de estos equipos
            agentes_ids = []
            for equipo in equipos:
                agentes_del_equipo = equipo.agentes_detalle.values_list('agente_id', flat=True)
                agentes_ids.extend(agentes_del_equipo)
            
            if not agentes_ids:
                logger.warning(f"No hay agentes en equipos de campaña {campana_id}")
                return []
            
            # Filtrar agentes DISPONIBLES
            estado_disponible = get_estado('ESTADO_AGENTE', 'DISPONIBLE')
            
            agentes_disponibles = User.objects.filter(
                documento_id__in=agentes_ids,
                estado_actual__estado_id=estado_disponible
            ).distinct()
            
            logger.info(f"Encontrados {agentes_disponibles.count()} agentes disponibles en campaña {campana_id}")
            
            return list(agentes_disponibles)
            
        except Exception as e:
            logger.error(f"Error al obtener agentes disponibles de campaña {campana_id}: {str(e)}")
            return []
    
    @staticmethod
    def obtener_clientes_pendientes(base_datos_id: int, max_intentos: int = MAX_INTENTOS) -> list:
        """
        Obtiene clientes pendientes de una base de datos que aún no han alcanzado el máximo de intentos.
        
        Args:
            base_datos_id: ID de la base de datos
            max_intentos: Máximo de intentos permitidos
            
        Returns:
            Lista de tuplas (cliente, iteracion)
        """
        try:
            base = BaseDatosCargada.objects.get(id=base_datos_id)
            estado_no_contactado = get_estado('ESTADO_INTERACION_LLAMADA', 'NO_CONTACTADO')
            
            # Buscar iteraciones pendientes (NO_CONTACTADO con intentos < max_intentos)
            iteraciones_pendientes = IteracionCliente.objects.filter(
                campana=base.campana,
                cliente__base_datos=base,
                estado_iteracion=estado_no_contactado,
                intento__lt=max_intentos
            ).select_related('cliente').order_by('intento', 'created_at')[:50]  # Batch de 50
            
            resultado = [(iter.cliente, iter) for iter in iteraciones_pendientes]
            
            logger.info(f"Encontrados {len(resultado)} clientes pendientes en base {base_datos_id}")
            
            return resultado
            
        except BaseDatosCargada.DoesNotExist:
            logger.error(f"Base de datos {base_datos_id} no encontrada")
            return []
        except Exception as e:
            logger.error(f"Error al obtener clientes pendientes: {str(e)}")
            return []
    
    @staticmethod
    def finalizar_iteracion(base_datos_id: int) -> dict:
        """
        Finaliza la iteración de una base de datos.
        
        Args:
            base_datos_id: ID de la base de datos
            
        Returns:
            dict con información del resultado
        """
        try:
            base = BaseDatosCargada.objects.get(id=base_datos_id)
            base.iteracion_activa = False
            base.save()
            
            logger.info(f"Iteración finalizada para base {base_datos_id}")
            
            return {
                'success': True,
                'mensaje': 'Iteración finalizada',
                'base_datos_id': base_datos_id
            }
            
        except BaseDatosCargada.DoesNotExist:
            logger.error(f"Base de datos {base_datos_id} no encontrada")
            return {
                'success': False,
                'error': 'Base de datos no encontrada'
            }
        except Exception as e:
            logger.error(f"Error al finalizar iteración: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    @staticmethod
    def cambiar_estado_agente(agente_id: str, nuevo_estado_valor: str) -> bool:
        """
        Cambia el estado de un agente usando el servicio centralizado.
        Esta función ahora es un wrapper del servicio centralizado.
        
        Args:
            agente_id: Documento ID del agente
            nuevo_estado_valor: Valor del nuevo estado (ej: 'EN_LLAMADA', 'DISPONIBLE')
            
        Returns:
            bool indicando éxito
        """
        try:
            success, message, _ = cambiar_estado_agente_por_valor(
                agente_id, 
                nuevo_estado_valor, 
                usuario_cambio=None  # El sistema hace el cambio
            )
            if not success:
                logger.warning(f"Cambio de estado no exitoso: {message}")
            return success
        except Exception as e:
            logger.error(f"Error al cambiar estado de agente {agente_id}: {str(e)}")
            return False