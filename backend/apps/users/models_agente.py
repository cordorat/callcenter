"""
Modelos para gestión de agentes y sus estados en el call center.
"""
from django.db import models
from django.utils import timezone
from apps.users.models import User


class TiposParametros(models.Model):
    """
    Tabla de parámetros generales del sistema.
    Almacena tipos parametrizables como estados de agente, estados de llamada, etc.
    """
    
    class Categoria(models.TextChoices):
        ESTADO_AGENTE = 'ESTADO_AGENTE', 'Estado de Agente'
        ESTADO_LLAMADA = 'ESTADO_LLAMADA', 'Estado de Llamada'
        TIPO_LLAMADA = 'TIPO_LLAMADA', 'Tipo de Llamada'
        MOTIVO_RECHAZO = 'MOTIVO_RECHAZO', 'Motivo de Rechazo'
    
    categoria = models.CharField(
        'Categoría',
        max_length=50,
        choices=Categoria.choices,
        help_text='Categoría del parámetro'
    )
    codigo = models.CharField(
        'Código',
        max_length=50,
        help_text='Código único del parámetro dentro de su categoría'
    )
    nombre = models.CharField(
        'Nombre',
        max_length=100,
        help_text='Nombre descriptivo del parámetro'
    )
    descripcion = models.TextField(
        'Descripción',
        blank=True,
        help_text='Descripción detallada del parámetro'
    )
    color = models.CharField(
        'Color',
        max_length=20,
        blank=True,
        help_text='Color asociado (ej: #00FF00 para verde)'
    )
    icono = models.CharField(
        'Icono',
        max_length=50,
        blank=True,
        help_text='Nombre del icono (ej: check, clock, phone)'
    )
    orden = models.IntegerField(
        'Orden',
        default=0,
        help_text='Orden de visualización'
    )
    activo = models.BooleanField(
        'Activo',
        default=True
    )
    
    created_at = models.DateTimeField('Fecha de creación', auto_now_add=True)
    updated_at = models.DateTimeField('Fecha de actualización', auto_now=True)
    
    class Meta:
        verbose_name = 'Tipo de Parámetro'
        verbose_name_plural = 'Tipos de Parámetros'
        unique_together = ['categoria', 'codigo']
        ordering = ['categoria', 'orden', 'nombre']
        indexes = [
            models.Index(fields=['categoria', 'codigo']),
            models.Index(fields=['categoria', 'activo']),
        ]
    
    def __str__(self):
        return f"{self.get_categoria_display()} - {self.nombre}"


class Equipo(models.Model):
    """
    Equipos de trabajo para organizar agentes.
    """
    nombre = models.CharField(
        'Nombre del Equipo',
        max_length=100,
        unique=True
    )
    descripcion = models.TextField(
        'Descripción',
        blank=True
    )
    supervisor = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='equipos_supervisados',
        limit_choices_to={'role': User.Role.ADMIN},
        help_text='Supervisor o administrador del equipo'
    )
    activo = models.BooleanField(
        'Activo',
        default=True
    )
    
    created_at = models.DateTimeField('Fecha de creación', auto_now_add=True)
    updated_at = models.DateTimeField('Fecha de actualización', auto_now=True)
    
    class Meta:
        verbose_name = 'Equipo'
        verbose_name_plural = 'Equipos'
        ordering = ['nombre']
    
    def __str__(self):
        return self.nombre


class EquipoAgenteDetalle(models.Model):
    """
    Relación muchos a muchos entre equipos y agentes.
    Permite que un agente pertenezca a múltiples equipos.
    """
    equipo = models.ForeignKey(
        Equipo,
        on_delete=models.CASCADE,
        related_name='agentes_detalle'
    )
    agente = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='equipos_detalle',
        limit_choices_to={'role': User.Role.AGENT}
    )
    fecha_asignacion = models.DateTimeField(
        'Fecha de Asignación',
        default=timezone.now
    )
    activo = models.BooleanField(
        'Activo',
        default=True
    )
    
    created_at = models.DateTimeField('Fecha de creación', auto_now_add=True)
    updated_at = models.DateTimeField('Fecha de actualización', auto_now=True)
    
    class Meta:
        verbose_name = 'Detalle Equipo-Agente'
        verbose_name_plural = 'Detalles Equipo-Agente'
        unique_together = ['equipo', 'agente']
        ordering = ['-fecha_asignacion']
        indexes = [
            models.Index(fields=['agente', 'activo']),
            models.Index(fields=['equipo', 'activo']),
        ]
    
    def __str__(self):
        return f"{self.agente.full_name} en {self.equipo.nombre}"


class EstadoAgenteDetalle(models.Model):
    """
    Historial de estados de los agentes.
    Registra cada cambio de estado con timestamp y detalles.
    """
    
    class EstadoAgente(models.TextChoices):
        DISPONIBLE = 'DISPONIBLE', 'Disponible'
        OCUPADO = 'OCUPADO', 'Ocupado'
        DESCONECTADO = 'DESCONECTADO', 'Desconectado'
        EN_PAUSA = 'EN_PAUSA', 'En Pausa'
        EN_LLAMADA = 'EN_LLAMADA', 'En Llamada'
        POSTCALL = 'POSTCALL', 'Post-Llamada'
    
    agente = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='historial_estados',
        limit_choices_to={'role': User.Role.AGENT}
    )
    estado = models.CharField(
        'Estado',
        max_length=20,
        choices=EstadoAgente.choices,
        help_text='Estado actual del agente'
    )
    estado_parametro = models.ForeignKey(
        TiposParametros,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='estados_agente',
        limit_choices_to={'categoria': TiposParametros.Categoria.ESTADO_AGENTE}
    )
    fecha = models.DateField(
        'Fecha',
        default=timezone.now,
        help_text='Fecha del cambio de estado'
    )
    hora_inicio = models.DateTimeField(
        'Hora de Inicio',
        default=timezone.now,
        help_text='Momento exacto del cambio de estado'
    )
    hora_fin = models.DateTimeField(
        'Hora de Fin',
        null=True,
        blank=True,
        help_text='Momento en que finaliza este estado'
    )
    duracion_segundos = models.IntegerField(
        'Duración (segundos)',
        null=True,
        blank=True,
        help_text='Duración total en este estado'
    )
    comentarios = models.TextField(
        'Comentarios',
        blank=True,
        help_text='Comentarios opcionales sobre el cambio de estado'
    )
    ip_address = models.GenericIPAddressField(
        'Dirección IP',
        null=True,
        blank=True,
        help_text='IP desde donde se realizó el cambio'
    )
    user_agent = models.CharField(
        'User Agent',
        max_length=255,
        blank=True,
        help_text='Navegador/dispositivo usado'
    )
    
    created_at = models.DateTimeField('Fecha de creación', auto_now_add=True)
    
    class Meta:
        verbose_name = 'Estado de Agente'
        verbose_name_plural = 'Historial de Estados de Agentes'
        ordering = ['-hora_inicio']
        indexes = [
            models.Index(fields=['agente', '-hora_inicio']),
            models.Index(fields=['agente', 'estado']),
            models.Index(fields=['fecha', 'estado']),
        ]
    
    def __str__(self):
        return f"{self.agente.full_name} - {self.get_estado_display()} ({self.hora_inicio})"
    
    def save(self, *args, **kwargs):
        """
        Calcula la duración si hora_fin está presente.
        """
        if self.hora_fin and self.hora_inicio:
            delta = self.hora_fin - self.hora_inicio
            self.duracion_segundos = int(delta.total_seconds())
        super().save(*args, **kwargs)
    
    @property
    def duracion_formateada(self):
        """Devuelve la duración en formato legible."""
        if not self.duracion_segundos:
            return "En curso"
        
        horas = self.duracion_segundos // 3600
        minutos = (self.duracion_segundos % 3600) // 60
        segundos = self.duracion_segundos % 60
        
        if horas > 0:
            return f"{horas}h {minutos}m {segundos}s"
        elif minutos > 0:
            return f"{minutos}m {segundos}s"
        else:
            return f"{segundos}s"
    
    @property
    def esta_activo(self):
        """Verifica si este estado aún está activo (sin hora_fin)."""
        return self.hora_fin is None


class EstadoAgenteActual(models.Model):
    """
    Tabla de referencia rápida para el estado actual de cada agente.
    Se actualiza automáticamente con signals.
    """
    agente = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='estado_actual',
        primary_key=True,
        limit_choices_to={'role': User.Role.AGENT}
    )
    estado = models.CharField(
        'Estado Actual',
        max_length=20,
        choices=EstadoAgenteDetalle.EstadoAgente.choices,
        default=EstadoAgenteDetalle.EstadoAgente.DESCONECTADO
    )
    ultima_actualizacion = models.DateTimeField(
        'Última Actualización',
        auto_now=True
    )
    detalle = models.ForeignKey(
        EstadoAgenteDetalle,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='+',
        help_text='Referencia al registro detallado actual'
    )
    
    # Campos de configuración
    acepta_llamadas = models.BooleanField(
        'Acepta Llamadas',
        default=False,
        help_text='Indica si el agente puede recibir llamadas'
    )
    tiene_audio = models.BooleanField(
        'Tiene Audio',
        default=False,
        help_text='Audio/micrófono configurado correctamente'
    )
    conexion_activa = models.BooleanField(
        'Conexión Activa',
        default=False,
        help_text='Tiene conexión a internet estable'
    )
    
    class Meta:
        verbose_name = 'Estado Actual de Agente'
        verbose_name_plural = 'Estados Actuales de Agentes'
    
    def __str__(self):
        return f"{self.agente.full_name} - {self.get_estado_display()}"
    
    @property
    def puede_recibir_llamadas(self):
        """Valida si el agente cumple todos los requisitos para recibir llamadas."""
        return (
            self.acepta_llamadas and
            self.tiene_audio and
            self.conexion_activa and
            self.estado == EstadoAgenteDetalle.EstadoAgente.DISPONIBLE
        )
