# Sistema de Gestión de Usuarios - Call Center

Sistema completo de autenticación y gestión de usuarios con roles (Administrador y Agente) para un Call Center, implementado con Django REST Framework y JWT.

## 🚀 Características

- ✅ Autenticación con JWT (JSON Web Tokens)
- ✅ Sistema de roles: **Administrador** y **Agente**
- ✅ CRUD completo de usuarios
- ✅ Permisos basados en roles (RBAC)
- ✅ Validaciones de seguridad
- ✅ API REST completa y documentada

## 📋 Requisitos

- Python 3.13+
- Django 4.2.7
- Django REST Framework 3.14.0
- djangorestframework-simplejwt 5.3.1

## 🔧 Instalación

### 1. Clonar el repositorio (si aplica)
```bash
git clone <url-del-repositorio>
cd callcenter
```

### 2. Crear entorno virtual
```powershell
python -m venv venv
venv\Scripts\activate
```

### 3. Instalar dependencias
```powershell
cd backend
pip install django djangorestframework djangorestframework-simplejwt django-cors-headers
```

### 4. Aplicar migraciones
```powershell
python manage.py migrate
```

### 5. Crear usuario administrador
```powershell
python create_admin.py
```

**Credenciales del administrador:**
- Email: `admin@callcenter.com`
- Password: `admin123`

⚠️ **IMPORTANTE:** Cambiar la contraseña en producción.

### 6. Iniciar el servidor
```powershell
python manage.py runserver
```

El servidor estará disponible en: `http://localhost:8000`

## 🎯 Endpoints API

### Autenticación

| Método | Endpoint | Descripción | Requiere Auth |
|--------|----------|-------------|---------------|
| POST | `/api/auth/login/` | Iniciar sesión | No |
| POST | `/api/auth/logout/` | Cerrar sesión | Sí |
| POST | `/api/auth/refresh/` | Refrescar token | No |

### Usuarios

| Método | Endpoint | Descripción | Permisos |
|--------|----------|-------------|----------|
| GET | `/api/users/` | Listar usuarios | Autenticado |
| POST | `/api/users/` | Crear usuario | Admin |
| GET | `/api/users/{id}/` | Ver usuario | Admin o Propietario |
| PATCH | `/api/users/{id}/` | Actualizar usuario | Admin o Propietario |
| DELETE | `/api/users/{id}/` | Desactivar usuario | Admin |
| POST | `/api/users/{id}/activate/` | Activar usuario | Admin |
| GET | `/api/users/me/` | Ver mi perfil | Autenticado |
| POST | `/api/users/change_password/` | Cambiar contraseña | Autenticado |

## 📝 Ejemplos de Uso

### 1. Login
```http
POST http://localhost:8000/api/auth/login/
Content-Type: application/json

{
  "email": "admin@callcenter.com",
  "password": "admin123"
}
```

**Respuesta:**
```json
{
  "user": {
    "id": 1,
    "email": "admin@callcenter.com",
    "first_name": "Admin",
    "last_name": "Sistema",
    "full_name": "Admin Sistema",
    "phone": "+1234567890",
    "role": "ADMIN",
    "is_active": true,
    "created_at": "2025-10-05T18:30:00Z",
    "updated_at": "2025-10-05T18:30:00Z"
  },
  "tokens": {
    "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
    "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
  }
}
```

### 2. Crear un Agente (como Administrador)
```http
POST http://localhost:8000/api/users/
Content-Type: application/json
Authorization: Bearer <access_token>

{
  "email": "agente@callcenter.com",
  "first_name": "Juan",
  "last_name": "Pérez",
  "phone": "+1234567890",
  "role": "AGENT",
  "password": "agente123",
  "password_confirm": "agente123",
  "is_active": true
}
```

### 3. Listar Usuarios
```http
GET http://localhost:8000/api/users/
Authorization: Bearer <access_token>
```

### 4. Ver mi Perfil
```http
GET http://localhost:8000/api/users/me/
Authorization: Bearer <access_token>
```

## 🔐 Roles y Permisos

### Administrador (ADMIN)
- ✅ Ver todos los usuarios
- ✅ Crear nuevos usuarios (agentes y administradores)
- ✅ Actualizar cualquier usuario
- ✅ Desactivar/activar usuarios
- ✅ Ver su propio perfil
- ✅ Cambiar su contraseña

### Agente (AGENT)
- ✅ Ver solo su propio perfil
- ✅ Actualizar su propia información
- ✅ Cambiar su contraseña
- ❌ No puede crear otros usuarios
- ❌ No puede ver otros usuarios
- ❌ No puede desactivar usuarios

## 🧪 Pruebas

El archivo `api_tests.http` contiene ejemplos de todas las peticiones HTTP que puedes hacer al API. Puedes usarlo con:

- **VS Code**: Instala la extensión "REST Client" y abre el archivo
- **IntelliJ/PyCharm**: Abre el archivo directamente
- **Postman**: Importa las peticiones manualmente

### Flujo de prueba recomendado:

1. **Login como administrador** → Obtener token
2. **Crear un agente** → Usando el token del admin
3. **Login como agente** → Obtener token del agente
4. **Probar permisos** → Verificar que el agente no pueda crear usuarios
5. **Actualizar perfil** → Cada usuario actualiza su información
6. **Cambiar contraseña** → Probar cambio de contraseña
7. **Logout** → Cerrar sesión

## 📁 Estructura del Proyecto

```
backend/
├── manage.py
├── create_admin.py          # Script para crear admin inicial
├── api_tests.http           # Archivo de pruebas HTTP
├── db.sqlite3              # Base de datos SQLite
├── callcenter/             # Configuración del proyecto
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
└── apps/
    ├── authn/              # Autenticación (login/logout)
    │   ├── views.py
    │   ├── serializers.py
    │   └── urls.py
    └── users/              # Gestión de usuarios
        ├── models.py       # Modelo User con roles
        ├── serializers.py  # Serializadores
        ├── views.py        # ViewSets y endpoints
        ├── permissions.py  # Permisos personalizados
        └── urls.py
```

## 🔒 Seguridad

- ✅ Contraseñas hasheadas con PBKDF2
- ✅ Tokens JWT con expiración
- ✅ Blacklist de refresh tokens al hacer logout
- ✅ Validación de contraseñas con Django validators
- ✅ CORS configurado (cambiar en producción)
- ✅ Permisos basados en roles

## 🛠️ Configuración Adicional

### Cambiar duración de tokens JWT

En `callcenter/settings.py`:

```python
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=8),  # Cambiar aquí
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),  # Cambiar aquí
    # ...
}
```

### Cambiar configuración de CORS

En producción, en `callcenter/settings.py`:

```python
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = [
    "https://tu-frontend.com",
    "https://www.tu-frontend.com",
]
```

## 📚 Próximos Pasos

- [ ] Implementar recuperación de contraseña por email
- [ ] Agregar campos adicionales al perfil de usuario
- [ ] Implementar sistema de permisos más granular
- [ ] Agregar logs de auditoría
- [ ] Implementar rate limiting
- [ ] Agregar tests unitarios y de integración
- [ ] Documentar API con Swagger/OpenAPI

## 🐛 Troubleshooting

### Error: "No module named 'apps'"
**Solución:** Verifica que los archivos `apps.py` de cada aplicación tengan el nombre completo. Ejemplo:
```python
# apps/users/apps.py
class UsersConfig(AppConfig):
    name = "apps.users"  # Debe incluir "apps."
```

### Error: "Invalid token"
**Solución:** El token ha expirado o es inválido. Haz login nuevamente o usa el refresh token.

### Error: "Authentication credentials were not provided"
**Solución:** Agrega el header de autorización: `Authorization: Bearer <token>`

## 📞 Soporte

Para preguntas o problemas, contacta al equipo de desarrollo.

---

**Desarrollado con ❤️ para Call Center Management System**
