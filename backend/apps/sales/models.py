"""
Modelos para gestión de ventas y contratos del call center.
Tablas del MER: Venta, Contrato
"""
from django.db import models
from apps.campaigns.models import Campana


class Venta(models.Model):
    """
    Registro de ventas realizadas en el call center.
    Tabla del MER: Venta (ESTRICTAMENTE según MER - solo FK de campaña)
    """
    # venta_id se genera automáticamente como AutoField (PK)
    
    campana = models.ForeignKey(
        Campana,
        on_delete=models.CASCADE,
        related_name='ventas'
    )

    fecha_venta = models.DateTimeField(
        'Fecha de Venta',
        auto_now_add=True
    )
    monto = models.DecimalField(
        'Monto',
        max_digits=10,
        decimal_places=2
    )
    
    created_at = models.DateTimeField('Fecha de creación', auto_now_add=True)
    updated_at = models.DateTimeField('Fecha de actualización', auto_now=True)
    
    class Meta:
        db_table = 'venta'
        verbose_name = 'Venta'
        verbose_name_plural = 'Ventas'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['campana', '-created_at']),
        ]
    
    def __str__(self):
        return f"Venta #{self.id} - Campaña: {self.campana.nombre}"


class Contrato(models.Model):
    """
    Contratos generados.
    Tabla del MER: Contrato (ESTRICTAMENTE según MER)
    """
    # contrato_id se genera automáticamente como AutoField (PK)
    
    campana = models.ForeignKey(
        Campana,
        on_delete=models.CASCADE,
        related_name='contratos'
    )
    contrato_texto = models.TextField(
        'Texto del Contrato'
    )
    
    created_at = models.DateTimeField('Fecha de creación', auto_now_add=True)
    updated_at = models.DateTimeField('Fecha de actualización', auto_now=True)
    
    class Meta:
        db_table = 'contrato'
        verbose_name = 'Contrato'
        verbose_name_plural = 'Contratos'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['campana']),
        ]
    
    def __str__(self):
        return f"Contrato #{self.id} - Campaña: {self.campana.nombre}"
