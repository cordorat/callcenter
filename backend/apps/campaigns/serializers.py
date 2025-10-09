from rest_framework import serializers
from .models import Cliente, BaseDatosCargada

class ClienteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cliente
        fields = '__all__'
class BaseDatosCargadaSerializer(serializers.ModelSerializer):
    clientes = ClienteSerializer(many=True, read_only=True, source='cliente_set')
    class Meta:
        model = BaseDatosCargada
        fields = '__all__'