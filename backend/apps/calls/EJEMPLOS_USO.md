# 🧪 Ejemplos de Uso - Serializers con Estados Helper

## Fecha: 11 de Octubre de 2025

Este documento contiene ejemplos prácticos de cómo usar los serializers actualizados.

---

## 📞 1. Recibir una Llamada Entrante

### Endpoint: `POST /api/calls/recibir/`

```python
# Request
{
    "llamada_sid": "CA1234567890abcdef",
    "telefono_origen": "+1234567890",
    "telefono_destino": "+0987654321",
    "cliente_id": 5,  # Opcional
    "campana_id": 2
}

# Response (200 OK)
{
    "llamada_sid": "CA1234567890abcdef",
    "agente": 1,
    "agente_nombre": "Juan Pérez",
    "cliente_id": 5,
    "cliente_nombre": "María González",
    "campana_id": 2,
    "campana_nombre": "Campaña de Ventas Q4",
    "telefono_origen": "+1234567890",
    "telefono_destino": "+0987654321",
    "hora_inicio_timbrado": "2025-10-11T14:30:00Z",
    "estado_recibida": 15,  # ID del estado TIMBRADO
    "estado_venta": 20,  # ID del estado PENDIENTE
    "twilio_call_sid": null
}
```

### En el Backend (View):
```python
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def recibir_llamada(request):
    """
    Endpoint para que un agente reciba una llamada entrante.
    """
    serializer = RecibirLlamadaSerializer(
        data=request.data,
        context={'request': request}
    )
    
    if serializer.is_valid():
        llamada = serializer.save()
        return Response(
            LlamadaSerializer(llamada).data,
            status=status.HTTP_201_CREATED
        )
    
    return Response(
        serializer.errors,
        status=status.HTTP_400_BAD_REQUEST
    )
```

### Errores Posibles:
```json
// Usuario no es agente
{
    "non_field_errors": ["Solo los agentes pueden recibir llamadas."]
}

// Agente no disponible
{
    "agente": ["El agente no está disponible. Estado actual: EN_LLAMADA"]
}

// Campaña no existe
{
    "campana_id": ["La campaña no existe."]
}

// SID duplicado
{
    "llamada_sid": ["Ya existe una llamada con este SID."]
}
```

---

## 🎬 2. Iniciar una Llamada (Agente Contestó)

### Endpoint: `PATCH /api/calls/{llamada_sid}/iniciar/`

```python
# Request
{
    # Sin datos necesarios, solo el PATCH
}

# Response (200 OK)
{
    "llamada_sid": "CA1234567890abcdef",
    "estado_recibida": 16,  # ID del estado EN_CURSO
    "hora_inicio_llamada": "2025-10-11T14:30:15Z",
    "duracion_timbrado_segundos": 15
}
```

### En el Backend (View):
```python
@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def iniciar_llamada(request, llamada_sid):
    """
    Marca que el agente contestó la llamada.
    """
    try:
        llamada = Llamada.objects.get(llamada_sid=llamada_sid)
    except Llamada.DoesNotExist:
        return Response(
            {"detail": "Llamada no encontrada."},
            status=status.HTTP_404_NOT_FOUND
        )
    
    serializer = IniciarLlamadaSerializer(
        llamada,
        data={},
        context={'request': request}
    )
    
    if serializer.is_valid():
        llamada = serializer.save()
        return Response(
            LlamadaSerializer(llamada).data,
            status=status.HTTP_200_OK
        )
    
    return Response(
        serializer.errors,
        status=status.HTTP_400_BAD_REQUEST
    )
```

### Error Posible:
```json
{
    "non_field_errors": [
        "La llamada no puede iniciar desde el estado EN_CURSO"
    ]
}
```

---

## ✅ 3. Completar una Llamada (Con Venta)

### Endpoint: `PATCH /api/calls/{llamada_sid}/completar/`

```python
# Request - Con Venta
{
    "grabacion_url": "https://recordings.twilio.com/RE123...",
    "crear_formulario": true,
    "monto_venta": 150.50
}

# Response (200 OK)
{
    "llamada_sid": "CA1234567890abcdef",
    "estado_recibida": 17,  # ID del estado COMPLETADA
    "estado_venta": 21,  # ID del estado VENTA
    "hora_fin_llamada": "2025-10-11T14:35:00Z",
    "duracion_llamada_segundos": 285,
    "duracion_total_formateada": "4m 45s",
    "grabacion_url": "https://recordings.twilio.com/RE123..."
}
```

### Request - Sin Venta
```python
{
    "grabacion_url": "https://recordings.twilio.com/RE123...",
    "crear_formulario": false
}

# estado_venta será 22 (NO_VENTA)
```

### En el Backend:
```python
@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def completar_llamada(request, llamada_sid):
    """
    Completa una llamada y opcionalmente registra una venta.
    """
    try:
        llamada = Llamada.objects.get(llamada_sid=llamada_sid)
    except Llamada.DoesNotExist:
        return Response(
            {"detail": "Llamada no encontrada."},
            status=status.HTTP_404_NOT_FOUND
        )
    
    serializer = CompletarLlamadaSerializer(
        llamada,
        data=request.data,
        context={'request': request}
    )
    
    if serializer.is_valid():
        llamada = serializer.save()
        return Response(
            LlamadaSerializer(llamada).data,
            status=status.HTTP_200_OK
        )
    
    return Response(
        serializer.errors,
        status=status.HTTP_400_BAD_REQUEST
    )
```

---

## ❌ 4. Rechazar una Llamada

### Endpoint: `PATCH /api/calls/{llamada_sid}/rechazar/`

```python
# Request
{
    "motivo_rechazo_valor": "FUERA_DE_HORARIO"
}

# Response (200 OK)
{
    "llamada_sid": "CA1234567890abcdef",
    "estado_recibida": 18,  # ID del estado RECHAZADA
    "estado_venta": 22,  # ID del estado NO_VENTA
    "hora_fin_llamada": "2025-10-11T14:30:30Z"
}
```

### Motivos Válidos:
- `FUERA_DE_HORARIO`
- `SIN_CAPACIDAD`
- `CLIENTE_INADECUADO`
- `PROBLEMA_TECNICO`
- `OTRO`

### Error Posible:
```json
{
    "motivo_rechazo_valor": [
        "El motivo de rechazo \"INVALIDO\" no existe."
    ]
}
```

---

## 🔄 5. Transferir una Llamada

### Endpoint: `PATCH /api/calls/{llamada_sid}/transferir/`

```python
# Request
{
    "agente_destino_id": 3
}

# Response (200 OK)
{
    "llamada_sid": "CA1234567890abcdef",
    "agente": 3,
    "agente_nombre": "Pedro Martínez",
    "agente_anterior": 1,
    "estado_recibida": 19  # ID del estado TRANSFERIDA
}
```

### Errores Posibles:
```json
// Agente no existe
{
    "agente_destino_id": ["El agente destino no existe."]
}

// Usuario no es agente
{
    "agente_destino_id": [
        "El usuario Pedro Martínez no es un agente."
    ]
}

// Agente no disponible
{
    "agente_destino_id": [
        "El agente Pedro Martínez no está disponible para recibir llamadas."
    ]
}

// Llamada no en curso
{
    "non_field_errors": [
        "Solo se pueden transferir llamadas en curso."
    ]
}
```

---

## 📊 6. Listar Llamadas con Filtros

### Endpoint: `GET /api/calls/`

```python
# Query Params
?estado=COMPLETADA&campana=2&fecha_desde=2025-10-01

# En la View
from common.estados_helper import get_estado_id

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def listar_llamadas(request):
    """
    Lista llamadas con filtros opcionales.
    """
    llamadas = Llamada.objects.all()
    
    # Filtrar por estado
    estado_valor = request.query_params.get('estado')
    if estado_valor:
        estado_id = get_estado_id('ESTADO_LLAMADA', estado_valor)
        if estado_id:
            llamadas = llamadas.filter(estado_recibida_id=estado_id)
    
    # Filtrar por campaña
    campana_id = request.query_params.get('campana')
    if campana_id:
        llamadas = llamadas.filter(campana_id=campana_id)
    
    # Filtrar por fecha
    fecha_desde = request.query_params.get('fecha_desde')
    if fecha_desde:
        llamadas = llamadas.filter(
            hora_inicio_timbrado__gte=fecha_desde
        )
    
    serializer = LlamadaSerializer(llamadas, many=True)
    return Response(serializer.data)
```

---

## 🔍 7. Consultar Estados Disponibles

### Desde Python (Shell o Script):

```python
from common.estados_helper import EstadosHelper

# Ver todos los estados de llamada
estados_llamada = EstadosHelper.get_estados_por_categoria('ESTADO_LLAMADA')
for estado in estados_llamada:
    print(f"{estado.parametros_id}: {estado.valor} - {estado.descripcion}")

# Salida:
# 15: TIMBRADO - Llamada sonando
# 16: EN_CURSO - Llamada en progreso
# 17: COMPLETADA - Llamada finalizada exitosamente
# 18: RECHAZADA - Llamada rechazada
# 19: TRANSFERIDA - Llamada transferida
# ...
```

### Desde CLI:
```bash
python consultar_estados.py ESTADO_LLAMADA
```

---

## 🧪 8. Testing con Pytest

### Test de Recibir Llamada:

```python
import pytest
from django.contrib.auth import get_user_model
from apps.calls.models import Llamada
from apps.calls.serializers import RecibirLlamadaSerializer
from apps.campaigns.models import Campana, Cliente
from common.estados_helper import get_estado_id

User = get_user_model()

@pytest.fixture
def agente_disponible(db):
    """Crea un agente en estado disponible."""
    from apps.users.models import EstadoAgenteActual
    
    user = User.objects.create_user(
        username='agente1',
        email='agente1@test.com',
        rol_id=get_estado_id('ROL_USUARIO', 'AGENTE')
    )
    
    EstadoAgenteActual.objects.create(
        agente_id=user,
        estado_id_id=get_estado_id('ESTADO_AGENTE', 'DISPONIBLE')
    )
    
    return user

@pytest.fixture
def campana_activa(db):
    """Crea una campaña activa."""
    return Campana.objects.create(
        nombre='Test Campaign',
        fecha_inicio='2025-01-01',
        fecha_fin='2025-12-31'
    )

@pytest.mark.django_db
def test_recibir_llamada_exitosa(agente_disponible, campana_activa, rf):
    """Test: Agente puede recibir llamada correctamente."""
    request = rf.post('/api/calls/recibir/')
    request.user = agente_disponible
    
    data = {
        'llamada_sid': 'CA_TEST_123',
        'telefono_origen': '+1234567890',
        'telefono_destino': '+0987654321',
        'campana_id': campana_activa.id
    }
    
    serializer = RecibirLlamadaSerializer(
        data=data,
        context={'request': request}
    )
    
    assert serializer.is_valid(), serializer.errors
    llamada = serializer.save()
    
    # Verificar que se creó la llamada
    assert Llamada.objects.filter(llamada_sid='CA_TEST_123').exists()
    
    # Verificar estado de llamada
    estado_timbrado_id = get_estado_id('ESTADO_LLAMADA', 'TIMBRADO')
    assert llamada.estado_recibida_id == estado_timbrado_id
    
    # Verificar estado de venta
    estado_pendiente_id = get_estado_id('ESTADO_VENTA', 'PENDIENTE')
    assert llamada.estado_venta_id == estado_pendiente_id
    
    # Verificar que se creó el cliente
    assert Cliente.objects.filter(telefono='+1234567890').exists()

@pytest.mark.django_db
def test_recibir_llamada_agente_ocupado(agente_disponible, campana_activa, rf):
    """Test: Agente ocupado no puede recibir llamada."""
    from apps.users.models import EstadoAgenteActual
    
    # Cambiar agente a EN_LLAMADA
    estado_actual = EstadoAgenteActual.objects.get(agente_id=agente_disponible)
    estado_actual.estado_id_id = get_estado_id('ESTADO_AGENTE', 'EN_LLAMADA')
    estado_actual.save()
    
    request = rf.post('/api/calls/recibir/')
    request.user = agente_disponible
    
    data = {
        'llamada_sid': 'CA_TEST_456',
        'telefono_origen': '+1111111111',
        'telefono_destino': '+2222222222',
        'campana_id': campana_activa.id
    }
    
    serializer = RecibirLlamadaSerializer(
        data=data,
        context={'request': request}
    )
    
    # Debe fallar la validación
    assert not serializer.is_valid()
    assert 'agente' in serializer.errors
```

---

## 📈 9. Estadísticas con Estados

### Contar llamadas por estado:

```python
from django.db.models import Count
from apps.calls.models import Llamada
from common.estados_helper import get_estado_id

# Obtener IDs de estados
estado_completada = get_estado_id('ESTADO_LLAMADA', 'COMPLETADA')
estado_rechazada = get_estado_id('ESTADO_LLAMADA', 'RECHAZADA')
estado_en_curso = get_estado_id('ESTADO_LLAMADA', 'EN_CURSO')

# Contar por estado
stats = {
    'completadas': Llamada.objects.filter(
        estado_recibida_id=estado_completada
    ).count(),
    'rechazadas': Llamada.objects.filter(
        estado_recibida_id=estado_rechazada
    ).count(),
    'en_curso': Llamada.objects.filter(
        estado_recibida_id=estado_en_curso
    ).count()
}

print(stats)
# {'completadas': 150, 'rechazadas': 25, 'en_curso': 3}
```

### Ventas por campaña:

```python
from apps.calls.models import Venta
from django.db.models import Sum

ventas_por_campana = Venta.objects.values(
    'campana_id__nombre'
).annotate(
    total_ventas=Count('venta_id'),
    monto_total=Sum('monto')
).order_by('-monto_total')

for item in ventas_por_campana:
    print(f"{item['campana_id__nombre']}: "
          f"{item['total_ventas']} ventas, "
          f"${item['monto_total']}")
```

---

## 🔐 10. Permisos Personalizados

### Permission Class basada en rol:

```python
from rest_framework.permissions import BasePermission
from common.estados_helper import get_estado_id

class IsAgent(BasePermission):
    """
    Permiso: Solo agentes pueden acceder.
    """
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        rol_agente = get_estado_id('ROL_USUARIO', 'AGENTE')
        return request.user.rol_id == rol_agente

class IsSupervisor(BasePermission):
    """
    Permiso: Solo supervisores pueden acceder.
    """
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        rol_supervisor = get_estado_id('ROL_USUARIO', 'SUPERVISOR')
        return request.user.rol_id == rol_supervisor

class IsAgentOrSupervisor(BasePermission):
    """
    Permiso: Agentes o supervisores pueden acceder.
    """
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        rol_agente = get_estado_id('ROL_USUARIO', 'AGENTE')
        rol_supervisor = get_estado_id('ROL_USUARIO', 'SUPERVISOR')
        
        return request.user.rol_id in [rol_agente, rol_supervisor]

# Uso en views
@api_view(['POST'])
@permission_classes([IsAgent])
def recibir_llamada(request):
    # Solo agentes pueden acceder
    ...
```

---

*Última actualización: 11 de Octubre de 2025*
