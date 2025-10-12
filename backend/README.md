# 📞 Sistema de Gestión de Call Center

Sistema completo de gestión para Call Center con autenticación, gestión de usuarios, campañas, llamadas, grabaciones, KPIs en tiempo real e integración con Twilio.

## 🚀 Características Principales

### Backend (Django REST Framework + JWT)

#### � Autenticación y Usuarios
- ✅ Autenticación JWT con tokens de acceso y refresh
- ✅ Sistema de roles parametrizable: **Administrador**, **Agente**, **Supervisor**
- ✅ CRUD completo de usuarios con permisos basados en roles (RBAC)
- ✅ Gestión de estados de agentes en tiempo real (Disponible, Ocupado, En Pausa, etc.)
- ✅ Tracking de tiempos por estado con historial diario
- ✅ Cambio de contraseña seguro
- ✅ Blacklist de tokens para logout seguro

#### 📞 Gestión de Llamadas
- ✅ Registro completo de llamadas con estados
- ✅ Integración con Twilio para llamadas salientes/entrantes
- ✅ Webhooks para eventos de Twilio (inicio, fin, estado)
- ✅ Grabación automática de llamadas
- ✅ Transcripción de llamadas (integrable)
- ✅ Estados parametrizables: Completada, No Contestada, Ocupado, etc.
- ✅ Gestión de clientes con historial de llamadas

#### 🎯 Campañas y Ventas
- ✅ Creación y gestión de campañas
- ✅ Asignación de productos a campañas
- ✅ Estados de campaña parametrizables (Activa, Pausada, Finalizada)
- ✅ Tracking de ventas por campaña
- ✅ Objetivos de llamadas y ventas
- ✅ Formularios dinámicos por campaña

#### 📊 KPIs y Reportes
- ✅ KPIs en tiempo real por agente
- ✅ Total de llamadas atendidas
- ✅ Ventas realizadas y cumplimiento
- ✅ Duración promedio de llamadas
- ✅ Llamadas por hora (gráficas)
- ✅ Rangos de fecha: Hoy, Semana, Mes, Personalizado
- ✅ Vista general (Overview) para dashboards

#### 🏢 Organización
- ✅ Gestión de centros (sedes)
- ✅ Equipos de trabajo con coordinadores
- ✅ Asignación de agentes a equipos
- ✅ Base de datos de clientes
- ✅ Iteraciones de llamadas a clientes

#### ⚙️ Sistema Parametrizable
- ✅ Tabla `tipos_parametros` central para configuración
- ✅ Estados parametrizables (Llamadas, Ventas, Agentes, Campañas)
- ✅ Roles de usuario configurables
- ✅ Sin código hardcodeado, 100% configurable

### Frontend (React + Vite)

#### 🎨 Interfaz de Usuario
- ✅ Dashboard principal con KPIs en tiempo real
- ✅ Vista de estado de agentes
- ✅ Gestión de llamadas activas
- ✅ Historial de llamadas
- ✅ Gráficas interactivas (llamadas por hora)
- ✅ Gestión de campañas
- ✅ Formularios dinámicos de ventas

#### 📱 Funcionalidades Frontend
- ✅ Autenticación con JWT
- ✅ Refresh automático de tokens
- ✅ Gestión de estado con Context API
- ✅ Componentes reutilizables
- ✅ Diseño responsivo
- ✅ Actualización en tiempo real de estados

## 📋 Requisitos

### Backend
- Python 3.13+
- Django 4.2.7
- Django REST Framework 3.14.0
- djangorestframework-simplejwt 5.3.1
- PostgreSQL (recomendado) o SQLite (desarrollo)
- Twilio Account (para funcionalidad de llamadas)

### Frontend
- Node.js 16+
- npm o yarn
- React 18+
- Vite

---

## 🆕 Guía de Instalación para Nuevos Usuarios

### 1️⃣ Clonar el Repositorio
```bash
git clone https://github.com/cordorat/callcenter.git
cd callcenter
```

### 2️⃣ Configurar Backend

#### a) Crear y activar entorno virtual
```powershell
# Crear entorno virtual en la raíz del proyecto
python -m venv venv

# Activar (Windows)
venv\Scripts\activate

# Activar (Linux/Mac)
source venv/bin/activate
```

#### b) Instalar dependencias
```powershell
cd callcenter/backend
pip install -r requirements.txt
```

#### c) Configurar variables de entorno
Crea un archivo `.env` en `callcenter/backend/` con:

```env
# Django
SECRET_KEY=tu-secret-key-super-segura-aqui
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Base de datos (PostgreSQL recomendado)
DB_NAME=callcenter
DB_USER=postgres
DB_PASSWORD=tu_password
DB_HOST=localhost
DB_PORT=5432

# Twilio (opcional para desarrollo inicial)
TWILIO_ACCOUNT_SID=tu_account_sid
TWILIO_AUTH_TOKEN=tu_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

#### d) Aplicar migraciones
```powershell
python manage.py migrate
```

#### e) Poblar tabla de parámetros
```powershell
# Ejecutar script de población de datos iniciales
python poblar_tipos_parametros.py
```

#### f) Crear usuario administrador
```powershell
python create_admin.py
```

**Credenciales por defecto:**
- Email: `admin@callcenter.com`
- Password: `admin123`

⚠️ **IMPORTANTE:** Cambiar la contraseña en producción.

#### g) Iniciar servidor backend
```powershell
python manage.py runserver
```

El backend estará disponible en: `http://localhost:8000`

### 3️⃣ Configurar Frontend

#### a) Instalar dependencias
```powershell
cd ../../frontend
npm install
```

#### b) Configurar variables de entorno
Crea un archivo `.env` en `callcenter/frontend/` con:

```env
VITE_API_URL=http://localhost:8000
```

#### c) Iniciar servidor frontend
```powershell
npm run dev
```

El frontend estará disponible en: `http://localhost:5173`

### 4️⃣ Verificar Instalación
1. Abre el navegador en `http://localhost:5173`
2. Inicia sesión con las credenciales del admin
3. Verifica que puedas ver el dashboard

---

## 🔄 Guía de Reset para Usuarios Existentes

Si ya tienes el proyecto y necesitas hacer un reset completo de la base de datos y migraciones:

### ⚠️ ADVERTENCIA
Este proceso **ELIMINARÁ TODOS LOS DATOS**. 

#### a)Iniciar nueva DB
### Opcional
# Abre pgadmin y busca la db que tienes actualmente y eliminala
### Obligatorio
# Crear una nueva DB y asegurate que el que la variable DB_NAME tenga el mismo nombre que la DB nueva

#### b) hacer migraciones 
```powershell
python manage.py migrate
```
#### c) Crear nuevo superusuario
```powershell
python create_admin.py
```
#### d) Poblar la tabla parametros con los estados (roles, estado campaña, etc)
```powershell
python poblar_tipos_parametros.py
```

## 🔧 Solución de Problemas Comunes

### ❌ Error: "No se puede conectar a la base de datos"
**Causa:** PostgreSQL no está corriendo o credenciales incorrectas

**Solución:**
```powershell
# Verificar que PostgreSQL esté corriendo
# Windows: Servicios > PostgreSQL
# Linux: sudo systemctl status postgresql

# Verificar credenciales en .env
```

### ❌ Error: "Migrations are out of sync"
**Causa:** Cambios en modelos no reflejados en migraciones

**Solución:**
```powershell
# Ver estado de migraciones
python manage.py showmigrations
```

### ❌ Error: "Cannot resolve keyword 'id' into field"
**Causa:** El modelo User usa `documento_id` como PK, no `id`

**Solución:**
```python
# ❌ Incorrecto
User.objects.get(id=123)

# ✅ Correcto
User.objects.get(documento_id=123)
# o usar .pk
User.objects.get(pk=123)
```

### ❌ Error: "Cannot resolve keyword 'agente' into field"
**Causa:** Algunos modelos usan sufijos `_id` en los campos FK

**Solución:**
```python
# ❌ Incorrecto
EstadoAgenteActual.objects.filter(agente=user)

# ✅ Correcto
EstadoAgenteActual.objects.filter(agente_id=user)
```

### ❌ Error: "TiposParametros matching query does not exist"
**Causa:** Tabla tipos_parametros no está poblada

**Solución:**
```powershell
python poblar_tipos_parametros.py
```

### ❌ Frontend no conecta con Backend
**Causa:** CORS no configurado o URL incorrecta

**Solución:**
```python
# En backend/callcenter/settings.py
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
```

```env
# En frontend/.env
VITE_API_URL=http://localhost:8000
```

---

## 🎯 Endpoints API Completos

### 🔐 Autenticación (`/api/auth/`)

| Método | Endpoint | Descripción | Requiere Auth |
|--------|----------|-------------|---------------|
| POST | `/api/auth/login/` | Iniciar sesión | No |
| POST | `/api/auth/logout/` | Cerrar sesión | Sí |
| POST | `/api/auth/refresh/` | Refrescar token | No |

### 👥 Usuarios (`/api/users/`)

| Método | Endpoint | Descripción | Permisos |
|--------|----------|-------------|----------|
| GET | `/api/users/agents/` | Listar agentes | Admin |
| POST | `/api/users/agents/` | Crear agente | Admin |
| GET | `/api/users/agents/{pk}/` | Ver agente | Admin o Propietario |
| PATCH | `/api/users/agents/{pk}/` | Actualizar agente | Admin o Propietario |
| DELETE | `/api/users/agents/{pk}/` | Desactivar agente | Admin |
| POST | `/api/users/agents/{pk}/activate/` | Activar agente | Admin |
| GET | `/api/users/agents/me/` | Ver mi perfil | Autenticado |
| POST | `/api/users/agents/change_password/` | Cambiar contraseña | Autenticado |
| GET | `/api/users/parametros/` | Listar parámetros del sistema | Autenticado |
| GET | `/api/users/parametros/?nombre=ROL_USUARIO` | Filtrar parámetros | Autenticado |

### 📊 Estados de Agentes (`/api/users/estados/`)

| Método | Endpoint | Descripción | Permisos |
|--------|----------|-------------|----------|
| GET | `/api/users/estados/mi-estado/` | Ver mi estado actual | Agente |
| POST | `/api/users/estados/cambiar-estado/` | Cambiar estado | Agente |
| GET | `/api/users/estados/detalle-diario/?fecha=YYYY-MM-DD` | Detalle de estados por día | Agente |

### 📞 Llamadas (`/api/calls/`)

| Método | Endpoint | Descripción | Permisos |
|--------|----------|-------------|----------|
| GET | `/api/calls/llamadas/` | Listar llamadas | Autenticado |
| POST | `/api/calls/llamadas/` | Registrar llamada | Agente |
| GET | `/api/calls/llamadas/{id}/` | Ver detalle de llamada | Autenticado |
| PATCH | `/api/calls/llamadas/{id}/` | Actualizar llamada | Agente |
| GET | `/api/calls/clientes/` | Listar clientes | Autenticado |
| POST | `/api/calls/clientes/` | Crear cliente | Agente |
| GET | `/api/calls/clientes/{id}/historial/` | Historial de llamadas | Autenticado |



### 📊 KPIs (`/api/kpis/`)

| Método | Endpoint | Descripción | Permisos |
|--------|----------|-------------|----------|
| GET | `/api/kpis/agente/?agente_id={id}&rango={hoy\|semana\|mes\|personalizado}` | KPIs de agente | Autenticado |
| GET | `/api/kpis/overview/?rango={hoy\|semana\|mes}` | Vista general (dashboard) | Autenticado |

**Rangos disponibles:**
- `hoy`: Día actual
- `semana`: Semana actual (lunes a hoy)
- `mes`: Mes actual (día 1 a hoy)
- `personalizado`: Requiere `fecha_desde` y `fecha_hasta`

### 🔗 Webhooks Twilio (`/webhooks/twilio/`)

| Método | Endpoint | Descripción | Uso |
|--------|----------|-------------|-----|
| POST | `/webhooks/twilio/status/` | Estado de llamada | Twilio |
| POST | `/webhooks/twilio/recording/` | Grabación disponible | Twilio |

---

## 📝 Ejemplos de Uso

### 1. Login y Obtener Token
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
    "documento_id": "1083866259",
    "email": "admin@callcenter.com",
    "first_name": "Admin",
    "last_name": "Sistema",
    "full_name": "Admin Sistema",
    "phone": "+1234567890",
    "rol": "ADMIN",
    "is_active": true
  },
  "tokens": {
    "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
    "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
  }
}
```

### 2. Ver Parámetros del Sistema
```http
GET http://localhost:8000/api/users/parametros/
Authorization: Bearer <access_token>
```

**Respuesta:**
```json
[
  {
    "parametros_id": 1,
    "nombre": "ROL_USUARIO",
    "valor": "ADMIN",
    "descripcion": "Rol Administrador"
  },
  {
    "parametros_id": 2,
    "nombre": "ROL_USUARIO",
    "valor": "AGENTE",
    "descripcion": "Rol Agente"
  },
  {
    "parametros_id": 10,
    "nombre": "ESTADO_AGENTE",
    "valor": "Disponible",
    "descripcion": "Agente disponible para recibir llamadas"
  }
]
```

### 3. Crear un Agente
```http
POST http://localhost:8000/api/users/agents/
Content-Type: application/json
Authorization: Bearer <access_token>

{
  "documento_id": "1234567890",
  "email": "agente@callcenter.com",
  "first_name": "Juan",
  "last_name": "Pérez",
  "phone": "+1234567890",
  "rol_id": 2,
  "password": "agente123",
  "password_confirm": "agente123",
  "is_active": true
}
```

### 4. Ver Estado Actual del Agente
```http
GET http://localhost:8000/api/users/estados/mi-estado/
Authorization: Bearer <access_token_agente>
```

**Respuesta:**
```json
{
  "agente": "Juan Pérez",
  "estado": "Disponible"
}
```

### 5. Cambiar Estado del Agente
```http
POST http://localhost:8000/api/users/estados/cambiar-estado/
Content-Type: application/json
Authorization: Bearer <access_token_agente>

{
  "estado_id": 11
}
```

### 6. Obtener KPIs de un Agente
```http
GET http://localhost:8000/api/kpis/agente/?agente_id=1234567890&rango=semana
Authorization: Bearer <access_token>
```

**Respuesta:**
```json
{
  "agente_id": "1234567890",
  "agente_nombre": "Juan Pérez",
  "total_llamadas": 45,
  "ventas_realizadas": 12,
  "cumplimiento": 26.67,
  "llamadas_por_hora": 1.41,
  "duracion_promedio_segundos": 180.5,
  "fecha_desde": "2025-10-06",
  "fecha_hasta": "2025-10-12",
  "llamadas_por_hora_detalle": [
    {"hora": "09:00", "total": 5},
    {"hora": "10:00", "total": 8},
    {"hora": "11:00", "total": 6}
  ]
}
```

### 7. Registrar una Llamada
```http
POST http://localhost:8000/api/calls/llamadas/
Content-Type: application/json
Authorization: Bearer <access_token_agente>

{
  "cliente_id": 1,
  "telefono_destino": "+573001234567",
  "estado_llamada_id": 20,
  "estado_venta_id": 30,
  "duracion": 180,
  "observaciones": "Cliente interesado en producto X"
}
```

### 8. Crear una Campaña
```http
POST http://localhost:8000/api/campaigns/
Content-Type: application/json
Authorization: Bearer <access_token_admin>

{
  "nombre": "Campaña Producto X",
  "descripcion": "Campaña de ventas del producto X",
  "fecha_inicio": "2025-10-15",
  "fecha_fin": "2025-11-15",
  "estado_id": 40,
  "objetivo_llamadas": 1000,
  "objetivo_ventas": 200
}
```

---

## 🔐 Roles y Permisos

### Sistema Parametrizable
El sistema usa la tabla `tipos_parametros` para definir roles dinámicamente. Los roles por defecto son:

### 🔴 Administrador (ADMIN)
- ✅ **Usuarios**: Ver, crear, actualizar, activar/desactivar todos los usuarios
- ✅ **Campañas**: Crear, modificar, eliminar campañas
- ✅ **Productos**: Gestionar catálogo de productos
- ✅ **Centros**: Gestionar sedes y centros
- ✅ **Equipos**: Crear y gestionar equipos de trabajo
- ✅ **KPIs**: Ver KPIs de todos los agentes
- ✅ **Reportes**: Generar reportes globales
- ✅ **Parámetros**: Ver configuración del sistema
- ✅ **Estados**: Ver y cambiar estado de cualquier agente

### 🟡 Coordinador (SUPERVISOR)
- ✅ **Equipo**: Ver y gestionar su equipo asignado
- ✅ **KPIs**: Ver KPIs de agentes de su equipo
- ✅ **Llamadas**: Ver historial de llamadas de su equipo
- ✅ **Estados**: Cambiar estado de agentes de su equipo
- ⚠️ **Campañas**: Solo ver, no modificar
- ⚠️ **Usuarios**: Solo ver agentes de su equipo

### 🟢 Agente (AGENTE)
- ✅ **Perfil**: Ver y actualizar su información personal
- ✅ **Estado**: Cambiar su propio estado (Disponible, Ocupado, En Pausa, etc.)
- ✅ **Llamadas**: Registrar y ver sus propias llamadas
- ✅ **Clientes**: Ver y actualizar información de clientes
- ✅ **Ventas**: Registrar ventas y completar formularios
- ✅ **KPIs**: Ver solo sus propios KPIs
- ✅ **Historial**: Ver su historial de estados y llamadas
- ❌ **No puede**: Crear usuarios, ver otros agentes, modificar campañas

---

## 🏗️ Arquitectura del Sistema

### Modelos Principales

#### 👤 Users App
- **User**: Usuarios del sistema con `documento_id` como PK
- **TiposParametros**: Tabla central de parámetros (roles, estados, etc.)
- **Centro**: Centros o sedes del call center
- **EstadoAgenteActual**: Estado actual de cada agente
- **EstadoAgenteDetalle**: Historial diario de tiempos por estado

#### 📞 Calls App
- **Cliente**: Base de datos de clientes
- **Llamada**: Registro de llamadas con estados y duración
- **IteracionCliente**: Iteraciones de contacto con clientes

#### 🎯 Campaigns App
- **Producto**: Catálogo de productos
- **Campana**: Campañas de ventas/marketing
- **ProductoCampanaDetalle**: Relación productos-campañas
- **Venta**: Registro de ventas realizadas
- **FormularioCampana**: Formularios dinámicos por campaña

#### 🎙️ Recordings App
- **Grabacion**: Almacenamiento de grabaciones de llamadas

#### 🔗 Integrations App
- **IntegracionTwilio**: Configuración de Twilio

### Flujo de Trabajo

```
┌─────────────────────────────────────────────────────────────┐
│                      USUARIO INICIA SESIÓN                   │
│                    (JWT Token generado)                      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                 AGENTE CAMBIA ESTADO                         │
│           (Disponible, Ocupado, En Pausa, etc.)              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              AGENTE RECIBE/REALIZA LLAMADA                   │
│               (Integración con Twilio)                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│            LLAMADA REGISTRADA EN SISTEMA                     │
│        (Estado, duración, cliente, grabación)                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│            AGENTE COMPLETA FORMULARIO                        │
│              (Si resulta en venta)                           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              VENTA REGISTRADA                                │
│         (Asociada a campaña y producto)                      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│            KPIs ACTUALIZADOS EN TIEMPO REAL                  │
│    (Dashboard muestra métricas actualizadas)                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 🧪 Pruebas y Testing

### Archivo de Pruebas HTTP
El archivo `api_tests.http` contiene ejemplos de todas las peticiones. Puedes usarlo con:

- **VS Code**: Instala "REST Client" extension
- **IntelliJ/PyCharm**: Abre el archivo directamente
- **Postman**: Importa las peticiones manualmente

### Scripts de Utilidad

#### `create_admin.py`
Crea el usuario administrador inicial.

```powershell
python create_admin.py
```

#### `crear_campaña.py`
Verifica o crea una campaña de prueba.

```powershell
python crear_campaña.py
```

#### `test_kpis_connection.py`
Prueba la conexión y consulta de KPIs.

```powershell
python test_kpis_connection.py
```

### Flujo de Prueba Recomendado

1. **Login como administrador** → Obtener access_token
2. **Ver parámetros del sistema** → Verificar tipos_parametros
3. **Crear un agente** → Con rol AGENTE
4. **Login como agente** → Obtener token del agente
5. **Cambiar estado del agente** → A "Disponible"
6. **Ver estado actual** → Verificar cambio
7. **Registrar una llamada** → Con cliente de prueba
8. **Ver KPIs** → Verificar que aparece la llamada
9. **Crear una campaña** → Como administrador
10. **Registrar venta** → Asociada a campaña
11. **Logout** → Cerrar sesiones

---

## 📁 Estructura Completa del Proyecto

```
callcenter/
├── README.md                          # Este archivo
├── venv/                              # Entorno virtual (git ignore)
├── backend/
│   ├── manage.py
│   ├── requirements.txt
│   ├── create_admin.py                # Script crear admin
│   ├── crear_campaña.py               # Script crear campaña
│   ├── api_tests.http                 # Tests HTTP
│   ├── test_kpis_connection.py
│   ├── reset_full.ps1                 # Script reset automático
│   ├── MIGRATION_RESET_POSTGRESQL.md  # Guía de reset manual
│   ├── db.sqlite3                     # DB SQLite (desarrollo)
│   ├── .env                           # Variables de entorno
│   ├── callcenter/                    # Configuración Django
│   │   ├── settings.py
│   │   ├── urls.py
│   │   ├── wsgi.py
│   │   └── asgi.py
│   ├── common/                        # Utilidades compartidas
│   │   ├── estados_helper.py          # Helper para estados
│   │   └── twilio_client.py           # Cliente Twilio
│   ├── webhooks/                      # Webhooks externos
│   │   └── urls.py
│   ├── scripts/                       # Scripts de población
│   │   └── populate_parametros.py
│   └── apps/
│       ├── authn/                     # Autenticación
│       │   ├── models.py
│       │   ├── serializers.py
│       │   ├── views.py
│       │   ├── urls.py
│       │   └── migrations/
│       ├── users/                     # Usuarios y estados
│       │   ├── models.py
│       │   ├── serializers.py
│       │   ├── views.py
│       │   ├── urls.py
│       │   ├── permissions.py
│       │   ├── validators.py
│       │   ├── signals.py
│       │   └── migrations/
│       ├── calls/                     # Llamadas y clientes
│       │   ├── models.py
│       │   ├── serializers.py
│       │   ├── views.py
│       │   ├── urls.py
│       │   └── migrations/
│       ├── campaigns/                 # Campañas y ventas
│       │   ├── models.py
│       │   ├── serializers.py
│       │   ├── views.py
│       │   ├── urls.py
│       │   └── migrations/
│       ├── kpis/                      # KPIs y reportes
│       │   ├── views.py
│       │   ├── urls.py
│       │   └── migrations/
│       ├── recordings/                # Grabaciones
│       │   ├── models.py
│       │   ├── views.py
│       │   └── migrations/
│       └── integrations/              # Integraciones externas
│           ├── models.py
│           ├── views.py
│           ├── urls.py
│           └── migrations/
│
└── frontend/
    ├── package.json
    ├── vite.config.js
    ├── index.html
    ├── .env
    ├── public/
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── components/
        │   ├── KpiCard.jsx
        │   ├── UpdateBadge.jsx
        │   ├── agentStatus/
        │   ├── campaign/
        │   ├── forms/
        │   └── sales/
        ├── core/
        │   ├── api/
        │   ├── components/
        │   ├── context/
        │   └── navigation/
        ├── hooks/
        │   ├── useAgentState.js
        │   └── ...
        ├── pages/
        │   ├── Dashboard.jsx
        │   ├── Login.jsx
        │   └── ...
        ├── routes/
        └── services/
```

---

## 🔒 Seguridad y Mejores Prácticas

### Configuración de Seguridad

- ✅ **Contraseñas**: Hasheadas con PBKDF2 (Django default)
- ✅ **JWT**: Tokens con expiración configurable
- ✅ **Blacklist**: Refresh tokens invalidados en logout
- ✅ **Validación**: Django password validators activos
- ✅ **CORS**: Configurado (ajustar en producción)
- ✅ **HTTPS**: Requerido en producción
- ✅ **Permisos**: RBAC basado en roles

### Configuración para Producción

#### 1. Variables de Entorno
```env
SECRET_KEY=generar-clave-segura-aleatoria-64-caracteres
DEBUG=False
ALLOWED_HOSTS=tudominio.com,www.tudominio.com

# PostgreSQL
DB_NAME=callcenter_prod
DB_USER=callcenter_user
DB_PASSWORD=password-super-seguro
DB_HOST=localhost
DB_PORT=5432

# Twilio
TWILIO_ACCOUNT_SID=tu_sid_real
TWILIO_AUTH_TOKEN=tu_token_real
TWILIO_PHONE_NUMBER=+573001234567
```

#### 2. CORS
```python
# En settings.py
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = [
    "https://tudominio.com",
    "https://www.tudominio.com",
]
```

#### 3. Tokens JWT
```python
# En settings.py
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=8),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "USER_ID_FIELD": "documento_id",
    "USER_ID_CLAIM": "documento_id",
}
```

#### 4. Base de Datos
- Usar PostgreSQL en producción
- Hacer backups regulares
- Configurar replicación si es necesario

---

## 📊 Tablas y Datos Iniciales

### Tabla `tipos_parametros`
Esta tabla es **FUNDAMENTAL** para el funcionamiento del sistema. Contiene:

#### ROL_USUARIO
- ADMIN: Administrador
- SUPERVISOR: Supervisor de equipo
- AGENTE: Agente de call center

#### ESTADO_AGENTE
- Disponible
- Ocupado
- En Pausa
- Almuerzo
- Capacitación
- Reunión
- Desconectado
- Fin de Turno
- Problema Técnico

#### ESTADO_LLAMADA
- Completada
- No Contestada
- Ocupado
- Buzón de Voz
- Rechazada
- Fallida
- Cancelada

#### ESTADO_VENTA
- VENTA: Venta exitosa
- NO_VENTA: No se concretó venta
- PENDIENTE: Cliente interesado, seguimiento
- AGENDADA: Cita agendada

#### ESTADO_CAMPANA
- Activa
- Pausada
- Finalizada

### Script de Población
El script `scripts/populate_parametros.py` debe contener todos estos datos para poblar la tabla inicial.

---

## 🚀 Deployment

### Heroku (Ejemplo)

1. **Instalar Heroku CLI**
2. **Crear app**:
   ```bash
   heroku create tu-callcenter
   ```

3. **Configurar add-ons**:
   ```bash
   heroku addons:create heroku-postgresql:hobby-dev
   ```

4. **Variables de entorno**:
   ```bash
   heroku config:set SECRET_KEY=tu-secret-key
   heroku config:set DEBUG=False
   heroku config:set TWILIO_ACCOUNT_SID=xxx
   ```

5. **Deploy**:
   ```bash
   git push heroku main
   heroku run python manage.py migrate
   heroku run python create_admin.py
   ```

### Docker (Ejemplo básico)

```dockerfile
FROM python:3.13-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

CMD ["gunicorn", "callcenter.wsgi:application", "--bind", "0.0.0.0:8000"]
```

---

## 📚 Documentación Adicional

### Archivos de Referencia
- `SERIALIZERS_VIEWSETS_EXPLICACION.md`: Explicación de serializers y viewsets
- `MIGRATION_RESET_POSTGRESQL.md`: Guía detallada de reset de DB
- `api_tests.http`: Tests completos de API

### Recursos Externos
- [Django Documentation](https://docs.djangoproject.com/)
- [Django REST Framework](https://www.django-rest-framework.org/)
- [Twilio Documentation](https://www.twilio.com/docs)
- [Simple JWT](https://django-rest-framework-simplejwt.readthedocs.io/)

---

## 🤝 Contribución

### Workflow de Desarrollo

1. **Crear rama feature**:
   ```bash
   git checkout -b feature/nueva-funcionalidad
   ```

2. **Hacer commits**:
   ```bash
   git commit -m "feat: descripción del cambio"
   ```

3. **Push y PR**:
   ```bash
   git push origin feature/nueva-funcionalidad
   ```

### Convenciones de Commits
- `feat:` Nueva funcionalidad
- `fix:` Corrección de bug
- `docs:` Cambios en documentación
- `style:` Formato, punto y coma faltante, etc.
- `refactor:` Refactorización de código
- `test:` Agregar tests
- `chore:` Mantenimiento

---

## 📞 Soporte y Contacto

### Issues Conocidos
Revisa la sección **"Solución de Problemas Comunes"** arriba.

### Reportar Bugs
1. Verifica que no esté ya reportado
2. Incluye pasos para reproducir
3. Incluye logs de error completos
4. Versión de Python, Django, etc.

### Solicitar Features
1. Describe la funcionalidad deseada
2. Explica el caso de uso
3. Proporciona ejemplos

---

## 📝 Changelog

### v1.0.0 (2025-10-12)
- ✅ Sistema completo de autenticación JWT
- ✅ Gestión de usuarios con roles parametrizables
- ✅ Estados de agentes en tiempo real
- ✅ Registro y gestión de llamadas
- ✅ Integración con Twilio
- ✅ Sistema de campañas y ventas
- ✅ KPIs en tiempo real
- ✅ Dashboard frontend
- ✅ Grabación de llamadas
- ✅ Webhooks Twilio

### Próximas Versiones
- [ ] Recuperación de contraseña por email
- [ ] Sistema de notificaciones push
- [ ] Reportes avanzados con filtros
- [ ] Exportación a Excel/PDF
- [ ] Chat interno entre agentes
- [ ] Integración con WhatsApp Business
- [ ] IA para análisis de sentimientos
- [ ] Tests unitarios completos

---

**Desarrollado con ❤️ para Call Center Management System**

© 2025 Call Center Team
