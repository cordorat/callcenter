"""
Serializadores para gestión de llamadas del call center.
"""
from rest_framework import serializers
from django.utils import timezone
from django.db import transaction
from apps.calls.models import Llamada, IteracionCliente, Venta, FormularioVenta, ReporteLlamada, Comision
from apps.campaigns.models import Cliente, Campana, Producto
from apps.users.models import User, EstadoAgenteActual, EstadoAgenteDetalle, TiposParametros
from common.estados_helper import EstadosHelper, get_estado, get_estado_id





class CampanaSerializer(serializers.ModelSerializer):
    """Serializer para campañas."""
    
    total_llamadas = serializers.SerializerMethodField()
    llamadas_completadas = serializers.SerializerMethodField()
    
    class Meta:
        model = Campana
        fields = [
            'id', 'nombre', 'descripcion',
            'fecha_inicio', 'fecha_fin', 'objetivo_llamadas',
            'objetivo_ventas', 'total_llamadas',
            'llamadas_completadas', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']
    
    def get_total_llamadas(self, obj):
        """Cuenta total de llamadas de la campaña."""
        return obj.llamadas.count()
    
    def get_llamadas_completadas(self, obj):
        """Cuenta llamadas completadas de la campaña."""
        estado_completada = get_estado_id('ESTADO_LLAMADA', 'COMPLETADA')
        if estado_completada:
            return obj.llamadas.filter(
                estado_llamada_id=estado_completada
            ).count()
        return 0


class FormularioVentaSerializer(serializers.ModelSerializer):
    """Serializer para formularios de venta."""
    
    class Meta:
        model = FormularioVenta
        fields = [
            'id', 'llamada', 'agente', 'campos_json'
        ]
        read_only_fields = ['id']
    
    def validate_datos_formulario(self, value):
        """Valida que datos_formulario sea un diccionario válido."""
        if value and not isinstance(value, dict):
            raise serializers.ValidationError(
                'Los datos deben ser un objeto JSON válido.'
            )
        return value


class VentaSerializer(serializers.ModelSerializer):
    """Serializer para ventas."""
    
    class Meta:
        model = Venta
        fields = ['venta_id', 'campana_id', 'monto']
        read_only_fields = ['venta_id']


class RegistrarVentaSerializer(serializers.Serializer):
    """
    Serializer para registrar una nueva venta desde el módulo de llamadas.
    
    Valida todos los campos requeridos y crea tanto el registro de venta
    como actualiza el estado de la llamada.
    """
    # Campos requeridos
    llamada_id = serializers.IntegerField(
        required=True,
        help_text='ID de la llamada asociada a la venta'
    )
    cliente_nombre = serializers.CharField(
        required=True,
        max_length=255,
        help_text='Nombre completo del cliente',
        error_messages={
            'required': 'El nombre del cliente es obligatorio.',
            'blank': 'El nombre del cliente no puede estar vacío.'
        }
    )
    cliente_id = serializers.IntegerField(
        required=True,
        help_text='ID del cliente',
        error_messages={
            'required': 'El ID del cliente es obligatorio.',
        }
    )
    producto_id = serializers.IntegerField(
        required=True,
        help_text='ID del producto o servicio adquirido',
        error_messages={
            'required': 'Debe seleccionar un producto.',
        }
    )
    
    # Campos opcionales
    observaciones = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text='Observaciones adicionales sobre la venta'
    )
    monto = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        required=False,
        allow_null=True,
        help_text='Monto de la venta (opcional, se puede tomar del producto)'
    )
    
    def validate_llamada_id(self, value):
        """Valida que la llamada exista y pertenezca al agente autenticado."""
        user = self.context.get('request').user
        
        try:
            llamada = Llamada.objects.select_related('agente', 'cliente').get(pk=value)
        except Llamada.DoesNotExist:
            raise serializers.ValidationError(
                f'No existe una llamada con ID {value}.'
            )
        
        # Verificar que la llamada pertenezca al agente
        if llamada.agente != user and not user.is_admin():
            raise serializers.ValidationError(
                'No tienes permiso para registrar ventas en esta llamada.'
            )
        
        # Verificar que no tenga ya una venta asociada
        if llamada.venta:
            raise serializers.ValidationError(
                f'Esta llamada ya tiene una venta registrada (ID: {llamada.venta.venta_id}).'
            )
        
        return value
    
    def validate_producto_id(self, value):
        """Valida que el producto exista y esté activo."""
        try:
            producto = Producto.objects.get(pk=value)
        except Producto.DoesNotExist:
            raise serializers.ValidationError(
                f'No existe un producto con ID {value}.'
            )
        
        if not producto.activo:
            raise serializers.ValidationError(
                f'El producto "{producto.nombre}" no está disponible.'
            )
        
        return value
    
    def validate_cliente_id(self, value):
        """Valida que el cliente exista."""
        try:
            cliente = Cliente.objects.get(pk=value)
        except Cliente.DoesNotExist:
            raise serializers.ValidationError(
                f'No existe un cliente con ID {value}.'
            )
        
        return value
    
    @transaction.atomic
    def create(self, validated_data):
        """
        Crea el registro de venta y actualiza la llamada.
        
        Proceso:
        1. Obtener la llamada y producto
        2. Crear el registro de venta (solo campaña y monto según MER)
        3. Guardar datos del formulario en FormularioVenta.campos_json
        4. Vincular la venta a la llamada
        5. Actualizar el estado de la llamada a "VENTA"
        6. Crear comisión automáticamente para el agente
        
        Returns:
            Venta: Instancia de la venta creada
        """
        # Obtener datos validados
        llamada_id = validated_data['llamada_id']
        producto_id = validated_data['producto_id']
        
        # Obtener instancias
        llamada = Llamada.objects.select_related(
            'agente', 'cliente', 'cliente__campana'
        ).get(pk=llamada_id)
        producto = Producto.objects.get(pk=producto_id)
        
        # Determinar el monto (del request o del producto)
        monto = validated_data.get('monto') or producto.precio
        
        # Crear la venta (solo campos del MER)
        # La campaña viene del cliente de la llamada
        venta = Venta.objects.create(
            campana_id=llamada.cliente.campana if llamada.cliente else None,
            monto=monto
        )
        
        # Guardar los datos del formulario en FormularioVenta
        FormularioVenta.objects.create(
            llamada=llamada,
            agente=llamada.agente,
            completado=True,
            fecha_completado=timezone.now(),
            campos_json={
                'cliente_nombre': validated_data['cliente_nombre'],
                'cliente_id': validated_data['cliente_id'],
                'producto_id': producto_id,
                'producto_nombre': producto.nombre,
                'observaciones': validated_data.get('observaciones', ''),
                'monto': str(monto)
            }
        )
        
        # Actualizar la llamada para vincular la venta
        llamada.venta = venta
        
        # Cambiar estado de la llamada a VENTA
        estado_venta = get_estado('ESTADO_VENTA', 'VENTA')
        if estado_venta:
            llamada.estado_venta = estado_venta
        
        llamada.save()
        
        # Crear comisión automáticamente
        campana = llamada.cliente.campana if llamada.cliente else None
        if campana and llamada.agente and monto:
            from decimal import Decimal
            # Calcular comisión: monto * (porcentaje / 100)
            porcentaje_comision = campana.comision_porcentaje or Decimal('10.00')
            monto_comision = monto * (porcentaje_comision / Decimal('100'))
            
            # Crear registro de comisión
            Comision.objects.create(
                agente=llamada.agente,
                venta=venta,
                producto=producto,
                cantidad=monto_comision
            )
        
        return venta
    
    def to_representation(self, instance):
        """
        Personaliza la respuesta para incluir información completa de la venta.
        Obtiene datos del agente y formulario desde la llamada asociada.
        Incluye información de la comisión generada.
        """
        # Obtener la llamada asociada a esta venta
        llamada = instance.llamadas.first()
        agente_info = None
        formulario_data = {}
        comision_info = None
        
        if llamada:
            # Información del agente
            if llamada.agente:
                agente_info = {
                    'id': llamada.agente.documento_id,
                    'nombre': llamada.agente.full_name
                }
            
            # Datos del formulario
            formulario = llamada.formularios.first()
            if formulario:
                formulario_data = formulario.campos_json
        
        # Obtener comisión asociada a esta venta
        try:
            comision = instance.comision
            if comision:
                comision_info = {
                    'id': comision.comision_id,
                    'cantidad': str(comision.cantidad),
                    'porcentaje': str(comision.venta.campana_id.comision_porcentaje) if comision.venta.campana_id else '10.00',
                    'fecha': comision.fecha.isoformat()
                }
        except Comision.DoesNotExist:
            comision_info = None
        
        return {
            'venta_id': instance.venta_id,
            'mensaje': f'La venta ha sido registrada exitosamente con ID #{instance.venta_id}',
            'venta': {
                'id': instance.venta_id,
                'cliente_nombre': formulario_data.get('cliente_nombre', ''),
                'cliente_id': formulario_data.get('cliente_id'),
                'producto': {
                    'id': formulario_data.get('producto_id'),
                    'nombre': formulario_data.get('producto_nombre', ''),
                    'precio': formulario_data.get('monto', '0')
                },
                'monto': str(instance.monto) if instance.monto else None,
                'observaciones': formulario_data.get('observaciones', ''),
                'agente': agente_info
            },
            'comision': comision_info
        }


class IteracionClienteSerializer(serializers.ModelSerializer):
    """Serializer para iteraciones de cliente."""
    
    class Meta:
        model = IteracionCliente
        fields = [
            'id', 'campana', 'cliente',
            'estado_iteracion', 'intento'
        ]
    
    def validate_estado_interacion_llamada_id(self, value):
        """Valida que el estado sea de tipo ESTADO_INTERACION_LLAMADA."""
        if value:
            estados_validos = EstadosHelper.get_estados_por_categoria('ESTADO_INTERACION_LLAMADA')
            if value.id not in [e.id for e in estados_validos]:
                raise serializers.ValidationError(
                    'El estado debe ser de tipo ESTADO_INTERACION_LLAMADA.'
                )
        return value


class LlamadaSerializer(serializers.ModelSerializer):
    """Serializer para lectura de llamadas."""
    
    agente_nombre = serializers.CharField(
        source='agente.full_name',
        read_only=True
    )
    cliente_nombre = serializers.CharField(
        source='cliente.nombre',
        read_only=True
    )
    duracion_total_formateada = serializers.ReadOnlyField()
    estado_venta_valor = serializers.CharField(
        source='estado_venta.valor',
        read_only=True
    )
    estado_llamada_valor = serializers.CharField(
        source='estado_llamada.valor',
        read_only=True
    )
    
    class Meta:
        model = Llamada
        fields = [
            'id', 'agente', 'agente_nombre', 'cliente', 'cliente_nombre',
            'venta', 'telefono_origen', 'telefono_destino',
            'fecha_hora_inicio', 'fecha_hora_fin', 'duracion',
            'duracion_total_formateada', 'grabacion_url',
            'twilio_call_sid', 'twilio_status', 'twilio_recording_sid',
            'twilio_recording_url', 'transcipcion', 'fue_contestada',
            'estado_llamada', 'estado_llamada_valor',
            'estado_venta', 'estado_venta_valor',
            'estado_reportada', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'duracion', 'fue_contestada', 'created_at', 'updated_at'
        ]


class HistorialLlamadaSerializer(serializers.ModelSerializer):
    """Serializer detallado para historial de llamadas del agente."""
    
    agente_nombre = serializers.CharField(
        source='agente.full_name',
        read_only=True
    )
    cliente_nombre = serializers.SerializerMethodField()
    cliente_telefono = serializers.CharField(
        source='cliente.telefono',
        read_only=True
    )
    cliente_otros_datos = serializers.SerializerMethodField()
    duracion_total_formateada = serializers.ReadOnlyField()
    estado_venta_valor = serializers.CharField(
        source='estado_venta.valor',
        read_only=True
    )
    estado_llamada_valor = serializers.CharField(
        source='estado_llamada.valor',
        read_only=True
    )
    estado_reportada_valor = serializers.CharField(
        source='estado_reportada.valor',
        read_only=True
    )
    estado_auditoria_valor = serializers.CharField(
        source='estado_auditoria.valor',
        read_only=True
    )
    auditado_por_nombre = serializers.CharField(
        source='auditado_por.full_name',
        read_only=True
    )
    tiene_grabacion = serializers.SerializerMethodField()
    notas = serializers.SerializerMethodField()
    resultado_llamada = serializers.SerializerMethodField()
    es_venta = serializers.SerializerMethodField()
    venta_info = serializers.SerializerMethodField()
    
    class Meta:
        model = Llamada
        fields = [
            'id', 'agente', 'agente_nombre',
            'cliente', 'cliente_nombre', 'cliente_telefono', 'cliente_otros_datos',
            'telefono_origen', 'telefono_destino',
            'fecha_hora_inicio', 'fecha_hora_fin', 'duracion',
            'duracion_total_formateada', 'tiene_grabacion', 'grabacion_url',
            'twilio_call_sid', 'twilio_recording_url', 'fue_contestada',
            'estado_llamada', 'estado_llamada_valor',
            'estado_venta', 'estado_venta_valor', 'es_venta',
            'estado_reportada', 'estado_reportada_valor',
            'estado_auditoria', 'estado_auditoria_valor',
            'fecha_auditoria', 'auditado_por', 'auditado_por_nombre', 'notas_auditoria',
            'notas', 'resultado_llamada', 'venta_info',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'duracion', 'fue_contestada', 'created_at', 'updated_at'
        ]
    
    def get_cliente_nombre(self, obj):
        """Obtiene el nombre del cliente."""
        if obj.cliente:
            return obj.cliente.nombre or 'Sin nombre'
        return 'Sin cliente'
    
    def get_cliente_otros_datos(self, obj):
        """
        Obtiene otros_datos del cliente procesados correctamente.
        Extrae campos como documento_id, email, direccion usando las mismas
        reglas que ClienteSerializer para mantener consistencia.
        """
        if not obj.cliente or not obj.cliente.otros_datos:
            return {}
        
        otros_datos = obj.cliente.otros_datos
        if not isinstance(otros_datos, dict):
            return {}
        
        # Extraer campos usando la misma lógica que ClienteSerializer
        return {
            'documento_id': (otros_datos.get('documento_id') or 
                           otros_datos.get('documento') or 
                           otros_datos.get('cedula') or
                           otros_datos.get('identificacion') or
                           otros_datos.get('identificación')),
            'email': (otros_datos.get('email') or 
                     otros_datos.get('correo') or 
                     otros_datos.get('correo_electronico') or
                     otros_datos.get('correo electrónico') or
                     otros_datos.get('correo_electrónico')),
            'direccion': (otros_datos.get('direccion') or 
                         otros_datos.get('dirección') or
                         otros_datos.get('address')),
            'observaciones': (otros_datos.get('observaciones') or 
                            otros_datos.get('notas') or 
                            otros_datos.get('comentarios')),
            # Mantener también los datos raw por si se necesitan
            '_raw': otros_datos
        }
    
    def get_tiene_grabacion(self, obj):
        """Indica si la llamada tiene grabación disponible."""
        return bool(obj.grabacion_url or obj.twilio_recording_url)
    
    def get_es_venta(self, obj):
        """Indica si la llamada resultó en venta."""
        if obj.estado_venta:
            return obj.estado_venta.valor == 'VENTA'
        return False
    
    def get_notas(self, obj):
        """Obtiene las notas de la transcripción o formularios asociados."""
        notas = []
        
        # Agregar transcripción si existe
        if obj.transcipcion:
            notas.append({
                'tipo': 'transcripcion',
                'contenido': obj.transcipcion
            })
        
        # Agregar notas de formularios si existen
        formularios = obj.formularios.all()
        for form in formularios:
            if form.campos_json:
                notas.append({
                    'tipo': 'formulario',
                    'contenido': form.campos_json
                })
        
        return notas
    
    def get_resultado_llamada(self, obj):
        """Obtiene el resultado de la llamada de forma legible."""
        resultado = {
            'estado_llamada': obj.estado_llamada.valor if obj.estado_llamada else 'Desconocido',
            'estado_venta': obj.estado_venta.valor if obj.estado_venta else 'Sin información'
        }
        
        # Agregar información de venta si existe
        if obj.venta:
            resultado['venta_realizada'] = True
            resultado['monto_venta'] = float(obj.venta.monto) if obj.venta.monto else None
        else:
            resultado['venta_realizada'] = False
            resultado['monto_venta'] = None
        
        return resultado
    
    def get_venta_info(self, obj):
        """Obtiene información completa de la venta si existe."""
        if not obj.venta:
            return None
        
        # Información básica de la venta
        venta_data = {
            'venta_id': obj.venta.venta_id,
            'monto': str(obj.venta.monto) if obj.venta.monto else None,
            'campana_id': obj.venta.campana_id.id if obj.venta.campana_id else None,
            'campana_nombre': obj.venta.campana_id.nombre if obj.venta.campana_id else None,
        }
        
        # Obtener datos del formulario de venta si existe
        formulario = obj.formularios.filter(completado=True).first()
        if formulario and formulario.campos_json:
            venta_data['cliente_nombre'] = formulario.campos_json.get('cliente_nombre')
            venta_data['cliente_id'] = formulario.campos_json.get('cliente_id')
            venta_data['producto_id'] = formulario.campos_json.get('producto_id')
            venta_data['producto_nombre'] = formulario.campos_json.get('producto_nombre')
            venta_data['observaciones'] = formulario.campos_json.get('observaciones')
        
        return venta_data


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
        
        # Validar que el usuario esté disponible
        try:
            estado_actual = EstadoAgenteActual.objects.get(agente_id=user)
            estado_disponible = get_estado_id('ESTADO_AGENTE', 'DISPONIBLE')
            
            if estado_actual.estado_id_id != estado_disponible:
                estado_obj = estado_actual.estado_id
                estado_nombre = estado_obj.valor if estado_obj else 'Desconocido'
                raise serializers.ValidationError({
                    'agente': f'El usuario no está disponible. Estado actual: {estado_nombre}'
                })
        except EstadoAgenteActual.DoesNotExist:
            raise serializers.ValidationError(
                'No se encontró el estado del usuario.'
            )
        
        # Validar que la campaña exista
        campana_id = attrs.get('campana_id')
        try:
            campana = Campana.objects.get(id=campana_id)
            attrs['campana'] = campana
        except Campana.DoesNotExist:
            raise serializers.ValidationError({
                'campana_id': 'La campaña no existe.'
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
            cliente_id=cliente,
            campana_id=validated_data['campana'],
            telefono_origen=validated_data['telefono_origen'],
            telefono_destino=validated_data['telefono_destino'],
            hora_inicio_timbrado=timezone.now(),
            estado_venta=EstadosHelper.venta_pendiente(),
            estado_recibida=get_estado('ESTADO_LLAMADA', 'TIMBRADO')
        )
        
        # Actualizar estado del agente a EN_LLAMADA
        estado_actual = EstadoAgenteActual.objects.get(agente_id=user)
        
        # Cerrar estado anterior
        if estado_actual.estado_detalle_id:
            try:
                detalle_anterior = EstadoAgenteDetalle.objects.get(
                    estado_agente_detalle_id=estado_actual.estado_detalle_id
                )
                if not detalle_anterior.hora_fin:
                    detalle_anterior.hora_fin = timezone.now()
                    detalle_anterior.save()
            except EstadoAgenteDetalle.DoesNotExist:
                pass
        
        # Crear nuevo estado EN_LLAMADA
        nuevo_detalle = EstadoAgenteDetalle.objects.create(
            agente_id=user,
            estado_id=EstadosHelper.agente_en_llamada(),
            comentario=f'Llamada recibida: {llamada.llamada_sid}',
            hora_inicio=timezone.now(),
            fecha=timezone.now().date()
        )
        
        estado_actual.estado_id = EstadosHelper.agente_en_llamada()
        estado_actual.estado_detalle_id = nuevo_detalle.estado_agente_detalle_id
        estado_actual.save()
        
        return llamada


class IniciarLlamadaSerializer(serializers.Serializer):
    """Serializer para marcar que la llamada inició (agente contestó)."""
    
    def update(self, instance, validated_data):
        """Actualiza la llamada a EN_CURSO."""
        estado_timbrado = get_estado('ESTADO_LLAMADA', 'TIMBRADO')
        
        if instance.estado_recibida != estado_timbrado:
            estado_nombre = instance.estado_recibida.valor if instance.estado_recibida else 'Desconocido'
            raise serializers.ValidationError(
                f'La llamada no puede iniciar desde el estado {estado_nombre}'
            )
        
        instance.estado_recibida = get_estado('ESTADO_LLAMADA', 'EN_CURSO')
        instance.hora_inicio_llamada = timezone.now()
        instance.save()
        
        return instance


class CompletarLlamadaSerializer(serializers.Serializer):
    """Serializer para completar una llamada."""
    
    grabacion_url = serializers.URLField(
        required=False,
        allow_blank=True,
        help_text='URL de la grabación'
    )
    crear_formulario = serializers.BooleanField(
        default=False,
        help_text='Si se debe crear un formulario para la llamada'
    )
    monto_venta = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        required=False,
        allow_null=True,
        help_text='Monto de la venta si se realizó'
    )
    
    def update(self, instance, validated_data):
        """Completa la llamada."""
        estado_en_curso = get_estado('ESTADO_LLAMADA', 'EN_CURSO')
        estado_timbrado = get_estado('ESTADO_LLAMADA', 'TIMBRADO')
        
        if instance.estado_recibida not in [estado_en_curso, estado_timbrado]:
            estado_nombre = instance.estado_recibida.valor if instance.estado_recibida else 'Desconocido'
            raise serializers.ValidationError(
                f'La llamada no puede completarse desde el estado {estado_nombre}'
            )
        
        instance.estado_recibida = get_estado('ESTADO_LLAMADA', 'COMPLETADA')
        instance.hora_fin_llamada = timezone.now()
        instance.grabacion_url = validated_data.get('grabacion_url', instance.grabacion_url)
        
        # Si se realizó venta, actualizar estado
        monto_venta = validated_data.get('monto_venta')
        if monto_venta:
            instance.estado_venta = EstadosHelper.venta_realizada()
        else:
            instance.estado_venta = EstadosHelper.venta_no_realizada()
        
        instance.save()
        
        # Crear venta si se solicita
        if monto_venta and validated_data.get('crear_formulario'):
            venta = Venta.objects.create(
                campana_id=instance.campana_id,
                monto=monto_venta
            )
            FormularioVenta.objects.create(
                llamada_id=instance,
                cliente_id=instance.cliente_id,
                venta_id=venta,
                datos_formulario={}
            )
        
        # Actualizar estado del agente a POSTCALL
        request = self.context.get('request')
        user = request.user
        
        try:
            estado_actual = EstadoAgenteActual.objects.get(agente_id=user)
            
            # Cerrar estado anterior
            if estado_actual.estado_detalle_id:
                try:
                    detalle_anterior = EstadoAgenteDetalle.objects.get(
                        estado_agente_detalle_id=estado_actual.estado_detalle_id
                    )
                    if not detalle_anterior.hora_fin:
                        detalle_anterior.hora_fin = timezone.now()
                        detalle_anterior.save()
                except EstadoAgenteDetalle.DoesNotExist:
                    pass
            
            # Crear nuevo estado POSTCALL
            nuevo_detalle = EstadoAgenteDetalle.objects.create(
                agente_id=user,
                estado_id=EstadosHelper.agente_postcall(),
                comentario=f'Llamada completada: {instance.llamada_sid}',
                hora_inicio=timezone.now(),
                fecha=timezone.now().date()
            )
            
            estado_actual.estado_id = EstadosHelper.agente_postcall()
            estado_actual.estado_detalle_id = nuevo_detalle.estado_agente_detalle_id
            estado_actual.save()
        except EstadoAgenteActual.DoesNotExist:
            pass
        
        return instance


class RechazarLlamadaSerializer(serializers.Serializer):
    """Serializer para rechazar una llamada."""
    
    motivo_rechazo_valor = serializers.CharField(
        required=False,
        allow_null=True,
        max_length=50,
        help_text='Valor del motivo de rechazo (ej: FUERA_DE_HORARIO, SIN_CAPACIDAD)'
    )
    
    def validate_motivo_rechazo_valor(self, value):
        """Valida que el motivo de rechazo exista."""
        if value:
            motivo = get_estado('MOTIVO_RECHAZO', value)
            if not motivo:
                raise serializers.ValidationError(
                    f'El motivo de rechazo "{value}" no existe.'
                )
        return value
    
    def update(self, instance, validated_data):
        """Rechaza la llamada."""
        estado_timbrado = get_estado('ESTADO_LLAMADA', 'TIMBRADO')
        estado_en_curso = get_estado('ESTADO_LLAMADA', 'EN_CURSO')
        
        if instance.estado_recibida not in [estado_timbrado, estado_en_curso]:
            estado_nombre = instance.estado_recibida.valor if instance.estado_recibida else 'Desconocido'
            raise serializers.ValidationError(
                f'La llamada no puede rechazarse desde el estado {estado_nombre}'
            )
        
        instance.estado_recibida = get_estado('ESTADO_LLAMADA', 'RECHAZADA')
        instance.hora_fin_llamada = timezone.now()
        instance.estado_venta = EstadosHelper.venta_no_realizada()
        
        # Asignar motivo de rechazo si se proporciona
        motivo_valor = validated_data.get('motivo_rechazo_valor')
        if motivo_valor:
            # Podríamos agregar un campo motivo_rechazo al modelo Llamada si es necesario
            pass
        
        instance.save()
        
        # Actualizar estado del agente a DISPONIBLE
        request = self.context.get('request')
        user = request.user
        
        try:
            estado_actual = EstadoAgenteActual.objects.get(agente_id=user)
            
            # Cerrar estado anterior
            if estado_actual.estado_detalle_id:
                try:
                    detalle_anterior = EstadoAgenteDetalle.objects.get(
                        estado_agente_detalle_id=estado_actual.estado_detalle_id
                    )
                    if not detalle_anterior.hora_fin:
                        detalle_anterior.hora_fin = timezone.now()
                        detalle_anterior.save()
                except EstadoAgenteDetalle.DoesNotExist:
                    pass
            
            # Volver a DISPONIBLE
            nuevo_detalle = EstadoAgenteDetalle.objects.create(
                agente_id=user,
                estado_id=EstadosHelper.agente_disponible(),
                comentario=f'Llamada rechazada: {instance.llamada_sid}',
                hora_inicio=timezone.now(),
                fecha=timezone.now().date()
            )
            
            estado_actual.estado_id = EstadosHelper.agente_disponible()
            estado_actual.estado_detalle_id = nuevo_detalle.estado_agente_detalle_id
            estado_actual.save()
        except EstadoAgenteActual.DoesNotExist:
            pass
        
        return instance


class TransferirLlamadaSerializer(serializers.Serializer):
    """Serializer para transferir una llamada a otro agente."""
    
    agente_destino_id = serializers.IntegerField(
        help_text='ID del agente al que se transfiere'
    )
    
    def validate_agente_destino_id(self, value):
        """Valida que el agente destino exista y esté disponible."""
        try:
            # Validar que el usuario existe y es agente
            agente = User.objects.get(id=value)
            rol_agente_id = get_estado_id('ROL_USUARIO', 'AGENTE')
            
            if not hasattr(agente, 'rol_id') or agente.rol_id != rol_agente_id:
                raise serializers.ValidationError(
                    f'El usuario {agente.full_name} no es un agente.'
                )
            
            # Validar que esté disponible
            try:
                estado = EstadoAgenteActual.objects.get(agente_id=agente)
                estado_disponible = get_estado_id('ESTADO_AGENTE', 'DISPONIBLE')
                
                if estado.estado_id_id != estado_disponible:
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
        estado_en_curso = get_estado('ESTADO_LLAMADA', 'EN_CURSO')
        
        if instance.estado_recibida != estado_en_curso:
            raise serializers.ValidationError(
                'Solo se pueden transferir llamadas en curso.'
            )
        
        request = self.context.get('request')
        agente_origen = request.user
        agente_destino = User.objects.get(id=validated_data['agente_destino_id'])
        
        # Actualizar la llamada
        instance.estado_recibida = get_estado('ESTADO_LLAMADA', 'TRANSFERIDA')
        instance.agente_anterior = agente_origen
        instance.agente = agente_destino
        instance.save()
        
        # Liberar agente origen
        try:
            estado_origen = EstadoAgenteActual.objects.get(agente_id=agente_origen)
            
            # Cerrar estado anterior
            if estado_origen.estado_detalle_id:
                try:
                    detalle_anterior = EstadoAgenteDetalle.objects.get(
                        estado_agente_detalle_id=estado_origen.estado_detalle_id
                    )
                    if not detalle_anterior.hora_fin:
                        detalle_anterior.hora_fin = timezone.now()
                        detalle_anterior.save()
                except EstadoAgenteDetalle.DoesNotExist:
                    pass
            
            nuevo_detalle_origen = EstadoAgenteDetalle.objects.create(
                agente_id=agente_origen,
                estado_id=EstadosHelper.agente_disponible(),
                comentario=f'Llamada transferida: {instance.llamada_sid}',
                hora_inicio=timezone.now(),
                fecha=timezone.now().date()
            )
            
            estado_origen.estado_id = EstadosHelper.agente_disponible()
            estado_origen.estado_detalle_id = nuevo_detalle_origen.estado_agente_detalle_id
            estado_origen.save()
        except EstadoAgenteActual.DoesNotExist:
            pass
        
        # Ocupar agente destino
        try:
            estado_destino = EstadoAgenteActual.objects.get(agente_id=agente_destino)
            
            # Cerrar estado anterior
            if estado_destino.estado_detalle_id:
                try:
                    detalle_anterior = EstadoAgenteDetalle.objects.get(
                        estado_agente_detalle_id=estado_destino.estado_detalle_id
                    )
                    if not detalle_anterior.hora_fin:
                        detalle_anterior.hora_fin = timezone.now()
                        detalle_anterior.save()
                except EstadoAgenteDetalle.DoesNotExist:
                    pass
            
            nuevo_detalle_destino = EstadoAgenteDetalle.objects.create(
                agente_id=agente_destino,
                estado_id=EstadosHelper.agente_en_llamada(),
                comentario=f'Llamada recibida por transferencia: {instance.llamada_sid}',
                hora_inicio=timezone.now(),
                fecha=timezone.now().date()
            )
            
            estado_destino.estado_id = EstadosHelper.agente_en_llamada()
            estado_destino.estado_detalle_id = nuevo_detalle_destino.estado_agente_detalle_id
            estado_destino.save()
        except EstadoAgenteActual.DoesNotExist:
            pass
        
        return instance


class ReporteLlamadaSerializer(serializers.ModelSerializer):
    """
    Serializer para reportes de llamadas.
    Permite al BackOffice reportar problemas encontrados en las llamadas.
    """
    reportado_por_nombre = serializers.SerializerMethodField()
    llamada_info = serializers.SerializerMethodField()
    
    class Meta:
        model = ReporteLlamada
        fields = [
            'id',
            'llamada',
            'reportado_por',
            'reportado_por_nombre',
            'descripcion',
            'fecha_reporte',
            'llamada_info',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'fecha_reporte', 'created_at', 'updated_at', 'reportado_por']
    
    def get_reportado_por_nombre(self, obj):
        """Obtiene el nombre completo del usuario que reportó."""
        if obj.reportado_por:
            return obj.reportado_por.get_full_name()
        return None
    
    def get_llamada_info(self, obj):
        """Obtiene información básica de la llamada reportada."""
        if obj.llamada:
            return {
                'id': obj.llamada.id,
                'fecha_inicio': obj.llamada.fecha_hora_inicio,
                'duracion': obj.llamada.duracion,
                'agente_nombre': obj.llamada.agente.get_full_name() if obj.llamada.agente else None,
                'cliente_nombre': obj.llamada.cliente.nombre if obj.llamada.cliente else None
            }
        return None
    
    def validate_descripcion(self, value):
        """
        Valida que la descripción tenga entre 10 y 500 caracteres.
        """
        if len(value.strip()) < 10:
            raise serializers.ValidationError(
                "La descripción debe contener al menos 10 caracteres"
            )
        if len(value) > 500:
            raise serializers.ValidationError(
                "La descripción no puede exceder los 500 caracteres"
            )
        return value.strip()
    
    def create(self, validated_data):
        """
        Crea el reporte y actualiza el estado de la llamada.
        """
        # Obtener el usuario del contexto
        request = self.context.get('request')
        if request and request.user:
            validated_data['reportado_por'] = request.user
        
        # Crear el reporte
        reporte = ReporteLlamada.objects.create(**validated_data)
        
        # Actualizar estado_reportada de la llamada
        llamada = reporte.llamada
        estado_reportada = get_estado_id('ESTADO_REPORTADA', 'REPORTADA')
        if estado_reportada:
            llamada.estado_reportada_id = estado_reportada
            llamada.save(update_fields=['estado_reportada'])
        
        return reporte


class ReporteLlamadaListSerializer(serializers.ModelSerializer):
    """
    Serializer simplificado para listar reportes.
    """
    reportado_por_nombre = serializers.CharField(
        source='reportado_por.get_full_name',
        read_only=True
    )

    class Meta:
        model = ReporteLlamada
        fields = [
            'id',
            'llamada',
            'reportado_por_nombre',
            'descripcion',
            'fecha_reporte'
        ]
        read_only_fields = fields

class HistorialJefeCampanaSerializer(serializers.ModelSerializer):
    """
    Serializer para historial de llamadas del Jefe de Campaña.
    Muestra información resumida y detallada de cada llamada.
    """
    
    # Información del cliente
    cliente_nombre = serializers.CharField(
        source='cliente.nombre',
        read_only=True
    )
    cliente_telefono = serializers.CharField(
        source='cliente.telefono',
        read_only=True
    )
    
    # Información del agente
    agente_nombre = serializers.CharField(
        source='agente.full_name',
        read_only=True
    )
    agente_id = serializers.IntegerField(
        source='agente.documento_id',
        read_only=True
    )
    
    # Información de la llamada
    duracion_formateada = serializers.ReadOnlyField(source='duracion_total_formateada')
    fue_contestada = serializers.BooleanField(read_only=True)
    
    # Estados
    estado_llamada_valor = serializers.CharField(
        source='estado_llamada.valor',
        read_only=True
    )
    estado_venta_valor = serializers.CharField(
        source='estado_venta.valor',
        read_only=True
    )
    
    # Información de venta
    hubo_venta = serializers.SerializerMethodField()
    monto_venta = serializers.SerializerMethodField()
    
    # Información adicional (para vista detallada)
    notas_agente = serializers.SerializerMethodField()
    cliente_otros_datos = serializers.JSONField(
        source='cliente.otros_datos',
        read_only=True
    )
    
    class Meta:
        model = Llamada
        fields = [
            # IDs
            'id',
            # Cliente
            'cliente_nombre',
            'cliente_telefono',
            'cliente_otros_datos',
            # Agente
            'agente_id',
            'agente_nombre',
            # Llamada
            'telefono_destino',
            'fecha_hora_inicio',
            'fecha_hora_fin',
            'duracion',
            'duracion_formateada',
            'fue_contestada',
            # Estados
            'estado_llamada_valor',
            'estado_venta_valor',
            # Venta
            'hubo_venta',
            'monto_venta',
            # Detalles adicionales
            'notas_agente',
            'transcipcion',
            'grabacion_url',
            'twilio_recording_url',
        ]
        read_only_fields = [
            'id',
            'cliente_nombre',
            'cliente_telefono',
            'cliente_otros_datos',
            'agente_id',
            'agente_nombre',
            'telefono_destino',
            'fecha_hora_inicio',
            'fecha_hora_fin',
            'duracion',
            'duracion_formateada',
            'fue_contestada',
            'estado_llamada_valor',
            'estado_venta_valor',
            'hubo_venta',
            'monto_venta',
            'notas_agente',
            'transcipcion',
            'grabacion_url',
            'twilio_recording_url',
        ]
    
    def get_hubo_venta(self, obj):
        """Indica si hubo venta en la llamada."""
        return obj.venta is not None
    
    def get_monto_venta(self, obj):
        """Retorna el monto de la venta si existe."""
        if obj.venta and obj.venta.monto:
            return float(obj.venta.monto)
        return None
    
    def get_notas_agente(self, obj):
        """
        Obtiene las notas del agente desde:
        - Transcripción de la llamada
        - Formularios asociados
        """
        notas = []
        
        # Agregar transcripción si existe
        if obj.transcipcion:
            notas.append({
                'tipo': 'transcripcion',
                'contenido': obj.transcipcion
            })
        
        # Agregar notas de formularios
        formularios = obj.formularios.all()
        for formulario in formularios:
            if formulario.campos_json:
                notas.append({
                    'tipo': 'formulario',
                    'campos': formulario.campos_json
                })
        
        return notas


class ComisionSerializer(serializers.ModelSerializer):
    """
    Serializer para comisiones de agentes.
    """
    agente_nombre = serializers.SerializerMethodField()
    campana_nombre = serializers.SerializerMethodField()
    producto_nombre = serializers.SerializerMethodField()
    
    class Meta:
        model = Comision
        fields = [
            'comision_id', 'agente', 'agente_nombre', 'venta',
            'producto', 'producto_nombre', 'cantidad', 'fecha',
            'campana_nombre'
        ]
        read_only_fields = ['comision_id', 'fecha']
    
    def get_agente_nombre(self, obj):
        """Obtiene el nombre completo del agente."""
        return obj.agente.get_full_name() if obj.agente else None
    
    def get_campana_nombre(self, obj):
        """Obtiene el nombre de la campaña desde la venta."""
        if obj.venta and obj.venta.campana_id:
            return obj.venta.campana_id.nombre
        return None
    
    def get_producto_nombre(self, obj):
        """Obtiene el nombre del producto."""
        if obj.producto:
            return obj.producto.nombre
        return None
