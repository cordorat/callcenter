"""
Modelos para gestión de llamadas del call center.
"""
from django.db import models
from django.utils import timezone
from apps.users.models import User, TiposParametros, EstadoAgenteDetalle


class Cliente(models.Model):
    """
    Información de clientes para gestión de llamadas.
    """
    nombre = models.CharField(
        'Nombre',
        max_length=150
    )
    apellido = models.CharField(
        'Apellido',
        max_length=150,
        blank=True
    )
    telefono = models.CharField(
        'Teléfono',
        max_length=20,
        help_text='Número de teléfono principal'
    )
    telefono_alternativo = models.CharField(
        'Teléfono Alternativo',
        max_length=20,
        blank=True
    )
    email = models.EmailField(
        'Correo Electrónico',
        blank=True
    )
    documento_id = models.CharField(
        'Documento de Identidad',
        max_length=50,
        unique=True,
        null=True,
        blank=True
    )
    direccion = models.TextField(
        'Dirección',
        blank=True
    )
    ciudad = models.CharField(
        'Ciudad',
        max_length=100,
        blank=True
    )
    pais = models.CharField(
        'País',
        max_length=100,
        blank=True,
        default='Colombia'
    )
    notas = models.TextField(
        'Notas',
        blank=True,
        help_text='Notas adicionales sobre el cliente'
    )
    activo = models.BooleanField(
        'Activo',
        default=True
    )
    
    created_at = models.DateTimeField('Fecha de creación', auto_now_add=True)
    updated_at = models.DateTimeField('Fecha de actualización', auto_now=True)
    
    class Meta:
        verbose_name = 'Cliente'
        verbose_name_plural = 'Clientes'
        ordering = ['apellido', 'nombre']
        indexes = [
            models.Index(fields=['telefono']),
            models.Index(fields=['documento_id']),
            models.Index(fields=['email']),
        ]
    
    def __str__(self):
        return f"{self.nombre} {self.apellido} - {self.telefono}"
    
    @property
    def nombre_completo(self):
        """Devuelve el nombre completo del cliente."""
        return f"{self.nombre} {self.apellido}".strip()


class Campana(models.Model):
    """
    Campañas de ventas/marketing del call center.
    """
    
    class TipoCampana(models.TextChoices):
        VENTAS = 'VENTAS', 'Ventas'
        COBRANZAS = 'COBRANZAS', 'Cobranzas'
        ENCUESTAS = 'ENCUESTAS', 'Encuestas'
        SOPORTE = 'SOPORTE', 'Soporte'
        MARKETING = 'MARKETING', 'Marketing'
    
    nombre = models.CharField(
        'Nombre de la Campaña',
        max_length=200
    )
    descripcion = models.TextField(
        'Descripción',
        blank=True
    )
    tipo = models.CharField(
        'Tipo de Campaña',
        max_length=20,
        choices=TipoCampana.choices,
        default=TipoCampana.VENTAS
    )
    fecha_inicio = models.DateField(
        'Fecha de Inicio',
        default=timezone.now
    )
    fecha_fin = models.DateField(
        'Fecha de Fin',
        null=True,
        blank=True
    )
    activa = models.BooleanField(
        'Activa',
        default=True
    )
    objetivo_llamadas = models.IntegerField(
        'Objetivo de Llamadas',
        null=True,
        blank=True,
        help_text='Meta de llamadas para esta campaña'
    )
    objetivo_ventas = models.IntegerField(
        'Objetivo de Ventas',
        null=True,
        blank=True,
        help_text='Meta de ventas/conversiones'
    )
    
    created_at = models.DateTimeField('Fecha de creación', auto_now_add=True)
    updated_at = models.DateTimeField('Fecha de actualización', auto_now=True)
    
    class Meta:
        verbose_name = 'Campaña'
        verbose_name_plural = 'Campañas'
        ordering = ['-fecha_inicio']
    
    def __str__(self):
        return f"{self.nombre} ({self.get_tipo_display()})"


class Llamada(models.Model):
    """
    Registro de llamadas del call center.
    """
    
    class EstadoLlamada(models.TextChoices):
        TIMBRADO = 'TIMBRADO', 'Timbrado'
        EN_CURSO = 'EN_CURSO', 'En Curso'
        COMPLETADA = 'COMPLETADA', 'Completada'
        NO_CONTESTADA = 'NO_CONTESTADA', 'No Contestada'
        RECHAZADA = 'RECHAZADA', 'Rechazada'
        TRANSFERIDA = 'TRANSFERIDA', 'Transferida'
        COLGADA = 'COLGADA', 'Colgada'
    
    class TipoLlamada(models.TextChoices):
        ENTRANTE = 'ENTRANTE', 'Entrante'
        SALIENTE = 'SALIENTE', 'Saliente'
    
    class EstadoVenta(models.TextChoices):
        VENTA = 'VENTA', 'Venta'
        NO_VENTA = 'NO_VENTA', 'No Venta'
        PENDIENTE = 'PENDIENTE', 'Pendiente'
    # Identificadores únicos
    llamada_sid = models.CharField(
        'SID de Llamada',
        max_length=100,
        unique=True,
        null=True,
        blank=True,
        help_text='ID único de Twilio o sistema telefónico'
    )
    
    # Relaciones
    agente = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='llamadas_atendidas',
        limit_choices_to={'role': User.Role.AGENT}
    )
    cliente = models.ForeignKey(
        Cliente,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='llamadas'
    )
    campana = models.ForeignKey(
        Campana,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='llamadas'
    )
    
    # Información de la llamada
    tipo_llamada = models.CharField(
        'Tipo de Llamada',
        max_length=20,
        choices=TipoLlamada.choices,
        default=TipoLlamada.ENTRANTE
    )
    telefono_origen = models.CharField(
        'Teléfono de Origen',
        max_length=20,
        help_text='Número que llama'
    )
    telefono_destino = models.CharField(
        'Teléfono de Destino',
        max_length=20,
        help_text='Número al que se llama'
    )
    
    # Estados y tiempos
    estado_llamada = models.CharField(
        'Estado de Llamada',
        max_length=20,
        choices=EstadoLlamada.choices,
        default=EstadoLlamada.TIMBRADO
    )
    estado_venta = models.CharField(
        'Estado de venta',
        max_length=20,
        choices=EstadoVenta.choices,
        default=EstadoVenta.VENTA
    )    
    estado_recibida = models.BooleanField(
        'Recibida',
        default=False,
        help_text='Si el agente aceptó la llamada'
    )
    
    hora_inicio_timbrado = models.DateTimeField(
        'Hora Inicio Timbrado',
        default=timezone.now,
        help_text='Momento en que empieza a sonar'
    )
    hora_inicio_llamada = models.DateTimeField(
        'Hora Inicio Llamada',
        null=True,
        blank=True,
        help_text='Momento en que el agente contesta'
    )
    hora_fin_llamada = models.DateTimeField(
        'Hora Fin Llamada',
        null=True,
        blank=True
    )
    
    duracion_timbrado_segundos = models.IntegerField(
        'Duración Timbrado (seg)',
        null=True,
        blank=True,
        help_text='Tiempo que sonó antes de ser atendida o rechazada'
    )
    duracion_llamada_segundos = models.IntegerField(
        'Duración Llamada (seg)',
        null=True,
        blank=True,
        help_text='Duración total de la conversación'
    )
    
    # Grabación
    grabacion_url = models.URLField(
        'URL de Grabación',
        max_length=500,
        blank=True,
        help_text='URL de la grabación en Twilio o servidor'
    )
    grabacion_duracion = models.IntegerField(
        'Duración Grabación (seg)',
        null=True,
        blank=True
    )
    
    # Campos específicos de Twilio
    twilio_call_sid = models.CharField(
        'Twilio Call SID',
        max_length=100,
        blank=True,
        help_text='ID único de la llamada en Twilio'
    )
    twilio_status = models.CharField(
        'Estado Twilio',
        max_length=50,
        blank=True,
        help_text='Estado de la llamada en Twilio (ringing, in-progress, completed, etc.)'
    )
    twilio_recording_sid = models.CharField(
        'Twilio Recording SID',
        max_length=100,
        blank=True,
        help_text='ID de la grabación en Twilio'
    )
    twilio_recording_url = models.URLField(
        'URL Grabación Twilio',
        max_length=500,
        blank=True,
        help_text='URL de la grabación en los servidores de Twilio'
    )
    
    # Resultado y notas
    motivo_rechazo = models.CharField(
        'Motivo de Rechazo',
        max_length=100,
        blank=True,
        help_text='Razón por la que se rechazó la llamada'
    )
    notas = models.TextField(
        'Notas',
        blank=True,
        help_text='Notas del agente sobre la llamada'
    )
    requiere_seguimiento = models.BooleanField(
        'Requiere Seguimiento',
        default=False
    )
    
    # Transferencias y redireccionamientos
    agente_anterior = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='llamadas_transferidas',
        help_text='Agente que transfirió esta llamada'
    )
    intentos_redireccion = models.IntegerField(
        'Intentos de Redirección',
        default=0,
        help_text='Número de veces que se redirigió a otro agente'
    )
    
    # Metadatos
    ip_address = models.GenericIPAddressField(
        'Dirección IP',
        null=True,
        blank=True
    )
    metadata = models.JSONField(
        'Metadata',
        default=dict,
        blank=True,
        help_text='Datos adicionales de la llamada'
    )
    
    created_at = models.DateTimeField('Fecha de creación', auto_now_add=True)
    updated_at = models.DateTimeField('Fecha de actualización', auto_now=True)
    
    class Meta:
        verbose_name = 'Llamada'
        verbose_name_plural = 'Llamadas'
        ordering = ['-hora_inicio_timbrado']
        indexes = [
            models.Index(fields=['agente', '-hora_inicio_timbrado']),
            models.Index(fields=['cliente', '-hora_inicio_timbrado']),
            models.Index(fields=['estado_llamada', '-hora_inicio_timbrado']),
            models.Index(fields=['llamada_sid']),
            models.Index(fields=['telefono_origen']),
        ]
    
    def __str__(self):
        agente_nombre = self.agente.full_name if self.agente else "Sin asignar"
        return f"Llamada {self.id} - {agente_nombre} - {self.get_estado_llamada_display()}"
    
    def save(self, *args, **kwargs):
        """Calcula duraciones automáticamente."""
        # Duración del timbrado
        if self.hora_inicio_llamada and self.hora_inicio_timbrado:
            delta = self.hora_inicio_llamada - self.hora_inicio_timbrado
            self.duracion_timbrado_segundos = int(delta.total_seconds())
        
        # Duración de la llamada
        if self.hora_fin_llamada and self.hora_inicio_llamada:
            delta = self.hora_fin_llamada - self.hora_inicio_llamada
            self.duracion_llamada_segundos = int(delta.total_seconds())
        
        super().save(*args, **kwargs)
    
    @property
    def duracion_total_formateada(self):
        """Devuelve la duración total en formato legible."""
        if not self.duracion_llamada_segundos:
            return "0s"
        
        minutos = self.duracion_llamada_segundos // 60
        segundos = self.duracion_llamada_segundos % 60
        
        if minutos > 0:
            return f"{minutos}m {segundos}s"
        return f"{segundos}s"


class FormularioLlamada(models.Model):
    """
    Formularios de gestión asociados a llamadas.
    Información que el agente debe completar durante o después de la llamada.
    """
    llamada = models.ForeignKey(
        Llamada,
        on_delete=models.CASCADE,
        related_name='formularios'
    )
    agente = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='formularios_completados'
    )
    
    campos_json = models.JSONField(
        'Campos del Formulario',
        default=dict,
        help_text='Estructura JSON con los campos y valores del formulario'
    )
    completado = models.BooleanField(
        'Completado',
        default=False
    )
    fecha_completado = models.DateTimeField(
        'Fecha de Completado',
        null=True,
        blank=True
    )
    
    created_at = models.DateTimeField('Fecha de creación', auto_now_add=True)
    updated_at = models.DateTimeField('Fecha de actualización', auto_now=True)
    
    class Meta:
        verbose_name = 'Formulario de Llamada'
        verbose_name_plural = 'Formularios de Llamadas'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Formulario {self.id} - Llamada {self.llamada_id}"
