"""
Serializadores para gestión de estados de agentes.
"""
from rest_framework import serializers
from django.utils import timezone
from apps.users.models import (
    EstadoAgenteDetalle,
    EstadoAgenteActual,
    TiposParametros,
    Equipo,
    EquipoAgenteDetalle,
    User
)


class TiposParametrosSerializer(serializers.ModelSerializer):
    """Serializer para tipos de parámetros del sistema."""
    
    categoria_display = serializers.CharField(
        source='get_categoria_display',
        read_only=True
    )
    
    class Meta:
        model = TiposParametros
        fields = [
            'id', 'categoria', 'categoria_display', 'codigo', 'nombre',
            'descripcion', 'color', 'icono', 'orden', 'activo',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class EquipoSerializer(serializers.ModelSerializer):
    """Serializer para equipos de trabajo."""
    
    supervisor_nombre = serializers.CharField(
        source='supervisor.full_name',
        read_only=True
    )
    total_agentes = serializers.SerializerMethodField()
    
    class Meta:
        model = Equipo
        fields = [
            'id', 'nombre', 'descripcion', 'supervisor', 'supervisor_nombre',
            'total_agentes', 'activo', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']
    
    def get_total_agentes(self, obj):
        """Cuenta agentes activos en el equipo."""
        return obj.agentes_detalle.filter(activo=True).count()


class EquipoAgenteDetalleSerializer(serializers.ModelSerializer):
    """Serializer para relación equipo-agente."""
    
    equipo_nombre = serializers.CharField(
        source='equipo.nombre',
        read_only=True
    )
    agente_nombre = serializers.CharField(
        source='agente.full_name',
        read_only=True
    )
    agente_email = serializers.EmailField(
        source='agente.email',
        read_only=True
    )
    
    class Meta:
        model = EquipoAgenteDetalle
        fields = [
            'id', 'equipo', 'equipo_nombre', 'agente', 'agente_nombre',
            'agente_email', 'fecha_asignacion', 'activo',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class EstadoAgenteDetalleSerializer(serializers.ModelSerializer):
    """Serializer para historial de estados de agente."""
    
    estado_display = serializers.CharField(
        source='get_estado_display',
        read_only=True
    )
    agente_nombre = serializers.CharField(
        source='agente.full_name',
        read_only=True
    )
    duracion_formateada = serializers.ReadOnlyField()
    esta_activo = serializers.ReadOnlyField()
    
    class Meta:
        model = EstadoAgenteDetalle
        fields = [
            'id', 'agente', 'agente_nombre', 'estado', 'estado_display',
            'estado_parametro', 'fecha', 'hora_inicio', 'hora_fin',
            'duracion_segundos', 'duracion_formateada', 'esta_activo',
            'comentarios', 'ip_address', 'user_agent', 'created_at'
        ]
        read_only_fields = ['created_at', 'duracion_segundos']


class EstadoAgenteActualSerializer(serializers.ModelSerializer):
    """Serializer para estado actual de agente."""
    
    estado_display = serializers.CharField(
        source='get_estado_display',
        read_only=True
    )
    agente_nombre = serializers.CharField(
        source='agente.full_name',
        read_only=True
    )
    agente_email = serializers.EmailField(
        source='agente.email',
        read_only=True
    )
    puede_recibir_llamadas = serializers.ReadOnlyField()
    
    class Meta:
        model = EstadoAgenteActual
        fields = [
            'agente', 'agente_nombre', 'agente_email', 'estado',
            'estado_display', 'ultima_actualizacion', 'detalle',
            'acepta_llamadas', 'tiene_audio', 'conexion_activa',
            'puede_recibir_llamadas'
        ]
        read_only_fields = ['ultima_actualizacion']


class CambioEstadoSerializer(serializers.Serializer):
    """
    Serializer para cambiar el estado de un agente.
    Valida que se cumplan los requisitos antes del cambio.
    """
    estado = serializers.ChoiceField(
        choices=EstadoAgenteDetalle.EstadoAgente.choices,
        help_text='Nuevo estado del agente'
    )
    comentarios = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=500,
        help_text='Comentarios opcionales sobre el cambio'
    )
    
    # Campos de configuración (solo relevantes para estado DISPONIBLE)
    tiene_audio = serializers.BooleanField(
        required=False,
        default=False,
        help_text='Audio/micrófono configurado correctamente'
    )
    conexion_activa = serializers.BooleanField(
        required=False,
        default=False,
        help_text='Conexión a internet activa'
    )
    
    def validate(self, attrs):
        """Validaciones de negocio para cambio de estado."""
        request = self.context.get('request')
        user = request.user
        nuevo_estado = attrs.get('estado')
        
        # Solo agentes pueden cambiar su estado
        if not user.is_agent():
            raise serializers.ValidationError(
                'Solo los agentes pueden cambiar su estado.'
            )
        
        # Si cambia a DISPONIBLE, validar requisitos
        if nuevo_estado == EstadoAgenteDetalle.EstadoAgente.DISPONIBLE:
            tiene_audio = attrs.get('tiene_audio', False)
            conexion_activa = attrs.get('conexion_activa', False)
            
            if not tiene_audio:
                raise serializers.ValidationError({
                    'tiene_audio': 'Debe tener audio/micrófono configurado para estar disponible.'
                })
            
            if not conexion_activa:
                raise serializers.ValidationError({
                    'conexion_activa': 'Debe tener conexión a internet activa para estar disponible.'
                })
            
            # Validar que no tenga llamadas pendientes
            from apps.calls.models import Llamada
            llamadas_pendientes = Llamada.objects.filter(
                agente=user,
                estado_llamada__in=[
                    'EN_CURSO',
                    'TIMBRADO'
                ]
            ).exists()
            
            if llamadas_pendientes:
                raise serializers.ValidationError(
                    'No puede cambiar a disponible mientras tenga llamadas pendientes.'
                )
            
            # Validar que no tenga formularios incompletos
            formularios_pendientes = Llamada.objects.filter(
                agente=user,
                formulario__isnull=False,
                formulario__completado=False
            ).exists()
            
            if formularios_pendientes:
                raise serializers.ValidationError(
                    'Debe completar todos los formularios pendientes antes de estar disponible.'
                )
        
        return attrs
    
    def create(self, validated_data):
        """Crea un nuevo registro de estado para el agente."""
        request = self.context.get('request')
        user = request.user
        
        # Obtener IP y User-Agent del request
        ip_address = self.get_client_ip(request)
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        
        # Cerrar el estado anterior si existe
        try:
            estado_actual = EstadoAgenteActual.objects.get(agente=user)
            if estado_actual.detalle and estado_actual.detalle.esta_activo:
                detalle_anterior = estado_actual.detalle
                detalle_anterior.hora_fin = timezone.now()
                detalle_anterior.save()
        except EstadoAgenteActual.DoesNotExist:
            pass
        
        # Crear nuevo registro de estado
        nuevo_detalle = EstadoAgenteDetalle.objects.create(
            agente=user,
            estado=validated_data['estado'],
            comentarios=validated_data.get('comentarios', ''),
            ip_address=ip_address,
            user_agent=user_agent[:255]
        )
        
        # Actualizar o crear estado actual
        estado_actual, created = EstadoAgenteActual.objects.get_or_create(
            agente=user,
            defaults={
                'estado': validated_data['estado'],
                'detalle': nuevo_detalle
            }
        )
        
        if not created:
            estado_actual.estado = validated_data['estado']
            estado_actual.detalle = nuevo_detalle
            
            # Actualizar flags de configuración
            if validated_data['estado'] == EstadoAgenteDetalle.EstadoAgente.DISPONIBLE:
                estado_actual.acepta_llamadas = True
                estado_actual.tiene_audio = validated_data.get('tiene_audio', True)
                estado_actual.conexion_activa = validated_data.get('conexion_activa', True)
            else:
                estado_actual.acepta_llamadas = False
            
            estado_actual.save()
        
        return nuevo_detalle
    
    def get_client_ip(self, request):
        """Obtiene la IP del cliente desde el request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class EstadoAgenteSimpleSerializer(serializers.Serializer):
    """Serializer simple para consultar estado actual de múltiples agentes."""
    
    agente_id = serializers.IntegerField()
    agente_nombre = serializers.CharField()
    agente_email = serializers.EmailField()
    estado = serializers.CharField()
    estado_display = serializers.CharField()
    puede_recibir_llamadas = serializers.BooleanField()
    ultima_actualizacion = serializers.DateTimeField()
