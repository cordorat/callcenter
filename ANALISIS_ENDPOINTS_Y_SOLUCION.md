# 🔍 Análisis de Endpoints y Problema con Datos del Cliente

## 📋 Estado Actual de los Endpoints

### ❌ Endpoints que NO EXISTEN

Los siguientes endpoints que el hook `useTwilioCall` intenta usar **NO EXISTEN** en el backend:

1. **`GET /api/calls/by-sid/<sid>/`** ❌
   - Usado en línea 153 de `useTwilioCall.js`
   - Intenta obtener información de llamada por CallSid
   - **NO EXISTE** en `views.py`

2. **`GET /api/calls/client-by-call-sid/<sid>/`** ❌
   - Usado en línea 160 de `useTwilioCall.js`
   - Intenta obtener información del cliente por CallSid
   - **NO EXISTE** en `views.py`

3. **`GET /api/calls/disponible-venta/`** ❌
   - Usado en línea 520 de `useTwilioCall.js` (función `recuperarLlamadaId`)
   - Intenta recuperar última llamada disponible para venta
   - **NO EXISTE** en `views.py`

4. **`POST /api/calls/create/`** ❌
   - Usado en línea 372 de `useTwilioCall.js` (función `makeCall`)
   - Intenta crear registro de llamada manual
   - **NO EXISTE** en `views.py`

### ✅ Endpoints que SÍ EXISTEN

Los siguientes endpoints relacionados SÍ existen y pueden ser útiles:

1. **`POST /api/calls/llamadas/recibir_llamada/`** ✅
   - Recibe una llamada entrante
   - Acepta: `llamada_sid`, `telefono_origen`, `telefono_destino`, `cliente_id`, `campana_id`
   - **Este es el más cercano a lo que necesitamos**

2. **`GET /api/calls/llamadas/mis_llamadas_activas/`** ✅
   - Obtiene llamadas activas del agente
   - Puede servir para recuperar información durante AFTERCALL

3. **`GET /api/calls/llamadas/<id>/`** ✅
   - Obtiene detalles de una llamada por ID (no por SID)
   - Usa el endpoint estándar del ViewSet

---

## 🐛 Problema: Datos del Cliente Undefined/Vacíos

### Causa Raíz

El problema tiene **3 causas principales**:

#### 1. **Endpoints inexistentes** 
```javascript
// Línea 153 - Este endpoint NO EXISTE
const response = await apiClient.get(`/api/calls/by-sid/${callSid}/`);

// Línea 160 - Este endpoint NO EXISTE
const clientResp = await apiClient.get(`/api/calls/client-by-call-sid/${callSid}/`);
```

Estos endpoints fallan silenciosamente (catch en línea 188), lo que resulta en:
- `currentCallInfo = null`
- `currentClientInfo = null`
- `persistedCallData` se crea pero con valores `null`

#### 2. **Estructura del modelo Llamada**

El modelo `Llamada` tiene:
- `cliente` → FK a `Cliente` (puede ser null)
- `telefono_origen` → String
- `telefono_destino` → String

Pero el modelo `Cliente` tiene:
- `nombre` → String
- `telefono` → String  
- `otros_datos` → JSONField (puede contener documento, dirección, correo, ciudad)

**NO hay campos directos** en `Llamada` para:
- `documento`
- `direccion`
- `correo`
- `ciudad`

#### 3. **Serializer incompleto**

El `LlamadaSerializer` solo incluye:
```python
'cliente_nombre' = serializers.CharField(source='cliente.nombre')
```

**NO incluye** acceso a `otros_datos` del cliente ni a los campos individuales.

---

## ✅ SOLUCIÓN PROPUESTA

### Solución 1: Crear los Endpoints Faltantes (RECOMENDADO)

Agregar 4 nuevos métodos `@action` al `LlamadaViewSet`:

#### A. Endpoint para obtener llamada por SID

```python
# En apps/calls/views.py - Clase LlamadaViewSet

@action(detail=False, methods=['get'], url_path='by-sid/(?P<call_sid>[^/.]+)')
def by_sid(self, request, call_sid=None):
    """
    Obtiene una llamada por su Twilio Call SID.
    
    URL: /api/calls/llamadas/by-sid/<call_sid>/
    
    Retorna:
        - Información completa de la llamada
        - Información del cliente si está asociado
        - campos de otros_datos parseados
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
        
        # Agregar datos del cliente expandidos si existe
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
        
        return Response(data)
    
    except Llamada.DoesNotExist:
        return Response(
            {'detail': 'Llamada no encontrada con el SID proporcionado.'},
            status=status.HTTP_404_NOT_FOUND
        )
```

#### B. Endpoint para crear llamada manual

```python
@action(detail=False, methods=['post'], url_path='create')
def create_call(self, request):
    """
    Crea un registro de llamada manual (antes de llamar con Twilio).
    
    URL: POST /api/calls/llamadas/create/
    
    Body:
    {
        "telefono_destino": "+573001234567",
        "campana_id": 1,  // opcional
        "agente_id": 123,
        "tipo": "saliente"
    }
    
    Retorna:
        - ID de la llamada creada
        - Datos básicos de la llamada
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
                {'error': 'Estados del sistema no configurados correctamente'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # Buscar cliente por teléfono si existe
        cliente = None
        if campana_id:
            try:
                cliente = Cliente.objects.filter(
                    telefono=telefono_destino,
                    campana_id=campana_id
                ).first()
            except Cliente.DoesNotExist:
                pass
        
        # Crear llamada
        llamada = Llamada.objects.create(
            agente_id=agente_id,
            cliente=cliente,
            telefono_origen=request.user.telefono if hasattr(request.user, 'telefono') else '',
            telefono_destino=telefono_destino,
            estado_llamada_id=estado_pendiente,
            estado_venta_id=estado_no_venta,
            estado_reportada_id=estado_no_reportada,
            fue_contestada=False
        )
        
        return Response(
            {
                'id': llamada.id,
                'telefono_destino': llamada.telefono_destino,
                'cliente_id': llamada.cliente.cliente_id if llamada.cliente else None,
                'fecha_hora_inicio': llamada.fecha_hora_inicio,
            },
            status=status.HTTP_201_CREATED
        )
    
    except Exception as e:
        return Response(
            {'error': f'Error creando llamada: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
```

#### C. Endpoint para recuperar última llamada disponible para venta

```python
@action(detail=False, methods=['get'], url_path='disponible-venta')
def disponible_venta(self, request):
    """
    Obtiene la última llamada del agente que está disponible para registrar venta.
    
    URL: GET /api/calls/llamadas/disponible-venta/
    
    Criterios:
    - Llamada del agente autenticado
    - Estado: COMPLETADA o similar
    - Más reciente
    - Puede o no tener venta ya registrada
    
    Retorna:
        {
            "llamada": { ... },
            "cliente": { ... }  // con todos los campos expandidos
        }
    """
    # Buscar la llamada más reciente del agente
    # Puede estar en estado COMPLETADA, EN_CURSO, etc.
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
```

#### D. Endpoint redundante (ya NO es necesario)

El endpoint `/api/calls/client-by-call-sid/<sid>/` ya NO es necesario porque `by-sid` devuelve toda la información del cliente expandida.

---

### Solución 2: Modificar el Hook para Usar Endpoints Existentes (ALTERNATIVA)

Si no queremos crear nuevos endpoints, podemos modificar el hook para usar `recibir_llamada`:

```javascript
// En makeCall() - En lugar de crear con /create/
// Usar el endpoint recibir_llamada DESPUÉS de que Twilio conecte

twilioClient.onConnect(async (call) => {
  const callSid = call.parameters.CallSid;
  
  // 1. Crear/Actualizar registro de llamada usando el endpoint existente
  try {
    const response = await apiClient.post('/api/calls/llamadas/recibir_llamada/', {
      llamada_sid: callSid,
      telefono_origen: user.telefono || '',
      telefono_destino: phoneNumber,
      cliente_id: null, // Se actualizará después si se encuentra
      campana_id: campana_id
    });
    
    const llamadaData = response.data;
    
    // 2. Guardar en persistedCallData
    setPersistedCallData({
      llamada_id: llamadaData.id,
      telefono: phoneNumber,
      call_sid: callSid,
      // ... otros campos
    });
  } catch (err) {
    console.error('Error registrando llamada:', err);
  }
});
```

**PROBLEMA con esta solución:**
- `recibir_llamada` está diseñado para llamadas ENTRANTES
- NO devuelve información del cliente expandida
- Requiere modificaciones más complejas en el flujo

---

## 🎯 SOLUCIÓN RECOMENDADA FINAL

### Paso 1: Crear los 3 Endpoints Nuevos

Agregar a `apps/calls/views.py` en la clase `LlamadaViewSet`:
- ✅ `by_sid()` - Obtener llamada por SID con cliente expandido
- ✅ `create_call()` - Crear llamada manual
- ✅ `disponible_venta()` - Recuperar última llamada

### Paso 2: Verificar Permisos en Estados

Asegurarse que existan estos estados en `TiposParametros`:
```sql
-- ESTADO_LLAMADA
('PENDIENTE', 'Llamada creada pero no iniciada')
('EN_CURSO', 'Llamada en progreso')
('COMPLETADA', 'Llamada finalizada')

-- ESTADO_VENTA
('VENTA', 'Se realizó venta')
('NO_VENTA', 'No se realizó venta')

-- ESTADO_REPORTE  
('REPORTADA', 'Llamada reportada')
('NO_REPORTADA', 'Llamada no reportada')
```

### Paso 3: Actualizar el Hook (Ya está implementado)

El hook `useTwilioCall.js` ya tiene el código correcto, solo necesita que los endpoints existan:

```javascript
// Línea 372 - POST /api/calls/llamadas/create/
const createResponse = await apiClient.post('/api/calls/llamadas/create/', { ... });

// Línea 153 - GET /api/calls/llamadas/by-sid/<sid>/
const response = await apiClient.get(`/api/calls/llamadas/by-sid/${callSid}/`);

// Línea 520 - GET /api/calls/llamadas/disponible-venta/
const response = await apiClient.get('/api/calls/llamadas/disponible-venta/');
```

### Paso 4: Ajustar el Parseo en el Frontend

Una vez que `by-sid` devuelva `cliente_expandido`, actualizar el hook:

```javascript
// Línea 168 - Actualizar para usar cliente_expandido
const persistedData = {
  llamada_id: response.data.id,
  cliente_id: response.data.cliente_expandido?.id || null,
  telefono: response.data.telefono_destino || response.data.telefono_origen,
  nombre: response.data.cliente_expandido?.nombre || null,
  documento: response.data.cliente_expandido?.documento || null,
  direccion: response.data.cliente_expandido?.direccion || null,
  correo: response.data.cliente_expandido?.correo || null,
  ciudad: response.data.cliente_expandido?.ciudad || null,
  campana_id: response.data.campana_id || null,
  call_sid: callSid,
  timestamp: new Date().toISOString()
};
```

---

## 📝 Código Completo para Agregar a views.py

```python
# AGREGAR al final de la clase LlamadaViewSet en apps/calls/views.py

    @action(detail=False, methods=['get'], url_path='by-sid/(?P<call_sid>[^/.]+)')
    def by_sid(self, request, call_sid=None):
        """Obtiene una llamada por su Twilio Call SID con información completa del cliente."""
        try:
            llamada = Llamada.objects.select_related('cliente', 'agente', 'venta').get(
                twilio_call_sid=call_sid
            )
            
            # Validar permisos
            if llamada.agente != request.user and not request.user.is_admin():
                return Response(
                    {'detail': 'No tiene permisos para ver esta llamada.'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            data = LlamadaSerializer(llamada).data
            
            # Expandir datos del cliente
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
            
            return Response(data)
        
        except Llamada.DoesNotExist:
            return Response(
                {'detail': 'Llamada no encontrada.'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['post'], url_path='create')
    def create_call(self, request):
        """Crea un registro de llamada manual antes de iniciar la llamada con Twilio."""
        telefono_destino = request.data.get('telefono_destino')
        campana_id = request.data.get('campana_id')
        agente_id = request.data.get('agente_id')
        
        if not telefono_destino:
            return Response(
                {'error': 'telefono_destino es requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if agente_id != request.user.id and not request.user.is_admin():
            return Response(
                {'error': 'No tiene permisos'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            estado_pendiente = get_estado_id('ESTADO_LLAMADA', 'PENDIENTE')
            estado_no_venta = get_estado_id('ESTADO_VENTA', 'NO_VENTA')
            estado_no_reportada = get_estado_id('ESTADO_REPORTE', 'NO_REPORTADA')
            
            cliente = None
            if campana_id:
                cliente = Cliente.objects.filter(
                    telefono=telefono_destino,
                    campana_id=campana_id
                ).first()
            
            llamada = Llamada.objects.create(
                agente_id=agente_id,
                cliente=cliente,
                telefono_origen='',
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
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'], url_path='disponible-venta')
    def disponible_venta(self, request):
        """Obtiene la última llamada del agente para registrar venta."""
        llamada = Llamada.objects.filter(
            agente=request.user
        ).select_related('cliente', 'venta').order_by('-fecha_hora_inicio').first()
        
        if not llamada:
            return Response(
                {'detail': 'No hay llamadas disponibles.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
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
```

---

## ✅ Resumen de Cambios Necesarios

1. **Backend (`apps/calls/views.py`):**
   - ✅ Agregar método `by_sid()` 
   - ✅ Agregar método `create_call()`
   - ✅ Agregar método `disponible_venta()`

2. **Frontend (`useTwilioCall.js`):**
   - ✅ Actualizar línea 168 para usar `cliente_expandido`
   - ✅ Todo lo demás ya está implementado correctamente

3. **Base de datos:**
   - ✅ Verificar que existan los estados necesarios en `TiposParametros`

---

## 🎯 Resultado Esperado

Después de implementar estos cambios:

✅ Las llamadas manuales capturarán el `llamada_id` correctamente
✅ Las llamadas automáticas obtendrán información completa del cliente
✅ Los datos del cliente incluirán: nombre, documento, dirección, correo, ciudad
✅ La información persistirá durante AFTERCALL
✅ Se podrá recuperar el `llamada_id` si se pierde el estado
✅ Se podrán registrar ventas con toda la información necesaria
