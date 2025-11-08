# Código para agregar a apps/calls/views.py

## Instrucciones:
## Agregar estos 3 métodos al final de la clase LlamadaViewSet (antes del cierre de la clase)
## Ubicación: backend/apps/calls/views.py, dentro de class LlamadaViewSet

    @action(detail=False, methods=['get'], url_path='by-sid/(?P<call_sid>[^/.]+)')
    def by_sid(self, request, call_sid=None):
        """
        Obtiene una llamada por su Twilio Call SID con información completa del cliente.
        
        URL: GET /api/calls/llamadas/by-sid/<call_sid>/
        
        Retorna:
            - Información completa de la llamada
            - Información del cliente expandida (con otros_datos parseados)
        
        Ejemplo:
            GET /api/calls/llamadas/by-sid/CA1234567890/
        """
        try:
            llamada = Llamada.objects.select_related('cliente', 'agente', 'venta').get(
                twilio_call_sid=call_sid
            )
            
            # Validar permisos: solo el agente asignado o admin
            if llamada.agente != request.user and not request.user.is_admin():
                return Response(
                    {'detail': 'No tiene permisos para ver esta llamada.'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Serializar llamada
            data = LlamadaSerializer(llamada).data
            
            # Expandir datos del cliente si existe
            if llamada.cliente:
                cliente = llamada.cliente
                data['cliente_expandido'] = {
                    'id': cliente.cliente_id,
                    'nombre': cliente.nombre,
                    'telefono': cliente.telefono,
                    'documento': cliente.otros_datos.get('documento') if cliente.otros_datos else None,
                    'direccion': cliente.otros_datos.get('direccion') if cliente.otros_datos else None,
                    'correo': cliente.otros_datos.get('correo') if cliente.otros_datos else None,
                    'ciudad': cliente.otros_datos.get('ciudad') if cliente.otros_datos else None,
                }
            else:
                data['cliente_expandido'] = None
            
            return Response(data)
        
        except Llamada.DoesNotExist:
            return Response(
                {'detail': 'Llamada no encontrada con el SID proporcionado.'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['post'], url_path='create')
    def create_call(self, request):
        """
        Crea un registro de llamada manual antes de iniciar la llamada con Twilio.
        
        URL: POST /api/calls/llamadas/create/
        
        Body:
        {
            "telefono_destino": "+573001234567",
            "campana_id": 1,  // opcional
            "agente_id": 123,
            "tipo": "saliente"
        }
        
        Retorna:
            {
                "id": 456,
                "telefono_destino": "+573001234567",
                "cliente_id": 789,  // null si no existe cliente
                "fecha_hora_inicio": "2025-01-15T10:30:00Z"
            }
        """
        telefono_destino = request.data.get('telefono_destino')
        campana_id = request.data.get('campana_id')
        agente_id = request.data.get('agente_id')
        
        if not telefono_destino:
            return Response(
                {'error': 'telefono_destino es requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validar que el agente sea el usuario autenticado o admin
        if agente_id != request.user.id and not request.user.is_admin():
            return Response(
                {'error': 'No tiene permisos para crear llamadas para otro agente'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            # Obtener estados iniciales
            estado_pendiente = get_estado_id('ESTADO_LLAMADA', 'PENDIENTE')
            estado_no_venta = get_estado_id('ESTADO_VENTA', 'NO_VENTA')
            estado_no_reportada = get_estado_id('ESTADO_REPORTE', 'NO_REPORTADA')
            
            if not all([estado_pendiente, estado_no_venta, estado_no_reportada]):
                return Response(
                    {'error': 'Estados del sistema no configurados correctamente. Verifica TiposParametros.'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            # Buscar cliente por teléfono si existe y hay campaña
            cliente = None
            if campana_id:
                cliente = Cliente.objects.filter(
                    telefono=telefono_destino,
                    campana_id=campana_id
                ).first()
            
            # Crear llamada
            llamada = Llamada.objects.create(
                agente_id=agente_id,
                cliente=cliente,
                telefono_origen='',  # Se actualizará cuando se conecte
                telefono_destino=telefono_destino,
                estado_llamada_id=estado_pendiente,
                estado_venta_id=estado_no_venta,
                estado_reportada_id=estado_no_reportada,
                fue_contestada=False
            )
            
            return Response({
                'id': llamada.id,
                'telefono_destino': llamada.telefono_destino,
                'cliente_id': llamada.cliente.cliente_id if llamada.cliente else None,
                'fecha_hora_inicio': llamada.fecha_hora_inicio,
            }, status=status.HTTP_201_CREATED)
        
        except Exception as e:
            return Response(
                {'error': f'Error creando llamada: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'], url_path='disponible-venta')
    def disponible_venta(self, request):
        """
        Obtiene la última llamada del agente que está disponible para registrar venta.
        
        URL: GET /api/calls/llamadas/disponible-venta/
        
        Retorna:
            {
                "llamada": {
                    "id": 456,
                    "telefono_destino": "+573001234567",
                    "telefono_origen": "+573007654321",
                    "campana_id": 1,
                    "sid": "CA1234567890",
                    "fecha_inicio": "2025-01-15T10:30:00Z"
                },
                "cliente": {
                    "id": 789,
                    "nombre": "Juan Pérez",
                    "telefono": "+573001234567",
                    "documento": "1234567890",
                    "direccion": "Calle 123",
                    "correo": "juan@email.com",
                    "ciudad": "Cali"
                }
            }
        """
        # Buscar la llamada más reciente del agente
        llamada = Llamada.objects.filter(
            agente=request.user
        ).select_related('cliente', 'venta').order_by('-fecha_hora_inicio').first()
        
        if not llamada:
            return Response(
                {'detail': 'No hay llamadas disponibles para registrar venta.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Preparar respuesta
        data = {
            'llamada': {
                'id': llamada.id,
                'telefono_destino': llamada.telefono_destino,
                'telefono_origen': llamada.telefono_origen,
                'campana_id': llamada.venta.campana_id.id if llamada.venta else None,
                'sid': llamada.twilio_call_sid,
                'fecha_inicio': llamada.fecha_hora_inicio,
            }
        }
        
        # Agregar cliente si existe
        if llamada.cliente:
            cliente = llamada.cliente
            data['cliente'] = {
                'id': cliente.cliente_id,
                'nombre': cliente.nombre,
                'telefono': cliente.telefono,
                'documento': cliente.otros_datos.get('documento') if cliente.otros_datos else None,
                'direccion': cliente.otros_datos.get('direccion') if cliente.otros_datos else None,
                'correo': cliente.otros_datos.get('correo') if cliente.otros_datos else None,
                'ciudad': cliente.otros_datos.get('ciudad') if cliente.otros_datos else None,
            }
        else:
            data['cliente'] = None
        
        return Response(data)
