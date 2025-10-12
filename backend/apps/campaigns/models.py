from django.db import models


class Producto(models.Model):
    """
    Productos o servicios ofrecidos en las campañas.
    """
    producto_id = models.AutoField(primary_key=True)
    nombre = models.CharField('Nombre', max_length=255)
    descripcion = models.TextField('Descripción', blank=True)
    precio = models.DecimalField('Precio', max_digits=10, decimal_places=2, null=True, blank=True)
    
    class Meta:
        db_table = 'producto'
        verbose_name = 'Producto'
        verbose_name_plural = 'Productos'
        ordering = ['nombre']
    
    def __str__(self):
        return self.nombre


class Campana(models.Model):
    """
    Campañas de ventas/marketing del call center.
    """
    campana_id = models.AutoField(primary_key=True)
    nombre = models.CharField('Nombre de la Campaña', max_length=150)
    descripcion = models.TextField('Descripción', blank=True)
    fecha_inicio = models.DateField('Fecha de Inicio', null=True, blank=True)
    fecha_fin = models.DateField('Fecha de Fin', null=True, blank=True)
    jefe_campana = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='id_jefe_campana',
        related_name='campanas_dirigidas'
    )    
        
    
    class Meta:
        db_table = 'campana'
        verbose_name = 'Campaña'
        verbose_name_plural = 'Campañas'
        ordering = ['-fecha_inicio']
    
    def __str__(self):
        return self.nombre


class ProductoCampanaDetalle(models.Model):
    """
    Relación muchos a muchos entre productos y campañas.
    """
    producto_id = models.ForeignKey(
        Producto,
        on_delete=models.CASCADE,
        related_name='campanas_detalle',
        db_column='producto_id'
    )
    campana_id = models.ForeignKey(
        Campana,
        on_delete=models.CASCADE,
        related_name='productos_detalle',
        db_column='campana_id'
    )
    
    class Meta:
        db_table = 'producto_campana_detalle'
        verbose_name = 'Producto-Campaña Detalle'
        verbose_name_plural = 'Productos-Campañas Detalle'
        unique_together = ['producto_id', 'campana_id']
    
    def __str__(self):
        return f"{self.producto_id.nombre} - {self.campana_id.nombre}"


class BaseDatosCargada(models.Model):
    """
    Bases de datos cargadas para campañas.
    """
    id = models.AutoField(primary_key=True)
    campana_id = models.IntegerField('ID Campaña')
    nombre_bd = models.CharField('Nombre BD', max_length=150)
    fecha_carga = models.DateTimeField('Fecha de Carga', auto_now_add=True)
    
    class Meta:
        db_table = 'base_datos_cargada'
        verbose_name = 'Base de Datos Cargada'
        verbose_name_plural = 'Bases de Datos Cargadas'
    
    def __str__(self):
        return f"{self.nombre_bd} - Campaña {self.campana_id}"


class Cliente(models.Model):
    """
    Clientes para las campañas.
    """
    cliente_id = models.AutoField(primary_key=True)
    base_datos_id = models.ForeignKey(
        BaseDatosCargada,
        on_delete=models.CASCADE,
        related_name='clientes',
        db_column='base_datos_id',
        null=True,
        blank=True
    )
    campana_id = models.IntegerField('ID Campaña')
    nombre = models.CharField('Nombre', max_length=255)
    telefono = models.CharField('Teléfono', max_length=20)
    otros_datos = models.JSONField('Otros Datos', blank=True, null=True)
    
    class Meta:
        db_table = 'cliente'
        verbose_name = 'Cliente'
        verbose_name_plural = 'Clientes'
        indexes = [
            models.Index(fields=['base_datos_id', 'campana_id']),
            models.Index(fields=['telefono']),
        ]
    
    def __str__(self):
        return f"{self.nombre} ({self.telefono})"


class IteracionCliente(models.Model):
    
    contrato_id=models.AutoField(primary_key=True)
    campana_id = models.ForeignKey(
        Campana,
        on_delete=models.CASCADE,
        related_name='campanas',
        db_column='campana_id',
        null=True,
        blank=True)
    contrato_texto = models.TextField('Texto del Contrato', blank=True)
    
    class Meta:
        db_table = 'contrato'
        verbose_name = 'Contrato'
        verbose_name_plural = 'Contratos'
    
    def __str__(self):
        return f"Contrato {self.contrato_id} - Campaña {self.campana_id.nombre if self.campana_id else 'N/A'}"
