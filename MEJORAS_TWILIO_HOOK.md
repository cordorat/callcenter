# 🎯 Mejoras Implementadas en useTwilioCall

## 📋 Resumen de Cambios

Se ha mejorado el hook `useTwilioCall` para capturar y persistir correctamente el `llamada_id` durante todo el ciclo de vida de una llamada, incluyendo el período de AFTERCALL. Esto permite registrar ventas en cualquier momento con un `llamada_id` válido.

---

## ✨ Nuevas Funcionalidades

### 1. **Estado Persistente: `persistedCallData`**

Nuevo estado que mantiene la información de la llamada incluso después de desconectar:

```javascript
const [persistedCallData, setPersistedCallData] = useState(null);
```

**Estructura de datos:**
```javascript
{
  llamada_id: 123,           // ID del backend (CRÍTICO)
  cliente_id: 456,           // ID del cliente
  telefono: '+573001234567', // Teléfono del cliente
  nombre: 'Juan Pérez',      // Nombre del cliente
  documento: '1234567890',   // Documento
  direccion: 'Calle 123',    // Dirección
  correo: 'juan@email.com',  // Correo
  ciudad: 'Cali',            // Ciudad
  campana_id: 1,             // ID de campaña
  call_sid: 'CA123...',      // SID de Twilio
  timestamp: '2025-01-15...' // Timestamp
}
```

---

### 2. **Captura de `llamada_id` en Llamadas MANUALES**

**Flujo mejorado en `makeCall()`:**

1. ✅ Crea registro en backend ANTES de llamar con Twilio
2. ✅ Obtiene `llamada_id` del backend
3. ✅ Guarda en `persistedCallData` INMEDIATAMENTE
4. ✅ Pasa `llamada_id` como parámetro a Twilio

```javascript
// 1. Crear llamada en backend
const createResponse = await apiClient.post('/api/calls/create/', {
  telefono_destino: formattedNumber,
  campana_id: campana_id,
  agente_id: user?.id,
  tipo: 'saliente'
});

// 2. Guardar en estado persistente
setPersistedCallData({
  llamada_id: createResponse.data.id, // ⭐ CRÍTICO
  telefono: formattedNumber,
  // ... otros datos
});

// 3. Llamar con Twilio pasando llamada_id
await twilioClient.makeCall(formattedNumber, {
  llamada_id: createResponse.data.id
});
```

---

### 3. **Captura de `llamada_id` en Llamadas AUTOMÁTICAS**

**Flujo mejorado en `onConnect()`:**

```javascript
twilioClient.onConnect(async (call) => {
  // Obtener información de llamada y cliente del backend
  const response = await apiClient.get(`/api/calls/by-sid/${callSid}/`);
  const clientResp = await apiClient.get(`/api/calls/client-by-call-sid/${callSid}/`);
  
  // ⭐ Guardar en estado persistente
  const persistedData = {
    llamada_id: response.data.id, // ⭐ CRÍTICO
    cliente_id: clientResp.data?.id,
    telefono: response.data.telefono_destino,
    // ... mapear todos los campos
  };
  
  setPersistedCallData(persistedData);
});
```

---

### 4. **Persistencia Durante AFTERCALL**

**Modificación en `onDisconnect()`:**

```javascript
twilioClient.onDisconnect(async (call) => {
  // Limpiar estados de UI
  setIsInCall(false);
  setIsRinging(false);
  setCallStatus('idle');
  
  // ❌ NO limpiar estos estados:
  // setCurrentCallInfo(null); 
  // setCurrentClientInfo(null);
  // setPersistedCallData(null);
  
  // ✅ Los datos persisten para AFTERCALL
  console.log('Manteniendo datos para AFTERCALL:', persistedCallData);
  
  // Cambiar estado a AFTERCALL
  await changeState('AFTERCALL', 'Llamada finalizada, en proceso after call');
});
```

---

### 5. **Nueva Función: `clearCallData()`**

Limpia todos los datos de la llamada cuando el agente vuelve a DISPONIBLE:

```javascript
const clearCallData = useCallback(() => {
  console.log('🧹 Limpiando todos los datos de llamada');
  setCurrentCallInfo(null);
  setCurrentClientInfo(null);
  setPersistedCallData(null);
  setCallDuration(0);
}, [currentCallInfo, currentClientInfo, persistedCallData]);
```

**Uso en componente:**
```javascript
useEffect(() => {
  if (frontendState === 'DISPONIBLE') {
    clearCallData();
  }
}, [frontendState, clearCallData]);
```

---

### 6. **Nueva Función: `recuperarLlamadaId()`**

Recupera el `llamada_id` del backend si se pierde el estado (fallback):

```javascript
const recuperarLlamadaId = useCallback(async () => {
  try {
    const response = await apiClient.get('/api/calls/disponible-venta/');
    
    if (response.data?.llamada) {
      const llamadaData = response.data.llamada;
      
      // Reconstruir estado persistente
      setPersistedCallData({
        llamada_id: llamadaData.id,
        // ... mapear otros campos
      });
      
      return llamadaData.id;
    }
    
    return null;
  } catch (error) {
    console.error('❌ Error recuperando llamada_id:', error);
    return null;
  }
}, []);
```

**Uso en componente:**
```javascript
useEffect(() => {
  if (frontendState === 'AFTERCALL' && !llamadaId) {
    recuperarLlamadaId();
  }
}, [frontendState, llamadaId, recuperarLlamadaId]);
```

---

### 7. **Nuevas Exportaciones del Hook**

```javascript
return {
  // Estados existentes
  isReady, isInCall, isRinging, isMuted, callDuration, callStatus,
  error, incomingCall, currentCallInfo, currentClientInfo,
  
  // ⭐ NUEVOS: Estados persistentes
  persistedCallData,     // Objeto completo con toda la información
  llamadaId,            // Acceso directo al llamada_id
  
  // Acciones existentes
  makeCall, hangup, toggleMute, acceptIncomingCall, rejectIncomingCall,
  sendDigit, subscribeToStateChanges,
  
  // ⭐ NUEVAS: Gestión de datos persistentes
  clearCallData,        // Limpia datos cuando vuelve a DISPONIBLE
  recuperarLlamadaId,   // Recupera llamada_id del backend
  
  // Utilidades
  formatDuration,
};
```

---

## 🔄 Flujo Completo de Estados

### Caso 1: Llamada Manual
```
1. DISPONIBLE
   ↓ Agente marca número
2. makeCall() crea registro en backend
   ↓ persistedCallData.llamada_id = 123
3. Twilio conecta
   ↓ onConnect() mantiene los datos
4. EN_LLAMADA
   ↓ Cliente/agente cuelga
5. onDisconnect() NO limpia datos
   ↓ persistedCallData mantiene llamada_id=123
6. AFTERCALL
   ↓ Agente puede registrar venta con llamada_id=123 ✅
7. Agente completa after-call
   ↓ clearCallData() limpia todo
8. DISPONIBLE
```

### Caso 2: Llamada Automática
```
1. DISPONIBLE
   ↓ Sistema inicia llamada automática
2. Backend crea registro
   ↓ Agente recibe llamada
3. Agente acepta
   ↓ onConnect() obtiene llamada_id del backend
   ↓ persistedCallData.llamada_id = 456
4. EN_LLAMADA
   ↓ Conversación termina
5. onDisconnect() NO limpia datos
   ↓ persistedCallData mantiene llamada_id=456
6. AFTERCALL
   ↓ Agente puede registrar venta con llamada_id=456 ✅
7. Agente completa after-call
   ↓ clearCallData() limpia todo
8. DISPONIBLE
```

### Caso 3: Pérdida de Estado (refresh durante AFTERCALL)
```
1. Agente en AFTERCALL
   ↓ Página se refresca
2. persistedCallData = null
   ↓ Componente detecta: frontendState='AFTERCALL' && !llamadaId
3. recuperarLlamadaId() se ejecuta
   ↓ Backend devuelve última llamada del agente
4. persistedCallData se restablece ✅
   ↓ llamadaId disponible nuevamente
5. Agente puede registrar venta
```

---

## 📝 Cambios en `Calls.jsx`

### 1. **Importar nuevas propiedades del hook:**

```javascript
const {
  // ... props existentes
  persistedCallData,      // ⭐ NUEVO
  llamadaId,             // ⭐ NUEVO
  clearCallData,         // ⭐ NUEVO
  recuperarLlamadaId,    // ⭐ NUEVO
} = useTwilioCall();
```

### 2. **Usar `persistedCallData` en lugar de `currentCallInfo`:**

```javascript
// ANTES:
if (currentCallInfo && isEnLlamadaOAfterCall) {
  setPhoneNumber(currentCallInfo.telefono || '');
  // ...
}

// DESPUÉS:
if (persistedCallData && isEnLlamadaOAfterCall) {
  setPhoneNumber(persistedCallData.telefono || '');
  // ...
}
```

### 3. **Limpiar datos al volver a DISPONIBLE:**

```javascript
React.useEffect(() => {
  if (frontendState === 'DISPONIBLE') {
    clearCallData();
  }
}, [frontendState, clearCallData]);
```

### 4. **Recuperar llamada_id si se pierde:**

```javascript
React.useEffect(() => {
  if (frontendState === 'AFTERCALL' && !llamadaId) {
    recuperarLlamadaId();
  }
}, [frontendState, llamadaId, recuperarLlamadaId]);
```

### 5. **Pasar `campana_id` a `makeCall()`:**

```javascript
// ANTES:
const success = await makeCall(phoneNumber);

// DESPUÉS:
const success = await makeCall(phoneNumber, campana_id);
```

### 6. **Usar `llamadaId` en `SaleInfoSection`:**

```javascript
<SaleInfoSection 
  cliente={cliente} 
  llamada_id={llamadaId || currentCallInfo?.id || null}
  campana_id={campana_id}
  onVentaChange={setVenta}
/>
```

---

## 🎯 Beneficios de las Mejoras

### ✅ **Captura Garantizada**
- `llamada_id` se captura tanto en llamadas manuales como automáticas
- Se persiste inmediatamente al crear/conectar la llamada

### ✅ **Persistencia Durante AFTERCALL**
- Los datos NO se limpian al desconectar
- Disponibles durante todo el proceso de after-call
- Permite registrar ventas en cualquier momento

### ✅ **Limpieza Controlada**
- Los datos solo se limpian cuando el agente vuelve a DISPONIBLE
- Evita pérdida accidental de información

### ✅ **Recuperación de Estado**
- Función fallback para recuperar `llamada_id` del backend
- Maneja casos de refresh o pérdida de estado

### ✅ **Compatibilidad**
- Mantiene toda la funcionalidad existente
- No rompe código que usa `currentCallInfo`
- Agrega nuevas propiedades sin eliminar las anteriores

### ✅ **Debugging Mejorado**
- Logs claros en cada paso del proceso
- Fácil seguimiento del flujo de datos
- Identificación rápida de problemas

---

## 🧪 Testing Recomendado

### ✅ Caso 1: Llamada Manual
- [ ] Marcar número manualmente
- [ ] Verificar que `llamadaId` tenga valor durante la llamada
- [ ] Colgar y verificar que `llamadaId` persiste en AFTERCALL
- [ ] Registrar venta exitosamente
- [ ] Volver a DISPONIBLE y verificar que los datos se limpian

### ✅ Caso 2: Llamada Automática
- [ ] Recibir llamada automática del sistema
- [ ] Aceptar llamada
- [ ] Verificar que `llamadaId` tenga valor durante la llamada
- [ ] Cliente cuelga
- [ ] Verificar que `llamadaId` persiste en AFTERCALL
- [ ] Registrar venta exitosamente
- [ ] Volver a DISPONIBLE y verificar que los datos se limpian

### ✅ Caso 3: Recuperación de Estado
- [ ] Estar en AFTERCALL con `llamadaId` válido
- [ ] Refrescar página (F5)
- [ ] Verificar que `recuperarLlamadaId()` se ejecuta automáticamente
- [ ] Verificar que `llamadaId` se restablece
- [ ] Verificar que se puede registrar venta

### ✅ Caso 4: Flujo Completo
- [ ] DISPONIBLE → Llamar → EN_LLAMADA → Colgar → AFTERCALL → Registrar venta → DISPONIBLE
- [ ] Verificar que `persistedCallData` se limpia solo al final

---

## 📊 Logs de Debugging

El hook ahora incluye logs detallados para facilitar el debugging:

```
[useTwilioCall] Llamando a: +573001234567
[useTwilioCall] Creando registro de llamada en backend...
[useTwilioCall] ✅ Llamada creada en backend: {...}
[useTwilioCall] ✅ Datos persistidos para llamada manual: {...}
[useTwilioCall] Llamada conectada
[useTwilioCall] ✅ Datos persistidos para AFTERCALL: {...}
[useTwilioCall] Llamada desconectada
[useTwilioCall] ℹ️ Manteniendo datos de llamada para AFTERCALL
[useTwilioCall] Estado cambiado exitosamente a AFTERCALL
[useTwilioCall] 🧹 Limpiando todos los datos de llamada
[useTwilioCall] ✅ Datos de llamada limpiados correctamente
```

---

## 🚀 Próximos Pasos

1. ✅ **Testing exhaustivo** con llamadas manuales y automáticas
2. ✅ **Verificar integración** con `SaleInfoSection`
3. ✅ **Monitorear logs** en producción para identificar edge cases
4. ✅ **Documentar** casos de error y cómo se manejan
5. ✅ **Agregar tests unitarios** para las nuevas funciones

---

## 📚 Documentación API Backend Requerida

El hook ahora interactúa con estos endpoints:

### POST `/api/calls/create/`
Crea un registro de llamada en el backend (para llamadas manuales)

**Request:**
```json
{
  "telefono_destino": "+573001234567",
  "campana_id": 1,
  "agente_id": 123,
  "tipo": "saliente"
}
```

**Response:**
```json
{
  "id": 456,
  "telefono_destino": "+573001234567",
  "campana_id": 1,
  "agente_id": 123,
  "tipo": "saliente",
  "fecha_inicio": "2025-01-15T10:30:00Z"
}
```

### GET `/api/calls/disponible-venta/`
Recupera la última llamada del agente disponible para registrar venta

**Response:**
```json
{
  "llamada": {
    "id": 456,
    "telefono_destino": "+573001234567",
    "telefono_origen": null,
    "campana_id": 1,
    "sid": "CA123...",
    "fecha_inicio": "2025-01-15T10:30:00Z"
  },
  "cliente": {
    "id": 789,
    "nombre": "Juan Pérez",
    "documento": "1234567890",
    "telefono": "+573001234567",
    "direccion": "Calle 123",
    "correo": "juan@email.com",
    "ciudad": "Cali"
  }
}
```

---

## ✅ Checklist de Implementación

- [x] Agregar estado `persistedCallData`
- [x] Modificar `makeCall()` para crear registro en backend
- [x] Modificar `onConnect()` para guardar `persistedCallData`
- [x] Modificar `onDisconnect()` para NO limpiar datos
- [x] Agregar función `clearCallData()`
- [x] Agregar función `recuperarLlamadaId()`
- [x] Exportar nuevas propiedades del hook
- [x] Actualizar JSDoc con documentación completa
- [x] Actualizar `Calls.jsx` para usar nuevas funcionalidades
- [x] Agregar logs de debugging
- [x] Crear documentación de cambios

---

## 🎉 Resultado Final

El hook `useTwilioCall` ahora garantiza que:

1. ✅ **Siempre hay un `llamada_id` válido** durante llamadas y AFTERCALL
2. ✅ **Los datos persisten** hasta que el agente vuelve a DISPONIBLE
3. ✅ **Se puede recuperar el estado** si se pierde (refresh, etc.)
4. ✅ **El código es retrocompatible** con implementaciones existentes
5. ✅ **El debugging es fácil** gracias a logs detallados

**Ahora el agente puede registrar ventas en cualquier momento durante AFTERCALL con total confianza de que el `llamada_id` estará disponible.**
