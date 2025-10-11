"""
Signals para el módulo de usuarios.
"""
from django.db.models.signals import post_save
from django.dispatch import receiver
from apps.users.models import User, EstadoAgenteActual


@receiver(post_save, sender=User)
def crear_estado_agente_inicial(sender, instance, created, **kwargs):
    """
    Crea automáticamente un EstadoAgenteActual cuando se crea un nuevo agente.
    """
    # Solo crear si es un agente nuevo y no existe ya un estado actual
    if created and instance.role == User.Role.AGENT:
        EstadoAgenteActual.objects.get_or_create(
            agente=instance,
            defaults={
                'estado': EstadoAgenteActual.EstadoAgente.DESCONECTADO,
                'acepta_llamadas': False,
                'conexion_activa': False,
                'tiene_audio': False,
                'comentarios': 'Estado inicial automático'
            }
        )
