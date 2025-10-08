from django.db import models

class Cliente(models.Model):
    cliente_id = models.AutoField(primary_key=True)
    base_datos_id = models.IntegerField()
    campaña_id = models.IntegerField()
    nombre = models.CharField(max_length=255)
    telefono = models.CharField(max_length=20)
    otros_datos = models.JSONField(blank=True, null=True)

    class Meta:
        db_table = 'cliente'
        indexes = [
            models.Index(fields=['base_datos_id', 'campaña_id']),
            models.Index(fields=['telefono']),
        ]

    def __str__(self):
        return f"{self.nombre} ({self.telefono})"
