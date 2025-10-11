from rest_framework import serializers

class KPIAgenteSerializer(serializers.Serializer):
    agente_id = serializers.IntegerField()
    rango = serializers.ChoiceField(choices=['hoy', 'semana', 'mes', 'personalizado'], default='hoy')
    fecha_desde = serializers.DateField(required=False)
    fecha_hasta = serializers.DateField(required=False)
