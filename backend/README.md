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
- ✅ Carga masiva de bases de datos (CSV)
- ✅ **Iteración automática de bases de datos**
- ✅ **Programación de llamadas automáticas**
- ✅ **Sistema de reintentos configurable (máx. 3 intentos)**
- ✅ **Asignación inteligente a agentes disponibles**

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

#### 🤖 Automatización con Celery
- ✅ **Sistema de tareas asíncronas** con Celery + Redis
- ✅ **Verificación automática de bases programadas** (cada 1 minuto)
- ✅ **Asignación automática de llamadas** a agentes disponibles
- ✅ **Procesamiento concurrente** de llamadas (hasta 100+ simultáneas)
- ✅ **Retry automático** en caso de fallos
- ✅ **Workers especializados** por tipo de tarea
- ✅ **Monitoreo con Flower** (opcional)

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
- **Redis 7.0+** (para Celery y tareas asíncronas)
- **Celery 5.4.0** (para automatización)

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

Copiar el archivo de ejemplo y editarlo con tus valores:

```powershell
cd callcenter\backend
copy .env.example .env
```

Editar `.env` con tus configuraciones:

```env
# Django
SECRET_KEY=tu-secret-key-super-segura-aqui
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Base de datos (PostgreSQL recomendado)
DB_ENGINE=django.db.backends.postgresql
DB_NAME=callcenter_db
DB_USER=postgres
DB_PASSWORD=tu_password_aqui
DB_HOST=localhost
DB_PORT=5432

# Twilio (REQUERIDO para llamadas reales)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+573001234567
TWILIO_API_KEY=SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_API_SECRET=your_api_secret_here
TWILIO_TWIML_APP_SID=APxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Site URL (para webhooks de Twilio)
SITE_URL=http://localhost:8000

# Celery y Redis (para automatización)
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# Iteración Automática
MAX_INTENTOS=3
TIEMPO_ESPERA_REASIGNACION=30
```

> 💡 **Notas importantes**:
> - El archivo `.env` está en `.gitignore` y NO se debe subir al repositorio
> - Usar `.env.example` como referencia para todas las variables disponibles
> - Para obtener credenciales de Twilio: https://console.twilio.com/

#### d) Instalar Redis

**Opción 1: Windows Subsystem for Linux (WSL)**
```bash
# En WSL/Ubuntu
sudo apt update
sudo apt install redis-server
redis-server
```

**Opción 2: Redis para Windows**
1. Descargar de: https://github.com/microsoftarchive/redis/releases
2. Instalar y ejecutar `redis-server.exe`

**Opción 3: Docker (Recomendado)**
```bash
docker run -d -p 6379:6379 --name redis redis:latest
```

#### e) Aplicar migraciones
```powershell
python manage.py migrate
```

#### f) Poblar tabla de parámetros
```powershell
# Ejecutar script de población de datos iniciales
python poblar_tipos_parametros.py
```

#### g) Crear usuario administrador
```powershell
python create_admin.py
```

**Credenciales por defecto:**
- Email: `admin@callcenter.com`
- Password: `admin123`

⚠️ **IMPORTANTE:** Cambiar la contraseña en producción.

#### h) Iniciar Servicios del Sistema (Terminales Separadas)

Para que el sistema funcione completamente, necesitas tener **4 terminales** abiertas simultáneamente:

**Terminal 1 - Redis (Base de Datos en Memoria):**
```powershell
# Opción 1: Redis nativo
redis-server

# Opción 2: Docker (recomendado)
docker run -d -p 6379:6379 --name redis redis:latest

# Verificar que Redis esté corriendo
redis-cli ping
# Debe responder: PONG
```

**Terminal 2 - Celery Worker (Procesador de Tareas Asíncronas):**
```powershell
# Windows
celery -A callcenter worker -l info --pool=solo

# Linux/Mac
celery -A callcenter worker -l info --pool=gevent --concurrency=20
```

**Terminal 3 - Celery Beat (Programador de Tareas):**
```powershell
celery -A callcenter beat -l info
```

**Terminal 4 - Django Server (Backend API):**
```powershell
python manage.py runserver
```

**Terminal 5 - Ngrok (Para Webhooks de Twilio):**
```powershell
ngrok http 8000
```
> 💡 Copia la URL pública que genera (ej: `https://abc123.ngrok.io`) y actualiza `SITE_URL` en `.env`

El backend estará disponible en: `http://localhost:8000`

#### i) Verificar que todos los servicios estén corriendo

Abre una terminal adicional y verifica cada servicio:

```powershell
# 1. Verificar Redis
redis-cli ping
# Debe responder: PONG

# 2. Verificar Django
curl http://localhost:8000/api/
# Debe responder con JSON

# 3. Verificar Celery Worker
# Busca en los logs: "celery@NOMBRE ready"

# 4. Verificar Celery Beat
# Busca en los logs: "beat: Starting..."
```

> **💡 Nota para Desarrollo:** 
> - Si NO necesitas llamadas automáticas: Solo inicia Django (Terminal 4)
> - Si necesitas llamadas automáticas: Debes iniciar TODOS los servicios (Terminales 1-4)
> - Ngrok (Terminal 5) es necesario si necesitas hacer cualquier llamada

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

---

## ▶️ Ejecutar el Sistema Completo (Paso a Paso)

### 📋 Checklist Pre-Ejecución

Antes de iniciar, verifica que tengas:
- [x] Base de datos creada y configurada
- [x] Variables de entorno configuradas en `.env`
- [x] Redis instalado y corriendo
- [x] Dependencias instaladas (backend y frontend)
- [x] Migraciones aplicadas
- [x] Tabla de parámetros poblada
- [x] Usuario administrador creado

### 🚀 Secuencia de Inicio (Orden Recomendado)

#### **Paso 1: Iniciar Redis** (Terminal 1)
```powershell
# Navegar a cualquier directorio
redis-server

# Verificar
redis-cli ping
# Debe responder: PONG
```
✅ Redis debe estar corriendo antes de iniciar Celery

---

#### **Paso 2: Iniciar Celery Beat** (Terminal 2)
```powershell
# Navegar al directorio del backend
cd callcenter\backend

# Activar entorno virtual
venv\Scripts\activate

# Iniciar Celery Beat
celery -A callcenter beat -l info
```
✅ Debes ver: `beat: Starting...` y `Scheduler: Sending due task procesar_llamadas_pendientes_continuo`

---

#### **Paso 3: Iniciar Celery Worker** (Terminal 3)
```powershell
# Navegar al directorio del backend
cd callcenter\backend

# Activar entorno virtual
venv\Scripts\activate

# Windows
celery -A callcenter worker -l info --pool=solo

# Linux/Mac
celery -A callcenter worker -l info --pool=gevent --concurrency=20
```
✅ Debes ver: `celery@NOMBRE ready.` y `Received task: apps.campaigns.tasks.procesar_llamadas_pendientes_continuo`

---

#### **Paso 4: Iniciar Django Server** (Terminal 4)
```powershell
# Navegar al directorio del backend
cd callcenter\backend

# Activar entorno virtual
venv\Scripts\activate

# Iniciar servidor
python manage.py runserver
```
✅ Debes ver: `Starting development server at http://127.0.0.1:8000/`

---

#### **Paso 5: Iniciar Frontend** (Terminal 5)
```powershell
# Navegar al directorio del frontend
cd callcenter\frontend

# Iniciar Vite
npm run dev
```
✅ Debes ver: `Local: http://localhost:5173/`

---

#### **Paso 6 (Opcional): Iniciar Ngrok** (Terminal 6)
Solo necesario si vas a usar webhooks de Twilio (llamadas reales):

```powershell
# Navegar a cualquier directorio
ngrok http 8000
```
✅ Copia la URL pública (ej: `https://abc123.ngrok-free.app`) y actualiza `SITE_URL` en `.env`

---

### 🎯 Verificación del Sistema

#### 1. Verificar Servicios Backend
```powershell
# Abrir nueva terminal

# Verificar Redis
redis-cli ping
# ✅ Debe responder: PONG

# Verificar Django
curl http://localhost:8000/api/
# ✅ Debe responder con JSON

# Verificar que Celery procesa tareas
# Revisa los logs de Celery Worker (Terminal 3)
# ✅ Debe mostrar: "Buscando clientes pendientes para procesar..." cada 30 segundos
```

#### 2. Verificar Frontend
1. Abre `http://localhost:5173` en el navegador
2. Inicia sesión con credenciales del admin:
   - Email: `admin@callcenter.com`
   - Password: `admin123`
3. ✅ Debes ver el dashboard principal

#### 3. Verificar Llamadas Automáticas
1. En el frontend, crea una campaña
2. Carga una base de datos con clientes
3. Programa una iteración inmediata
4. Cambia el estado del agente a "Disponible"
5. ✅ En 30 segundos, Celery debe asignar y procesar la llamada automáticamente

---

### 🛑 Detener el Sistema (Orden Recomendado)

#### Orden de Apagado:
1. **Frontend** (Terminal 5): `Ctrl+C`
2. **Ngrok** (Terminal 6, si está corriendo): `Ctrl+C`
3. **Django** (Terminal 4): `Ctrl+C`
4. **Celery Worker** (Terminal 3): `Ctrl+C`
5. **Celery Beat** (Terminal 2): `Ctrl+C`
6. **Redis** (Terminal 1): `Ctrl+C` o `redis-cli shutdown`

---

### 🔄 Reiniciar Solo Servicios Específicos

#### Reiniciar solo el Backend (sin afectar Celery):
```powershell
# Terminal 4
Ctrl+C
python manage.py runserver
```

#### Reiniciar solo Celery Worker (después de cambios en tasks.py):
```powershell
# Terminal 3
Ctrl+C
celery -A callcenter worker -l info --pool=solo
```

#### Reiniciar solo Frontend (después de cambios en React):
```powershell
# Terminal 5
Ctrl+C
npm run dev
```

---

### 📊 Monitoreo de Tareas (Opcional)

#### Flower - Interfaz Web para Celery
```powershell
# Terminal adicional
cd callcenter\backend
venv\Scripts\activate

# Instalar Flower (si no está instalado)
pip install flower

# Iniciar Flower
celery -A callcenter flower
```
Visita: `http://localhost:5555` para ver:
- Tareas en ejecución
- Historial de tareas
- Workers activos
- Estadísticas en tiempo real

### 4️⃣ Verificar Instalación
1. Abre el navegador en `http://localhost:5173`
2. Inicia sesión con las credenciales del admin
3. Verifica que puedas ver el dashboard
4. Cambia el estado del agente a "Disponible"
5. Crea una campaña y carga una base de datos
6. Programa una iteración y verifica que se procesen llamadas automáticamente

---

## 🎯 Guía Rápida: Configurar Llamadas Automáticas

### Requisitos Previos
- ✅ Twilio configurado en `.env`
- ✅ Ngrok corriendo y URL actualizada en `SITE_URL`
- ✅ Todos los servicios iniciados (Redis, Celery Beat, Celery Worker, Django)

### Pasos para Configurar

#### 1. Crear Campaña
```
Frontend > Campañas > Nueva Campaña
- Nombre: "Campaña Test"
- Producto: Seleccionar producto
- Estado: Activa
- Guardar
```

#### 2. Asignar Agente al Equipo de la Campaña
```
Frontend > Equipos
- Crear equipo o editar existente
- Asignar campaña
- Asignar agente al equipo
- Guardar
```

#### 3. Cargar Base de Datos de Clientes
```
Frontend > Bases de Datos > Nueva Base
- Nombre: "Base Test"
- Campaña: Seleccionar campaña creada
- Archivo CSV: Subir archivo con columnas (nombre, telefono, etc.)
- Guardar
```

**Formato CSV recomendado:**
```csv
nombre,telefono,documento,correo,direccion,ciudad
Juan Perez,+573001234567,123456,juan@mail.com,Calle 1,Bogotá
Maria Lopez,+573001234568,789012,maria@mail.com,Calle 2,Medellín
```

#### 4. Programar Iteración
```
Frontend > Bases de Datos > [Base creada] > Programar Iteración
- Fecha/Hora: Inmediato (o programar para después)
- Max Intentos: 3
- Programar
```

#### 5. Poner Agente en Estado Disponible
```
Frontend > Dashboard > Estado del Agente
- Cambiar estado a: "Disponible"
```

#### 6. Verificar Procesamiento Automático

**En los logs de Celery Worker verás:**
```
[INFO] Buscando clientes pendientes para procesar...
[INFO] Encontrados 2 clientes pendientes en base 1
[INFO] Asignadas 1 llamadas en base 1
[INFO] Procesando llamada: Cliente Juan Perez -> Agente Test
[INFO] Registro de llamada 1 creado, cambiando agente a EN_LLAMADA...
[INFO] Llamada Twilio iniciada: CAxxxxx
```

**En el frontend verás:**
- Estado del agente cambia a "EN_LLAMADA"
- Aparece información de la llamada activa
- Controles para colgar, silenciar, etc.

---

## 📞 Flujo de Llamadas Automáticas

### Diagrama de Flujo

```
┌─────────────────────────────────────────────────────────────┐
│  1. Celery Beat ejecuta cada 30 segundos:                   │
│     procesar_llamadas_pendientes_continuo                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  2. Busca bases con iteraciones programadas y pendientes    │
│     Estado: PROGRAMADA o EN_PROCESO                         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  3. Por cada base, busca agentes disponibles en sus equipos │
│     Estado agente: DISPONIBLE                               │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  4. Busca clientes pendientes (< 3 intentos)                │
│     Estado iteración: PENDIENTE o NO_CONTACTADO             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  5. Asigna 1 cliente por agente disponible                  │
│     Crea tarea: procesar_llamada_automatica                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  6. Celery Worker ejecuta la llamada:                       │
│     a) Crea registro Llamada en BD                          │
│     b) Cambia agente a EN_LLAMADA                           │
│     c) Llama al cliente con Twilio                          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  7. Cliente contesta:                                        │
│     a) TwiML reproduce mensaje de bienvenida                │
│     b) Conecta al agente usando Twilio Client (WebRTC)      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  8. Frontend del agente:                                     │
│     a) Recibe llamada entrante                              │
│     b) AUTO-ACEPTA la llamada (sin intervención manual)     │
│     c) Muestra controles: colgar, silenciar, duración       │
│     d) Mantiene estado EN_LLAMADA                           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  9. Conversación en curso:                                   │
│     - Agente habla con cliente                              │
│     - Se graba la conversación                              │
│     - Estado agente: EN_LLAMADA                             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  10. Llamada termina (cualquiera cuelga):                   │
│     a) Webhook notifica a Django: status=completed          │
│     b) Actualiza duración de llamada                        │
│     c) Cambia agente a AFTERCALL                            │
│     d) Guarda URL de grabación                              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  11. Agente completa trabajo post-llamada:                  │
│     - Registra resultado de venta                           │
│     - Agrega notas                                          │
│     - Cambia manualmente a DISPONIBLE para nueva llamada    │
└─────────────────────────────────────────────────────────────┘
```

### Estados de Iteración de Cliente

| Estado | Descripción | Siguiente Acción |
|--------|-------------|------------------|
| `PENDIENTE` | Cliente nunca contactado | Intentar llamar |
| `EN_CURSO` | Llamada en progreso | Esperar resultado |
| `CONTACTADO` | Cliente contestó | No volver a llamar |
| `NO_CONTACTADO` | No contestó (intento < 3) | Reintentar después |
| `NO_CONTACTADO_MAX` | 3 intentos fallidos | No volver a llamar |

### Estados de Agente Durante Llamadas

| Estado | Cuándo | Duración |
|--------|--------|----------|
| `DISPONIBLE` | Agente listo para recibir llamadas | Indefinido |
| `EN_LLAMADA` | Desde que se inicia llamada hasta que termina | Durante conversación |
| `AFTERCALL` | Después de colgar | Hasta que agente se pone DISPONIBLE |

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

#### c) Poblar la tabla parametros con los estados (roles, estado campaña, etc)
```powershell
python poblar_tipos_parametros.py
```

#### d) Crear nuevo superusuario
```powershell
python create_admin.py
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

### ❌ Error: "Cannot connect to Redis"
**Causa:** Redis no está corriendo o puerto incorrecto

**Solución:**
```powershell
# Verificar que Redis esté corriendo
redis-cli ping
# Debe responder: PONG

# Si no responde, iniciar Redis
redis-server

# En Windows, verificar que el servicio esté activo
# Services.msc > Redis
```

### ❌ Error: "Celery worker not receiving tasks"
**Causa:** Redis no está corriendo, o configuración incorrecta en `.env`

**Solución:**
```powershell
# 1. Verificar Redis
redis-cli ping

# 2. Verificar configuración en .env
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# 3. Reiniciar Celery Worker
# Terminal Celery Worker: Ctrl+C
celery -A callcenter worker -l info --pool=solo
```

### ❌ Error: "No hay agentes disponibles"
**Causa:** No hay agentes en estado DISPONIBLE o no están en equipos de la campaña

**Solución:**
```powershell
# 1. Verificar estado del agente en frontend
# Dashboard > Estado del Agente > Cambiar a DISPONIBLE

# 2. Verificar que agente esté en equipo de la campaña
# Frontend > Equipos > Verificar asignaciones

# 3. Verificar en base de datos
python manage.py shell
>>> from apps.users.models import EstadoAgenteActual
>>> EstadoAgenteActual.objects.all()
```

### ❌ Error: "Llamadas duplicadas - Agente recibe misma llamada 2 veces"
**Causa:** Twilio envía eventos duplicados por retry/failover

**Solución:**
✅ **Ya está solucionado** en el código actual:
- El frontend deduplica llamadas entrantes por CallSid
- Logs mostrarán: `⚠️ Llamada duplicada detectada, ignorando`

### ❌ Error: "Agente cambia a AFTERCALL inmediatamente"
**Causa:** El frontend está cambiando el estado prematuramente

**Solución:**
✅ **Ya está solucionado** en el código actual:
- El frontend NO cambia estado a EN_LLAMADA (lo maneja el backend)
- Solo cambia a AFTERCALL cuando la llamada realmente termina

### ❌ Error: "Llamada se cancela antes de conectar"
**Causa:** Llamadas duplicadas causando cancelación prematura

**Solución:**
✅ **Ya está solucionado** con deduplicación en `twilioClient.js`

### ❌ Error: "Frontend no muestra controles de llamada"
**Causa:** Llamada no se está registrando correctamente en el sistema

**Solución:**
```javascript
// Verificar en consola del navegador (F12):
// Debe aparecer:
[useTwilioCall] Llamada conectada
[useTwilioCall] Call parameters: {CallSid: "CA...", ...}

// Si no aparece, verificar:
// 1. Twilio Client está inicializado
// 2. Token de Twilio es válido
// 3. No hay errores de JavaScript
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

### 🎯 Campañas (`/api/campaigns/`)

| Método | Endpoint | Descripción | Permisos |
|--------|----------|-------------|----------|
| POST | `/api/campaigns/cargar-base-datos/` | Cargar base de datos CSV | Admin/Jefe |
| GET | `/api/campaigns/listar-bases-datos/` | Listar bases de datos | Autenticado |
| GET | `/api/campaigns/base-datos/{pk}/` | Ver detalle de base | Autenticado |
| GET | `/api/campaigns/cargar-bd-registros/{pk}/` | Ver clientes de base | Autenticado |
| **PUT** | **`/api/campaigns/base-datos/{pk}/programar-iteracion/`** | **Iniciar/programar iteración** | **Admin/Jefe** |

#### 🤖 Iteración Automática de Bases de Datos

**Iniciar AHORA:**
```http
PUT /api/campaigns/base-datos/1/programar-iteracion/
Content-Type: application/json

{
  "iteracion_activa": true
}
```

**Programar para DESPUÉS:**
```http
PUT /api/campaigns/base-datos/1/programar-iteracion/
Content-Type: application/json

{
  "fecha_hora_inicio_iteracion": "2025-10-20T14:30:00-05:00"
}
```

**Respuesta:**
```json
{
  "mensaje": "Iteración iniciada correctamente.",
  "base_datos_id": 1,
  "fecha_hora_inicio": "2025-10-15T14:30:00Z",
  "iteracion_activa": true
}
```



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

## 🏗️ Arquitectura del Sistema

### Componentes Principales

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React + Vite)                  │
│  ┌───────────────┐  ┌──────────────┐  ┌──────────────────┐    │
│  │   Dashboard   │  │  Twilio SDK  │  │  Agent Controls  │    │
│  │   (UI/UX)     │  │   (WebRTC)   │  │  (Call Panel)    │    │
│  └───────┬───────┘  └──────┬───────┘  └────────┬─────────┘    │
│          │                  │                    │               │
│          └──────────────────┴────────────────────┘               │
│                             │                                    │
│                    HTTP/WebSocket                                │
└─────────────────────────────┼────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND (Django + DRF)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐     │
│  │  REST API    │  │   Webhooks   │  │  Authentication  │     │
│  │  Endpoints   │  │   (Twilio)   │  │      (JWT)       │     │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘     │
│         │                  │                    │                │
│         └──────────────────┴────────────────────┘                │
│                             │                                    │
└─────────────────────────────┼────────────────────────────────────┘
                              │
                 ┌────────────┴────────────┐
                 │                         │
                 ▼                         ▼
┌────────────────────────────┐  ┌──────────────────────────┐
│   CELERY BEAT (Scheduler)  │  │  CELERY WORKER (Tasks)   │
│  ┌──────────────────────┐  │  │  ┌────────────────────┐  │
│  │  Tarea cada 30 seg   │  │  │  │  Procesar Llamada  │  │
│  │  Buscar pendientes   │──┼──┼──▶  Twilio API        │  │
│  └──────────────────────┘  │  │  └────────────────────┘  │
└────────────┬───────────────┘  └──────────┬───────────────┘
             │                              │
             └──────────┬───────────────────┘
                        │
                        ▼
           ┌─────────────────────────┐
           │   REDIS (Message Broker) │
           │   - Task Queue           │
           │   - Results Backend      │
           └─────────────────────────┘
                        │
                        ▼
           ┌─────────────────────────┐
           │   PostgreSQL (Database)  │
           │   - Users & Agents       │
           │   - Campaigns & Clients  │
           │   - Calls & Recordings   │
           └─────────────────────────┘
                        │
                        ▼
           ┌─────────────────────────┐
           │    TWILIO (External)     │
           │   - Voice API            │
           │   - Client SDK           │
           │   - Recordings           │
           │   - Webhooks             │
           └─────────────────────────┘
```

### Flujo de Datos - Llamada Automática

```
1. USER ACTION (Frontend)
   └─▶ Crea campaña, carga clientes, programa iteración

2. CELERY BEAT (每30秒)
   └─▶ Ejecuta: procesar_llamadas_pendientes_continuo
       └─▶ Busca iteraciones programadas
           └─▶ Busca agentes disponibles
               └─▶ Busca clientes pendientes
                   └─▶ Crea tarea: procesar_llamada_automatica

3. CELERY WORKER
   └─▶ Ejecuta: procesar_llamada_automatica(cliente, agente)
       ├─▶ Crea registro Llamada en BD
       ├─▶ Cambia agente a EN_LLAMADA
       └─▶ Llama a Twilio API: make_call()

4. TWILIO
   └─▶ Llama al cliente
       ├─▶ Webhook: call-status (initiated)
       ├─▶ Webhook: call-status (ringing)
       └─▶ Cliente contesta
           └─▶ Webhook: handle-call
               └─▶ Django genera TwiML:
                   ├─▶ Say: "Hola, te comunicaremos..."
                   └─▶ Dial.client(agent_id)

5. FRONTEND (Agent Browser)
   └─▶ Twilio Client recibe llamada entrante
       ├─▶ Deduplica por CallSid
       ├─▶ Auto-acepta llamada
       ├─▶ Muestra controles de llamada
       └─▶ Notifica listeners para refrescar UI

6. CONVERSACIÓN
   └─▶ Audio stream: Cliente ↔ Twilio ↔ Agente (WebRTC)
       └─▶ Twilio graba conversación

7. FIN DE LLAMADA
   └─▶ Cualquiera cuelga
       └─▶ Webhook: call-status (completed)
           ├─▶ Actualiza duración en BD
           ├─▶ Guarda URL de grabación
           └─▶ Cambia agente a AFTERCALL

8. POST-LLAMADA
   └─▶ Agente completa trabajo
       ├─▶ Registra resultado de venta
       ├─▶ Agrega notas
       └─▶ Cambia a DISPONIBLE para nueva llamada
```

### Tecnologías y Dependencias

#### Backend
- **Django 5.2.7**: Framework web principal
- **Django REST Framework 3.14.0**: API REST
- **Simple JWT 5.3.1**: Autenticación con tokens JWT
- **Celery 5.4.0**: Tareas asíncronas y programadas
- **Redis 7.0+**: Message broker para Celery
- **PostgreSQL**: Base de datos principal
- **Twilio SDK 9.0.4**: Integración con Twilio Voice API

#### Frontend
- **React 18**: Librería de UI
- **Vite**: Build tool y dev server
- **Twilio Client SDK 2.16.0**: WebRTC para llamadas
- **Material-UI**: Componentes de UI
- **Axios**: Cliente HTTP
- **React Router**: Navegación

#### Infraestructura
- **Ngrok**: Túnel para webhooks en desarrollo
- **Flower (opcional)**: Monitoreo de Celery

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

## 🤖 Sistema de Iteración Automática

### ¿Qué es la Iteración Automática?

El sistema de iteración automática permite que el call center procese automáticamente bases de datos de clientes, asignando llamadas a agentes disponibles sin intervención manual.

### Características

- ✅ **Inicio inmediato** o **programación** para fecha/hora específica
- ✅ **Asignación inteligente** a agentes DISPONIBLES de equipos de la campaña
- ✅ **Sistema de reintentos**: Máximo 3 intentos por cliente
- ✅ **Procesamiento concurrente**: Hasta 100+ llamadas simultáneas
- ✅ **Finalización automática**: Se detiene cuando todos los clientes alcanzaron 3 intentos

### Flujo de Trabajo

```
1. Jefe de Campaña programa/inicia iteración
   ↓
2. Sistema verifica bases programadas (cada 1 minuto)
   ↓
3. Al llegar la hora, se activa la iteración
   ↓
4. Sistema prepara clientes (crea IteracionCliente)
   ↓
5. Busca agentes DISPONIBLES de equipos de la campaña
   ↓
6. Asigna clientes a agentes (batch de 50)
   ↓
7. Verifica configuración de Twilio:
   ├─ ❌ NO configurado → Falla llamada, marca NO_CONTACTADO
   └─ ✅ Configurado → Lanza llamada real vía Twilio
   ↓
8. Agente cambia a EN_LLAMADA
   ↓
9. Al terminar: actualiza estado cliente (CONTACTADO/NO_CONTACTADO)
   ↓
10. Incrementa intento del cliente
    ↓
11. Agente cambia a AFTERCALL (post-llamada) ⚠️
    ↓
12. Sistema asigna siguiente cliente a agentes DISPONIBLES
    ↓
13. Repite hasta que no haya clientes con intento < 3
    ↓
14. Finaliza iteración automáticamente
```

> ⚠️ **IMPORTANTE**: 
> - Los agentes NO vuelven automáticamente a DISPONIBLE después de llamadas
> - Quedan en estado **AFTERCALL** para permitir tareas post-llamada
> - El agente debe cambiar manualmente su estado cuando esté listo
> - Si Twilio **NO** está configurado, las llamadas **NO se simulan**, fallan con error

### Configuración

Todas las configuraciones sensibles se manejan a través del archivo `.env`:

#### Variables de Entorno Principales

```bash
# .env

# Twilio (REQUERIDO para llamadas reales)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+573001234567
TWILIO_API_KEY=SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_API_SECRET=your_api_secret_here
TWILIO_TWIML_APP_SID=APxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Celery & Redis
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# Iteración Automática
MAX_INTENTOS=3  # Máximo de intentos por cliente
TIEMPO_ESPERA_REASIGNACION=30  # Segundos entre asignaciones

# Site URL (para webhooks)
SITE_URL=http://localhost:8000  # En producción: https://tu-dominio.com
```

#### Ajustar Configuración

1. **Copiar archivo de ejemplo**:
   ```bash
   copy .env.example .env
   ```

2. **Editar valores** en `.env` según tus necesidades

3. **Reiniciar servicios** para aplicar cambios:
   ```bash
   # Reiniciar Django
   py manage.py runserver
   
   # Reiniciar Celery Workers
   celery -A callcenter worker --pool=gevent --concurrency=20 -Q llamadas,management
   ```

#### Concurrencia de Workers
Para manejar más llamadas simultáneas:
```bash
# Aumentar concurrencia
celery -A callcenter worker --pool=gevent --concurrency=50
```

### Monitoreo

#### Logs en Tiempo Real
Los workers de Celery mostrarán logs como:
```
[INFO] Iniciando iteración de base 1
[INFO] Encontrados 20 agentes disponibles en campaña 5
[INFO] Asignadas 20 llamadas en base 1
[INFO] Procesando llamada: Cliente Juan Pérez -> Agente María López
[INFO] Llamada procesada: Cliente 123, Intento 1
```

#### Flower (Monitoreo Visual)
```bash
pip install flower
celery -A callcenter flower
```
Visita: http://localhost:5555

### Troubleshooting

#### No se procesan llamadas
- Verifica que Celery Worker esté corriendo
- Verifica que Celery Beat esté corriendo (para programadas)
- Revisa logs de Celery

#### Error: "No hay agentes disponibles"
- Verifica que haya agentes en equipos de la campaña
- Verifica que agentes estén en estado DISPONIBLE
- Revisa el modelo `EstadoAgenteActual`

#### Llamadas fallan con error "Twilio no configurado"
- ⚠️ **El sistema NO simula llamadas** si Twilio no está configurado
- Las llamadas fallarán y los clientes se marcarán como NO_CONTACTADO
- Los agentes quedarán en AFTERCALL después de cada intento
- **Solución**: Configura credenciales de Twilio en `.env`:
  ```env
  TWILIO_ACCOUNT_SID=tu_account_sid
  TWILIO_AUTH_TOKEN=tu_auth_token
  TWILIO_PHONE_NUMBER=+1234567890
  ```

#### Agentes no vuelven a DISPONIBLE
- ✅ **Comportamiento esperado**: Agentes quedan en **AFTERCALL** después de llamadas
- Esto permite completar tareas post-llamada (notas, actualización de info, etc.)
- El agente debe cambiar manualmente su estado a DISPONIBLE cuando esté listo
- Si necesitas que vuelvan automáticamente, modifica `apps/campaigns/tasks.py` línea 252

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
- [Celery Documentation](https://docs.celeryq.dev/)
- [Redis Documentation](https://redis.io/docs/)

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

### v1.2.0 (2025-10-17) - Sistema de Llamadas Automáticas Completo
- ✅ **Auto-Accept de Llamadas Entrantes**
  - Agentes no necesitan aceptar manualmente las llamadas automáticas
  - Conexión instantánea cuando el cliente contesta
  - Deduplicación de llamadas entrantes (evita eventos duplicados de Twilio)
- ✅ **Gestión Inteligente de Estados de Agente**
  - Backend controla cambio a EN_LLAMADA al iniciar llamada
  - Agente permanece EN_LLAMADA durante toda la conversación
  - Cambio automático a AFTERCALL solo cuando la llamada termina
  - Logs detallados para debugging de estados
- ✅ **Integración Twilio Client (WebRTC)**
  - Llamadas directamente desde el navegador (sin teléfono físico)
  - Controles de llamada en UI: colgar, silenciar, duración
  - Grabación automática de conversaciones
  - Tokens JWT con auto-renovación
- ✅ **TwiML Optimizado para Llamadas Automáticas**
  - Mensaje de bienvenida al cliente
  - Conexión directa con agente usando dial.client()
  - Timeout de 30 segundos si agente no está disponible
  - Manejo de errores con mensajes apropiados
- ✅ **Webhooks Robustos**
  - Tracking completo de estados: initiated, ringing, in-progress, completed
  - Actualización automática de duración de llamadas
  - Manejo de casos edge: busy, failed, no-answer, canceled
  - Logs con prefijos [WEBHOOK STATUS] y [CAMBIO ESTADO] para debugging
- ✅ **Frontend Mejorado**
  - Información de llamada activa en tiempo real
  - Sincronización de estados con backend
  - Manejo de errores de conexión
  - Logs detallados en consola para debugging

### v1.1.0 (2025-01-XX) - Sistema de Iteración Automática
- ✅ **Sistema de Iteración Automática de Bases de Datos**
  - Programación de iteraciones inmediatas o con fecha/hora específica
  - Asignación inteligente de clientes a agentes disponibles
  - Sistema de reintentos automáticos (máximo 3 intentos)
  - Procesamiento asíncrono con Celery + Redis
  - Monitoreo de tareas con Flower
  - Gestión de estados de agentes durante llamadas
  - Finalización automática de iteraciones
- ✅ Integración de Celery Beat para tareas programadas
- ✅ Workers con concurrencia gevent para llamadas simultáneas
- ✅ Endpoint REST para control de iteraciones

### v1.0.0 (2025-10-12) - Lanzamiento Inicial
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

### Próximas Versiones (Roadmap)
- [ ] Dashboard de llamadas en tiempo real (vista supervisor)
- [ ] Transferencia de llamadas entre agentes
- [ ] Conferencias de 3 vías (agente + cliente + supervisor)
- [ ] Cola de espera para clientes
- [ ] Música en espera personalizable
- [ ] IVR (Interactive Voice Response) para menús automatizados
- [ ] Priorización de clientes en iteraciones
- [ ] Estadísticas detalladas por iteración
- [ ] Recuperación de contraseña por email
- [ ] Sistema de notificaciones push
- [ ] Reportes avanzados con filtros
- [ ] Exportación a Excel/PDF
- [ ] Chat interno entre agentes
- [ ] Integración con WhatsApp Business
- [ ] IA para análisis de sentimientos
- [ ] Transcripción automática de llamadas con IA
- [ ] Tests unitarios completos
- [ ] Tests E2E con Playwright

---

**Desarrollado con ❤️ para Call Center Management System**

© 2025 Call Center Team
