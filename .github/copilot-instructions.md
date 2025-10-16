# Instrucciones para Agentes de IA - Sistema Call Center

## Arquitectura del Proyecto

Este es un sistema full-stack para gestión de call center con **backend Django REST Framework** y **frontend React + Vite**. El backend es un monolito modular con apps independientes bajo `backend/apps/`:

```
backend/
├── apps/
│   ├── authn/         # Autenticación JWT (login/logout/refresh)
│   ├── users/         # Gestión de usuarios con RBAC + Estados de agentes
│   ├── campaigns/     # Campañas, productos, ventas
│   ├── calls/         # Llamadas, clientes, iteraciones
│   ├── recordings/    # Metadatos de grabaciones
│   ├── kpis/          # Métricas en tiempo real y reportes
│   └── integrations/  # Cliente Twilio y webhooks
├── common/            # estados_helper.py (acceso a TiposParametros)
└── callcenter/        # Settings, URLs principales

frontend/
├── src/
│   ├── components/    # Componentes reutilizables UI
│   ├── pages/         # Vistas principales (Dashboard, Llamadas, KPIs)
│   ├── hooks/         # useAgentState, useTwilioCall, etc.
│   ├── core/
│   │   ├── api/       # Clientes API (agentStates, calls, etc.)
│   │   └── context/   # AuthContext, estado global
│   └── services/      # twilioClient (integración Device SDK)
```

### Decisiones Arquitecturales Clave

1. **Apps con namespace completo**: Cada app se registra como `apps.{nombre}` en `apps.py` para evitar conflictos de importación
2. **Usuario personalizado basado en email**: No usa `username`, solo `email` como USERNAME_FIELD. El campo `documento_id` es la primary key.
3. **Sistema parametrizable con `TiposParametros`**: Tabla central para configuración (roles, estados de agente/llamada/campaña). Evita hardcodear valores.
4. **Estados de agente con tracking temporal**: Tabla `EstadoAgenteActual` (1 registro por agente) con campo `tiempo` (timestamp) para calcular `tiempo_en_estado` dinámicamente.
5. **Soft delete**: `DELETE` en usuarios solo marca `is_active=False`, nunca borra datos
6. **Frontend con persistencia de estado**: Usa `sessionStorage` para mantener estado del agente entre cambios de módulo/pestaña

## Sistema de Autenticación JWT

**Configuración**: JWT con token blacklist habilitado (`rest_framework_simplejwt.token_blacklist` en INSTALLED_APPS)

- **Access token**: 8 horas de vida
- **Refresh token**: 7 días, rotación habilitada
- **Logout**: Requiere enviar refresh token para blacklist

**Endpoints**:
- `POST /api/auth/login/` → Devuelve `{user: {...}, tokens: {access, refresh}}`
- `POST /api/auth/logout/` → Body: `{refresh: "token"}`, requiere auth
- `POST /api/auth/refresh/` → Body: `{refresh: "token"}`, devuelve nuevo access

## Sistema de Estados de Agente

**Arquitectura**:
- `EstadoAgenteActual`: 1 registro por agente con estado actual y timestamp de inicio
- `EstadoAgenteDetalle`: Historial diario con acumuladores de tiempo por estado
- `tiempo_en_estado`: Calculado dinámicamente en el backend como `(timezone.now() - estado.tiempo).total_seconds()`

**Workflow Frontend**:
1. Componente `AgentStatus` cambia estado → llama API → actualiza prop `currentStatus`
2. Componente `AgentMinutes` recibe prop → resetea timer a 0 inmediatamente
3. Hook `useAgentState` sincroniza cada 30s con backend para ajustar drift
4. Timer usa `requestAnimationFrame` + `sessionStorage` para persistencia entre módulos

**Estados requieren comentarios**: Definidos en `STATES_REQUIRING_COMMENTS` en `frontend/src/core/api/agentStates.js`

## Sistema de Permisos RBAC

**Implementación en `apps/users/permissions.py`**:

```python
IsAdmin              # Solo usuarios con role='ADMIN'
IsAdminOrOwner       # Admin o propietario del recurso (compara obj.id con request.user.id)
```

**Patrón en ViewSets**: Permisos dinámicos por acción

```python
def get_permissions(self):
    if self.action in ['create', 'destroy']:
        permission_classes = [IsAdmin]
    elif self.action in ['update', 'partial_update', 'retrieve']:
        permission_classes = [IsAdminOrOwner]
    return [permission() for permission in permission_classes]
```

**Filtrado de queryset por rol**:

```python
def get_queryset(self):
    if self.request.user.is_admin():
        return Model.objects.all()
    return Model.objects.filter(user=self.request.user)
```

## Flujo de Trabajo de Desarrollo

### Setup Inicial
```powershell
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python create_admin.py  # Crea admin@callcenter.com / admin123
python manage.py runserver
```

### Migraciones
```powershell
python manage.py makemigrations
python manage.py migrate
```

### Testing con api_tests.http
Usar VS Code REST Client con `backend/api_tests.http`. Flujo típico:
1. Login → copiar access token
2. Reemplazar `{{adminToken}}` en requests subsecuentes
3. Crear agente → login como agente → probar permisos limitados

### Crear Nueva App
```powershell
cd backend
python manage.py startapp nueva_app apps/nueva_app
```

**CRÍTICO**: Editar `apps/nueva_app/apps.py`:
```python
class NuevaAppConfig(AppConfig):
    name = "apps.nueva_app"  # Debe incluir "apps."
```

## Acceso a TiposParametros (Sistema Parametrizable)

**Nunca hardcodear valores de estados/roles**. Usar helpers en `common/estados_helper.py`:

```python
from common.estados_helper import get_estado, get_estado_id

# Obtener objeto completo
estado_disponible = get_estado('ESTADO_AGENTE', 'DISPONIBLE')
rol_admin = get_estado('ROL_USUARIO', 'ADMIN')

# Obtener solo el ID (más eficiente para queries)
estado_id = get_estado_id('ESTADO_AGENTE', 'DISPONIBLE')
User.objects.filter(rol_id=get_estado_id('ROL_USUARIO', 'AGENTE'))
```

**Categorías disponibles**: `ROL_USUARIO`, `ESTADO_AGENTE`, `ESTADO_LLAMADA`, `ESTADO_CAMPANA`, `ESTADO_VENTA`, `MOTIVO_RECHAZO`, `TIPO_LLAMADA`, `TIPO_CAMPANA`

## Convenciones del Proyecto

### Idioma
- **Código**: Nombres en inglés (`first_name`, `is_active`, `UserSerializer`)
- **Strings UI**: Español (`'Correo electrónico'`, `'El email es obligatorio'`)
- **Docstrings**: Español
- **Comentarios**: Español

### Serializadores
Patrón de múltiples serializadores por modelo:
- `{Model}Serializer` → Lectura/listado
- `{Model}CreateSerializer` → Creación con validaciones específicas
- `{Model}UpdateSerializer` → Actualización parcial

Ejemplo en `apps/users/serializers.py`:
```python
UserSerializer           # GET - campos públicos
UserCreateSerializer     # POST - con password y validaciones
UserUpdateSerializer     # PATCH - solo campos editables
ChangePasswordSerializer # POST /change_password/ - validación de old_password
```

### Validaciones
- Validaciones de campo: `validate_{field_name}(self, value)`
- Validaciones cruzadas: `validate(self, attrs)`
- Acceso al request: `self.context.get('request')`
- Validación de permisos en serializadores (ej: solo admin crea admin)

### Modelos
- Timestamps automáticos: `created_at = models.DateTimeField(auto_now_add=True)`
- Soft delete: `is_active` en lugar de `.delete()`
- Propiedades calculadas: `@property def full_name(self): ...`
- Métodos helper: `def is_admin(self): return self.role == self.Role.ADMIN`

## Integración de Componentes

### Auth ↔ Users
- `apps.authn` maneja login/logout (views y serializers)
- `apps.users` define el modelo User y gestión CRUD
- Login en `authn` importa `UserSerializer` de `users` para respuesta
- Ambas apps comparten el mismo modelo: `from apps.users.models import User`

### Frontend: Hooks y Componentes de Estado
- **`useAgentState`**: Hook centralizado para estado del agente. Auto-refresca cada 30s, notifica cambios via `subscribeToAgentStateChanges`
- **`useTwilioCall`**: Hook para llamadas Twilio. Cambia automáticamente estado a `EN_LLAMADA` al conectar
- **`AgentStatus` + `AgentMinutes`**: Componentes hermanos que comparten estado via props. `AgentStatus` notifica cambios a `AgentMinutes` inmediatamente
- **Persistencia**: Usar `sessionStorage` para estados que deben sobrevivir cambios de módulo (NO `localStorage` para datos sensibles)

### Backend: ViewSets Modulares
Los estados de agente están en `apps/users/states/views_estado.py` (no en `apps/users/views.py`):
- `EstadoAgenteViewSet`: CRUD de estados, endpoints `current`, `change_state`, `historial`
- Serializers en `apps/users/states/serializers_estado.py`
- Patrón: ViewSets grandes se dividen en submódulos por funcionalidad

### URLs
Patrón centralizado en `callcenter/urls.py`:
```python
urlpatterns = [
    path("api/auth/", include('apps.authn.urls')),
    path("api/users/", include('apps.users.urls')),
]
```

Cada app usa `app_name` para namespacing:
```python
# apps/authn/urls.py
app_name = 'authn'
```

## Dependencias Críticas

```
Django==5.2.7
djangorestframework==3.16.1
djangorestframework-simplejwt==5.3.1  # NO rest_framework_simplejwt
django-cors-headers==4.9.0
```

**Trampa común**: Existe un paquete incorrecto `rest_framework_simplejwt==0.0.2` que no funciona. Siempre usar `djangorestframework-simplejwt` con guiones.

## Testing y Debugging

### Verificar Usuario Autenticado
En cualquier view:
```python
print(f"User: {request.user.email}, Role: {request.user.role}, Admin: {request.user.is_admin()}")
```

### Estado de Autenticación
```python
# En serializers
request = self.context.get('request')
if request and request.user.is_authenticated:
    # Usuario autenticado disponible
```

### Errores Comunes
1. **ModuleNotFoundError en apps**: Verificar que `apps.py` tenga `name = "apps.{nombre}"`
2. **Token inválido**: Access token expiró (8h) - usar refresh
3. **Permission denied**: Verificar rol del usuario y permisos del ViewSet
4. **CORS errors**: Configurado `CORS_ALLOW_ALL_ORIGINS = True` (solo desarrollo)

## Patrones de Componentes Frontend

### Estado y Props en Componentes de Tiempo Real
**Problema común**: Timer que se reinicia al cambiar de módulo
**Solución implementada en `AgentMinutes.jsx`**:
1. Inicializar estado desde `sessionStorage` en la función inicializadora de `useState`
2. Usar `requestAnimationFrame` en lugar de `setInterval` para precisión
3. Detectar cambios inmediatos desde props (`currentStatus`) antes que desde hooks
4. Sincronizar con backend solo si diferencia > 2 segundos (evitar ajustes espurios)

```javascript
// ✅ CORRECTO: Inicializar con función
const [displayTime, setDisplayTime] = useState(() => {
  const saved = sessionStorage.getItem('timer_start');
  return saved ? calculateElapsed(saved) : 0;
});

// ❌ INCORRECTO: Inicializar en useEffect (llega tarde)
const [displayTime, setDisplayTime] = useState(0);
useEffect(() => { /* recuperar de storage */ }, []);
```

### Mapeo de Estados Backend ↔ Frontend
Estados en backend usan nombres descriptivos (`DISPONIBLE`, `EN_LLAMADA`), frontend usa constantes cortas (`AVAILABLE`, `CALL`):
- **Mapeo**: `frontend/src/core/api/agentStates.js` → `STATE_MAPPING` y `STATE_MAPPING_REVERSE`
- **Funciones**: `mapBackendToFrontend()`, `mapFrontendToBackend()`
- **Siempre mapear** antes de enviar al backend o después de recibir datos

## Debugging y Troubleshooting

### Backend: Timestamps con Timezone
- Campo `tiempo` en `EstadoAgenteActual`: `DateTimeField` con `default=timezone.now`
- Formato en DB: `2025-10-13 22:36:50.000 -0500` (timestamp + zona horaria)
- `TIME_ZONE = "America/Bogota"` en `settings.py`
- Cálculo de duración: `(timezone.now() - estado.tiempo).total_seconds()`

### Frontend: Sincronización de Estado
Si el timer se desincroniza:
1. Verificar que `sessionStorage` se actualiza en cada cambio de estado
2. Revisar que `startTimeRef.current` se calcula correctamente: `now - (backendSeconds * 1000)`
3. Confirmar que `isInitializedRef` previene reinicios prematuros
4. Logs en consola: buscar `[AgentMinutes]` para debugging

### Testing con api_tests.http
Usar VS Code REST Client. Variables disponibles:
- `{{baseUrl}}`: `http://localhost:8000/api`
- `{{adminToken}}`: Copiar manualmente después de login
- `{{agentToken}}`: Copiar después de login como agente

## Próximos Módulos Planificados

Módulos implementados siguen el mismo patrón:
- **campaigns**: CSV upload, asignación de agentes
- **calls**: Estados, disposiciones, marcador predictivo
- **recordings**: Metadatos, tarea celery para borrado a 60 días
- **kpis**: Rollups diarios, queries para dashboards
- **integrations**: Cliente Twilio, webhooks status/recording

---

**Última actualización**: Sistema de estados de agente con persistencia y sincronización completa (octubre 2025)
