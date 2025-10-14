# 🔄 Actualización de Serializers - Integración con Estados Helper

## Fecha: 11 de Octubre de 2025

---

## 📋 Resumen de Cambios

Se han actualizado **todos los serializers** de la app `calls` para:

1. ✅ Trabajar con la **nueva estructura de modelos** refactorizada
2. ✅ Usar **`estados_helper`** para gestión dinámica de estados
3. ✅ Mantener **todas las funcionalidades** originales
4. ✅ Eliminar dependencias de enums hardcodeados (choices)
5. ✅ Adaptar relaciones FK según nuevos nombres de campos

---

## 🎯 Serializers Actualizados

### 1. ✅ ClienteSerializer
**Estado:** Sin cambios (ya funcionaba correctamente)

**Campos:**
- `id`, `nombre`, `apellido`, `nombre_completo` (readonly)
- `telefono`, `telefono_alternativo`, `email`
- `documento_id`, `direccion`, `ciudad`, `pais`, `notas`
- `created_at`, `updated_at`

**Validaciones:**
- ✅ Documento único

---

### 2. ✅ CampanaSerializer
**Cambios:**
- ❌ Removido: `tipo_display`, `activo` (no existen en modelo refactorizado)
- ✅ Actualizado: `get_llamadas_completadas()` usa `estados_helper`

```python
def get_llamadas_completadas(self, obj):
    estado_completada = get_estado_id('ESTADO_LLAMADA', 'COMPLETADA')
    if estado_completada:
        return obj.llamadas.filter(
            estado_llamada_id=estado_completada
        ).count()
    return 0
```

**Campos:**
- `id`, `nombre`, `descripcion`
- `fecha_inicio`, `fecha_fin`
- `objetivo_llamadas`, `objetivo_ventas`
- `total_llamadas` (calculado), `llamadas_completadas` (calculado)

---

### 3. ✅ FormularioVentaSerializer (antes FormularioLlamadaSerializer)
**Cambios:**
- ✅ Renombrado de `FormularioLlamada` → `FormularioVenta`
- ✅ Campos actualizados según nuevo modelo

**Campos:**
- `formulario_id`, `llamada_id`, `cliente_id`, `venta_id`
- `datos_formulario` (JSON)

**Validaciones:**
- ✅ Valida que `datos_formulario` sea JSON válido

---

### 4. ✅ VentaSerializer (Nuevo)
**Estado:** Serializer nuevo

**Campos:**
- `venta_id` (readonly)
- `campana_id`
- `monto`

---

### 5. ✅ IteracionClienteSerializer (Nuevo)
**Estado:** Serializer nuevo para modelo `IteracionCliente`

**Campos:**
- `id`, `campana_id`, `cliente_id`
- `estado_interacion_llamada_id`, `intento`

**Validaciones:**
- ✅ Valida que `estado_interacion_llamada_id` sea de categoría `ESTADO_INTERACION_LLAMADA`

```python
def validate_estado_interacion_llamada_id(self, value):
    if value:
        estados_validos = EstadosHelper.get_estados_por_categoria('ESTADO_INTERACION_LLAMADA')
        if value not in estados_validos:
            raise serializers.ValidationError(
                'El estado debe ser de tipo ESTADO_INTERACION_LLAMADA.'
            )
    return value
```

---

### 6. ✅ LlamadaSerializer
**Cambios:**
- ❌ Removido: `estado_llamada_display`, `tipo_llamada_display`, `motivo_rechazo`, `notas`, `intentos_redireccion`, `formulario`, `metadata`, `id`
- ✅ Actualizado: Nombres de campos FK (`cliente` → `cliente_id`, `campana` → `campana_id`)
- ✅ Agregado: Campos Twilio completos, `estado_venta_valor`

**Campos principales:**
- `llamada_sid` (único)
- `agente`, `agente_nombre` (readonly)
- `cliente_id`, `cliente_nombre` (readonly)
- `campana_id`, `campana_nombre` (readonly)
- `telefono_origen`, `telefono_destino`
- `hora_inicio_timbrado`, `hora_inicio_llamada`, `hora_fin_llamada`
- `duracion_timbrado_segundos`, `duracion_llamada_segundos`, `duracion_total_formateada`
- `grabacion_url`, `grabacion_duracion`

**Campos Twilio (5):**
- `twilio_call_sid` (único)
- `twilio_status`
- `twilio_recording_sid`
- `twilio_recording_url`
- *(twilio_duration se mapea a duracion)*

**Campos de estado:**
- `estado_venta` (FK a TiposParametros)
- `estado_venta_valor` (readonly - muestra el valor)
- `estado_recibida` (FK a TiposParametros)

---

### 7. ✅ RecibirLlamadaSerializer
**Cambios:**
- ✅ Validación de rol usa `estados_helper`:
  ```python
  if user.rol_id != get_estado_id('ROL_USUARIO', 'AGENTE'):
      raise ValidationError('Solo los agentes pueden recibir llamadas.')
  ```

- ✅ Validación de estado del agente usa `estados_helper`:
  ```python
  estado_disponible = get_estado_id('ESTADO_AGENTE', 'DISPONIBLE')
  if estado_actual.estado_id_id != estado_disponible:
      raise ValidationError(...)
  ```

- ✅ Creación de llamada con estados dinámicos:
  ```python
  llamada = Llamada.objects.create(
      estado_venta=EstadosHelper.venta_pendiente(),
      estado_recibida=get_estado('ESTADO_LLAMADA', 'TIMBRADO')
  )
  ```

- ✅ Actualización de estado del agente:
  ```python
  nuevo_detalle = EstadoAgenteDetalle.objects.create(
      agente_id=user,
      estado_id=EstadosHelper.agente_en_llamada(),
      comentario=f'Llamada recibida: {llamada.llamada_sid}',
      hora_inicio=timezone.now(),
      fecha=timezone.now().date()
  )
  ```

**Campos de entrada:**
- `llamada_sid` (SID de Twilio)
- `telefono_origen`
- `telefono_destino`
- `cliente_id` (opcional)
- `campana_id`

**Validaciones:**
- ✅ Usuario es agente (rol)
- ✅ Agente está disponible (estado)
- ✅ Campaña existe
- ✅ Cliente existe (si se proporciona)
- ✅ No hay llamada duplicada (SID único)

**Lógica de negocio:**
1. Crea/busca cliente por teléfono
2. Crea llamada con estado TIMBRADO
3. Cierra estado anterior del agente
4. Crea nuevo estado EN_LLAMADA
5. Actualiza EstadoAgenteActual

---

### 8. ✅ IniciarLlamadaSerializer
**Cambios:**
- ✅ Usa `get_estado()` en lugar de enums:
  ```python
  estado_timbrado = get_estado('ESTADO_LLAMADA', 'TIMBRADO')
  if instance.estado_recibida != estado_timbrado:
      raise ValidationError(...)
  ```

- ✅ Actualiza `estado_recibida` en lugar de `estado_llamada`:
  ```python
  instance.estado_recibida = get_estado('ESTADO_LLAMADA', 'EN_CURSO')
  ```

**Validaciones:**
- ✅ Llamada debe estar en TIMBRADO

**Lógica:**
1. Valida estado actual
2. Cambia a EN_CURSO
3. Registra hora de inicio

---

### 9. ✅ CompletarLlamadaSerializer
**Cambios:**
- ❌ Removido: `notas` (no existe en modelo)
- ✅ Agregado: `monto_venta` (para registrar ventas)
- ✅ Usa estados dinámicos para validación y actualización
- ✅ Crea `Venta` y `FormularioVenta` si hay venta

```python
# Si se realizó venta, actualizar estado
monto_venta = validated_data.get('monto_venta')
if monto_venta:
    instance.estado_venta = EstadosHelper.venta_realizada()
else:
    instance.estado_venta = EstadosHelper.venta_no_realizada()
```

**Campos de entrada:**
- `grabacion_url` (opcional)
- `crear_formulario` (bool, default=False)
- `monto_venta` (decimal, opcional)

**Validaciones:**
- ✅ Llamada en estado EN_CURSO o TIMBRADO

**Lógica de negocio:**
1. Valida estado actual
2. Cambia a COMPLETADA
3. Actualiza estado_venta según si hubo venta
4. Crea Venta y FormularioVenta si corresponde
5. Cierra estado agente anterior
6. Crea estado POSTCALL para agente

---

### 10. ✅ RechazarLlamadaSerializer
**Cambios:**
- ❌ Removido: `motivo_rechazo_id`, `notas`
- ✅ Agregado: `motivo_rechazo_valor` (string con el valor del estado)
- ✅ Usa estados dinámicos para validación

```python
def validate_motivo_rechazo_valor(self, value):
    if value:
        motivo = get_estado('MOTIVO_RECHAZO', value)
        if not motivo:
            raise ValidationError(f'El motivo "{value}" no existe.')
    return value
```

**Campos de entrada:**
- `motivo_rechazo_valor` (opcional, ej: 'FUERA_DE_HORARIO')

**Validaciones:**
- ✅ Llamada en TIMBRADO o EN_CURSO
- ✅ Motivo existe en MOTIVO_RECHAZO

**Lógica:**
1. Valida estado actual
2. Cambia a RECHAZADA
3. Actualiza estado_venta a NO_VENTA
4. Vuelve agente a DISPONIBLE

---

### 11. ✅ TransferirLlamadaSerializer
**Cambios:**
- ❌ Removido: `notas`, `intentos_redireccion`
- ✅ Validación de rol usando estados:
  ```python
  rol_agente_id = get_estado_id('ROL_USUARIO', 'AGENTE')
  if agente.rol_id != rol_agente_id:
      raise ValidationError('El usuario no es un agente.')
  ```

- ✅ Validación de disponibilidad usando estados:
  ```python
  estado_disponible = get_estado_id('ESTADO_AGENTE', 'DISPONIBLE')
  if estado.estado_id_id != estado_disponible:
      raise ValidationError('Agente no disponible.')
  ```

**Campos de entrada:**
- `agente_destino_id`

**Validaciones:**
- ✅ Llamada en EN_CURSO
- ✅ Agente destino existe y es agente
- ✅ Agente destino está DISPONIBLE

**Lógica:**
1. Valida estado llamada y agente destino
2. Cambia llamada a TRANSFERIDA
3. Actualiza agente y agente_anterior
4. Libera agente origen (DISPONIBLE)
5. Ocupa agente destino (EN_LLAMADA)

---

## 🔑 Uso de Estados Helper

### Métodos utilizados:

```python
# Obtener estado completo (objeto TiposParametros)
EstadosHelper.agente_disponible()
EstadosHelper.agente_en_llamada()
EstadosHelper.agente_postcall()
EstadosHelper.venta_pendiente()
EstadosHelper.venta_realizada()
EstadosHelper.venta_no_realizada()

# Obtener estado genérico
get_estado('ESTADO_LLAMADA', 'TIMBRADO')
get_estado('ESTADO_LLAMADA', 'EN_CURSO')
get_estado('ESTADO_LLAMADA', 'COMPLETADA')
get_estado('ESTADO_LLAMADA', 'RECHAZADA')
get_estado('ESTADO_LLAMADA', 'TRANSFERIDA')

# Obtener solo ID
get_estado_id('ROL_USUARIO', 'AGENTE')
get_estado_id('ESTADO_AGENTE', 'DISPONIBLE')

# Obtener todos los estados de una categoría
EstadosHelper.get_estados_por_categoria('ESTADO_INTERACION_LLAMADA')
```

---

## 📊 Comparativa: Antes vs Después

### ANTES (con Choices):
```python
# Hardcoded
if user.role != User.Role.AGENT:
    raise ValidationError(...)

# Enums
if instance.estado_llamada != Llamada.EstadoLlamada.TIMBRADO:
    raise ValidationError(...)

# Creación
llamada.estado_llamada = Llamada.EstadoLlamada.COMPLETADA
```

### DESPUÉS (con Estados Helper):
```python
# Dinámico desde BD
if user.rol_id != get_estado_id('ROL_USUARIO', 'AGENTE'):
    raise ValidationError(...)

# Estados dinámicos
estado_timbrado = get_estado('ESTADO_LLAMADA', 'TIMBRADO')
if instance.estado_recibida != estado_timbrado:
    raise ValidationError(...)

# Con helper
llamada.estado_recibida = get_estado('ESTADO_LLAMADA', 'COMPLETADA')
# O método de conveniencia
llamada.estado_venta = EstadosHelper.venta_realizada()
```

---

## ✅ Funcionalidades Mantenidas

### 1. Validaciones de Negocio:
- ✅ Solo agentes reciben llamadas
- ✅ Agente debe estar disponible
- ✅ Campaña debe existir
- ✅ No duplicar SIDs
- ✅ Transiciones de estado válidas
- ✅ Agente destino disponible para transferencias

### 2. Gestión de Estados de Agente:
- ✅ Cierre automático de estado anterior
- ✅ Creación de nuevo estado con detalles
- ✅ Actualización de EstadoAgenteActual
- ✅ Registro de comentarios con SID de llamada

### 3. Gestión de Llamadas:
- ✅ Flujo completo: Timbrado → En Curso → Completada/Rechazada
- ✅ Cálculo de duraciones (automático en modelo)
- ✅ Registro de grabaciones
- ✅ Transferencias entre agentes
- ✅ Integración con Twilio (5 campos)

### 4. Gestión de Ventas:
- ✅ Registro de ventas con monto
- ✅ Estados de venta (PENDIENTE, VENTA, NO_VENTA)
- ✅ Creación de formularios asociados
- ✅ Relación con campaña

### 5. Características Especiales:
- ✅ Búsqueda/creación automática de clientes
- ✅ Histórico de transferencias (agente_anterior)
- ✅ Campos readonly calculados
- ✅ Serialización de relaciones (nombres legibles)

---

## 🔧 Adaptaciones Técnicas

### Campos de Modelo Actualizados:
```python
# ANTES
instance.agente
instance.cliente
instance.campana
instance.estado_llamada
instance.tipo_llamada

# DESPUÉS
instance.agente          # Sin cambio
instance.cliente_id      # Ahora con _id
instance.campana_id      # Ahora con _id
instance.estado_recibida # Reemplaza estado_llamada
instance.estado_venta    # FK a TiposParametros
```

### Campos de EstadoAgenteDetalle:
```python
# ANTES
detalle.estado
detalle.comentarios
detalle.esta_activo (property)

# DESPUÉS
detalle.estado_id     # FK a TiposParametros
detalle.comentario    # Singular, sin 's'
detalle.hora_fin      # Nullable para indicar activo
```

### Campos de EstadoAgenteActual:
```python
# ANTES
estado.estado
estado.detalle
estado.acepta_llamadas
estado.puede_recibir_llamadas (property)

# DESPUÉS
estado.estado_id          # FK a TiposParametros
estado.estado_detalle_id  # FK a EstadoAgenteDetalle
# acepta_llamadas y puede_recibir_llamadas removidos
# Se valida comparando estado_id_id con DISPONIBLE
```

---

## 🎯 Próximos Pasos

### 1. Poblar Estados (CRÍTICO):
```bash
cd backend
python poblar_tipos_parametros.py
```

### 2. Aplicar Migraciones:
```bash
python manage.py makemigrations
python manage.py migrate
```

### 3. Verificar Estados:
```bash
python consultar_estados.py
```

### 4. Actualizar Views/ViewSets:
- Adaptar filtros a nuevos nombres de campos
- Actualizar permisos basados en `rol_id`
- Verificar serializers context

### 5. Actualizar Tests:
- Tests de serializers
- Tests de validaciones
- Tests de flujos completos

### 6. Probar Integración Twilio:
- Webhooks de llamadas
- Grabaciones
- Estados de Twilio

---

## 📝 Notas Importantes

### ⚠️ Breaking Changes:
1. **Nombres de campos FK**: `cliente` → `cliente_id`, `campana` → `campana_id`
2. **Estado de llamada**: `estado_llamada` → `estado_recibida`
3. **EstadoAgenteDetalle**: `comentarios` → `comentario`, `estado` → `estado_id`
4. **EstadoAgenteActual**: `detalle` → `estado_detalle_id`
5. **Campos removidos**: `notas`, `intentos_redireccion`, `tipo_llamada`, `motivo_rechazo` (en Llamada)

### ✅ Mejoras:
1. Estados dinámicos (configurables sin código)
2. Caché de estados (mejor performance)
3. Validaciones más claras
4. Código más mantenible
5. Separación de responsabilidades (Venta, FormularioVenta)

### 🐛 Posibles Issues:
1. **Frontend**: Adaptar nombres de campos en requests
2. **Twilio Webhooks**: Verificar que envíen campos correctos
3. **Permisos**: Actualizar checks de `user.is_agent()` a verificación de `rol_id`
4. **Filtros**: Actualizar queries que usen `estado_llamada` (ahora `estado_recibida`)

---

*Última actualización: 11 de Octubre de 2025*
*Autor: GitHub Copilot*
