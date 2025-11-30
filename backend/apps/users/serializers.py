from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import User, TiposParametros, Centro
from common.estados_helper import get_estado
import re
import base64


# =============================================================================
# Funciones auxiliares para manejo de imágenes base64
# =============================================================================

def convert_image_to_base64(image_input):
    """
    Convierte una imagen a formato base64.
    
    Args:
        image_input: Puede ser:
            - String base64 (ya convertido) → devuelve tal cual
            - URL (http/https) → descarga y convierte
            - Archivo binario → convierte
    
    Returns:
        String en formato "data:image/{format};base64,{base64_string}"
        o None si hay error
    """
    try:
        # Caso 1: Ya es base64
        if isinstance(image_input, str):
            if image_input.startswith('data:image'):
                return image_input
            
            # Caso 2: Es una URL
            if image_input.startswith('http://') or image_input.startswith('https://'):
                # Configurar headers para simular navegador
                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
                response = requests.get(
                    image_input, 
                    timeout=15,
                    headers=headers,
                    verify=True
                )
                response.raise_for_status()
                image_data = response.content
                
                # Detectar formato de imagen
                img = Image.open(BytesIO(image_data))
                img_format = img.format.lower()
                
                # Convertir a base64
                base64_data = base64.b64encode(image_data).decode('utf-8')
                return f"data:image/{img_format};base64,{base64_data}"
        
        # Caso 3: Es un archivo binario (UploadedFile, bytes, etc)
        if hasattr(image_input, 'read'):
            image_data = image_input.read()
        else:
            image_data = image_input
        
        # Detectar formato
        img = Image.open(BytesIO(image_data))
        img_format = img.format.lower()
        
        # Convertir a base64
        base64_data = base64.b64encode(image_data).decode('utf-8')
        return f"data:image/{img_format};base64,{base64_data}"
        
    except requests.RequestException as e:
        # Error específico de requests (timeout, conexión, etc)
        print(f"Error al descargar imagen desde URL: {str(e)}")
        return None
    except Exception as e:
        # Otros errores (PIL, encoding, etc)
        print(f"Error al procesar imagen: {str(e)}")
        return None


def validate_base64_image(value):
    """
    Valida que un string sea una imagen base64 válida.
    
    Args:
        value: String a validar
    
    Returns:
        True si es válido, False si no
    """
    if not value:
        return True  # Campo vacío es válido (opcional)
    
    # Debe empezar con data:image/
    if not value.startswith('data:image/'):
        return False
    
    # Debe contener ;base64,
    if ';base64,' not in value:
        return False
    
    try:
        # Extraer la parte base64
        base64_data = value.split(';base64,')[1]
        # Intentar decodificar
        base64.b64decode(base64_data)
        return True
    except Exception:
        return False


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
    
    def validate_foto_perfil(self, value):
        """Valida que la foto de perfil esté en formato base64."""
        if not value:
            return value
        
        # Validar que sea base64 válido
        if not validate_base64_image(value):
            raise serializers.ValidationError(
                "El formato de la imagen no es válido. Debe ser una imagen en formato base64."
            )
        
        return value

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
    
    def validate_foto_perfil(self, value):
        """Valida que la foto de perfil esté en formato base64."""
        if not value:
            return value
        
        # Validar que sea base64 válido
        if not validate_base64_image(value):
            raise serializers.ValidationError(
                "El formato de la imagen no es válido. Debe ser una imagen en formato base64."
            )
        
        return value

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


class AdminUserUpdateSerializer(serializers.ModelSerializer):
    """
    Serializador para actualización completa de usuarios por administrador.
    Cumple con HU: Actualizar los datos de un Usuario (Administrador).
    
    Campos editables:
    - Nombre completo (first_name, last_name)
    - Correo electrónico (email)
    - Teléfono (phone)
    - Rol (role/rol)
    - Estado (is_active)
    - Contraseña (password, opcional)
    """
    
    # Campo 'role' para compatibilidad con frontend (acepta strings como 'ADMIN', 'AGENTE')
    role = serializers.CharField(
        write_only=True,
        required=False,
        allow_null=True,
        help_text="Rol del usuario (ADMIN, AGENTE, COORDINADOR, etc.)"
    )
    
    # Campo password opcional para cambio de contraseña
    password = serializers.CharField(
        write_only=True,
        required=False,
        allow_blank=True,
        style={'input_type': 'password'},
        help_text="Nueva contraseña (opcional)"
    )
    
    # Campo computado para mostrar el rol actual
    current_role = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = User
        fields = [
            'first_name',
            'last_name',
            'email',
            'phone',
            'rol',
            'role',  # Campo adicional para aceptar string
            'current_role',  # Campo de solo lectura
            'is_active',
            'password'
        ]
        extra_kwargs = {
            'first_name': {'required': True},
            'last_name': {'required': True},
            'email': {'required': True},
            'phone': {'required': True},
            'is_active': {'required': True}
        }

    def get_current_role(self, obj):
        """Devuelve el rol actual del usuario."""
        if obj.rol:
            return obj.rol.valor
        return None

    def validate_email(self, value):
        """
        Valida que el email cumpla con el formato requerido.
        Criterio 2.2: El correo debe contener el dominio.
        """
        if not value:
            raise serializers.ValidationError(
                "El correo electrónico es obligatorio."
            )

        # Verificar que tenga @
        if '@' not in value:
            raise serializers.ValidationError(
                "El correo debe contener un dominio válido (ej: usuario@dominio.com)"
            )

        # Verificar que tenga un dominio después del @
        partes = value.split('@')
        if len(partes) != 2 or not partes[1] or '.' not in partes[1]:
            raise serializers.ValidationError(
                "El correo debe contener un dominio válido (ej: usuario@dominio.com)"
            )

        # Verificar que el email no esté siendo usado por otro usuario
        if self.instance:
            # En actualización, excluir el usuario actual
            if User.objects.exclude(pk=self.instance.pk).filter(email=value).exists():
                raise serializers.ValidationError(
                    "Este correo electrónico ya está en uso por otro usuario."
                )
        else:
            # En creación (no debería pasar pero por seguridad)
            if User.objects.filter(email=value).exists():
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
        
        Criterio 2.2: El teléfono debe contener solo números y contener solo 10 caracteres
        (o formato internacional con +).
        """
        if not value:
            raise serializers.ValidationError(
                "El teléfono es obligatorio."
            )

        # Remover espacios en blanco
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
            # Verificar que solo contenga números
            if not value.isdigit():
                raise serializers.ValidationError(
                    "El teléfono debe contener solo números. Si desea incluir código de país, use el formato: +573001234567"
                )

            # Verificar que tenga exactamente 10 dígitos
            if len(value) != 10:
                raise serializers.ValidationError(
                    "El teléfono debe contener exactamente 10 dígitos o incluir el código de país (ej: +573001234567)"
                )

        return value

    def validate_password(self, value):
        """
        Valida la complejidad de la contraseña si se proporciona.
        Criterio 2.2: La contraseña deberá tener mínimo 8 caracteres, una minúscula, 
        una mayúscula, un número y un caracter especial.
        """
        # Si no se proporciona contraseña o está vacía, no validar
        if not value:
            return value

        # Verificar longitud mínima
        if len(value) < 8:
            raise serializers.ValidationError(
                "La contraseña debe tener al menos 8 caracteres."
            )

        # Verificar que tenga al menos una minúscula
        if not re.search(r'[a-z]', value):
            raise serializers.ValidationError(
                "La contraseña debe contener al menos una letra minúscula."
            )

        # Verificar que tenga al menos una mayúscula
        if not re.search(r'[A-Z]', value):
            raise serializers.ValidationError(
                "La contraseña debe contener al menos una letra mayúscula."
            )

        # Verificar que tenga al menos un número
        if not re.search(r'\d', value):
            raise serializers.ValidationError(
                "La contraseña debe contener al menos un número."
            )

        # Verificar que tenga al menos un carácter especial
        if not re.search(r'[!@#$%^&*()_+\-=\[\]{};:\'",.<>?/\\|`~]', value):
            raise serializers.ValidationError(
                "La contraseña debe contener al menos un carácter especial."
            )

        return value

    def validate(self, attrs):
        """
        Validaciones cruzadas y conversión de 'role' a 'rol'.
        """
        # Convertir 'role' (string) a 'rol' (objeto TiposParametros) si se proporciona
        role_string = attrs.pop('role', None)
        
        if role_string:
            # Mapear valores comunes a los valores en la base de datos
            role_mapping = {
                'AGENTE': 'AGENTE',
                'ADMIN': 'ADMIN',
                'COORDINADOR': 'COORDINADOR',
                'BACKOFFICE': 'BACKOFFICE',
                'JEFE DE CENTRO': 'JEFE_CENTRO',
                'JEFE_CENTRO': 'JEFE_CENTRO',
                'JEFE DE CAMPAÑA': 'JEFE_CAMPANA',
                'JEFE_CAMPANA': 'JEFE_CAMPANA'
            }
            
            # Convertir a valor de base de datos
            role_valor = role_mapping.get(role_string.upper(), role_string.upper())
            
            # Buscar el TiposParametros correspondiente
            rol_obj = get_estado('ROL_USUARIO', role_valor)
            if not rol_obj:
                raise serializers.ValidationError({
                    "role": f"Rol '{role_string}' no válido. Debe ser 'ADMIN', 'AGENTE', 'COORDINADOR', 'BACKOFFICE', 'JEFE_CENTRO' o 'JEFE_CAMPANA'."
                })
            attrs['rol'] = rol_obj

        return attrs

    def update(self, instance, validated_data):
        """
        Actualiza el usuario con los datos validados.
        Si se proporciona contraseña, la actualiza también.
        """
        # Extraer password si se proporciona
        password = validated_data.pop('password', None)
        
        # Actualizar campos normales
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        # Actualizar password si se proporcionó
        if password:
            instance.set_password(password)
        
        instance.save()
        return instance


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
    
    def validate_foto_perfil(self, value):
        """Valida que la foto de perfil esté en formato base64."""
        if not value:
            return value
        
        # Validar que sea base64 válido
        if not validate_base64_image(value):
            raise serializers.ValidationError(
                "El formato de la imagen no es válido. Debe ser una imagen en formato base64."
            )
        
        return value

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


# =============================================================================
# Serializadores para Centro
# =============================================================================

class CentroSerializer(serializers.ModelSerializer):
    """
    Serializador para lectura de Centros.
    Incluye información del Jefe de Centro si existe.
    """
    # Información del jefe de centro (solo lectura)
    jefe_centro_nombre = serializers.SerializerMethodField()
    jefe_centro_email = serializers.SerializerMethodField()
    
    class Meta:
        model = Centro
        fields = [
            'id',
            'nombre',
            'direccion',
            'jefe_centro',
            'jefe_centro_nombre',
            'jefe_centro_email',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_jefe_centro_nombre(self, obj):
        """Devuelve el nombre completo del jefe de centro."""
        if obj.jefe_centro:
            return obj.jefe_centro.full_name
        return None
    
    def get_jefe_centro_email(self, obj):
        """Devuelve el email del jefe de centro."""
        if obj.jefe_centro:
            return obj.jefe_centro.email
        return None


class CentroCreateSerializer(serializers.ModelSerializer):
    """
    Serializador para crear Centros.
    Valida que el jefe de centro tenga el rol correcto.
    """
    
    class Meta:
        model = Centro
        fields = [
            'nombre',
            'direccion',
            'jefe_centro'
        ]
    
    def validate_nombre(self, value):
        """Valida que el nombre no esté vacío y sea único."""
        if not value or not value.strip():
            raise serializers.ValidationError(
                "El nombre del centro es obligatorio."
            )
        
        # Verificar que no exista otro centro con el mismo nombre
        if Centro.objects.filter(nombre__iexact=value.strip()).exists():
            raise serializers.ValidationError(
                "Ya existe un centro con este nombre."
            )
        
        return value.strip()
    
    def validate_direccion(self, value):
        """Valida que la dirección no esté vacía."""
        if not value or not value.strip():
            raise serializers.ValidationError(
                "La dirección del centro es obligatoria."
            )
        return value.strip()
    
    def validate_jefe_centro(self, value):
        """
        Valida que el jefe de centro:
        1. Exista en el sistema
        2. Tenga el rol JEFE_CENTRO
        3. Esté activo
        4. No sea jefe de otro centro (opcional, puedes quitarlo si un jefe puede tener múltiples centros)
        """
        if value is None:
            # El jefe de centro es opcional en la creación
            return value
        
        # Verificar que el usuario esté activo
        if not value.is_active:
            raise serializers.ValidationError(
                "El usuario seleccionado no está activo."
            )
        
        # Verificar que tenga el rol correcto
        rol_jefe_centro = get_estado('ROL_USUARIO', 'JEFE_CENTRO')
        if value.rol != rol_jefe_centro:
            raise serializers.ValidationError(
                f"El usuario seleccionado no tiene el rol de Jefe de Centro. "
                f"Rol actual: {value.get_role_display()}"
            )
        
        # Verificar que no sea jefe de otro centro
        centro_existente = Centro.objects.filter(jefe_centro=value).first()
        if centro_existente:
            raise serializers.ValidationError(
                f"Este usuario ya es jefe del centro '{centro_existente.nombre}'."
            )
        
        return value
    
    def create(self, validated_data):
        """Crea un nuevo centro."""
        return Centro.objects.create(**validated_data)


class CentroUpdateSerializer(serializers.ModelSerializer):
    """
    Serializador para actualizar Centros.
    Permite actualización parcial de campos.
    """
    
    class Meta:
        model = Centro
        fields = [
            'nombre',
            'direccion',
            'jefe_centro'
        ]
    
    def validate_nombre(self, value):
        """Valida que el nombre no esté vacío y sea único (excluyendo el actual)."""
        if not value or not value.strip():
            raise serializers.ValidationError(
                "El nombre del centro es obligatorio."
            )
        
        # Verificar que no exista otro centro con el mismo nombre (excluyendo el actual)
        if self.instance:
            if Centro.objects.filter(nombre__iexact=value.strip()).exclude(pk=self.instance.pk).exists():
                raise serializers.ValidationError(
                    "Ya existe un centro con este nombre."
                )
        
        return value.strip()
    
    def validate_direccion(self, value):
        """Valida que la dirección no esté vacía."""
        if not value or not value.strip():
            raise serializers.ValidationError(
                "La dirección del centro es obligatoria."
            )
        return value.strip()
    
    def validate_jefe_centro(self, value):
        """
        Valida que el jefe de centro tenga el rol correcto.
        Permite desasignar (value=None) o cambiar a otro jefe válido.
        """
        if value is None:
            # Permitir desasignar el jefe de centro
            return value
        
        # Verificar que el usuario esté activo
        if not value.is_active:
            raise serializers.ValidationError(
                "El usuario seleccionado no está activo."
            )
        
        # Verificar que tenga el rol correcto
        rol_jefe_centro = get_estado('ROL_USUARIO', 'JEFE_CENTRO')
        if value.rol != rol_jefe_centro:
            raise serializers.ValidationError(
                f"El usuario seleccionado no tiene el rol de Jefe de Centro. "
                f"Rol actual: {value.get_role_display()}"
            )
        
        # Verificar que no sea jefe de otro centro (excluyendo el actual)
        if self.instance:
            centro_existente = Centro.objects.filter(jefe_centro=value).exclude(pk=self.instance.pk).first()
            if centro_existente:
                raise serializers.ValidationError(
                    f"Este usuario ya es jefe del centro '{centro_existente.nombre}'."
                )
        
        return value
    
    def update(self, instance, validated_data):
        """Actualiza el centro con los datos validados."""
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


class CentroListSerializer(serializers.ModelSerializer):
    """
    Serializador simplificado para listar Centros.
    Útil para dropdowns y selects en el frontend.
    """
    jefe_centro_nombre = serializers.SerializerMethodField()
    
    class Meta:
        model = Centro
        fields = [
            'id',
            'nombre',
            'jefe_centro',
            'jefe_centro_nombre'
        ]
    
    def get_jefe_centro_nombre(self, obj):
        """Devuelve el nombre completo del jefe de centro."""
        if obj.jefe_centro:
            return obj.jefe_centro.full_name
        return None
