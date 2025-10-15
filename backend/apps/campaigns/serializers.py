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


# ============================================================
# SERIALIZERS PARA EQUIPOS
# ============================================================

from .models import Equipo, EquipoAgenteDetalle, Campana
from apps.users.models import User
from common.estados_helper import get_estado_id


class AgenteSimpleSerializer(serializers.ModelSerializer):
    """Serializer simple para mostrar información básica de agentes."""
    
    full_name = serializers.CharField(read_only=True)
    codigo_agente = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['documento_id', 'first_name', 'last_name', 'full_name', 'email', 'codigo_agente']
        read_only_fields = fields
    
    def get_codigo_agente(self, obj):
        """Retorna código de agente (documento_id truncado)."""
        return obj.documento_id[:6] if obj.documento_id else None


class CampanaSimpleSerializer(serializers.ModelSerializer):
    """Serializer simple para campañas."""
    
    estado_nombre = serializers.SerializerMethodField()
    
    class Meta:
        model = Campana
        fields = ['id', 'nombre', 'descripcion', 'estado', 'estado_nombre', 'fecha_inicio', 'fecha_fin']
        read_only_fields = fields
    
    def get_estado_nombre(self, obj):
        """Retorna el nombre del estado de la campaña."""
        if obj.estado:
            return obj.estado.valor
        return None


class EquipoSerializer(serializers.ModelSerializer):
    """
    Serializer para lectura de equipos.
    Incluye información detallada de jefe de centro, campaña y agentes.
    """
    jefe_centro_nombre = serializers.SerializerMethodField()
    campana_info = CampanaSimpleSerializer(source='campana', read_only=True)
    agentes = serializers.SerializerMethodField()
    cantidad_agentes = serializers.SerializerMethodField()
    
    class Meta:
        model = Equipo
        fields = [
            'equipo_id', 'nombre', 'jefe_centro', 'jefe_centro_nombre',
            'campana', 'campana_info', 'agentes', 'cantidad_agentes',
            'is_active'
        ]
        read_only_fields = ['equipo_id']
    
    def get_jefe_centro_nombre(self, obj):
        """Retorna el nombre completo del jefe de centro."""
        if obj.jefe_centro:
            return obj.jefe_centro.full_name
        return None
    
    def get_agentes(self, obj):
        """Retorna lista de agentes del equipo."""
        agentes_ids = obj.agentes_detalle.values_list('agente_id', flat=True)
        agentes = User.objects.filter(documento_id__in=agentes_ids)
        return AgenteSimpleSerializer(agentes, many=True).data
    
    def get_cantidad_agentes(self, obj):
        """Retorna la cantidad de agentes en el equipo."""
        return obj.agentes_detalle.count()


class EquipoCreateSerializer(serializers.ModelSerializer):
    """
    Serializer para creación de equipos.
    Valida criterios de la HU:
    - 4.1: Todos los campos son obligatorios
    - 4.2: No se puede repetir un agente en un mismo equipo
    - 4.3: Un agente no puede estar en dos equipos diferentes
    - 4.4: El equipo solo se puede asignar a campañas activas
    """
    agentes_ids = serializers.ListField(
        child=serializers.CharField(),
        write_only=True,
        required=True,
        help_text='Lista de documento_id de agentes a asignar'
    )
    
    class Meta:
        model = Equipo
        fields = ['nombre', 'campana', 'agentes_ids']
    
    def validate_nombre(self, value):
        """Validar que el nombre no esté vacío y sea único."""
        if not value or not value.strip():
            raise serializers.ValidationError('El nombre del equipo es obligatorio.')
        
        if len(value.strip()) < 3:
            raise serializers.ValidationError('El nombre del equipo debe tener al menos 3 caracteres.')
        
        return value.strip()
    
    def validate_campana(self, value):
        """
        Criterio 4.4: El equipo solo se puede asignar a campañas activas.
        """
        if not value:
            raise serializers.ValidationError('La campaña es obligatoria.')
        
        # Verificar que la campaña esté activa
        estado_activo_id = get_estado_id('ESTADO_CAMPANA', 'ACTIVA')
        if value.estado_id != estado_activo_id:
            raise serializers.ValidationError(
                f'La campaña "{value.nombre}" no está activa. Solo se pueden asignar campañas activas.'
            )
        
        return value
    
    def validate_agentes_ids(self, value):
        """
        Validar lista de agentes:
        - Criterio 4.1: No puede estar vacía
        - Criterio 4.2: No se puede repetir un agente en un mismo equipo
        """
        if not value or len(value) == 0:
            raise serializers.ValidationError('Debe seleccionar al menos un agente.')
        
        # Criterio 4.2: Verificar que no haya duplicados
        if len(value) != len(set(value)):
            raise serializers.ValidationError('No se puede repetir un agente en el mismo equipo.')
        
        # Verificar que todos los documento_id existan
        rol_agente_id = get_estado_id('ROL_USUARIO', 'AGENTE')
        agentes_existentes = User.objects.filter(
            documento_id__in=value,
            rol_id=rol_agente_id,
            is_active=True
        )
        
        if agentes_existentes.count() != len(value):
            documentos_no_encontrados = set(value) - set(agentes_existentes.values_list('documento_id', flat=True))
            raise serializers.ValidationError(
                f'Los siguientes documentos no corresponden a agentes activos: {", ".join(documentos_no_encontrados)}'
            )
        
        return value
    
    def validate(self, attrs):
        """
        Validación cruzada:
        - Criterio 4.3: Un agente no puede estar en dos equipos diferentes
        """
        agentes_ids = attrs.get('agentes_ids', [])
        
        # Buscar si alguno de los agentes ya está en un equipo activo
        agentes_en_equipos = EquipoAgenteDetalle.objects.filter(
            agente_id__documento_id__in=agentes_ids,
            equipo_id__is_active=True
        ).select_related('agente_id', 'equipo_id')
        
        if agentes_en_equipos.exists():
            conflictos = []
            for detalle in agentes_en_equipos:
                conflictos.append(
                    f"{detalle.agente_id.full_name} ya está en el equipo '{detalle.equipo_id.nombre}'"
                )
            
            raise serializers.ValidationError({
                'agentes_ids': f'Los siguientes agentes ya están asignados a otros equipos: {"; ".join(conflictos)}'
            })
        
        return attrs
    
    def create(self, validated_data):
        """
        Crear equipo y asignar agentes.
        """
        agentes_ids = validated_data.pop('agentes_ids')
        
        # Obtener jefe_centro del request context
        request = self.context.get('request')
        if not request or not request.user:
            raise serializers.ValidationError('No se pudo identificar al jefe de centro.')
        
        validated_data['jefe_centro'] = request.user
        
        # Crear equipo
        equipo = Equipo.objects.create(**validated_data)
        
        # Asignar agentes
        agentes = User.objects.filter(documento_id__in=agentes_ids)
        for agente in agentes:
            EquipoAgenteDetalle.objects.create(
                equipo_id=equipo,
                agente_id=agente
            )
        
        return equipo
    
    def to_representation(self, instance):
        """Usar EquipoSerializer para la respuesta."""
        return EquipoSerializer(instance, context=self.context).data


class EquipoUpdateSerializer(serializers.ModelSerializer):
    """Serializer para actualización de equipos."""
    
    agentes_ids = serializers.ListField(
        child=serializers.CharField(),
        write_only=True,
        required=False,
        help_text='Lista de documento_id de agentes a asignar'
    )
    
    class Meta:
        model = Equipo
        fields = ['nombre', 'campana', 'is_active', 'agentes_ids']
    
    def validate_campana(self, value):
        """Validar que la campaña esté activa."""
        if value:
            estado_activo_id = get_estado_id('ESTADO_CAMPANA', 'ACTIVA')
            if value.estado_id != estado_activo_id:
                raise serializers.ValidationError(
                    f'La campaña "{value.nombre}" no está activa.'
                )
        return value
    
    def validate_agentes_ids(self, value):
        """Validar lista de agentes."""
        if value is not None:
            if len(value) != len(set(value)):
                raise serializers.ValidationError('No se puede repetir un agente en el mismo equipo.')
            
            # Verificar que existan
            rol_agente_id = get_estado_id('ROL_USUARIO', 'AGENTE')
            agentes_existentes = User.objects.filter(
                documento_id__in=value,
                rol_id=rol_agente_id,
                is_active=True
            )
            
            if agentes_existentes.count() != len(value):
                raise serializers.ValidationError('Algunos agentes no son válidos.')
        
        return value
    
    def update(self, instance, validated_data):
        """Actualizar equipo y agentes si es necesario."""
        agentes_ids = validated_data.pop('agentes_ids', None)
        
        # Actualizar campos del equipo
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Actualizar agentes si se proporcionaron
        if agentes_ids is not None:
            # Eliminar asignaciones actuales
            instance.agentes_detalle.all().delete()
            
            # Crear nuevas asignaciones
            agentes = User.objects.filter(documento_id__in=agentes_ids)
            for agente in agentes:
                EquipoAgenteDetalle.objects.create(
                    equipo_id=instance,
                    agente_id=agente
                )
        
        return instance
    
    def to_representation(self, instance):
        """Usar EquipoSerializer para la respuesta."""
        return EquipoSerializer(instance, context=self.context).data