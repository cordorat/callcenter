# Frontend - Sistema de Gestión Call Center

Frontend React + Vite para el sistema integral de gestión de call center. Interfaz moderna y responsiva para administración de agentes, campañas, llamadas y KPIs en tiempo real.

## 🚀 Tecnologías

- **React 18+**: Framework UI moderno
- **Vite**: Build tool ultrarrápido con HMR
- **Material-UI (MUI) v5**: Sistema de componentes profesional
- **Axios**: Cliente HTTP para APIs
- **React Router**: Enrutamiento avanzado
- **Context API**: Gestión de estado global
- **localStorage/sessionStorage**: Persistencia de datos

## 📁 Estructura del Proyecto

```
src/
├── components/          # Componentes reutilizables
│   ├── agentStatus/     # Estado del agente (status, minutos)
│   ├── campaing/        # Componentes de campañas (modales, tablas)
│   ├── forms/           # Formularios genéricos
│   ├── sales/           # Componentes de ventas
│   ├── teams/           # Gestión de equipos
│   └── KpiCard.jsx      # Tarjeta de KPI reutilizable
├── core/
│   ├── api/             # Servicios API (users, calls, kpis, etc)
│   ├── components/      # Componentes principales de layout
│   ├── context/         # AuthContext, contextos globales
│   └── navigation/      # Configuración de navegación
├── hooks/               # Hooks personalizados (useAgentState, useTwilioCall)
├── pages/               # Páginas principales
│   ├── Dashboard/       # Dashboard principal y agente
│   ├── Llamadas/        # Gestión de llamadas
│   ├── Usuario/         # Gestión de usuarios
│   └── ...
├── routes/              # Definición de rutas
├── services/            # Servicios (Twilio, etc)
└── App.jsx              # Componente raíz
```

## 🔧 Setup Inicial

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo (puerto 5173)
npm run dev

# Build para producción
npm run build

# Preview de build
npm run preview

# Lint
npm run lint
```

## 🔐 Autenticación

- **JWT con access + refresh tokens**
- Access token: 8 horas
- Refresh token: 7 días con rotación automática
- Token almacenado en `localStorage`
- Logout requiere blacklist en backend

### Login/Logout
```javascript
// Login
POST /api/auth/login/
{
  "email": "usuario@example.com",
  "password": "contraseña"
}

// Response
{
  "user": { ... },
  "tokens": {
    "access": "token",
    "refresh": "token"
  }
}

// Logout
POST /api/auth/logout/
Body: { "refresh": "token" }
```

## 🎨 Tema y Estilos

- **Material-UI Theme Context**: Soporte light/dark mode
- **Colores del tema**: Personalizables en `src/core/context/ThemeContext.jsx`
- **Componentes consistentes**: Modales, tablas, botones con estilos unificados

## 📊 Páginas Principales

### Dashboard (`/dashboard`)
- KPIs en tiempo real
- Historial de llamadas
- Gráficos de performance
- Estado del agente actual

### Agente Dashboard (`/agente/dashboard`)
- Información personal del agente
- Llamadas recientes
- KPIs personales
- Control de estado

### Usuarios (`/usuarios`)
- CRUD de usuarios
- Asignación de roles
- Filtrado y búsqueda
- Modal de creación

### Campañas (`/campanas`)
- Gestión de campañas
- Productos asociados
- Asignación de agentes
- Monitoreo de estado

### Llamadas (`/llamadas`)
- Histórico de llamadas
- Filtros avanzados
- Detalles de llamada
- Disposiciones

### Equipos (`/equipos`)
- Gestión de equipos de trabajo
- Asignación de agentes
- Campañas por equipo

### KPIs (`/kpis`)
- Métricas en tiempo real
- Reportes personalizados
- Comparativas de período
- Exportación de datos

## 🔄 Estados de Agente

Sistema de persistencia con sincronización:

```javascript
// Estados disponibles: DISPONIBLE, EN_LLAMADA, EN_PAUSA, FUERA_LINEA

// Cambiar estado
POST /api/users/estado-agente/change_state/

// Obtener estado actual
GET /api/users/estado-agente/current/

// Historial
GET /api/users/estado-agente/historial/
```

### Hook useAgentState
```javascript
const { currentStatus, changeStatus, tiempo_en_estado } = useAgentState();

// Auto-sincronización cada 30s
// Persistencia en sessionStorage
// Notificaciones en tiempo real
```

## 📞 Integración Twilio

Hook `useTwilioCall` para llamadas en tiempo real:
```javascript
const { 
  makeCall, 
  endCall, 
  onCall, 
  duration 
} = useTwilioCall();
```

## 🎯 Componentes Reutilizables

### KpiCard
```jsx
<KpiCard 
  title="Llamadas Completadas"
  value={125}
  color="success"
/>
```

### Modales de Formulario
- `CreateUserModal`: Crear usuario con validaciones
- `CreateTeamModal`: Crear equipo con búsqueda de agentes
- `CreateProductModal`: Crear producto

### Tablas
- Paginación automática
- Búsqueda integrada
- Acciones (editar, eliminar)
- Estilos consistentes

## 🔌 API Endpoints Consumidos

```
Authentication
POST /api/auth/login/
POST /api/auth/logout/
POST /api/auth/refresh/

Users
GET /api/users/
POST /api/users/
GET /api/users/{id}/
PATCH /api/users/{id}/

Agent States
GET /api/users/estado-agente/current/
POST /api/users/estado-agente/change_state/

Calls
GET /api/calls/llamadas/
GET /api/calls/llamadas/historial/

Campaigns
GET /api/campaigns/campanas/

KPIs
GET /api/kpis/overview/

Teams
GET /api/teams/equipos/
POST /api/teams/equipos/
```

## 🛠️ Desarrollo

### Convenciones de Código

1. **Componentes**: PascalCase, un componente por archivo
2. **Hooks**: camelCase, prefijo `use`
3. **Constantes**: UPPER_SNAKE_CASE
4. **Variables**: camelCase
5. **Idioma**: Español en UI, inglés en código

### Estructura de Componente
```jsx
import { useState, useEffect } from 'react';
import { useTheme } from '@mui/material/styles';

export default function MiComponente() {
  const theme = useTheme();
  const [state, setState] = useState(null);

  useEffect(() => {
    // Lógica de efecto
  }, []);

  return (
    <Box>
      {/* JSX */}
    </Box>
  );
}
```

### Manejo de Errores
```javascript
try {
  const data = await apiService.get('/endpoint');
  setData(data);
} catch (error) {
  console.error('Error:', error);
  setError(error.response?.data?.message || 'Error desconocido');
}
```

## 🐛 Troubleshooting

### CORS Errors
- Backend debe tener `CORS_ALLOW_ALL_ORIGINS = True` (desarrollo)
- Verificar que frontend url esté en `CORS_ALLOWED_ORIGINS`

### Token Inválido
- Refrescar token: `POST /api/auth/refresh/`
- Si falla, hacer logout y nueva autenticación

### Estado de Agente Desincronizado
- Hook `useAgentState` auto-sincroniza cada 30s
- Limpiar `sessionStorage` para reset forzado

## 📦 Build y Deployment

```bash
# Build optimizado
npm run build

# Analizar tamaño del bundle
npm run preview

# Deploy a producción (ej: Vercel)
vercel deploy --prod
```

## 📝 Licencia

Proyecto privado - Todos los derechos reservados

## 👥 Equipo

Desarrollado por el equipo de Call Center Management System
