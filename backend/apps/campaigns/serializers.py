from rest_framework import serializers
from .models import Cliente, BaseDatosCargada

class ClienteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cliente
        fields = '__all__'
    def validate_documento_id(self, value):
        """Valida que el documento sea único."""
        if value:
            instance = self.instance
            if Cliente.objects.filter(documento_id=value).exclude(
                id=instance.id if instance else None
            ).exists():
                raise serializers.ValidationError(
                    'Ya existe un cliente con este documento.'
                )
        return value        
class BaseDatosCargadaSerializer(serializers.ModelSerializer):
    clientes = ClienteSerializer(many=True, read_only=True, source='cliente_set')
    class Meta:
        model = BaseDatosCargada
        fields = '__all__'