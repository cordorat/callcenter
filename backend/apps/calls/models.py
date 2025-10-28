"""
Modelos para gestión de llamadas del call center.
"""
from django.db import models
from django.utils import timezone
from apps.users.models import User, TiposParametros
from apps.campaigns.models import Cliente, Campana

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
    
class Llamada(models.Model):
    """
    Registro de llamadas del call center.
    Tabla del MER: Llamada (campos exactos del MER + Twilio + teléfonos)
    """
    # llamada_id se genera automáticamente como AutoField (PK)
    
    # Relaciones según MER
    agente = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='llamadas_atendidas'
    )
    cliente = models.ForeignKey(
        Cliente,
        on_delete=models.SET_NULL,
        null=True,
        related_name='llamadas'
    )
    venta = models.ForeignKey(
        Venta,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='llamadas'
    )
    
    # Campos del MER
    fecha_hora_inicio = models.DateTimeField(
        'Fecha y Hora de Inicio',
        default=timezone.now
    )
    fecha_hora_fin = models.DateTimeField(
        'Fecha y Hora de Fin',
        null=True,
        blank=True
    )
    duracion = models.IntegerField(
        'Duración (segundos)',
        null=True,
        blank=True
    )
    
    # Estados según MER (FK a TiposParametros)
    estado_llamada = models.ForeignKey(
        TiposParametros,
        on_delete=models.PROTECT,
        related_name='llamadas_estado_llamada',
        help_text='Estado: contestada, no contestada'
    )
    estado_venta = models.ForeignKey(
        TiposParametros,
        on_delete=models.PROTECT,
        related_name='llamadas_estado_venta',
        help_text='Estado: venta, no venta'
    )
    estado_reportada = models.ForeignKey(
        TiposParametros,
        on_delete=models.PROTECT,
        related_name='llamadas_estado_reportada',
        help_text='Estado: reportada, no reportada'
    )

    transcipcion = models.TextField(
        'Transcripción',
        blank=True
    )
    
    grabacion_url = models.URLField(
        'URL de Grabación',
        max_length=500,
        blank=True
    )
    
    # Campos adicionales NECESARIOS para Twilio
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
        help_text='Estado de la llamada en Twilio'
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
        help_text='URL de la grabación en Twilio'
    )
    
    # Campos adicionales NECESARIOS para operación
    telefono_origen = models.CharField(
        'Teléfono de Origen',
        max_length=20
    )
    telefono_destino = models.CharField(
        'Teléfono de Destino',
        max_length=20
    )
    
    # Campos de auditoría para BackOffice
    estado_auditoria = models.ForeignKey(
        TiposParametros,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='llamadas_estado_auditoria',
        help_text='Estado: auditada, no auditada',
        default=None  # Se establecerá en save()
    )
    fecha_auditoria = models.DateTimeField(
        'Fecha de Auditoría',
        null=True,
        blank=True,
        help_text='Fecha y hora en que se auditó la llamada'
    )
    auditado_por = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='llamadas_auditadas',
        help_text='Usuario que auditó la llamada'
    )
    notas_auditoria = models.TextField(
        'Notas de Auditoría',
        blank=True,
        help_text='Observaciones del auditor'
    )
    
    created_at = models.DateTimeField('Fecha de creación', auto_now_add=True)
    updated_at = models.DateTimeField('Fecha de actualización', auto_now=True)
    
    class Meta:
        db_table = 'llamada'
        verbose_name = 'Llamada'
        verbose_name_plural = 'Llamadas'
        ordering = ['-fecha_hora_inicio']
        indexes = [
            models.Index(fields=['agente', '-fecha_hora_inicio']),
            models.Index(fields=['cliente', '-fecha_hora_inicio']),
            models.Index(fields=['estado_llamada']),
            models.Index(fields=['telefono_origen']),
        ]
    
    def __str__(self):
        agente_nombre = self.agente.get_full_name() if self.agente else "Sin asignar"
        return f"Llamada {self.id} - {agente_nombre}"
    
    def save(self, *args, **kwargs):
        """Calcula duración automáticamente y establece estado de auditoría por defecto."""
        # Establecer estado_auditoria por defecto si es None
        if self.estado_auditoria_id is None:
            from common.estados_helper import get_estado_id
            estado_no_auditada_id = get_estado_id('ESTADO_AUDITORIA', 'NO_AUDITADA')
            if estado_no_auditada_id:
                self.estado_auditoria_id = estado_no_auditada_id
        
        # Calcular duración si está disponible
        if self.fecha_hora_fin and self.fecha_hora_inicio:
            delta = self.fecha_hora_fin - self.fecha_hora_inicio
            self.duracion = int(delta.total_seconds())
        
        super().save(*args, **kwargs)
    
    @property
    def duracion_total_formateada(self):
        """Devuelve la duración total en formato legible."""
        if not self.duracion:
            return "0s"
        
        minutos = self.duracion // 60
        segundos = self.duracion % 60
        
        if minutos > 0:
            return f"{minutos}m {segundos}s"
        return f"{segundos}s"


class IteracionCliente(models.Model):
    """
    Iteraciones o intentos de contacto con clientes.
    Tabla del MER: Iteracion_Cliente
    """
    # iteracion_id se genera automáticamente como AutoField (PK)
    
    campana = models.ForeignKey(
        Campana,
        on_delete=models.CASCADE,
        related_name='iteraciones'
    )
    cliente = models.ForeignKey(
        Cliente,
        on_delete=models.CASCADE,
        related_name='iteraciones'
    )
    estado_iteracion = models.ForeignKey(
        TiposParametros,
        on_delete=models.PROTECT,
        related_name='iteraciones_estado'
    )
    intento = models.IntegerField(
        'Número de Intento',
        default=1
    )
    
    created_at = models.DateTimeField('Fecha de creación', auto_now_add=True)
    updated_at = models.DateTimeField('Fecha de actualización', auto_now=True)
    
    class Meta:
        db_table = 'iteracion_cliente'
        verbose_name = 'Iteración de Cliente'
        verbose_name_plural = 'Iteraciones de Clientes'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['campana', 'cliente']),
            models.Index(fields=['cliente', '-created_at']),
        ]
    
    def __str__(self):
        return f"Iteración {self.intento} - {self.cliente.nombre} - Campaña {self.campana.nombre}"


class FormularioVenta(models.Model):
    """
    Formulario asociado a una venta.
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