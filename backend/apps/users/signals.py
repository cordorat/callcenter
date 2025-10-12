"""
Signals para el módulo de usuarios.
"""
from django.db.models.signals import post_save
from django.dispatch import receiver
from apps.users.models import User, EstadoAgenteActual, TiposParametros

@receiver(post_save, sender=User)
def crear_estado_agente_inicial(sender, instance, created, **kwargs):
    """
    Crea automáticamente un EstadoAgenteActual cuando se crea un nuevo agente.
    """
    # Import local para evitar circular import
    from common.estados_helper import get_estado, get_estado_id
    
    # Solo crear si es un agente nuevo y no existe ya un estado actual
    rol_agente_id = get_estado_id('ROL_USUARIO', 'AGENTE')
    
    if created and instance.rol_id == rol_agente_id:
        # Obtener el estado DESCONECTADO
        estado_desconectado = get_estado('ESTADO_AGENTE', 'DESCONECTADO')
        
        EstadoAgenteActual.objects.get_or_create(
            agente=instance,
            defaults={
                'estado': estado_desconectado,
                'acepta_llamadas': False,
                'conexion_activa': False,
                'tiene_audio': False,
                'comentarios': 'Estado inicial automático'
            }
        )
