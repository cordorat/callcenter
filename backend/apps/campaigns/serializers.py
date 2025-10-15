from rest_framework import serializers
from .models import Cliente, BaseDatosCargada
import re


class ClienteSerializer(serializers.ModelSerializer):
    """
    Serializer básico para lectura de clientes.
    """
    # Campos calculados desde otros_datos JSON
    documento_id = serializers.SerializerMethodField()
    email = serializers.SerializerMethodField()
    direccion = serializers.SerializerMethodField()
    observaciones = serializers.SerializerMethodField()
    
    class Meta:
        model = Cliente
        fields = [
            'cliente_id', 'campana', 'nombre', 'telefono', 
            'otros_datos', 'base_datos',
            'documento_id', 'email', 'direccion', 'observaciones'
        ]
        read_only_fields = ['cliente_id', 'base_datos']
    
    def get_documento_id(self, obj):
        """Extrae documento_id de otros_datos."""
        if obj.otros_datos and isinstance(obj.otros_datos, dict):
            return obj.otros_datos.get('documento_id') or obj.otros_datos.get('documento') or obj.otros_datos.get('cedula')
        return None
    
    def get_email(self, obj):
        """Extrae email de otros_datos."""
        if obj.otros_datos and isinstance(obj.otros_datos, dict):
            return obj.otros_datos.get('email') or obj.otros_datos.get('correo') or obj.otros_datos.get('correo_electronico')
        return None
    
    def get_direccion(self, obj):
        """Extrae dirección de otros_datos."""
        if obj.otros_datos and isinstance(obj.otros_datos, dict):
            return obj.otros_datos.get('direccion') or obj.otros_datos.get('address')
        return None
    
    def get_observaciones(self, obj):
        """Extrae observaciones de otros_datos."""
        if obj.otros_datos and isinstance(obj.otros_datos, dict):
            return obj.otros_datos.get('observaciones') or obj.otros_datos.get('notas') or obj.otros_datos.get('comentarios')
        return None


class ClienteUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer para actualización de clientes con validaciones.
    Cumple con los criterios de aceptación de la HU.
    """
    # Campos editables
    nombre = serializers.CharField(max_length=255, required=True)
    telefono = serializers.CharField(max_length=20, required=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    direccion = serializers.CharField(max_length=500, required=False, allow_blank=True)
    observaciones = serializers.CharField(required=False, allow_blank=True)
    
    # Campo de solo lectura
    documento_id = serializers.CharField(read_only=True)
    
    class Meta:
        model = Cliente
        fields = ['cliente_id', 'nombre', 'telefono', 'documento_id', 'email', 'direccion', 'observaciones']
        read_only_fields = ['cliente_id', 'documento_id']
    
    def validate_nombre(self, value):
        """
        Criterio 4.3: El campo de nombre no debe aceptar caracteres especiales inválidos ni números.
        """
        if not value or not value.strip():
            raise serializers.ValidationError('El nombre es obligatorio.')
        
        # Permitir letras, espacios, guiones, apóstrofes y tildes
        if not re.match(r"^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s\-']+$", value):
            raise serializers.ValidationError(
                'El nombre solo puede contener letras, espacios, guiones y apóstrofes.'
            )
        
        if len(value.strip()) < 3:
            raise serializers.ValidationError('El nombre debe tener al menos 3 caracteres.')
        
        return value.strip()
    
    def validate_telefono(self, value):
        """
        Criterio 4.2: El campo de teléfono debe aceptar únicamente dígitos y símbolos válidos (+, -, espacio).
        """
        if not value or not value.strip():
            raise serializers.ValidationError('El teléfono es obligatorio.')
        
        # Permitir solo dígitos, +, -, espacio y paréntesis
        if not re.match(r'^[\d\+\-\s\(\)]+$', value):
            raise serializers.ValidationError(
                'El teléfono solo puede contener dígitos y los símbolos: +, -, espacio, ( )'
            )
        
        # Extraer solo dígitos para validar longitud mínima
        digitos = re.sub(r'\D', '', value)
        if len(digitos) < 7:
            raise serializers.ValidationError('El teléfono debe tener al menos 7 dígitos.')
        
        return value.strip()
    
    def validate_email(self, value):
        """
        Criterio 4.1: El campo de correo electrónico debe validar el formato correcto.
        """
        if not value:
            return value
        
        value = value.strip()
        
        # Validación básica de formato email
        email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_regex, value):
            raise serializers.ValidationError(
                'El formato del correo electrónico no es válido (ejemplo: nombre@dominio.com).'
            )
        
        return value
    
    def update(self, instance, validated_data):
        """
        Actualiza el cliente y mantiene otros_datos en JSON.
        Criterio 5.1: Actualizar la base de datos en tiempo real.
        """
        # Actualizar campos directos
        instance.nombre = validated_data.get('nombre', instance.nombre)
        instance.telefono = validated_data.get('telefono', instance.telefono)
        
        # Actualizar otros_datos JSON
        if not instance.otros_datos:
            instance.otros_datos = {}
        
        # Actualizar email en otros_datos
        if 'email' in validated_data:
            email = validated_data['email']
            if email:
                instance.otros_datos['email'] = email
            elif 'email' in instance.otros_datos:
                del instance.otros_datos['email']
        
        # Actualizar dirección en otros_datos
        if 'direccion' in validated_data:
            direccion = validated_data['direccion']
            if direccion:
                instance.otros_datos['direccion'] = direccion
            elif 'direccion' in instance.otros_datos:
                del instance.otros_datos['direccion']
        
        # Actualizar observaciones en otros_datos
        if 'observaciones' in validated_data:
            observaciones = validated_data['observaciones']
            if observaciones:
                instance.otros_datos['observaciones'] = observaciones
            elif 'observaciones' in instance.otros_datos:
                del instance.otros_datos['observaciones']
        
        instance.save()
        return instance
    
    def to_representation(self, instance):
        """
        Personalizar la respuesta para incluir todos los campos de otros_datos.
        Esto asegura que el frontend reciba email, direccion, observaciones después del update.
        """
        representation = super().to_representation(instance)
        
        # Extraer campos desde otros_datos JSON
        if instance.otros_datos and isinstance(instance.otros_datos, dict):
            # Documento ID (solo lectura)
            representation['documento_id'] = (
                instance.otros_datos.get('documento_id') or 
                instance.otros_datos.get('documento') or 
                instance.otros_datos.get('cedula') or
                ''
            )
            
            # Email
            representation['email'] = (
                instance.otros_datos.get('email') or 
                instance.otros_datos.get('correo') or 
                instance.otros_datos.get('correo_electronico') or
                ''
            )
            
            # Dirección
            representation['direccion'] = (
                instance.otros_datos.get('direccion') or 
                instance.otros_datos.get('address') or
                ''
            )
            
            # Observaciones
            representation['observaciones'] = (
                instance.otros_datos.get('observaciones') or 
                instance.otros_datos.get('notas') or 
                instance.otros_datos.get('comentarios') or
                ''
            )
        else:
            # Si no hay otros_datos, inicializar con strings vacíos
            representation['documento_id'] = ''
            representation['email'] = ''
            representation['direccion'] = ''
            representation['observaciones'] = ''
        
        return representation


class BaseDatosCargadaSerializer(serializers.ModelSerializer):
    clientes = ClienteSerializer(many=True, read_only=True, source='cliente_set')
    
    class Meta:
        model = BaseDatosCargada
        fields = '__all__'