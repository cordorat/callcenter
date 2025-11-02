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
        source='estado_id.valor',
        read_only=True
    )
    agente_nombre = serializers.CharField(
        source='agente_id.full_name',
        read_only=True
    )
    
    class Meta:
        model = EstadoAgenteDetalle
        fields = [
            'id', 'agente_id', 'agente_nombre', 'estado_id', 'estado_display',
            'tiempo', 'fecha', 'cambios'
        ]
        read_only_fields = []



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
        source='agente_id.full_name',
        read_only=True
    )
    agente_email = serializers.EmailField(
        source='agente_id.email',
        read_only=True
    )
    estado_valor = serializers.CharField(
        source='estado_id.valor',
        read_only=True
    )
    # Campo para compatibilidad con frontend (mismo valor que estado_valor)
    estado = serializers.CharField(
        source='estado_id.valor',
        read_only=True
    )
    estado_display = serializers.CharField(
        source='estado_id.descripcion',
        read_only=True
    )
    duracion_actual = serializers.ReadOnlyField(source='duracion_actual_segundos')
    # Alias para compatibilidad con frontend
    tiempo_en_estado = serializers.ReadOnlyField(source='duracion_actual_segundos')
    
    # Campaña actual del agente (desde equipo_agente_detalle → equipo → campana)
    campana_actual_id = serializers.SerializerMethodField()
    
    # Campos relacionados con capacidad de recibir llamadas
    # Por ahora retornamos valores basados en el estado
    acepta_llamadas = serializers.SerializerMethodField()
    conexion_activa = serializers.SerializerMethodField()
    tiene_audio = serializers.SerializerMethodField()
    puede_recibir_llamadas = serializers.SerializerMethodField()
    
    class Meta:
        model = EstadoAgenteActual
        fields = [
            'agente_id', 'agente_nombre', 'agente_email',
            'estado_id', 'estado_valor', 'estado', 'estado_display',
            'tiempo', 'ultima_actualizacion', 
            'duracion_actual', 'tiempo_en_estado',
            'campana_actual_id',
            'acepta_llamadas', 'conexion_activa', 'tiene_audio', 'puede_recibir_llamadas'
        ]
        read_only_fields = [
            'tiempo', 'ultima_actualizacion', 'duracion_actual', 'tiempo_en_estado',
            'campana_actual_id'
        ]
    
    def get_campana_actual_id(self, obj):
        """
        Obtiene la campaña actual del agente desde:
        equipo_agente_detalle → equipo → campana_id
        
        Retorna el campana_id del primer equipo activo al que pertenece el agente.
        Si el agente está en múltiples equipos, retorna el del primer equipo activo.
        """
        try:
            # Buscar el equipo activo del agente (verificar is_active en el equipo, no en la relación)
            equipo_agente = EquipoAgenteDetalle.objects.filter(
                agente_id=obj.agente_id,
                equipo_id__is_active=True  # Verificar que el equipo esté activo
            ).select_related('equipo_id__campana').first()
            
            if equipo_agente and equipo_agente.equipo_id and equipo_agente.equipo_id.campana:
                # El modelo Campana no define un atributo 'campana_id' en el objeto Django
                # (su PK es el atributo por defecto 'id' o 'pk'). Usamos getattr para
                # soportar ambas posibilidades y mantener robustez.
                campana_obj = equipo_agente.equipo_id.campana
                campana_id = getattr(campana_obj, 'id', None) or getattr(campana_obj, 'pk', None) or getattr(campana_obj, 'campana_id', None)
                agente_ident = getattr(obj.agente_id, 'documento_id', None) or getattr(obj.agente_id, 'email', 'unknown')
                print(f"[get_campana_actual_id] Agente {agente_ident} → Equipo {equipo_agente.equipo_id.nombre} → Campaña ID: {campana_id}")
                return campana_id
            else:
                agente_ident = getattr(obj.agente_id, 'documento_id', None) or getattr(obj.agente_id, 'email', 'unknown')
                print(f"[get_campana_actual_id] Agente {agente_ident} no tiene equipo activo o el equipo no tiene campaña")
            
            return None
        except Exception as e:
            # Log del error pero no fallar la serialización
            import logging
            logger = logging.getLogger(__name__)
            agente_ident = getattr(obj.agente_id, 'documento_id', None) or getattr(obj.agente_id, 'email', str(obj.agente_id))
            logger.error(f"Error obteniendo campana_actual_id para agente {agente_ident}: {e}")
            print(f"[get_campana_actual_id] ERROR para agente {agente_ident}: {e}")
            return None
    
    def get_acepta_llamadas(self, obj):
        """Un agente acepta llamadas si está DISPONIBLE."""
        if not obj.estado_id:
            return False
        return obj.estado_id.valor == 'DISPONIBLE'
    
    def get_conexion_activa(self, obj):
        """Un agente tiene conexión activa si NO está DESCONECTADO."""
        if not obj.estado_id:
            return False
        return obj.estado_id.valor != 'DESCONECTADO'
    
    def get_tiene_audio(self, obj):
        """Por defecto asumimos que tiene audio si está conectado."""
        if not obj.estado_id:
            return False
        return obj.estado_id.valor != 'DESCONECTADO'
    
    def get_puede_recibir_llamadas(self, obj):
        """Un agente puede recibir llamadas solo si está DISPONIBLE."""
        if not obj.estado_id:
            return False
        return obj.estado_id.valor == 'DISPONIBLE'


class CambioEstadoSerializer(serializers.Serializer):
    """Serializer para cambiar el estado de un agente."""
    
    # Estados según la base de datos actual
    ESTADO_CHOICES = [
        ('DISPONIBLE', 'Disponible'),
        ('EN_LLAMADA', 'En Llamada'),
        ('AFTERCALL', 'Post Llamada'),
        ('BREAK', 'Break'),
        ('ALMUERZO', 'Almuerzo'),
        ('CAPACITACION', 'Capacitación'),
        ('BAÑO', 'Baño'),
        ('NO_DISPONIBLE', 'No Disponible'),
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
