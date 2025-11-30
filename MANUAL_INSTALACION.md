# 📘 Manual de Instalación - Sistema Call Center

## Índice
1. [Requisitos del Sistema](#requisitos-del-sistema)
2. [Instalación de Docker Desktop](#instalación-de-docker-desktop)
3. [Configuración del Sistema](#configuración-del-sistema)
4. [Iniciar el Sistema](#iniciar-el-sistema)
5. [Crear Usuario Administrador](#crear-usuario-administrador)
6. [Configurar Datos Iniciales](#configurar-datos-iniciales)
7. [Uso Diario](#uso-diario)
8. [Solución de Problemas](#solución-de-problemas)
9. [Configuración de Twilio](#configuración-de-twilio)
10. [Configuración de AssemblyAI](#configuración-de-assemblyai)

---

## 1. Requisitos del Sistema

### Hardware Mínimo
- **Procesador**: Intel Core i5 o AMD equivalente
- **Memoria RAM**: 8 GB (recomendado 16 GB)
- **Disco Duro**: 20 GB de espacio libre
- **Conexión a Internet**: Requerida

### Software Requerido
- **Sistema Operativo**: Windows 10/11 Pro o Enterprise (64-bit)
- **Docker Desktop**: Versión 4.0 o superior

> ⚠️ **Importante**: Windows 10/11 Home requiere WSL2 habilitado.

---

## 2. Instalación de Docker Desktop

### Paso 2.1: Descargar Docker Desktop
1. Visite: https://www.docker.com/products/docker-desktop/
2. Haga clic en **"Download for Windows"**
3. Guarde el instalador

### Paso 2.2: Instalar Docker Desktop
1. Ejecute el instalador descargado (`Docker Desktop Installer.exe`)
2. Acepte los términos de licencia
3. Marque la opción **"Use WSL 2 instead of Hyper-V"** (recomendado)
4. Haga clic en **"Install"**
5. Espere a que termine la instalación
6. Reinicie el computador cuando se le solicite

### Paso 2.3: Configurar Docker Desktop
1. Después de reiniciar, abra **Docker Desktop**
2. Acepte los términos de servicio
3. Espere a que Docker inicie (el icono de ballena en la barra de tareas estará verde)
4. Verifique que Docker funciona:
   - Abra PowerShell
   - Escriba: `docker --version`
   - Debería ver algo como: `Docker version 24.x.x`

---

## 3. Configuración del Sistema

### Paso 3.1: Copiar archivos del proyecto
1. Copie la carpeta `callcenter` a una ubicación de su preferencia
   - Ejemplo: `C:\CallCenter\`
2. Evite rutas con espacios o caracteres especiales

### Paso 3.2: Configurar credenciales
1. Abra la carpeta del proyecto
2. Localice el archivo `.env.example`
3. **Copie** el archivo y renómbrelo a `.env`
4. Abra `.env` con un editor de texto (Notepad, VS Code, etc.)

### Paso 3.3: Completar el archivo .env

```env
# ==================== BASE DE DATOS ====================
DB_NAME=callcenter
DB_USER=postgres
DB_PASSWORD=postgres123

# ==================== DJANGO ====================
SECRET_KEY=cambie-esto-por-una-clave-secura-larga-y-unica
DEBUG=False
ALLOWED_HOSTS=localhost,127.0.0.1

# ==================== TWILIO (OBLIGATORIO) ====================
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1234567890

# ==================== ASSEMBLYAI (OBLIGATORIO) ====================
ASSEMBLYAI_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

> ⚠️ **Importante**: Nunca comparta el archivo `.env` con nadie.

---

## 4. Iniciar el Sistema

### Paso 4.1: Primera ejecución
1. Asegúrese de que Docker Desktop esté corriendo (icono verde en barra de tareas)
2. Haga doble clic en `iniciar.bat`
3. Espere mientras se descargan las imágenes y se construye el sistema
   - **Primera vez**: Puede tardar 5-15 minutos
   - **Siguientes veces**: Menos de 1 minuto

### Paso 4.2: Verificar que el sistema está corriendo
1. El script mostrará "SISTEMA INICIADO CORRECTAMENTE"
2. Abra su navegador
3. Visite: http://localhost

### Qué hace el script `iniciar.bat`:
1. ✅ Verifica que Docker esté corriendo
2. ✅ Verifica que exista el archivo `.env`
3. ✅ Construye las imágenes de los contenedores
4. ✅ Inicia todos los servicios
5. ✅ Ejecuta las migraciones de base de datos
6. ✅ Pobla la tabla `TiposParametros` con los datos iniciales (roles, estados, etc.)

> 💡 **Nota**: Los datos iniciales se cargan automáticamente gracias al comando `populate_tipos_parametros` de Django.

---

## 5. Crear Usuario Administrador

### Primera vez (obligatorio)
1. Con el sistema corriendo, ejecute `crear-admin.bat`
2. Ingrese los datos solicitados:
   - **Email**: correo del administrador
   - **Documento ID**: número de identificación
   - **Password**: contraseña segura (mínimo 8 caracteres)
3. Confirme la contraseña

### Acceder al panel de administración
1. Visite: http://localhost:8000/admin
2. Ingrese con las credenciales creadas

---

## 6. Configurar Datos Iniciales

### Paso 6.1: Acceder al panel de administración
1. Visite: http://localhost:8000/admin
2. Inicie sesión con el usuario administrador

### Paso 6.2: Configurar parámetros del sistema
En el panel de administración, configure:

1. **Tipos Parámetros**: Estados y roles del sistema
2. **Centros**: Sedes o ubicaciones físicas
3. **Campañas**: Campañas de llamadas
4. **Usuarios**: Crear jefes de campaña, coordinadores y agentes

---

## 7. Uso Diario

### Iniciar el sistema
1. Abra Docker Desktop
2. Ejecute `iniciar.bat`
3. Espere el mensaje de confirmación
4. Acceda a http://localhost

### Detener el sistema
1. Ejecute `detener.bat`
2. Los datos se preservan para la próxima vez

### Ver logs (para diagnóstico)
1. Ejecute `ver-logs.bat`
2. Seleccione qué servicio desea monitorear

### Scripts disponibles

| Script | Función |
|--------|---------|
| `iniciar.bat` | Inicia todos los servicios |
| `detener.bat` | Detiene todos los servicios |
| `crear-admin.bat` | Crea un usuario administrador |
| `ver-logs.bat` | Muestra logs del sistema |

---

## 8. Solución de Problemas

### Error: "Docker no está corriendo"
**Solución**:
1. Abra Docker Desktop
2. Espere a que el icono esté verde
3. Vuelva a ejecutar `iniciar.bat`

### Error: "No se encontró el archivo .env"
**Solución**:
1. Copie `.env.example` y renómbrelo a `.env`
2. Complete las credenciales de Twilio y AssemblyAI

### La página no carga (http://localhost)
**Solución**:
1. Ejecute `ver-logs.bat` y seleccione "Todos los servicios"
2. Busque mensajes de error en rojo
3. Verifique que ningún otro programa esté usando el puerto 80

### Error de conexión a la base de datos
**Solución**:
1. Ejecute `detener.bat`
2. Espere 10 segundos
3. Ejecute `iniciar.bat`

### Las llamadas no funcionan
**Verifique**:
1. Las credenciales de Twilio en `.env` son correctas
2. El número de teléfono tiene formato E.164 (+1234567890)
3. Su cuenta de Twilio tiene saldo

### Las transcripciones no funcionan
**Verifique**:
1. La API Key de AssemblyAI en `.env` es correcta
2. Su cuenta de AssemblyAI tiene créditos disponibles

### Reiniciar completamente el sistema
```batch
# En PowerShell o CMD dentro de la carpeta del proyecto:
docker-compose down -v
docker-compose up -d --build
```

> ⚠️ **Advertencia**: Esto borrará todos los datos de la base de datos.

---

## 9. Configuración de Twilio

### Paso 9.1: Crear cuenta en Twilio
1. Visite: https://www.twilio.com/try-twilio
2. Regístrese con su correo electrónico
3. Verifique su número de teléfono

### Paso 9.2: Obtener credenciales
1. Inicie sesión en: https://console.twilio.com
2. En la página principal encontrará:
   - **Account SID**: `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - **Auth Token**: Click en "Show" para verlo

### Paso 9.3: Comprar un número de teléfono
1. Vaya a: Phone Numbers → Manage → Buy a number
2. Seleccione un número con capacidades de voz
3. Complete la compra

### Paso 9.4: Configurar webhooks (opcional)
Para llamadas entrantes:
1. Vaya a: Phone Numbers → Manage → Active numbers
2. Seleccione su número
3. En "Voice & Fax", configure:
   - **A CALL COMES IN**: Webhook URL de su sistema

---

## 10. Configuración de AssemblyAI

### Paso 10.1: Crear cuenta
1. Visite: https://www.assemblyai.com
2. Haga clic en "Get Started Free"
3. Regístrese con su correo

### Paso 10.2: Obtener API Key
1. Inicie sesión en: https://www.assemblyai.com/dashboard
2. Su API Key se muestra en la página principal
3. Copie la clave y péguela en el archivo `.env`

### Precios de AssemblyAI
- Las primeras 100 horas de transcripción son gratuitas
- Después: ~$0.37 USD por hora de audio

---

## Soporte

Si tiene problemas adicionales:
1. Revise los logs con `ver-logs.bat`
2. Tome capturas de pantalla de los errores
3. Contacte al soporte técnico con esta información

---

**Versión del Manual**: 1.0  
**Última actualización**: Noviembre 2025
