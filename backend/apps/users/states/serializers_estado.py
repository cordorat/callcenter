"""
Serializadores para gestión de estados de agentes.
"""
from rest_framework import serializers
from django.utils import timezone
from apps.users.models import (
    EstadoAgenteDetalle,
    EstadoAgenteActual,
    TiposParametros,
    User
)
from apps.campaigns.models import Equipo, EquipoAgenteDetalle

class TiposParametrosSerializer(serializers.ModelSerializer):
    """Serializer para tipos de parámetros del sistema."""
    
    class Meta:
        model = TiposParametros
        fields = [
            'parametros_id', 'nombre', 'valor', 'descripcion'
        ]


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



class EstadoAgenteSimpleSerializer(serializers.Serializer):
    """Serializer simple para consultar estado actual de múltiples agentes."""
    
    agente_id = serializers.IntegerField()
    agente_nombre = serializers.CharField()
    agente_email = serializers.EmailField()
    estado = serializers.CharField()
    estado_display = serializers.CharField()
    puede_recibir_llamadas = serializers.BooleanField()
    ultima_actualizacion = serializers.DateTimeField()


class EstadoAgenteActualSerializer(serializers.ModelSerializer):
    """Serializer para el estado actual de un agente."""
    
    agente_nombre = serializers.CharField(
        source='agente.full_name',
        read_only=True
    )
    agente_email = serializers.EmailField(
        source='agente.email',
        read_only=True
    )
    estado_display = serializers.CharField(
        source='get_estado_display',
        read_only=True
    )
    puede_recibir_llamadas = serializers.SerializerMethodField()
    tiempo_en_estado = serializers.SerializerMethodField()
    
    class Meta:
        model = EstadoAgenteActual
        fields = [
            'agente', 'agente_nombre', 'agente_email',
            'estado', 'estado_display', 'hora_inicio_estado',
            'ultima_actualizacion', 'acepta_llamadas', 'conexion_activa',
            'tiene_audio', 'puede_recibir_llamadas', 'tiempo_en_estado',
            'ip_address', 'user_agent', 'comentarios', 'created_at'
        ]
        read_only_fields = [
            'hora_inicio_estado', 'ultima_actualizacion', 'created_at'
        ]
    
    def get_puede_recibir_llamadas(self, obj):
        """Verifica si el agente puede recibir llamadas."""
        return obj.puede_recibir_llamadas()
    
    def get_tiempo_en_estado(self, obj):
        """Retorna el tiempo en el estado actual en segundos."""
        return obj.tiempo_en_estado_actual()


class CambioEstadoSerializer(serializers.Serializer):
    """Serializer para cambiar el estado de un agente."""
    
    # Usamos las mismas opciones que EstadoAgenteActual.EstadoAgente
    ESTADO_CHOICES = [
        ('DISPONIBLE', 'Disponible'),
        ('EN_LLAMADA', 'En Llamada'),
        ('POSTCALL', 'Post Llamada'),
        ('BREAK', 'Break'),
        ('ALMUERZO', 'Almuerzo'),
        ('CAPACITACION', 'Capacitación'),
        ('REUNION', 'Reunión'),
        ('AUSENTE', 'Ausente'),
        ('DESCONECTADO', 'Desconectado'),
    ]
    
    nuevo_estado = serializers.ChoiceField(
        choices=ESTADO_CHOICES,
        required=True,
        help_text='Estado al que se desea cambiar'
    )
    comentarios = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=1000,
        help_text='Motivo del cambio de estado'
    )
    ip_address = serializers.IPAddressField(
        required=False,
        allow_null=True
    )
    user_agent = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=500
    )
    
    def validate_nuevo_estado(self, value):
        """Valida que el estado sea válido."""
        estados_validos = [choice[0] for choice in self.ESTADO_CHOICES]
        if value not in estados_validos:
            raise serializers.ValidationError(
                f"Estado inválido. Opciones: {', '.join(estados_validos)}"
            )
        return value
    
    def validate(self, attrs):
        """Validaciones cruzadas."""
        nuevo_estado = attrs.get('nuevo_estado')
        
        # Validar comentarios para ciertos estados
        estados_requieren_comentario = ['AUSENTE', 'REUNION', 'CAPACITACION']
        if nuevo_estado in estados_requieren_comentario:
            if not attrs.get('comentarios'):
                raise serializers.ValidationError({
                    'comentarios': f'El estado {nuevo_estado} requiere un comentario explicativo'
                })
        
        return attrs
