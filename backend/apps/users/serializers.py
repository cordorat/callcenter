from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import User, TiposParametros
from common.estados_helper import get_estado

class UserSerializer(serializers.ModelSerializer):
    """Serializador para mostrar información de usuarios."""
    
    full_name = serializers.ReadOnlyField()
    role = serializers.SerializerMethodField()  # Campo computado para compatibilidad con frontend
    id = serializers.SerializerMethodField()  # Campo id para compatibilidad con frontend
    
    class Meta:
        model = User
        exclude = ['password', 'groups', 'user_permissions']  # Excluir campos sensibles
        read_only_fields = ['documento_id']
    
    def get_role(self, obj):
        """Devuelve el valor del rol como string en inglés para compatibilidad con frontend."""
        if obj.rol:
            # Mapear valores en español a inglés para el frontend
            role_mapping = {
                'AGENTE': 'AGENTE',
                'ADMIN': 'ADMIN',
                'COORDINADOR': 'COORDINADOR',
                'ANALISTA': 'ANALISTA'
            }
            return role_mapping.get(obj.rol.valor, obj.rol.valor)
        return None
    
    def get_id(self, obj):
        """Devuelve documento_id si existe, sino el email como identificador único."""
        return obj.documento_id if obj.documento_id else obj.email


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
    # Permitir enviar 'role' como string (ej: "ADMIN", "AGENT") para compatibilidad con frontend
    role = serializers.CharField(write_only=True, required=False, allow_null=True)
    
    class Meta:
        model = User
        fields = [
            'email',
            'first_name',
            'last_name',
            'phone',
            'documento_id',
            'foto_perfil',
            'rol',
            'role',  # Campo adicional para aceptar string
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
        
        # 3. Convertir 'role' (string) a 'rol' (objeto TiposParametros) si es necesario
        role_string = attrs.pop('role', None)
        if role_string:
            role_mapping = {
                'AGENTE': 'AGENTE',
                'ADMIN': 'ADMIN',
                'COORDINADOR': 'COORDINADOR',
                'ANALISTA': 'ANALISTA'
            }
            # Convertir a español si viene en inglés, o usar el valor original
            role_valor = role_mapping.get(role_string, role_string)
            
            # Buscar el TiposParametros correspondiente
            rol_obj = get_estado('ROL_USUARIO', role_valor)
            if not rol_obj:
                raise serializers.ValidationError({
                    "role": f"Rol '{role_string}' no válido. Debe ser 'ADMIN', 'AGENTE', 'COORDINADOR' o 'ANALISTA'."
                })
            attrs['rol'] = rol_obj
        elif not attrs.get('rol'):
            # Si no se envió ni 'role' ni 'rol', error
            raise serializers.ValidationError({
                "role": "El campo 'role' o 'rol' es requerido."
            })
        
        return attrs
    
    def validate_rol(self, value):
        """Valida que solo los administradores puedan crear otros administradores."""
        request = self.context.get('request')
        if request and value == get_estado('ROL_USUARIO', 'ADMIN'):
            if not request.user.rol==get_estado('ROL_USUARIO', 'ADMIN'):
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
        if request.user.is_agent() and request.user.pk != instance.pk:
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
    
class CambiarEstadoSerializer(serializers.Serializer):
    """Serializer para cambiar el estado de un agente"""
    estado_id = serializers.IntegerField()
    agente_id = serializers.IntegerField(required=False, help_text="ID del agente (si lo cambia un supervisor)")
    
    def validate_estado_id(self, value):
        """Valida que el estado exista y sea del tipo correcto"""
        try:
            estado = TiposParametros.objects.get(
                parametros_id=value,
                nombre='ESTADO_AGENTE'
            )
            return value
        except TiposParametros.DoesNotExist:
            raise serializers.ValidationError("El estado especificado no es válido")
