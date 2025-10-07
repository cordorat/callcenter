from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import User


class UserSerializer(serializers.ModelSerializer):
    """Serializador para mostrar información de usuarios."""
    
    full_name = serializers.ReadOnlyField()
    
    class Meta:
        model = User
        fields = [
            'id',
            'email',
            'first_name',
            'last_name',
            'full_name',
            'phone',
            'documento_id',
            'foto_perfil',
            'role',
            'is_active',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class UserCreateSerializer(serializers.ModelSerializer):
    """Serializador para crear usuarios (solo administradores)."""
    
    password = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'}
    )
    password_confirm = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'}
    )
    
    class Meta:
        model = User
        fields = [
            'email',
            'first_name',
            'last_name',
            'phone',
            'documento_id',
            'foto_perfil',
            'role',
            'password',
            'password_confirm',
            'is_active'
        ]
    
    def validate(self, attrs):
        """Valida las contraseñas en orden: primero coincidencia, luego complejidad."""
        password = attrs.get('password')
        password_confirm = attrs.get('password_confirm')
        
        # 1. Primero validar que las contraseñas coincidan
        if password != password_confirm:
            raise serializers.ValidationError({
                "password": "Las contraseñas no coinciden.",
                "password_confirm": "Las contraseñas no coinciden."
            })
        
        # 2. Luego validar la complejidad de la contraseña
        try:
            validate_password(password)
        except Exception as e:
            raise serializers.ValidationError({
                "password": list(e.messages)
            })
        
        return attrs
    
    def validate_role(self, value):
        """Valida que solo los administradores puedan crear otros administradores."""
        request = self.context.get('request')
        if request and value == User.Role.ADMIN:
            if not request.user.is_admin():
                raise serializers.ValidationError(
                    "No tienes permisos para crear administradores."
                )
        return value
    
    def create(self, validated_data):
        """Crea un nuevo usuario."""
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        
        user = User.objects.create_user(
            password=password,
            **validated_data
        )
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    """Serializador para actualizar usuarios."""
    
    class Meta:
        model = User
        fields = [
            'first_name',
            'last_name',
            'phone',
            'documento_id',
            'foto_perfil',
            'is_active'
        ]
    
    def validate(self, attrs):
        """Validaciones adicionales para actualización."""
        request = self.context.get('request')
        instance = self.instance
        
        # Los agentes solo pueden actualizar su propia información
        if request.user.is_agent() and request.user.id != instance.id:
            raise serializers.ValidationError(
                "No tienes permisos para actualizar otros usuarios."
            )
        
        return attrs


class ChangePasswordSerializer(serializers.Serializer):
    """Serializador para cambiar contraseña."""
    
    old_password = serializers.CharField(
        required=True,
        write_only=True,
        style={'input_type': 'password'}
    )
    new_password = serializers.CharField(
        required=True,
        write_only=True,
        style={'input_type': 'password'}
    )
    new_password_confirm = serializers.CharField(
        required=True,
        write_only=True,
        style={'input_type': 'password'}
    )
    
    def validate_old_password(self, value):
        """Valida que la contraseña actual sea correcta."""
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("La contraseña actual es incorrecta.")
        return value
    
    def validate(self, attrs):
        """Valida las contraseñas nuevas en orden: primero coincidencia, luego complejidad."""
        new_password = attrs.get('new_password')
        new_password_confirm = attrs.get('new_password_confirm')
        
        # 1. Primero validar que las contraseñas coincidan
        if new_password != new_password_confirm:
            raise serializers.ValidationError({
                "new_password": "Las contraseñas nuevas no coinciden.",
                "new_password_confirm": "Las contraseñas nuevas no coinciden."
            })
        
        # 2. Luego validar la complejidad de la contraseña
        try:
            validate_password(new_password, user=self.context['request'].user)
        except Exception as e:
            raise serializers.ValidationError({
                "new_password": list(e.messages)
            })
        
        return attrs
    
    def save(self, **kwargs):
        """Guarda la nueva contraseña."""
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save()
        return user
