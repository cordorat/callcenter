from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from apps.users.models import User


class LoginSerializer(serializers.Serializer):
    """Serializador para login de usuarios."""
    
    email = serializers.EmailField(required=True)
    password = serializers.CharField(
        required=True,
        write_only=True,
        style={'input_type': 'password'}
    )
    
    def validate(self, attrs):
        """Valida las credenciales del usuario."""
        email = attrs.get('email')
        password = attrs.get('password')
        
        if email and password:
            user = authenticate(
                request=self.context.get('request'),
                username=email,
                password=password
            )
            
            if not user:
                raise serializers.ValidationError(
                    'Las credenciales son incorrectas.',
                    code='authorization'
                )
            
            if not user.is_active:
                raise serializers.ValidationError(
                    'Este usuario ha sido desactivado.',
                    code='authorization'
                )
        else:
            raise serializers.ValidationError(
                'Debe incluir "email" y "password".',
                code='authorization'
            )
        
        attrs['user'] = user
        return attrs


class PasswordResetRequestSerializer(serializers.Serializer):
    """
    Serializador para solicitar recuperación de contraseña.
    Valida que el usuario exista por su email.
    """
    email = serializers.EmailField(
        required=True,
        error_messages={
            'required': 'El correo electrónico es obligatorio',
            'blank': 'El correo electrónico es obligatorio',
            'invalid': 'Ingrese un correo electrónico válido'
        }
    )
    
    def validate(self, attrs):
        """
        Valida que el usuario exista por su email.
        """
        email = attrs.get('email')
        
        # Verificar si el usuario existe por email
        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            raise serializers.ValidationError({
                'email': 'No existe una cuenta asociada a este correo electrónico'
            })
        
        # Verificar que el usuario esté activo
        if not user.is_active:
            raise serializers.ValidationError({
                'email': 'Esta cuenta ha sido desactivada. Contacta al administrador.'
            })
        
        attrs['user'] = user
        return attrs


class PasswordResetConfirmSerializer(serializers.Serializer):
    """
    Serializador para confirmar el reseteo de contraseña con el token.
    Valida que las contraseñas cumplan los requisitos y coincidan.
    """
    token = serializers.CharField(
        required=True,
        max_length=64,
        error_messages={
            'required': 'El token es obligatorio',
            'blank': 'El token es obligatorio'
        }
    )
    
    new_password = serializers.CharField(
        required=True,
        write_only=True,
        min_length=8,
        max_length=16,
        style={'input_type': 'password'},
        error_messages={
            'required': 'La nueva contraseña es obligatoria',
            'blank': 'La nueva contraseña es obligatoria',
            'min_length': 'La contraseña debe tener al menos 8 caracteres',
            'max_length': 'La contraseña no puede exceder 16 caracteres'
        }
    )
    
    confirm_password = serializers.CharField(
        required=True,
        write_only=True,
        min_length=8,
        max_length=16,
        style={'input_type': 'password'},
        error_messages={
            'required': 'Debe confirmar la contraseña',
            'blank': 'Debe confirmar la contraseña',
            'min_length': 'La contraseña debe tener al menos 8 caracteres',
            'max_length': 'La contraseña no puede exceder 16 caracteres'
        }
    )
    
    def validate_new_password(self, value):
        """
        Valida que la contraseña cumpla con los requisitos del sistema.
        Utiliza los validadores de Django configurados en settings.py
        """
        try:
            validate_password(value)
        except DjangoValidationError as e:
            # Convertir errores de Django a errores de DRF
            raise serializers.ValidationError(list(e.messages))
        
        return value
    
    def validate(self, attrs):
        """
        Valida que las contraseñas coincidan.
        """
        new_password = attrs.get('new_password')
        confirm_password = attrs.get('confirm_password')
        
        if new_password != confirm_password:
            raise serializers.ValidationError({
                'confirm_password': 'Las contraseñas no coinciden'
            })
        
        return attrs
