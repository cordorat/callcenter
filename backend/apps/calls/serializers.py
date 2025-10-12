"""
Serializadores para gestión de llamadas del call center.
"""
from rest_framework import serializers
from django.utils import timezone
from apps.calls.models import Llamada, IteracionCliente, Venta, FormularioVenta
from apps.campaigns.models import Cliente, Campana
from apps.users.models import User, EstadoAgenteActual, EstadoAgenteDetalle


class ClienteSerializer(serializers.ModelSerializer):
    """Serializer para clientes."""
    
    nombre_completo = serializers.ReadOnlyField()
    
    class Meta:
        model = Cliente
        fields = [
            'id', 'nombre', 'apellido', 'nombre_completo', 'telefono',
            'telefono_alternativo', 'email', 'documento_id', 'direccion',
            'ciudad', 'pais', 'notas', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']
    
    def validate_documento_id(self, value):
        """Valida que el documento sea único."""
        if value:
            instance = self.instance
            if Cliente.objects.filter(documento_id=value).exclude(
                id=instance.id if instance else None
            ).exists():
                raise serializers.ValidationError(
                    'Ya existe un cliente con este documento.'
                )
        return value


class CampanaSerializer(serializers.ModelSerializer):
    """Serializer para campañas."""
    
    tipo_display = serializers.CharField(
        source='get_tipo_display',
        read_only=True
    )
    total_llamadas = serializers.SerializerMethodField()
    llamadas_completadas = serializers.SerializerMethodField()
    
    class Meta:
        model = Campana
        fields = [
            'id', 'nombre', 'descripcion', 'tipo', 'tipo_display',
            'fecha_inicio', 'fecha_fin', 'objetivo_llamadas',
            'objetivo_ventas', 'activo', 'total_llamadas',
            'llamadas_completadas', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']
    
    def get_total_llamadas(self, obj):
        """Cuenta total de llamadas de la campaña."""
        return obj.llamadas.count()
    
    def get_llamadas_completadas(self, obj):
        """Cuenta llamadas completadas de la campaña."""
        # TODO: Actualizar cuando se defina el nuevo campo de estado
        return obj.llamadas.filter(
            estado_llamada_id__isnull=False
        ).count()


# FormularioLlamadaSerializer - DEPRECADO: Modelo eliminado en refactorización
# class FormularioLlamadaSerializer(serializers.ModelSerializer):
#     """Serializer para formularios de llamada."""
#     
#     class Meta:
#         model = FormularioLlamada
#         fields = [
#             'id', 'llamada', 'campos_json', 'completado',
#             'fecha_completado', 'created_at', 'updated_at'
#         ]
#         read_only_fields = ['created_at', 'updated_at', 'fecha_completado']
#     
#     def validate_campos_json(self, value):
#         """Valida que campos_json sea un diccionario válido."""
#         if not isinstance(value, dict):
#             raise serializers.ValidationError(
#                 'Los campos deben ser un objeto JSON válido.'
#             )
#         return value


class LlamadaSerializer(serializers.ModelSerializer):
    """Serializer para lectura de llamadas."""
    
    estado_llamada_display = serializers.CharField(
        source='get_estado_llamada_display',
        read_only=True
    )
    tipo_llamada_display = serializers.CharField(
        source='get_tipo_llamada_display',
        read_only=True
    )
    agente_nombre = serializers.CharField(
        source='agente.full_name',
        read_only=True
    )
    cliente_nombre = serializers.CharField(
        source='cliente.nombre_completo',
        read_only=True
    )
    campana_nombre = serializers.CharField(
        source='campana.nombre',
        read_only=True
    )
    duracion_timbrado_formateada = serializers.ReadOnlyField()
    duracion_llamada_formateada = serializers.ReadOnlyField()
    duracion_total_formateada = serializers.ReadOnlyField()
    
    class Meta:
        model = Llamada
        fields = [
            'id', 'llamada_sid', 'agente', 'agente_nombre', 'cliente',
            'cliente_nombre', 'campana', 'campana_nombre', 'tipo_llamada',
            'tipo_llamada_display', 'estado_llamada', 'estado_llamada_display',
            'telefono_origen', 'telefono_destino', 'hora_inicio_timbrado',
            'hora_inicio_llamada', 'hora_fin_llamada', 'duracion_timbrado_segundos',
            'duracion_timbrado_formateada', 'duracion_llamada_segundos',
            'duracion_llamada_formateada', 'duracion_total_segundos',
            'duracion_total_formateada', 'grabacion_url', 'motivo_rechazo',
            'notas', 'agente_anterior', 'intentos_redireccion', 'formulario',
            'metadata', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'created_at', 'updated_at', 'duracion_timbrado_segundos',
            'duracion_llamada_segundos', 'duracion_total_segundos'
        ]


class RecibirLlamadaSerializer(serializers.Serializer):
    """Serializer para recibir una llamada entrante."""
    
    llamada_sid = serializers.CharField(
        max_length=50,
        help_text='SID de la llamada de Twilio'
    )
    telefono_origen = serializers.CharField(
        max_length=20,
        help_text='Número del que llama'
    )
    telefono_destino = serializers.CharField(
        max_length=20,
        help_text='Número al que se llama'
    )
    cliente_id = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text='ID del cliente (si ya existe)'
    )
    campana_id = serializers.IntegerField(
        help_text='ID de la campaña asociada'
    )
    
    def validate(self, attrs):
        """Validaciones de negocio para recibir llamada."""
        request = self.context.get('request')
        user = request.user
        
        # Validar que el usuario sea agente
        if not user.is_agent():
            raise serializers.ValidationError(
                'Solo los agentes pueden recibir llamadas.'
            )
        
        # Validar que el agente esté disponible
        try:
            estado_actual = EstadoAgenteActual.objects.get(agente=user)
            if not estado_actual.puede_recibir_llamadas:
                raise serializers.ValidationError({
                    'agente': f'El agente no está disponible. Estado actual: {estado_actual.get_estado_display()}'
                })
        except EstadoAgenteActual.DoesNotExist:
            raise serializers.ValidationError(
                'No se encontró el estado del agente.'
            )
        
        # Validar que la campaña exista y esté activa
        campana_id = attrs.get('campana_id')
        try:
            campana = Campana.objects.get(id=campana_id, activo=True)
            attrs['campana'] = campana
        except Campana.DoesNotExist:
            raise serializers.ValidationError({
                'campana_id': 'La campaña no existe o no está activa.'
            })
        
        # Validar que el cliente exista si se proporciona
        cliente_id = attrs.get('cliente_id')
        if cliente_id:
            try:
                cliente = Cliente.objects.get(id=cliente_id)
                attrs['cliente'] = cliente
            except Cliente.DoesNotExist:
                raise serializers.ValidationError({
                    'cliente_id': 'El cliente no existe.'
                })
        
        # Validar que no haya llamada duplicada con el mismo SID
        llamada_sid = attrs.get('llamada_sid')
        if Llamada.objects.filter(llamada_sid=llamada_sid).exists():
            raise serializers.ValidationError({
                'llamada_sid': 'Ya existe una llamada con este SID.'
            })
        
        return attrs
    
    def create(self, validated_data):
        """Crea una nueva llamada y actualiza el estado del agente."""
        request = self.context.get('request')
        user = request.user
        
        # Crear o buscar cliente
        cliente = validated_data.get('cliente')
        if not cliente:
            # Buscar cliente por teléfono
            telefono_origen = validated_data['telefono_origen']
            cliente, created = Cliente.objects.get_or_create(
                telefono=telefono_origen,
                defaults={'nombre': 'Cliente', 'apellido': 'Nuevo'}
            )
        
        # Crear la llamada
        llamada = Llamada.objects.create(
            llamada_sid=validated_data['llamada_sid'],
            agente=user,
            cliente=cliente,
            campana=validated_data['campana'],
            tipo_llamada=Llamada.TipoLlamada.ENTRANTE,
            estado_llamada=Llamada.EstadoLlamada.TIMBRADO,
            telefono_origen=validated_data['telefono_origen'],
            telefono_destino=validated_data['telefono_destino'],
            hora_inicio_timbrado=timezone.now()
        )
        
        # Actualizar estado del agente a EN_LLAMADA
        # Esto se manejará mejor con signals, pero por ahora lo hacemos manual
        estado_actual = EstadoAgenteActual.objects.get(agente=user)
        
        # Cerrar estado anterior
        if estado_actual.detalle and estado_actual.detalle.esta_activo:
            detalle_anterior = estado_actual.detalle
            detalle_anterior.hora_fin = timezone.now()
            detalle_anterior.save()
        
        # Crear nuevo estado EN_LLAMADA
        nuevo_detalle = EstadoAgenteDetalle.objects.create(
            agente=user,
            estado=EstadoAgenteDetalle.EstadoAgente.EN_LLAMADA,
            comentarios=f'Llamada recibida: {llamada.llamada_sid}'
        )
        
        estado_actual.estado = EstadoAgenteDetalle.EstadoAgente.EN_LLAMADA
        estado_actual.detalle = nuevo_detalle
        estado_actual.acepta_llamadas = False
        estado_actual.save()
        
        return llamada


class IniciarLlamadaSerializer(serializers.Serializer):
    """Serializer para marcar que la llamada inició (agente contestó)."""
    
    def update(self, instance, validated_data):
        """Actualiza la llamada a EN_CURSO."""
        if instance.estado_llamada != Llamada.EstadoLlamada.TIMBRADO:
            raise serializers.ValidationError(
                f'La llamada no puede iniciar desde el estado {instance.get_estado_llamada_display()}'
            )
        
        instance.estado_llamada = Llamada.EstadoLlamada.EN_CURSO
        instance.hora_inicio_llamada = timezone.now()
        instance.save()
        
        return instance


class CompletarLlamadaSerializer(serializers.Serializer):
    """Serializer para completar una llamada."""
    
    notas = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=1000,
        help_text='Notas sobre la llamada'
    )
    grabacion_url = serializers.URLField(
        required=False,
        allow_blank=True,
        help_text='URL de la grabación'
    )
    crear_formulario = serializers.BooleanField(
        default=False,
        help_text='Si se debe crear un formulario para la llamada'
    )
    
    def update(self, instance, validated_data):
        """Completa la llamada."""
        if instance.estado_llamada not in [
            Llamada.EstadoLlamada.EN_CURSO,
            Llamada.EstadoLlamada.TIMBRADO
        ]:
            raise serializers.ValidationError(
                f'La llamada no puede completarse desde el estado {instance.get_estado_llamada_display()}'
            )
        
        instance.estado_llamada = Llamada.EstadoLlamada.COMPLETADA
        instance.hora_fin_llamada = timezone.now()
        instance.notas = validated_data.get('notas', instance.notas)
        instance.grabacion_url = validated_data.get('grabacion_url', instance.grabacion_url)
        instance.save()
        
        # Crear formulario si se solicita
        if validated_data.get('crear_formulario'):
            FormularioLlamada.objects.create(
                llamada=instance,
                campos_json={}
            )
        
        # Actualizar estado del agente a POSTCALL
        request = self.context.get('request')
        user = request.user
        
        try:
            estado_actual = EstadoAgenteActual.objects.get(agente=user)
            
            # Cerrar estado anterior
            if estado_actual.detalle and estado_actual.detalle.esta_activo:
                detalle_anterior = estado_actual.detalle
                detalle_anterior.hora_fin = timezone.now()
                detalle_anterior.save()
            
            # Crear nuevo estado POSTCALL
            nuevo_detalle = EstadoAgenteDetalle.objects.create(
                agente=user,
                estado=EstadoAgenteDetalle.EstadoAgente.POSTCALL,
                comentarios=f'Llamada completada: {instance.llamada_sid}'
            )
            
            estado_actual.estado = EstadoAgenteDetalle.EstadoAgente.POSTCALL
            estado_actual.detalle = nuevo_detalle
            estado_actual.save()
        except EstadoAgenteActual.DoesNotExist:
            pass
        
        return instance


class RechazarLlamadaSerializer(serializers.Serializer):
    """Serializer para rechazar una llamada."""
    
    motivo_rechazo_id = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text='ID del parámetro de motivo de rechazo'
    )
    notas = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=500,
        help_text='Notas sobre el rechazo'
    )
    
    def update(self, instance, validated_data):
        """Rechaza la llamada."""
        if instance.estado_llamada not in [
            Llamada.EstadoLlamada.TIMBRADO,
            Llamada.EstadoLlamada.EN_CURSO
        ]:
            raise serializers.ValidationError(
                f'La llamada no puede rechazarse desde el estado {instance.get_estado_llamada_display()}'
            )
        
        instance.estado_llamada = Llamada.EstadoLlamada.RECHAZADA
        instance.hora_fin_llamada = timezone.now()
        
        if validated_data.get('motivo_rechazo_id'):
            from apps.users.models import TiposParametros
            try:
                motivo = TiposParametros.objects.get(
                    id=validated_data['motivo_rechazo_id'],
                    categoria=TiposParametros.Categoria.MOTIVO_RECHAZO
                )
                instance.motivo_rechazo = motivo
            except TiposParametros.DoesNotExist:
                pass
        
        instance.notas = validated_data.get('notas', instance.notas)
        instance.save()
        
        # Actualizar estado del agente a DISPONIBLE o el que corresponda
        request = self.context.get('request')
        user = request.user
        
        try:
            estado_actual = EstadoAgenteActual.objects.get(agente=user)
            
            # Cerrar estado anterior
            if estado_actual.detalle and estado_actual.detalle.esta_activo:
                detalle_anterior = estado_actual.detalle
                detalle_anterior.hora_fin = timezone.now()
                detalle_anterior.save()
            
            # Volver a DISPONIBLE
            nuevo_detalle = EstadoAgenteDetalle.objects.create(
                agente=user,
                estado=EstadoAgenteDetalle.EstadoAgente.DISPONIBLE,
                comentarios=f'Llamada rechazada: {instance.llamada_sid}'
            )
            
            estado_actual.estado = EstadoAgenteDetalle.EstadoAgente.DISPONIBLE
            estado_actual.detalle = nuevo_detalle
            estado_actual.acepta_llamadas = True
            estado_actual.save()
        except EstadoAgenteActual.DoesNotExist:
            pass
        
        return instance


class TransferirLlamadaSerializer(serializers.Serializer):
    """Serializer para transferir una llamada a otro agente."""
    
    agente_destino_id = serializers.IntegerField(
        help_text='ID del agente al que se transfiere'
    )
    notas = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=500,
        help_text='Notas sobre la transferencia'
    )
    
    def validate_agente_destino_id(self, value):
        """Valida que el agente destino exista y esté disponible."""
        try:
            agente = User.objects.get(id=value, role=User.Role.AGENT)
            
            # Validar que esté disponible
            try:
                estado = EstadoAgenteActual.objects.get(agente=agente)
                if not estado.puede_recibir_llamadas:
                    raise serializers.ValidationError(
                        f'El agente {agente.full_name} no está disponible para recibir llamadas.'
                    )
            except EstadoAgenteActual.DoesNotExist:
                raise serializers.ValidationError(
                    f'No se encontró el estado del agente {agente.full_name}.'
                )
            
            return value
        except User.DoesNotExist:
            raise serializers.ValidationError(
                'El agente destino no existe.'
            )
    
    def update(self, instance, validated_data):
        """Transfiere la llamada a otro agente."""
        if instance.estado_llamada != Llamada.EstadoLlamada.EN_CURSO:
            raise serializers.ValidationError(
                'Solo se pueden transferir llamadas en curso.'
            )
        
        request = self.context.get('request')
        agente_origen = request.user
        agente_destino = User.objects.get(id=validated_data['agente_destino_id'])
        
        # Actualizar la llamada
        instance.estado_llamada = Llamada.EstadoLlamada.TRANSFERIDA
        instance.agente_anterior = agente_origen
        instance.agente = agente_destino
        instance.intentos_redireccion += 1
        instance.notas = (instance.notas or '') + f"\n[Transferencia] {validated_data.get('notas', '')}"
        instance.save()
        
        # Liberar agente origen
        try:
            estado_origen = EstadoAgenteActual.objects.get(agente=agente_origen)
            if estado_origen.detalle and estado_origen.detalle.esta_activo:
                detalle_anterior = estado_origen.detalle
                detalle_anterior.hora_fin = timezone.now()
                detalle_anterior.save()
            
            nuevo_detalle_origen = EstadoAgenteDetalle.objects.create(
                agente=agente_origen,
                estado=EstadoAgenteDetalle.EstadoAgente.DISPONIBLE,
                comentarios=f'Llamada transferida: {instance.llamada_sid}'
            )
            
            estado_origen.estado = EstadoAgenteDetalle.EstadoAgente.DISPONIBLE
            estado_origen.detalle = nuevo_detalle_origen
            estado_origen.acepta_llamadas = True
            estado_origen.save()
        except EstadoAgenteActual.DoesNotExist:
            pass
        
        # Ocupar agente destino
        try:
            estado_destino = EstadoAgenteActual.objects.get(agente=agente_destino)
            if estado_destino.detalle and estado_destino.detalle.esta_activo:
                detalle_anterior = estado_destino.detalle
                detalle_anterior.hora_fin = timezone.now()
                detalle_anterior.save()
            
            nuevo_detalle_destino = EstadoAgenteDetalle.objects.create(
                agente=agente_destino,
                estado=EstadoAgenteDetalle.EstadoAgente.EN_LLAMADA,
                comentarios=f'Llamada recibida por transferencia: {instance.llamada_sid}'
            )
            
            estado_destino.estado = EstadoAgenteDetalle.EstadoAgente.EN_LLAMADA
            estado_destino.detalle = nuevo_detalle_destino
            estado_destino.acepta_llamadas = False
            estado_destino.save()
        except EstadoAgenteActual.DoesNotExist:
            pass
        
        return instance
