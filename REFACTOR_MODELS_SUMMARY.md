# Resumen de Refactorización de Modelos

## Fecha: 11 de Octubre de 2025

Se han refactorizado los modelos de la base de datos para alinearlos con el diagrama de entidad-relación proporcionado.

---

## Cambios en `apps/users/models.py`

### 1. **TiposParametros** (Actualizado)
- Se mantiene como tabla de parámetros del sistema
- Se agregó índice en campo `nombre`
- Soporta tipos: ROL_USUARIO, ESTADO_AGENTE, ESTADO_CAMPANA, ESTADO_LLAMADA, ESTADO_INTERACION_LLAMADA

### 2. **Centro** (NUEVO)
- **Tabla:** `centro`
- **Primary Key:** `centro_id` (AutoField)
- **Campos:**
  - `nombre` (CharField, max_length=150)
  - `telefono` (CharField, max_length=20)
  - `direccion` (TextField)
- Representa centros de atención o sucursales del call center

### 3. **Equipo** (Refactorizado)
- **Primary Key:** Cambiado a `equipo_id` (AutoField)
- **Nuevos campos:**
  - `ayte_campana_id` (IntegerField) - ID de campaña asociada
  - `estado_campana_id` (FK a TiposParametros) - Estado de la campaña
  - `jyfe_centro_id` (FK a Centro) - Centro al que pertenece
- **Eliminados:** `supervisor`, `activo`, `created_at`, `updated_at`
- **db_table:** `equipo`

### 4. **EquipoAgenteDetalle** (Simplificado)
- Simplificada la relación muchos a muchos entre equipos y agentes
- **Eliminados:** `fecha_asignacion`, `activo`, `created_at`, `updated_at`
- **db_table:** `equipo_agente_detalle`
- Campos: `agente_id` (FK), `equipo_id` (FK)

### 5. **EstadoAgenteDetalle** (Simplificado)
- **Refactorizado completamente** para seguir el diagrama
- **Nuevos campos:**
  - `agente_id` (FK a User)
  - `estado_id` (FK a TiposParametros)
  - `tiempo` (DateTimeField)
  - `fecha` (DateField)
  - `comentario` (TextField)
- **Eliminados:** `hora_inicio`, `hora_fin`, `duracion_segundos`, `ip_address`, `user_agent`, métodos auxiliares
- **db_table:** `estado_agente_detalle`

### 6. **EstadoAgenteActual** (Simplificado)
- **Refactorizado** para ser más simple
- **Campos:**
  - `agente_id` (OneToOneField, Primary Key)
  - `estado_id` (FK a TiposParametros)
- **Eliminados:** campos de tiempo, flags de conexión/audio, métodos, `cambiar_estado()`
- **db_table:** `estado_agente_actual`

---

## Cambios en `apps/campaigns/models.py`

### 1. **Producto** (NUEVO)
- **Tabla:** `producto`
- **Primary Key:** `producto_id` (AutoField)
- **Campos:**
  - `nombre` (CharField, max_length=255)
  - `descripcion` (TextField)
  - `precio` (DecimalField, max_digits=10, decimal_places=2)

### 2. **Campana** (Simplificado)
- **Primary Key:** Cambiado a `campana_id` (AutoField)
- **Campos mantenidos:**
  - `nombre` (max_length=150)
  - `descripcion`
  - `fecha_inicio`
  - `fecha_fin`
- **Eliminados:** `tipo`, `activa`, `objetivo_llamadas`, `objetivo_ventas`, `created_at`, `updated_at`, choices `TipoCampana`
- **db_table:** `campana`

### 3. **ProductoCampanaDetalle** (NUEVO)
- **Tabla:** `producto_campana_detalle`
- Relación muchos a muchos entre Producto y Campaña
- **Campos:**
  - `producto_id` (FK a Producto)
  - `campana_id` (FK a Campana)

### 4. **BaseDatosCargada** (Actualizado)
- Mantiene estructura básica
- Campo `id` explícito como AutoField

### 5. **Cliente** (Actualizado)
- **Campo actualizado:** `base_datos` renombrado a `base_datos_id` con `db_column`
- Mantiene la estructura general

### 6. **Contacto** (NUEVO)
- **Tabla:** `contacto`
- **Primary Key:** `contacto_id` (AutoField)
- **Campos:**
  - `campana_id` (IntegerField)
  - `cliente_id` (FK a Cliente)
  - `nombre_nota` (CharField, max_length=255)

---

## Cambios en `apps/calls/models.py`

### 1. **Cliente y Campana** (Eliminados)
- Se eliminaron estos modelos de calls porque ahora están en campaigns
- Las importaciones ahora referencian: `from apps.campaigns.models import Cliente, Campana`

### 2. **Llamada** (Refactorizado)
- **Primary Key:** Cambiado a `llamada_id` (AutoField)
- **Campos relacionales actualizados:**
  - `agente_id` (FK a User) - antes `agente`
  - `cliente_id` (FK a Cliente de campaigns) - antes `cliente`
  - `campana_id` (FK a Campana de campaigns) - antes `campana`
  - `estado_llamada_id` (FK a TiposParametros) - NUEVO
  - `estado_iteracion_llamada_id` (FK a TiposParametros) - NUEVO
- **Nuevos campos:**
  - `fecha` (DateField)
  - `duracion` (IntegerField) - duración en segundos
  - `estado_llamada_temporal` (SmallIntegerField)
  - `estado_venta` (SmallIntegerField)
  - `twilio_duration` (IntegerField) - duración reportada por Twilio
- **Campos Twilio mantenidos y funcionales:**
  - `twilio_call_sid` - ID único de llamada (añadido unique=True)
  - `twilio_status` - Estado de la llamada
  - `twilio_recording_sid` - ID de grabación
  - `twilio_recording_url` - URL de grabación
  - `twilio_duration` - Duración reportada por Twilio
- **Eliminados:** 
  - `tipo_llamada`, `telefono_origen`, `telefono_destino`
  - `hora_inicio_timbrado`, `hora_inicio_llamada`, `hora_fin_llamada`
  - `duracion_timbrado_segundos`, `duracion_llamada_segundos`
  - `estado_recibida`, `motivo_rechazo`, `notas`, `requiere_seguimiento`
  - `agente_anterior`, `intentos_redireccion`
  - `ip_address`, `metadata`
  - `created_at`, `updated_at`
  - Choices classes y métodos auxiliares
- **db_table:** `llamada`
- **Método save():** Actualizado para sincronizar `duracion` con `twilio_duration`

### 3. **IteracionCliente** (NUEVO)
- **Tabla:** `iteracion_cliente`
- Historial de iteraciones/intentos de contacto con clientes
- **Campos:**
  - `campana_id` (IntegerField)
  - `cliente_id` (FK a Cliente)
  - `llamada_id` (FK a Llamada)
  - `estado_interacion_llamada_id` (FK a TiposParametros)
  - `venta_id` (IntegerField, nullable)
  - `fecha` (DateField)
  - `tiempo` (DateTimeField)
  - `motivo` (TextField)

### 4. **Venta** (NUEVO)
- **Tabla:** `venta`
- **Primary Key:** `venta_id` (AutoField)
- Registro de ventas realizadas
- **Campos:**
  - `campana_id` (FK a Campana)
  - `cliente_id` (FK a Cliente)
  - `llamada_id` (FK a Llamada, nullable)
  - `monto` (DecimalField, max_digits=10, decimal_places=2)
  - `atributo` (CharField, max_length=255)
  - `valor` (TextField)

### 5. **FormularioLlamada** (Eliminado)
- Modelo eliminado por completo

---

## Resumen de Tablas del Diagrama Implementadas

✅ **Tipos_Parametros** - Actualizado
✅ **Centro** - NUEVO
✅ **Equipo** - Refactorizado
✅ **Equipo_Agente_Detalle** - Simplificado
✅ **Estado_Agente_Detalle** - Refactorizado
✅ **Estado_Agente_Actual** - Simplificado
✅ **Producto** - NUEVO
✅ **Campaña** - Simplificado
✅ **Producto_Campaña_Detalle** - NUEVO
✅ **Base_Datos_Cargada** - Actualizado
✅ **Cliente** - Actualizado
✅ **Contacto** - NUEVO
✅ **Llamada** - Refactorizado con campos Twilio funcionales
✅ **Iteracion_Cliente** - NUEVO
✅ **Venta** - NUEVO

---

## Integración con Twilio

Los siguientes campos de Twilio se mantienen **funcionales** en el modelo `Llamada`:

1. **twilio_call_sid**: ID único de la llamada (ahora con unique=True para mejor integridad)
2. **twilio_status**: Estado actual de la llamada en Twilio
3. **twilio_recording_sid**: ID de la grabación
4. **twilio_recording_url**: URL para acceder a la grabación
5. **twilio_duration**: Duración de la llamada reportada por Twilio

El método `save()` sincroniza automáticamente el campo `duracion` con `twilio_duration` cuando está disponible.

---

## Próximos Pasos Recomendados

1. **Crear migraciones:**
   ```bash
   python manage.py makemigrations
   ```

2. **Revisar las migraciones generadas** antes de aplicarlas

3. **Aplicar migraciones:**
   ```bash
   python manage.py migrate
   ```

4. **Actualizar serializers y views** que usen los modelos modificados

5. **Actualizar queries en el frontend** que referencien campos eliminados o renombrados

6. **Poblar TiposParametros** con los valores necesarios:
   - ESTADO_AGENTE: Disponible, Break, En Llamada, etc.
   - ESTADO_LLAMADA: En curso, Completada, etc.
   - ESTADO_INTERACION_LLAMADA: Contactado, No Contactado, etc.

---

## Notas Importantes

- **Pérdida de datos**: Los campos eliminados perderán sus datos al migrar
- **Backup**: Se recomienda hacer backup de la base de datos antes de migrar
- **Testing**: Probar todas las funcionalidades relacionadas con llamadas y agentes
- **Twilio**: Los webhooks de Twilio deben actualizarse para usar los nuevos nombres de campo
