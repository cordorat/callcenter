"""
Modelos para gestión de llamadas del call center.
"""
from django.db import models
from django.utils import timezone
from apps.users.models import User, TiposParametros
from apps.campaigns.models import Cliente, Campana


class Llamada(models.Model):
    """
    Registro de llamadas del call center.
    """
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
        related_name='llamadas',
        db_column='agente_id'
    )
    cliente_id = models.ForeignKey(
        Cliente,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='llamadas',
        db_column='cliente_id'
    )
    campana_id = models.ForeignKey(
        Campana,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='llamadas'
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
    
    estado_venta = models.ForeignKey(
        TiposParametros,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='estados_ventas',
        db_column='estado_venta_id',
        help_text='Estado de la venta'
    )   
    estado_recibida = models.BooleanField(
        TiposParametros,
        on_delete=models.SET_NULL,
        null=True,
        default=False,
        db_column='estado_recibida_id',
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
        unique=True,
        null=True,
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
    # Transferencias y redireccionamientos
    agente_anterior = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='llamadas_transferidas',
        help_text='Agente que transfirió esta llamada'
    )

    
    class Meta:
        db_table = 'llamada'
        verbose_name = 'Llamada'
        verbose_name_plural = 'Llamadas'
        ordering = ['-hora_inicio_timbrado']
        indexes = [
            models.Index(fields=['agente', '-hora_inicio_timbrado']),
            models.Index(fields=['cliente', '-hora_inicio_timbrado']),
            models.Index(fields=['llamada_sid']),
            models.Index(fields=['telefono_origen']),
        ]
    
    def __str__(self):
        agente = self.agente_id.full_name if self.agente_id else "Sin agente"
        return f"Llamada {self.llamada_id} - {agente}"
    
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
        if self.twilio_duration and not self.duracion:
            self.duracion = self.twilio_duration        
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


class IteracionCliente(models.Model):
    
    campana_id = models.ForeignKey(
        Campana,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='campanas_iteraciones',
        db_column='campana_id'
    )
    cliente_id = models.ForeignKey(
        Cliente,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='clientes_iteraciones',
        db_column='cliente_id'
    )    
    estado_interacion_llamada_id = models.ForeignKey(
        TiposParametros,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='iteraciones_estado',
        db_column='estado_interacion_llamada_id'
    )
    intento = models.IntegerField('ID Venta', null=True, blank=True)
    
    class Meta:
        db_table = 'iteracion_cliente'
        verbose_name = 'Iteración de Cliente'
        verbose_name_plural = 'Iteraciones de Clientes'
        indexes = [
            models.Index(fields=['cliente_id', 'campana_id']),
        ]
    
    def __str__(self):
        cliente_nombre = self.cliente_id.nombre if self.cliente_id else "Sin cliente"
        return f"Iteración {self.id} - {cliente_nombre} - Campaña {self.campana_id.nombre if self.campana_id else 'N/A'}"


class Venta(models.Model):
    """
    Registro de ventas realizadas.
    """
    venta_id = models.AutoField(primary_key=True)
    campana_id = models.ForeignKey(
        Campana,
        on_delete=models.CASCADE,
        related_name='ventas',
        db_column='campana_id'
    )
    monto = models.DecimalField('Monto', max_digits=10, decimal_places=2, null=True, blank=True)
    
    class Meta:
        db_table = 'venta'
        verbose_name = 'Venta'
        verbose_name_plural = 'Ventas'
    
    def __str__(self):
        return f"Venta {self.venta_id}"

class FormularioVenta(models.Model):
    """
    Formulario asociado a una venta.
    """
    formulario_id = models.AutoField(primary_key=True)
    llamada_id = models.ForeignKey(
        Llamada,
        on_delete=models.CASCADE,
        related_name='formularios',
        db_column='llamada_id'
    )
    cliente_id = models.ForeignKey(
        Cliente,
        on_delete=models.CASCADE,
        related_name='formularios',
        db_column='cliente_id'
    )
    venta_id = models.ForeignKey(
        Venta,
        on_delete=models.CASCADE,
        related_name='formularios',
        db_column='campana_id'
    )
    datos_formulario = models.JSONField('Datos del Formulario', blank=True, null=True)
    
    class Meta:
        db_table = 'formulario_venta'
        verbose_name = 'Formulario de Venta'
        verbose_name_plural = 'Formularios de Ventas'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Formulario {self.formulario_id}"
