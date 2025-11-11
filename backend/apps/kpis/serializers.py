from rest_framework import serializers
from apps.users.models import User
from datetime import date


class AgenteListSerializer(serializers.ModelSerializer):
    """
    Serializer para listar agentes con información básica.
    Usado por coordinadores para ver el listado de agentes.
    """
    id = serializers.CharField(source='documento_id', read_only=True)
    nombre_completo = serializers.SerializerMethodField()
    email = serializers.EmailField()
    estado_actual = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'nombre_completo', 'email', 'phone', 'estado_actual']
    
    def get_nombre_completo(self, obj):
        return obj.get_full_name()
    
    def get_estado_actual(self, obj):
        """Obtiene el estado actual del agente."""
        try:
            estado = obj.estado_actual
            if estado and estado.estado_id:
                return estado.estado_id.valor
        except:
            pass
        return 'SIN_ESTADO'


class KPIAgenteDetailSerializer(serializers.Serializer):
    """
    Serializer para KPI detallado de un agente.
    Incluye: nombre, tiempo trabajado, llamadas, ventas, estado, duración promedio, tasa conversión.
    """
    # Información del agente
    agente_id = serializers.CharField()
    agente_nombre = serializers.CharField()
    agente_email = serializers.EmailField(required=False)
    
    # Período de reporte
    fecha_desde = serializers.DateField()
    fecha_hasta = serializers.DateField()
    
    # KPIs principales
    total_llamadas = serializers.IntegerField()
    ventas_realizadas = serializers.IntegerField()
    tasa_conversion = serializers.FloatField()  # Porcentaje 0-100
    
    # Tiempo trabajado
    tiempo_trabajado_segundos = serializers.IntegerField()
    tiempo_trabajado_formateado = serializers.CharField()
    
    # Duración de llamadas
    duracion_promedio_segundos = serializers.FloatField()
    duracion_promedio_formateado = serializers.CharField()
    
    # Estado actual
    estado_actual = serializers.CharField(required=False)
    
    # Series para gráficas
    llamadas_por_hora = serializers.ListField(child=serializers.DictField(), required=False)


class KPIListSerializer(serializers.Serializer):
    """
    Serializer para lista de query params para filtrar KPIs.
    """
    agente_id = serializers.CharField(required=False)
    fecha_desde = serializers.DateField(required=False)
    fecha_hasta = serializers.DateField(required=False)
    rango = serializers.ChoiceField(
        choices=['hoy', 'semana', 'mes', 'personalizado'],
        default='hoy'
    )
    
    def validate(self, data):
        """Validaciones cruzadas."""
        fecha_desde = data.get('fecha_desde')
        fecha_hasta = data.get('fecha_hasta')
        hoy = date.today()
        
        # Validar que no sean fechas futuras
        if fecha_desde and fecha_desde > hoy:
            raise serializers.ValidationError({'fecha_desde': 'No se pueden elegir fechas futuras'})
        
        if fecha_hasta and fecha_hasta > hoy:
            raise serializers.ValidationError({'fecha_hasta': 'No se pueden elegir fechas futuras'})
        
        # Validar rango de fechas
        if fecha_desde and fecha_hasta and fecha_desde > fecha_hasta:
            raise serializers.ValidationError(
                {'fecha_desde': 'La fecha inicial no puede ser mayor a la fecha posterior'}
            )
        
        return data

class KPICampanaSerializer(serializers.Serializer):
    """
    Serializer para KPIs de campaña (Jefe de Campaña).
    Retorna métricas agregadas de una campaña específica.
    """
    # Identificación de la campaña
    campana_id = serializers.IntegerField(
        help_text='ID de la campaña'
    )
    campana_nombre = serializers.CharField(
        help_text='Nombre de la campaña'
    )
    
    # KPIs principales
    llamadas_activas = serializers.IntegerField(
        help_text='Número de llamadas en curso en este momento'
    )
    agentes_disponibles = serializers.IntegerField(
        help_text='Número de agentes disponibles ahora'
    )
    tiempo_promedio_llamada = serializers.FloatField(
        help_text='Duración promedio de llamadas en segundos'
    )
    llamadas_del_dia = serializers.IntegerField(
        help_text='Total de llamadas realizadas hoy'
    )
    ventas_realizadas = serializers.IntegerField(
        help_text='Total de ventas realizadas en el período'
    )
    tasa_conversion = serializers.FloatField(
        help_text='Tasa de conversión (%) = (ventas / llamadas contestadas) * 100'
    )
    
    # Metadatos
    fecha_consulta = serializers.DateTimeField(
        help_text='Timestamp de cuándo se generaron estos KPIs'
    )
    total_agentes = serializers.IntegerField(
        help_text='Total de agentes asignados a la campaña'
    )
    
class KPICoordinadorSerializer(serializers.Serializer):
    """
    Serializer para KPIs del equipo de un coordinador.
    Incluye métricas agregadas de todos los agentes del equipo.
    """
    # Identificación del equipo/coordinador
    coordinador_id = serializers.CharField(
        help_text='ID del coordinador'
    )
    coordinador_nombre = serializers.CharField(
        help_text='Nombre completo del coordinador'
    )
    total_equipos = serializers.IntegerField(
        help_text='Número de equipos que coordina'
    )
    
    # KPI 1: Llamadas activas (en tiempo real)
    llamadas_activas = serializers.IntegerField(
        help_text='Número de llamadas en curso en este momento'
    )
    
    # KPI 2: Desglose de estados del equipo
    estados_equipo = serializers.DictField(
        child=serializers.IntegerField(),
        help_text='Diccionario con cantidad de agentes por estado {DISPONIBLE: 3, EN_LLAMADA: 2, ...}'
    )
    
    # KPI 3: Tiempo promedio de llamada
    tiempo_promedio_llamada = serializers.FloatField(
        help_text='Duración promedio de llamadas en segundos (período seleccionado)'
    )
    
    # KPI 4: Llamadas del día/período
    llamadas_del_periodo = serializers.IntegerField(
        help_text='Total de llamadas realizadas en el período seleccionado'
    )
    
    # KPI 5: Ventas realizadas
    ventas_realizadas = serializers.IntegerField(
        help_text='Total de ventas realizadas en el período'
    )
    
    # KPI 6: Tasa de conversión
    tasa_conversion = serializers.FloatField(
        help_text='Tasa de conversión (%) = (ventas / llamadas contestadas) * 100'
    )
    
    # KPI 7: Ranking de agentes por ventas
    ranking_agentes = serializers.ListField(
        child=serializers.DictField(),
        help_text='Lista ordenada de agentes con sus ventas [{agente_id, nombre, ventas}, ...]'
    )
    
    # Metadatos
    total_agentes = serializers.IntegerField(
        help_text='Total de agentes en los equipos del coordinador'
    )
    fecha_desde = serializers.DateField(
        help_text='Fecha de inicio del período consultado'
    )
    fecha_hasta = serializers.DateField(
        help_text='Fecha de fin del período consultado'
    )
    fecha_consulta = serializers.DateTimeField(
        help_text='Timestamp de cuándo se generaron estos KPIs'
    )