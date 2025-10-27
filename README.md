# 📞 Sistema de Gestión Call Center

Sistema integral full-stack para la administración y gestión de call centers. Aplicación moderna construida con **Django REST Framework** (backend) y **React + Vite** (frontend) que proporciona herramientas completas para gestionar agentes, campañas, llamadas y métricas en tiempo real.

## 🎯 Características Principales

- ✅ **Autenticación JWT**: Sistema seguro con access y refresh tokens
- ✅ **Gestión de Usuarios**: RBAC (Role-Based Access Control) avanzado
- ✅ **Estados de Agente**: Tracking temporal y sincronización en tiempo real
- ✅ **Gestión de Campañas**: Creación, asignación y monitoreo
- ✅ **Histórico de Llamadas**: Registros completos con metadatos
- ✅ **KPIs en Tiempo Real**: Métricas de performance del call center
- ✅ **Integración Twilio**: Soporte para llamadas VoIP
- ✅ **Dashboard Responsivo**: UI moderna con Material-UI
- ✅ **Tema Light/Dark**: Soporte completo para ambos modos

## 📋 Requisitos Previos

- **Python 3.9+**: Para el backend
- **Node.js 18+**: Para el frontend
- **SQLite3**: Base de datos (incluida con Python)
- **pip**: Gestor de paquetes Python
- **npm**: Gestor de paquetes Node.js

## 🚀 Guía de Instalación

### 1. Clonar el Repositorio

```bash
git clone https://github.com/cordorat/callcenter.git
cd callcenter
```

### 2. Setup Backend

```bash
cd backend

# Crear entorno virtual
python -m venv venv

# Activar entorno virtual
# En Windows:
venv\Scripts\activate
# En macOS/Linux:
source venv/bin/activate

# Instalar dependencias
pip install -r requirements.txt

# Aplicar migraciones
python manage.py migrate

# Crear usuario administrador
python create_admin.py  # Email: admin@callcenter.com / Contraseña: admin123

# Poblar tipos de parámetros
python poblar_tipos_parametros.py

# Iniciar servidor
python manage.py runserver
# El backend estará disponible en http://localhost:8000
```

### 3. Setup Frontend

```bash
cd frontend

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
# El frontend estará disponible en http://localhost:5173
```

## 📁 Estructura del Proyecto

```
callcenter/
├── backend/                     # Django REST Framework
│   ├── apps/
│   │   ├── authn/              # Autenticación JWT
│   │   ├── users/              # Gestión de usuarios y roles
│   │   ├── campaigns/          # Campañas y productos
│   │   ├── calls/              # Llamadas y clientes
│   │   ├── recordings/         # Metadatos de grabaciones
│   │   ├── kpis/               # Métricas y reportes
│   │   └── integrations/       # Integraciones (Twilio)
│   ├── common/                 # Utilidades compartidas
│   ├── callcenter/             # Settings y configuración
│   ├── manage.py
│   ├── requirements.txt
│   └── README.md
│
├── frontend/                    # React + Vite
│   ├── src/
│   │   ├── components/         # Componentes reutilizables
│   │   ├── core/               # Lógica core (API, contextos)
│   │   ├── hooks/              # Custom hooks
│   │   ├── pages/              # Páginas principales
│   │   ├── services/           # Servicios (Twilio, etc)
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   ├── vite.config.js
│   └── README.md
│
└── README.md                    # Este archivo
```

## 🔐 Autenticación

### Sistema JWT

- **Access Token**: 8 horas de duración
- **Refresh Token**: 7 días con rotación automática
- **Blacklist**: Habilitado para logout seguro

### Flujo de Login

```bash
# 1. Login
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@callcenter.com","password":"admin123"}'

# Respuesta:
{
  "user": {
    "documento_id": 1,
    "email": "admin@callcenter.com",
    "role": "ADMIN"
  },
  "tokens": {
    "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
    "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
  }
}

# 2. Usar Access Token en requests subsecuentes
curl -H "Authorization: Bearer {access_token}" \
  http://localhost:8000/api/users/

# 3. Refrescar Token (cuando access expira)
curl -X POST http://localhost:8000/api/auth/refresh/ \
  -H "Content-Type: application/json" \
  -d '{"refresh":"{refresh_token}"}'

# 4. Logout (invalida el token)
curl -X POST http://localhost:8000/api/auth/logout/ \
  -H "Authorization: Bearer {access_token}" \
  -H "Content-Type: application/json" \
  -d '{"refresh":"{refresh_token}"}'
```

## 👥 Roles y Permisos

| Rol | Descripción | Permisos |
|-----|-------------|----------|
| **ADMIN** | Administrador del sistema | Todo acceso |
| **COORDINADOR** | Coordinador de campañas | Crear campañas, asignar agentes |
| **AGENTE** | Agente de call center | Ver sus llamadas, cambiar estado |
| **JEFE_CAMPAÑA** | Jefe de campaña | Monitoreo de campaña |
| **JEFE_CENTRO** | Jefe del centro | Reportes y KPIs |
| **BACKOFFICE** | Personal de back office | Gestión administrativa |

## 📊 Endpoints Principales

### Autenticación
```
POST   /api/auth/login/              # Login
POST   /api/auth/logout/             # Logout
POST   /api/auth/refresh/            # Refresh token
```

### Usuarios
```
GET    /api/users/                   # Listar usuarios
POST   /api/users/                   # Crear usuario
GET    /api/users/{id}/              # Obtener usuario
PATCH  /api/users/{id}/              # Actualizar usuario
```

### Estado de Agente
```
GET    /api/users/estado-agente/current/           # Estado actual
POST   /api/users/estado-agente/change_state/      # Cambiar estado
GET    /api/users/estado-agente/historial/         # Historial
```

### Campañas
```
GET    /api/campaigns/campanas/      # Listar campañas
POST   /api/campaigns/campanas/      # Crear campaña
```

### Llamadas
```
GET    /api/calls/llamadas/          # Listar llamadas
GET    /api/calls/llamadas/historial/ # Historial de llamadas
```

### KPIs
```
GET    /api/kpis/overview/           # KPIs generales
```

## 🛠️ Desarrollo

### Crear Nueva App Backend

```bash
cd backend
python manage.py startapp nueva_app apps/nueva_app

# Editar apps/nueva_app/apps.py y actualizar name:
# name = "apps.nueva_app"
```

### Hacer Migraciones

```bash
cd backend
python manage.py makemigrations
python manage.py migrate
```

### Testing API (REST Client)

Usar `backend/api_tests.http` con la extensión REST Client de VS Code:

1. Login → copiar access token
2. Reemplazar `{{adminToken}}` en requests
3. Probar endpoints

## 🐛 Troubleshooting

### Error: "ModuleNotFoundError: No module named 'apps.xxx'"

**Solución**: Verificar que `apps.py` tenga `name = "apps.{nombre}"` (con "apps." al inicio)

### Error: "CORS policy: No 'Access-Control-Allow-Origin' header"

**Solución**: En backend, `settings.py` debe tener:
```python
CORS_ALLOW_ALL_ORIGINS = True  # Desarrollo
# O especificar frontend URL en producción
CORS_ALLOWED_ORIGINS = ["http://localhost:5173"]
```

### Error: "Token inválido o expirado"

**Solución**: Refrescar el token:
```bash
POST /api/auth/refresh/
Body: {"refresh": "token"}
```

### Estado de Agente Desincronizado

**Solución**: El hook `useAgentState` sincroniza automáticamente cada 30s. Si persiste:
- Limpiar `sessionStorage`
- Logout y login nuevamente

## 📚 Documentación Adicional

- [Backend README](./backend/README.md) - Documentación específica del backend
- [Frontend README](./frontend/README.md) - Documentación específica del frontend

## 🚢 Deployment

### Backend (Django)

```bash
# Configurar producción
DEBUG = False
ALLOWED_HOSTS = ['yourdomain.com']
SECRET_KEY = 'tu-clave-secreta'

# Ejecutar collectstatic
python manage.py collectstatic

# Deployar con Gunicorn + Nginx
gunicorn callcenter.wsgi:application --bind 0.0.0.0:8000
```

### Frontend (React)

```bash
# Build para producción
npm run build

# Deployar a Vercel, Netlify, etc
vercel deploy --prod
```

## 📝 Convenciones de Código

### Backend (Django/Python)
- **Nombres de variables**: `snake_case`
- **Nombres de clases**: `PascalCase`
- **Idioma**: Inglés en código, español en strings UI
- **Docstrings**: Español

### Frontend (React/JavaScript)
- **Componentes**: `PascalCase`, un archivo por componente
- **Hooks**: `camelCase`, prefijo `use`
- **Constantes**: `UPPER_SNAKE_CASE`
- **Idioma**: Inglés en código, español en UI

## 🤝 Contribuir

1. Crear rama desde `development`: `git checkout -b feature/mi-feature`
2. Hacer cambios y commits descriptivos
3. Push a la rama: `git push origin feature/mi-feature`
4. Crear Pull Request hacia `development`

## 📦 Dependencias Principales

### Backend
```
Django==5.2.7
djangorestframework==3.16.1
djangorestframework-simplejwt==5.3.1
django-cors-headers==4.9.0
```

### Frontend
```
react==18.x
vite==5.x
@mui/material==5.x
axios==1.x
react-router-dom==6.x
```

## 📞 Soporte

Para reportar bugs o sugerencias:
1. Crear issue en el repositorio
2. Describir el problema en detalle
3. Incluir pasos para reproducir
4. Adjuntar logs si es posible

## 📄 Licencia

Proyecto privado - Todos los derechos reservados © 2025

## 👥 Equipo

Desarrollado por el equipo de desarrollo del Sistema Call Center

---

**Última actualización**: Octubre 26, 2025

Para más información, consulta la documentación en los README específicos de cada módulo.
