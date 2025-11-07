from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import User, TiposParametros
from common.estados_helper import get_estado
import re


class UserSerializer(serializers.ModelSerializer):
    """Serializador para mostrar información de usuarios."""

    full_name = serializers.ReadOnlyField()
    # Campo computado para compatibilidad con frontend
    role = serializers.SerializerMethodField()
    # Campo id para compatibilidad con frontend
    id = serializers.SerializerMethodField()

    class Meta:
        model = User
        # Excluir campos sensibles
        exclude = ['password', 'groups', 'user_permissions']
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
    role = serializers.CharField(
        write_only=True, required=False, allow_null=True)

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
                'BACKOFFICE': 'BACKOFFICE',
                'JEFE DE CENTRO': 'JEFE_CENTRO',
                'JEFE DE CAMPAÑA': 'JEFE DE CAMPAÑA'
            }
            # Convertir a español si viene en inglés, o usar el valor original
            role_valor = role_mapping.get(role_string, role_string)

            # Buscar el TiposParametros correspondiente
            rol_obj = get_estado('ROL_USUARIO', role_valor)
            if not rol_obj:
                raise serializers.ValidationError({
                    "role": f"Rol '{role_string}' no válido. Debe ser 'ADMIN', 'AGENTE', 'COORDINADOR', 'BACKOFFICE', 'JEFE DE CENTRO' o 'JEFE DE CAMPAÑA'."
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
            if not request.user.rol == get_estado('ROL_USUARIO', 'ADMIN'):
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
            raise serializers.ValidationError(
                "La contraseña actual es incorrecta.")
        return value

    def validate_new_password(self, value):
        """
        Valida la complejidad de la nueva contraseña.
        Criterio 2.2: Mínimo 8, máximo 16, al menos un número, letra y carácter especial
        """

        # Verificar longitud (ya se valida con min_length/max_length pero lo reforzamos)
        if len(value) < 8 or len(value) > 16:
            raise serializers.ValidationError(
                "La contraseña debe tener entre 8 y 16 caracteres"
            )

        # Verificar que tenga al menos un número
        if not re.search(r'\d', value):
            raise serializers.ValidationError(
                "La contraseña debe contener al menos un número"
            )

        # Verificar que tenga al menos una letra
        if not re.search(r'[a-zA-Z]', value):
            raise serializers.ValidationError(
                "La contraseña debe contener al menos una letra"
            )

        # Verificar que tenga al menos un carácter especial
        if not re.search(r'[!@#$%^&*()_+\-=\[\]{};:\'",.<>?/\\|`~]', value):
            raise serializers.ValidationError(
                "La contraseña debe contener al menos un carácter especial"
            )

        return value

    def validate(self, attrs):
        """Valida las contraseñas nuevas en orden: primero coincidencia, luego complejidad."""
        old_password = attrs.get('old_password')
        new_password = attrs.get('new_password')
        new_password_confirm = attrs.get('new_password_confirm')

        # 1. Primero validar que las contraseñas coincidan
        if new_password != new_password_confirm:
            raise serializers.ValidationError({
                "new_password": "Las contraseñas nuevas no coinciden.",
                "new_password_confirm": "Las contraseñas nuevas no coinciden."
            })

        # 2. Verificar que la nueva contraseña no sea igual a la actual
        if old_password == new_password:
            raise serializers.ValidationError({
                "new_password": "La contraseña nueva no puede ser igual a la anterior"
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
    agente_id = serializers.IntegerField(
        required=False, help_text="ID del agente (si lo cambia un supervisor)")

    def validate_estado_id(self, value):
        """Valida que el estado exista y sea del tipo correcto"""
        try:
            estado = TiposParametros.objects.get(
                parametros_id=value,
                nombre='ESTADO_AGENTE'
            )
            return value
        except TiposParametros.DoesNotExist:
            raise serializers.ValidationError(
                "El estado especificado no es válido")


class ProfileUpdateSerializer(serializers.ModelSerializer):
    """
    Serializador para actualizar el perfil de un usuario.
    Campos: first_name, last_name, email, phone, foto_perfil

    Validaciones:
    - Email debe tener @ y terminar en .com o .co
    - Teléfono solo números, máximo 10 caracteres
    - documento_id es solo lectura (código de usuario)
    """

    # Campo de solo lectura para mostrar el código de usuario
    documento_id = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = [
            'documento_id',  # Código de usuario (solo lectura)
            'first_name',
            'last_name',
            'email',
            'phone',
            'foto_perfil'
        ]
        read_only_fields = ['documento_id']

    def validate_email(self, value):
        """
        Valida que el email tenga @ y termine en .com o .co
        Criterio 2.5.1
        """
        if not value:
            raise serializers.ValidationError(
                "El correo electrónico es obligatorio.")

        # Verificar que tenga @
        if '@' not in value:
            raise serializers.ValidationError(
                "Debe cumplir con el formato abc@nnn.com/.co"
            )

        # Verificar que termine en .com o .co
        if not (value.endswith('.com') or value.endswith('.co')):
            raise serializers.ValidationError(
                "Debe cumplir con el formato abc@nnn.com/.co"
            )

        # Verificar que el email no esté siendo usado por otro usuario
        request = self.context.get('request')
        if request and request.user:
            # Excluir el usuario actual de la búsqueda
            if User.objects.exclude(pk=request.user.pk).filter(email=value).exists():
                raise serializers.ValidationError(
                    "Este correo electrónico ya está en uso."
                )

        return value


    def validate_phone(self, value):
        """
        Valida el formato del teléfono.
        Acepta dos formatos:
        1. Solo números: 10 dígitos (ej: 3001234567)
        2. Con código de país: +XX seguido de 7-15 dígitos (ej: +573001234567)

        Criterio 2.5.2 actualizado
        """
        if not value:
            # El teléfono es opcional, si está vacío está bien
            return value

        # Remover espacios en blanco al inicio y final
        value = value.strip()

        # CASO 1: Número con código de país (comienza con +)
        if value.startswith('+'):
            # Validar formato: +XX... donde XX... son solo dígitos
            numero_sin_mas = value[1:]  # Quitar el símbolo +

            if not numero_sin_mas.isdigit():
                raise serializers.ValidationError(
                    "El formato con código de país debe ser: +XX seguido de números (ej: +573001234567)"
                )

            # Validar longitud: mínimo 8 (+ + 1 dígito país + 7 dígitos número)
            # máximo 16 (+ + 3 dígitos país + 15 dígitos número)
            if len(numero_sin_mas) < 8 or len(numero_sin_mas) > 15:
                raise serializers.ValidationError(
                    "El número con código de país debe tener entre 8 y 15 dígitos después del +"
                )

        # CASO 2: Número sin código de país (solo dígitos)
        else:
            # Verificar que solo contenga dígitos
            if not value.isdigit():
                raise serializers.ValidationError(
                    "Sólo se aceptan números. Si desea incluir código de país, use el formato: +573001234567"
                )

            # Validar longitud: exactamente 10 dígitos para números colombianos
            if len(value) != 10:
                raise serializers.ValidationError(
                    "El teléfono debe tener 10 dígitos o incluir el código de país (ej: +573001234567)"
                )

        return value
