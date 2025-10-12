# 📚 Guía de Uso - Sistema de Estados (TiposParametros)

## Fecha: 11 de Octubre de 2025

---

## 📋 Índice

1. [Poblar la Base de Datos](#poblar-la-base-de-datos)
2. [Consultar Estados](#consultar-estados)
3. [Usar Estados en el Código](#usar-estados-en-el-código)
4. [Categorías Disponibles](#categorías-disponibles)
5. [Ejemplos de Uso](#ejemplos-de-uso)

---

## 🚀 Poblar la Base de Datos

### Paso 1: Ejecutar el script de población

```bash
cd backend
python poblar_tipos_parametros.py
```

Este script creará **todos los estados necesarios** para el funcionamiento del sistema:

- ✅ 4 Roles de usuario
- ✅ 10 Estados de agente
- ✅ 5 Estados de campaña
- ✅ 9 Estados de llamada
- ✅ 8 Estados de iteración/llamada
- ✅ 7 Estados de venta
- ✅ 5 Motivos de rechazo
- ✅ 4 Tipos de llamada
- ✅ 6 Tipos de campaña

**Total: ~58 registros**

### Salida Esperada:

```
================================================================================
POBLANDO TIPOS DE PARÁMETROS
================================================================================
✅ Creado: ROL_USUARIO - ADMIN
✅ Creado: ROL_USUARIO - SUPERVISOR
...
================================================================================
RESUMEN
================================================================================
✅ Registros creados: 58
ℹ️  Registros existentes: 0
📊 Total procesados: 58
================================================================================
```

---

## 🔍 Consultar Estados

### Ver todos los estados:

```bash
python consultar_estados.py
```

### Buscar un estado específico:

```bash
python consultar_estados.py ESTADO_AGENTE DISPONIBLE
```

Salida:
```
================================================================================
✅ ESTADO ENCONTRADO
================================================================================
ID:          5
Categoría:   ESTADO_AGENTE
Valor:       DISPONIBLE
Descripción: Agente disponible para recibir llamadas
================================================================================
```

---

## 💻 Usar Estados en el Código

### Opción 1: Usar el Helper (Recomendado)

```python
from common.estados_helper import EstadosHelper, get_estado, get_estado_id

# Obtener objeto completo
estado = EstadosHelper.agente_disponible()
estado = get_estado('ESTADO_AGENTE', 'DISPONIBLE')

# Obtener solo el ID
estado_id = get_estado_id('ESTADO_AGENTE', 'DISPONIBLE')

# Obtener todos los estados de una categoría
estados_agente = EstadosHelper.get_estados_por_categoria('ESTADO_AGENTE')
```

### Opción 2: Consulta Directa

```python
from apps.users.models import TiposParametros

# Obtener un estado
estado = TiposParametros.objects.get(
    nombre='ESTADO_AGENTE',
    valor='DISPONIBLE'
)

# Obtener el ID
estado_id = estado.parametros_id
```

### Opción 3: Hardcodear IDs (No Recomendado)

Ejecuta `python consultar_estados.py` y copia los IDs:

```python
# Estados de agente
ESTADO_AGENTE_DISPONIBLE_ID = 5
ESTADO_AGENTE_EN_LLAMADA_ID = 6
ESTADO_AGENTE_POSTCALL_ID = 7
```

---

## 📁 Categorías Disponibles

### 1. ROL_USUARIO
Roles de usuarios del sistema:
- `ADMIN` - Administrador
- `SUPERVISOR` - Supervisor
- `AGENTE` - Agente de call center
- `ANALISTA` - Analista de datos

### 2. ESTADO_AGENTE
Estados de los agentes:
- `DISPONIBLE` - Listo para recibir llamadas
- `EN_LLAMADA` - Atendiendo llamada
- `POSTCALL` - Trabajo post-llamada
- `BREAK` - Descanso corto
- `ALMUERZO` - Hora de almuerzo
- `CAPACITACION` - En capacitación
- `REUNION` - En reunión
- `AUSENTE` - Ausente
- `DESCONECTADO` - Desconectado
- `OCUPADO` - Ocupado

### 3. ESTADO_CAMPANA
Estados de campañas:
- `ACTIVA` - Campaña activa
- `PAUSADA` - Pausada temporalmente
- `FINALIZADA` - Completada
- `PLANIFICADA` - Planificada
- `CANCELADA` - Cancelada

### 4. ESTADO_LLAMADA
Estados de llamadas:
- `TIMBRADO` - Sonando
- `EN_CURSO` - En progreso
- `COMPLETADA` - Finalizada exitosamente
- `NO_CONTESTADA` - No contestada
- `RECHAZADA` - Rechazada
- `TRANSFERIDA` - Transferida
- `COLGADA` - Colgada
- `OCUPADO` - Línea ocupada
- `ERROR` - Error

### 5. ESTADO_INTERACION_LLAMADA
Estados de iteraciones con clientes:
- `CONTACTADO` - Cliente contactado
- `NO_CONTACTADO` - No contactado
- `MENSAJE_DEJADO` - Mensaje dejado
- `NUMERO_INVALIDO` - Número inválido
- `NO_INTERESADO` - No interesado
- `CALLBACK_SOLICITADO` - Callback solicitado
- `OCUPADO` - Cliente ocupado
- `BUZON_VOZ` - Buzón de voz

### 6. ESTADO_VENTA
Estados de ventas:
- `VENTA` - Venta realizada
- `NO_VENTA` - No se realizó venta
- `PENDIENTE` - Pendiente de confirmación
- `INTERESADO` - Cliente interesado
- `SEGUIMIENTO` - Requiere seguimiento
- `CANCELADA` - Venta cancelada
- `CONFIRMADA` - Venta confirmada

### 7. MOTIVO_RECHAZO
Motivos de rechazo de llamadas:
- `FUERA_DE_HORARIO` - Fuera de horario
- `SIN_CAPACIDAD` - Sin capacidad
- `CLIENTE_INADECUADO` - Cliente inadecuado
- `PROBLEMA_TECNICO` - Problema técnico
- `OTRO` - Otro motivo

### 8. TIPO_LLAMADA
Tipos de llamadas:
- `ENTRANTE` - Inbound
- `SALIENTE` - Outbound
- `TRANSFERENCIA` - Transferida
- `CALLBACK` - Retorno

### 9. TIPO_CAMPANA
Tipos de campañas:
- `VENTAS` - Ventas
- `COBRANZAS` - Cobranzas
- `ENCUESTAS` - Encuestas
- `SOPORTE` - Soporte técnico
- `MARKETING` - Marketing
- `RETENCION` - Retención

---

## 📝 Ejemplos de Uso

### Ejemplo 1: Crear una llamada con estado

```python
from apps.calls.models import Llamada
from common.estados_helper import EstadosHelper

llamada = Llamada.objects.create(
    agente=agente,
    cliente_id=cliente,
    telefono_origen='+1234567890',
    telefono_destino='+0987654321',
    estado_venta=EstadosHelper.venta_pendiente(),  # Usando helper
    hora_inicio_timbrado=timezone.now()
)
```

### Ejemplo 2: Cambiar estado de agente

```python
from apps.users.models import EstadoAgenteActual, EstadoAgenteDetalle
from common.estados_helper import estados

# Obtener estado actual
estado_actual = EstadoAgenteActual.objects.get(agente_id=agente)

# Cambiar a EN_LLAMADA
estado_actual.estado_id = estados.agente_en_llamada()
estado_actual.save()

# Registrar en historial
EstadoAgenteDetalle.objects.create(
    agente_id=agente,
    estado_id=estados.agente_en_llamada(),
    tiempo=timezone.now(),
    fecha=timezone.now().date(),
    comentario='Iniciando llamada'
)
```

### Ejemplo 3: Filtrar llamadas por estado

```python
from apps.calls.models import Llamada
from common.estados_helper import get_estado_id

# Obtener ID del estado
estado_completada_id = get_estado_id('ESTADO_LLAMADA', 'COMPLETADA')

# Filtrar llamadas
llamadas_completadas = Llamada.objects.filter(
    estado_llamada_id=estado_completada_id
)
```

### Ejemplo 4: Serializer con estados

```python
from rest_framework import serializers
from common.estados_helper import EstadosHelper

class CrearLlamadaSerializer(serializers.Serializer):
    # ... campos ...
    
    def create(self, validated_data):
        llamada = Llamada.objects.create(
            **validated_data,
            estado_venta=EstadosHelper.venta_pendiente()
        )
        return llamada
```

### Ejemplo 5: Validación de estado en serializer

```python
from rest_framework import serializers
from common.estados_helper import get_estado_id

class IniciarLlamadaSerializer(serializers.Serializer):
    def update(self, instance, validated_data):
        # Validar que está en estado TIMBRADO
        estado_timbrado_id = get_estado_id('ESTADO_LLAMADA', 'TIMBRADO')
        
        if instance.estado_llamada_id != estado_timbrado_id:
            raise serializers.ValidationError(
                'La llamada debe estar en estado TIMBRADO'
            )
        
        # Cambiar a EN_CURSO
        instance.estado_llamada_id = get_estado_id('ESTADO_LLAMADA', 'EN_CURSO')
        instance.hora_inicio_llamada = timezone.now()
        instance.save()
        
        return instance
```

---

## 🎯 Mejores Prácticas

### ✅ DO (Hacer):

1. **Usar el Helper**
   ```python
   from common.estados_helper import EstadosHelper
   estado = EstadosHelper.agente_disponible()
   ```

2. **Cachear consultas frecuentes** (el helper ya lo hace)

3. **Validar estados antes de cambiarlos**
   ```python
   if estado_actual.estado_id == estados.agente_disponible():
       # Proceder con cambio
   ```

4. **Usar constantes legibles**
   ```python
   DISPONIBLE = EstadosHelper.agente_disponible()
   ```

### ❌ DON'T (No hacer):

1. **Hardcodear IDs directamente**
   ```python
   # ❌ MAL
   estado_id = 5
   ```

2. **Consultar sin caché**
   ```python
   # ❌ MAL (múltiples consultas)
   for llamada in llamadas:
       estado = TiposParametros.objects.get(nombre='...', valor='...')
   ```

3. **No validar existencia**
   ```python
   # ❌ MAL (puede fallar)
   estado = TiposParametros.objects.get(...)
   
   # ✅ BIEN
   estado = get_estado('ESTADO_AGENTE', 'DISPONIBLE')
   if estado:
       # usar estado
   ```

---

## 🔧 Troubleshooting

### Problema: Estado no encontrado

```python
estado = get_estado('ESTADO_AGENTE', 'DISPONIBLE')
if estado is None:
    # El estado no existe en la BD
    # Ejecutar: python poblar_tipos_parametros.py
```

### Problema: ID incorrecto

```bash
# Verificar IDs actuales
python consultar_estados.py ESTADO_AGENTE DISPONIBLE
```

### Problema: Caché desactualizado

```python
from common.estados_helper import EstadosHelper
from django.core.cache import cache

# Limpiar caché
cache.clear()
```

---

## 📊 Comandos Útiles

```bash
# Poblar estados
python poblar_tipos_parametros.py

# Ver todos los estados
python consultar_estados.py

# Buscar estado específico
python consultar_estados.py ESTADO_AGENTE DISPONIBLE

# Limpiar y repoblar (en Django shell)
python manage.py shell
>>> from apps.users.models import TiposParametros
>>> TiposParametros.objects.all().delete()
>>> exit()
python poblar_tipos_parametros.py
```

---

## ✅ Checklist de Implementación

- [ ] Ejecutar `python poblar_tipos_parametros.py`
- [ ] Verificar que se crearon todos los registros
- [ ] Ejecutar `python consultar_estados.py` para ver IDs
- [ ] Importar `estados_helper` en tus serializers/views
- [ ] Actualizar código para usar estados dinámicos
- [ ] Probar funcionalidades con estados reales
- [ ] Documentar IDs importantes para el equipo

---

*Última actualización: 11 de Octubre de 2025*
