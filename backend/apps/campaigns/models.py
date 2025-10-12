"""
Modelos para gestión de campañas y productos del call center.
Tablas del MER: Campaña, Producto, Producto_Campaña_Detalle, Centro, BaseDatosCargada
"""
from django.db import models
from django.utils import timezone
from apps.users.models import User, TiposParametros

class Centro(models.Model):
    """
    Centros o sedes del call center.
    Tabla del MER: Centro (campos exactos del MER)
    """
    # centro_id se genera automáticamente como AutoField (PK)
    
    jefe_centro = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='centros_a_cargo',
        verbose_name='Jefe de Centro'
    )
    nombre = models.CharField(
        'Nombre del Centro',
        max_length=200
    )
    direccion = models.TextField(
        'Dirección'
    )
    
    created_at = models.DateTimeField('Fecha de creación', auto_now_add=True)
    updated_at = models.DateTimeField('Fecha de actualización', auto_now=True)
    
    class Meta:
        db_table = 'centro'
        verbose_name = 'Centro'
        verbose_name_plural = 'Centros'
        ordering = ['nombre']
    
    def __str__(self):
        return self.nombre


class Campana(models.Model):
    """
    Campañas de ventas/marketing del call center.
    Tabla del MER: Campaña (campos exactos del MER)
    """
    # campana_id se genera automáticamente como AutoField (PK)
    
    jefe_campana = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='campanas_a_cargo',
        verbose_name='Jefe de Campaña'
    )
    centro = models.ForeignKey(
        Centro,
        on_delete=models.SET_NULL,
        null=True,
        related_name='campanas',
        verbose_name='Centro'
    )
    
    nombre = models.CharField(
        'Nombre de la Campaña',
        max_length=200
    )
    descripcion = models.TextField(
        'Descripción',
        blank=True
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
    estado = models.ForeignKey(
        TiposParametros,
        on_delete=models.PROTECT,
        related_name='campanas_estado',
        verbose_name='Estado'
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
        db_table = 'campana'
        verbose_name = 'Campaña'
        verbose_name_plural = 'Campañas'
        ordering = ['-fecha_inicio']
    
    def __str__(self):
        return self.nombre


class Producto(models.Model):
    """
    Productos o servicios que se ofrecen en las campañas.
    Tabla del MER: Producto
    """
    # producto_id se genera automáticamente como AutoField (PK)
    
    nombre = models.CharField(
        'Nombre del Producto',
        max_length=200
    )
    descripcion = models.TextField(
        'Descripción',
        blank=True
    )
    precio = models.DecimalField(
        'Precio',
        max_digits=10,
        decimal_places=2,
        help_text='Precio base del producto'
    )
    activo = models.BooleanField(
        'Activo',
        default=True
    )
    
    created_at = models.DateTimeField('Fecha de creación', auto_now_add=True)
    updated_at = models.DateTimeField('Fecha de actualización', auto_now=True)
    
    class Meta:
        db_table = 'producto'
        verbose_name = 'Producto'
        verbose_name_plural = 'Productos'
        ordering = ['nombre']
    
    def __str__(self):
        return f"{self.nombre} - ${self.precio}"


class ProductoCampanaDetalle(models.Model):
    """
    Relación entre productos y campañas (tabla intermedia).
    Tabla del MER: Producto_Campaña_Detalle (solo FKs)
    """
    # id se genera automáticamente como AutoField (PK)
    
    producto = models.ForeignKey(
        Producto,
        on_delete=models.CASCADE,
        related_name='campanas_detalle'
    )
    campana = models.ForeignKey(
        Campana,
        on_delete=models.CASCADE,
        related_name='productos_detalle'
    )
    
    created_at = models.DateTimeField('Fecha de creación', auto_now_add=True)
    updated_at = models.DateTimeField('Fecha de actualización', auto_now=True)
    
    class Meta:
        db_table = 'producto_campana_detalle'
        verbose_name = 'Producto en Campaña'
        verbose_name_plural = 'Productos en Campañas'
        unique_together = [['producto', 'campana']]
        indexes = [
            models.Index(fields=['producto', 'campana']),
        ]
    
    def __str__(self):
        return f"{self.producto.nombre} en {self.campana.nombre}"


class BaseDatosCargada(models.Model):
    """
    Registro de bases de datos cargadas para campañas.
    Tabla del MER: Base_Datos_Cargada
    """
    id = models.AutoField(primary_key=True)
    
    campana = models.ForeignKey(
        Campana,
        on_delete=models.CASCADE,
        related_name='bases_datos'
    )
    nombre_bd = models.CharField(
        'Nombre de la Base de Datos',
        max_length=150
    )
    fecha_carga = models.DateTimeField(
        'Fecha de Carga',
        auto_now_add=True
    )
    
    created_at = models.DateTimeField('Fecha de creación', auto_now_add=True)
    updated_at = models.DateTimeField('Fecha de actualización', auto_now=True)
    
    class Meta:
        db_table = 'base_datos_cargada'
        verbose_name = 'Base de Datos Cargada'
        verbose_name_plural = 'Bases de Datos Cargadas'
        ordering = ['-fecha_carga']
        indexes = [
            models.Index(fields=['campana', '-fecha_carga']),
        ]
    
    def __str__(self):
        return f"{self.nombre_bd} - {self.campana.nombre}"
