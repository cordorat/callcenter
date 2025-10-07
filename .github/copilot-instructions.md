# Instrucciones para Agentes de IA - Call Center Backend

## Arquitectura del Proyecto

Este es un **monolito modular Django REST Framework** para gestión de call center. La estructura sigue el patrón de apps independientes bajo `backend/apps/`:

```
backend/
├── apps/
│   ├── authn/         # Autenticación JWT (login/logout/refresh)
│   ├── users/         # Gestión de usuarios con RBAC
│   ├── campaigns/     # (Futuro) Campañas y listas CSV
│   ├── calls/         # (Futuro) Llamadas salientes
│   ├── recordings/    # (Futuro) Grabaciones con TTL 60 días
│   ├── kpis/          # (Futuro) Métricas y dashboards
│   └── integrations/  # (Futuro) Twilio y CRM
├── callcenter/        # Configuración Django
├── common/            # Utilidades compartidas
├── webhooks/          # (Futuro) Webhooks Twilio
└── tasks/             # (Futuro) Celery tasks
```

### Decisiones Arquitecturales Clave

1. **Apps con namespace completo**: Cada app se registra como `apps.{nombre}` en `apps.py` para evitar conflictos de importación
2. **Usuario personalizado basado en email**: No usa `username`, solo `email` como USERNAME_FIELD
3. **Roles en el modelo User**: `ADMIN` y `AGENT` como choices de Django, no grupos ni permisos separados
4. **Desactivación vs eliminación**: `DELETE` en usuarios solo marca `is_active=False`, nunca borra datos

## Sistema de Autenticación JWT

**Configuración**: JWT con token blacklist habilitado (`rest_framework_simplejwt.token_blacklist` en INSTALLED_APPS)

- **Access token**: 8 horas de vida
- **Refresh token**: 7 días, rotación habilitada
- **Logout**: Requiere enviar refresh token para blacklist

**Endpoints**:
- `POST /api/auth/login/` → Devuelve `{user: {...}, tokens: {access, refresh}}`
- `POST /api/auth/logout/` → Body: `{refresh: "token"}`, requiere auth
- `POST /api/auth/refresh/` → Body: `{refresh: "token"}`, devuelve nuevo access

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

## Próximos Módulos Planificados

Según `Estructura_Proyecto.md`, estos módulos siguen el mismo patrón:
- **campaigns**: CSV upload, asignación de agentes
- **calls**: Estados, disposiciones, marcador predictivo
- **recordings**: Metadatos, tarea celery para borrado a 60 días
- **kpis**: Rollups diarios, queries para dashboards
- **integrations**: Cliente Twilio, webhooks status/recording

---

**Última actualización**: Sistema de usuarios con roles ADMIN/AGENT completamente funcional (octubre 2025)
