from rest_framework import serializers
from django.contrib.auth import authenticate
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
