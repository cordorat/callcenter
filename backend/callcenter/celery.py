"""
Configuración de Celery para el proyecto callcenter.
"""
import os
from celery import Celery
from celery.schedules import crontab

# Establecer el módulo de configuración de Django para Celery
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'callcenter.settings')

# Crear instancia de Celery
app = Celery('callcenter')

# Cargar configuración desde settings.py con el prefijo CELERY_
app.config_from_object('django.conf:settings', namespace='CELERY')

# Autodescubrir tareas en todas las apps instaladas
app.autodiscover_tasks()

# Configurar tareas periódicas con Celery Beat
app.conf.beat_schedule = {
    'verificar-bases-programadas-cada-minuto': {
        'task': 'apps.campaigns.tasks.verificar_bases_programadas',
        'schedule': 60.0,  # Cada 60 segundos (1 minuto)
    },
    'procesar-llamadas-pendientes-cada-30-segundos': {
        'task': 'apps.campaigns.tasks.procesar_llamadas_pendientes_continuo',
        'schedule': 30.0,  # Cada 30 segundos
    },
}

@app.task(bind=True, ignore_result=True)
def debug_task(self):
    """Tarea de debug para verificar que Celery funciona."""
    print(f'Request: {self.request!r}')
