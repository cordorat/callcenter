# Modificación para useTwilioCall.js

## Ubicación: frontend/src/hooks/useTwilioCall.js
## Línea: 168-189 (dentro del callback onConnect)

## CAMBIO NECESARIO:
## Reemplazar la sección donde se crea persistedData para usar cliente_expandido

## ANTES (líneas 168-189):
```javascript
// ⭐ NUEVO: Guardar en estado persistente para mantener durante AFTERCALL
const persistedData = {
  llamada_id: response.data.id, // ⭐ CRÍTICO: ID del backend
  cliente_id: clientData?.id || null,
  telefono: response.data.telefono_destino || response.data.telefono_origen,
  nombre: clientData?.nombre || null,
  documento: clientData?.documento || null,
  direccion: clientData?.direccion || null,
  correo: clientData?.correo || null,
  ciudad: clientData?.ciudad || null,
  campana_id: response.data.campana_id || null,
  call_sid: callSid,
  timestamp: new Date().toISOString()
};

setPersistedCallData(persistedData);
console.log('[useTwilioCall] ✅ Datos persistidos para AFTERCALL:', persistedData);
```

## DESPUÉS (reemplazar con esto):
```javascript
// ⭐ NUEVO: Guardar en estado persistente para mantener durante AFTERCALL
// Usar cliente_expandido que viene del endpoint by-sid con todos los campos parseados
const clienteExpandido = response.data.cliente_expandido;

const persistedData = {
  llamada_id: response.data.id, // ⭐ CRÍTICO: ID del backend
  cliente_id: clienteExpandido?.id || null,
  telefono: response.data.telefono_destino || response.data.telefono_origen,
  nombre: clienteExpandido?.nombre || null,
  documento: clienteExpandido?.documento || null,
  direccion: clienteExpandido?.direccion || null,
  correo: clienteExpandido?.correo || null,
  ciudad: clienteExpandido?.ciudad || null,
  campana_id: response.data.campana_id || null,
  call_sid: callSid,
  timestamp: new Date().toISOString()
};

setPersistedCallData(persistedData);
console.log('[useTwilioCall] ✅ Datos persistidos para AFTERCALL:', persistedData);
```

## EXPLICACIÓN:
## - Ahora usamos response.data.cliente_expandido en lugar de clientData
## - cliente_expandido ya viene con todos los campos parseados desde otros_datos
## - Ya no necesitamos el segundo request a /client-by-call-sid/

---

## OPCIONAL: Eliminar el request redundante

## Si quieres optimizar aún más, puedes ELIMINAR este bloque (líneas 159-167):

```javascript
// Obtener información del cliente
let clientData = null;
try {
  const clientResp = await apiClient.get(`/api/calls/client-by-call-sid/${callSid}/`);
  setCurrentClientInfo(clientResp.data);
  clientData = clientResp.data;
  console.log('[useTwilioCall] Información de cliente obtenida:', clientResp.data);
} catch (clientErr) {
  console.error('[useTwilioCall] Error obteniendo información de cliente:', clientErr);
  setCurrentClientInfo(null);
}
```

## Y reemplazarlo con:

```javascript
// Información del cliente viene en response.data.cliente_expandido
const clienteExpandido = response.data.cliente_expandido;
if (clienteExpandido) {
  setCurrentClientInfo(clienteExpandido);
  console.log('[useTwilioCall] Información de cliente obtenida:', clienteExpandido);
} else {
  setCurrentClientInfo(null);
  console.log('[useTwilioCall] No hay información de cliente asociada');
}
```

---

## RESULTADO FINAL:

El callback onConnect debería quedar así:

```javascript
twilioClient.onConnect(async (call) => {
  console.log('[useTwilioCall] Llamada conectada');
  console.log('[useTwilioCall] Call parameters:', call.parameters);
  
  setIsInCall(true);
  setIsRinging(false);
  setCallStatus('in-call');
  setIncomingCall(null);
  
  // Obtener información de la llamada y del cliente del backend (si es llamada automática)
  try {
    const callSid = call.parameters.CallSid;
    if (callSid) {
      console.log('[useTwilioCall] Obteniendo información de llamada con CallSid:', callSid);
      const response = await apiClient.get(`/api/calls/llamadas/by-sid/${callSid}/`);
      setCurrentCallInfo(response.data);
      console.log('[useTwilioCall] Información de llamada obtenida:', response.data);

      // Información del cliente viene en response.data.cliente_expandido
      const clienteExpandido = response.data.cliente_expandido;
      if (clienteExpandido) {
        setCurrentClientInfo(clienteExpandido);
        console.log('[useTwilioCall] Información de cliente obtenida:', clienteExpandido);
      } else {
        setCurrentClientInfo(null);
        console.log('[useTwilioCall] No hay información de cliente asociada');
      }

      // ⭐ NUEVO: Guardar en estado persistente para mantener durante AFTERCALL
      const persistedData = {
        llamada_id: response.data.id, // ⭐ CRÍTICO: ID del backend
        cliente_id: clienteExpandido?.id || null,
        telefono: response.data.telefono_destino || response.data.telefono_origen,
        nombre: clienteExpandido?.nombre || null,
        documento: clienteExpandido?.documento || null,
        direccion: clienteExpandido?.direccion || null,
        correo: clienteExpandido?.correo || null,
        ciudad: clienteExpandido?.ciudad || null,
        campana_id: response.data.campana_id || null,
        call_sid: callSid,
        timestamp: new Date().toISOString()
      };
      
      setPersistedCallData(persistedData);
      console.log('[useTwilioCall] ✅ Datos persistidos para AFTERCALL:', persistedData);
    }
  } catch (err) {
    console.error('[useTwilioCall] Error obteniendo información de llamada:', err);
    setCurrentCallInfo(null);
    setCurrentClientInfo(null);
  }
  
  // Iniciar contador de duración
  startCallTimer();
  
  // NO cambiar estado aquí para llamadas automáticas
  // El backend ya cambió el estado a EN_LLAMADA cuando inició la llamada
  // Solo notificar a los listeners para refrescar UI
  console.log('[useTwilioCall] Llamada conectada, notificando listeners para refrescar UI...');
  stateChangeListeners.forEach(listener => {
    try {
      listener();
    } catch (err) {
      console.error('[useTwilioCall] Error en listener:', err);
    }
  });
});
```
