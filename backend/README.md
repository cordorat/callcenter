# Sistema de Gestión de Call Center

Sistema completo de autenticación, gestión de usuarios y seguimiento de estados de agentes para un Call Center, implementado con Django REST Framework y JWT.

## 🚀 Características

### Gestión de Usuarios
- ✅ Autenticación con JWT (JSON Web Tokens)
- ✅ Sistema de roles: **Administrador** y **Agente**
- ✅ CRUD completo de usuarios
- ✅ Permisos basados en roles (RBAC)
- ✅ Validaciones de seguridad

### Sistema de Estados de Agentes
- ✅ Seguimiento en tiempo real del estado de cada agente
- ✅ Registro automático de tiempos por estado
- ✅ Historial de cambios de estado con timestamps
- ✅ 9 estados predefinidos del agente
- ✅ Reportes diarios por fecha
- ✅ Formato de tiempo HH:MM:SS

## 📋 Requisitos

- Python 3.13+
- Django 5.2.7
- Django REST Framework 3.14.0
- djangorestframework-simplejwt 5.3.1
- PostgreSQL 12+
- psycopg2-binary 2.9.9

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
pip install -r requirements.txt
```

### 4. Configurar base de datos PostgreSQL
```powershell
# Crear base de datos en PostgreSQL
createdb callcenter_db

# O desde psql:
# CREATE DATABASE callcenter_db;
```

Configurar las credenciales en `.env`:
```env
DB_NAME=callcenter_db
DB_USER=postgres
DB_PASSWORD=tu_password
DB_HOST=localhost
DB_PORT=5432
```

### 5. Aplicar migraciones
```powershell
python manage.py migrate
```

### 6. Poblar estados de agentes
```powershell
python manage.py poblar_estados
```

Este comando crea los 9 estados predefinidos:
- 🟢 Disponible
- 🟠 En llamada
- 🟠 Aftercall
- 🟡 Break
- 🟡 Almuerzo
- 🟡 Baño
- 🔵 Entrenamiento
- 🔴 No disponible
- ⚫ Desconectado

### 7. Crear usuario administrador
```powershell
python create_admin.py
```

**Credenciales del administrador:**
- Email: `admin@callcenter.com`
- Password: `admin123`

⚠️ **IMPORTANTE:** Cambiar la contraseña en producción.

### 8. Iniciar el servidor
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

### Estados de Agentes

| Método | Endpoint | Descripción | Permisos |
|--------|----------|-------------|----------|
| GET | `/api/parametros/` | Listar estados disponibles | Autenticado |
| GET | `/api/estado/mi-estado/` | Ver mi estado actual | Autenticado |
| POST | `/api/estado/cambiar-estado/` | Cambiar mi estado | Autenticado |
| GET | `/api/estado/detalle-diario/?fecha=YYYY-MM-DD` | Ver detalle por fecha | Autenticado |

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

### 5. Listar Estados Disponibles
```http
GET http://localhost:8000/api/parametros/
Authorization: Bearer <access_token>
```

**Respuesta:**
```json
[
  {
    "parametros_id": 1,
    "nombre": "ESTADO_AGENTE",
    "valor": "Disponible",
    "descripcion": "Agente disponible para recibir llamadas"
  },
  {
    "parametros_id": 2,
    "nombre": "ESTADO_AGENTE",
    "valor": "En llamada",
    "descripcion": "Agente en llamada activa"
  }
]
```

### 6. Ver Mi Estado Actual
```http
GET http://localhost:8000/api/estado/mi-estado/
Authorization: Bearer <access_token>
```

**Respuesta:**
```json
{
  "agente": "Juan Pérez",
  "estado": "Disponible"
}
```

### 7. Cambiar Estado
```http
POST http://localhost:8000/api/estado/cambiar-estado/
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "estado_id": 4
}
```

**Respuesta:**
```json
{
  "agente": "Juan Pérez",
  "estado": "Break"
}
```

### 8. Ver Detalle Diario por Fecha
```http
GET http://localhost:8000/api/estado/detalle-diario/?fecha=2025-10-08
Authorization: Bearer <access_token>
```

**Respuesta:**
```json
[
  {
    "fecha": "2025-10-08",
    "agente": "Juan Pérez",
    "estado": "Disponible",
    "tiempo": "01:30:45",
    "cambios": "10:00:00 - Juan Pérez, 11:30:45 - Juan Pérez"
  },
  {
    "fecha": "2025-10-08",
    "agente": "Juan Pérez",
    "estado": "Break",
    "tiempo": "00:15:00",
    "cambios": "11:30:45 - Juan Pérez"
  }
]
```

## 🔐 Roles y Permisos

### Administrador (ADMIN)
- ✅ Ver todos los usuarios
- ✅ Crear nuevos usuarios (agentes y administradores)
- ✅ Actualizar cualquier usuario
- ✅ Desactivar/activar usuarios
- ✅ Ver su propio perfil
- ✅ Cambiar su contraseña
- ✅ Ver todos los estados de agentes

### Agente (AGENT)
- ✅ Ver solo su propio perfil
- ✅ Actualizar su propia información
- ✅ Cambiar su contraseña
- ✅ Ver y cambiar su propio estado
- ✅ Ver su historial de estados
- ✅ Ver detalle diario de sus estados
- ❌ No puede crear otros usuarios
- ❌ No puede ver otros usuarios
- ❌ No puede desactivar usuarios

## 📊 Estados de Agentes

El sistema incluye 9 estados predefinidos:

| ID | Estado | Color | Descripción |
|---|---|---|---|
| 1 | Disponible | 🟢 Verde (#4CAF50) | Listo para recibir llamadas |
| 2 | En llamada | 🟠 Naranja (#FF9800) | En llamada activa con cliente |
| 3 | Aftercall | 🟠 Naranja (#FF9800) | Registro post-llamada |
| 4 | Break | 🟡 Amarillo (#FFC107) | Descanso corto |
| 5 | Almuerzo | 🟡 Amarillo (#FFC107) | Hora de almuerzo |
| 6 | Baño | 🟡 Amarillo (#FFC107) | En el baño |
| 7 | Entrenamiento | 🔵 Azul (#2196F3) | En capacitación |
| 8 | No disponible | 🔴 Rojo (#F44336) | No disponible temporalmente |
| 9 | Desconectado | ⚫ Gris (#424242) | Desconectado del sistema |

### Funcionalidades del Sistema de Estados

- **Seguimiento Automático**: El sistema registra automáticamente cuánto tiempo pasa un agente en cada estado
- **Historial de Cambios**: Cada cambio de estado queda registrado con timestamp y usuario
- **Formato de Tiempo**: Los tiempos se almacenan en formato HH:MM:SS
- **Registros Diarios**: Se crean automáticamente 9 registros (uno por estado) el primer cambio del día
- **Consultas por Fecha**: Se puede consultar el detalle de cualquier fecha específica

## 🧪 Pruebas

El archivo `test_agent_status.http` contiene ejemplos de todas las peticiones HTTP que puedes hacer al API. Puedes usarlo con:

- **VS Code**: Instala la extensión "REST Client" y abre el archivo
- **IntelliJ/PyCharm**: Abre el archivo directamente
- **Postman**: Importa las peticiones manualmente

### Flujo de prueba recomendado:

#### Gestión de Usuarios:
1. **Login como administrador** → Obtener token
2. **Crear un agente** → Usando el token del admin
3. **Login como agente** → Obtener token del agente
4. **Probar permisos** → Verificar que el agente no pueda crear usuarios
5. **Actualizar perfil** → Cada usuario actualiza su información
6. **Cambiar contraseña** → Probar cambio de contraseña

#### Sistema de Estados:
1. **Listar estados disponibles** → Ver los 9 estados con sus IDs
2. **Ver mi estado actual** → Verificar estado por defecto (Desconectado)
3. **Cambiar a Disponible** → Cambiar estado usando estado_id: 1
4. **Cambiar a varios estados** → Probar Break, En llamada, Aftercall, etc.
5. **Ver detalle diario** → Consultar estados de una fecha específica
6. **Verificar historial** → Ver los cambios de estado registrados
7. **Logout** → Cerrar sesión

## 📁 Estructura del Proyecto

```
backend/
├── manage.py
├── create_admin.py          # Script para crear admin inicial
├── test_agent_status.http   # Archivo de pruebas de estados
├── api_tests.http           # Archivo de pruebas de usuarios
├── db.sqlite3               # Base de datos SQLite (desarrollo)
├── requirements.txt         # Dependencias del proyecto
├── callcenter/              # Configuración del proyecto
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
└── apps/
    ├── authn/               # Autenticación (login/logout)
    │   ├── views.py
    │   ├── serializers.py
    │   └── urls.py
    └── users/               # Gestión de usuarios y estados
        ├── models.py        # User, TiposParametros, EstadoAgenteDetalle, EstadoActualAgente
        ├── serializers.py   # Serializadores de usuarios y estados
        ├── views.py         # ViewSets y endpoints
        ├── permissions.py   # Permisos personalizados
        ├── admin.py         # Configuración del admin
        ├── urls.py
        └── management/
            └── commands/
                └── poblar_estados.py  # Comando para crear estados
```

## 🔒 Seguridad

- ✅ Contraseñas hasheadas con PBKDF2
- ✅ Tokens JWT con expiración
- ✅ Blacklist de refresh tokens al hacer logout
- ✅ Validación de contraseñas con Django validators
- ✅ CORS configurado (cambiar en producción)
- ✅ Permisos basados en roles
- ✅ Base de datos PostgreSQL en producción
- ✅ Variables de entorno para credenciales sensibles

## 🛠️ Configuración Adicional

### Base de Datos

#### PostgreSQL (Producción - Recomendado)
```python
# settings.py
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('DB_NAME', 'callcenter_db'),
        'USER': os.getenv('DB_USER', 'postgres'),
        'PASSWORD': os.getenv('DB_PASSWORD'),
        'HOST': os.getenv('DB_HOST', 'localhost'),
        'PORT': os.getenv('DB_PORT', '5432'),
    }
}
```

#### SQLite (Desarrollo - Solo para pruebas)
```python
# settings.py
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}
```

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

### Usuarios
- [ ] Implementar recuperación de contraseña por email
- [ ] Agregar foto de perfil con upload
- [ ] Implementar sistema de permisos más granular
- [ ] Agregar logs de auditoría

### Estados de Agentes
- [ ] Dashboard en tiempo real de estados
- [ ] Reportes personalizados por rango de fechas
- [ ] Alertas automáticas por tiempos excesivos en un estado
- [ ] Exportación de reportes a Excel/PDF
- [ ] Gráficos y estadísticas visuales

### General
- [ ] Implementar rate limiting
- [ ] Agregar tests unitarios y de integración
- [ ] Documentar API con Swagger/OpenAPI
- [ ] Sistema de notificaciones en tiempo real (WebSockets)
- [ ] Integración con sistemas de telefonía

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

### Error: "Debe especificar una fecha"
**Solución:** El endpoint `/api/estado/detalle-diario/` requiere el parámetro `fecha`:
```
GET /api/estado/detalle-diario/?fecha=2025-10-08
```

### Error: "la relación «tipos_parametros» ya existe"
**Solución:** Las tablas ya existen. Usa `python manage.py migrate --fake` o elimina las migraciones anteriores.

### Error de conexión a PostgreSQL
**Solución:** 
1. Verifica que PostgreSQL esté corriendo
2. Verifica las credenciales en `.env`
3. Verifica que la base de datos exista: `createdb callcenter_db`

## 📞 Soporte

Para preguntas o problemas, contacta al equipo de desarrollo.

---

**Desarrollado con ❤️ para Call Center Management System**
