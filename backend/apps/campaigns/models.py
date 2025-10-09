from django.db import models

class BaseDatosCargada(models.Model):
    # El id se crea automáticamente como auto_increment
    campana_id = models.IntegerField()
    nombre_bd = models.CharField(max_length=150)
    fecha_carga = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'base_datos_cargada'


class Cliente(models.Model):
    cliente_id = models.AutoField(primary_key=True)
    campana_id = models.IntegerField()
    nombre = models.CharField(max_length=255)
    telefono = models.CharField(max_length=20)
    otros_datos = models.JSONField(blank=True, null=True)
    base_datos = models.ForeignKey(BaseDatosCargada, on_delete=models.CASCADE, related_name="clientes",null=True, blank=True)

    class Meta:
        db_table = 'cliente'
        indexes = [
            models.Index(fields=['base_datos_id', 'campana_id']),
            models.Index(fields=['telefono']),
        ]

    def __str__(self):
        return f"{self.nombre} ({self.telefono})"
