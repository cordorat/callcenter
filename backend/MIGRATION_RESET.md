# 🔄 Guía de Reset de Migraciones - Sistema Parametrizado

## ⚠️ IMPORTANTE - Leer Antes de Empezar

Esta guía es para **todo el equipo de desarrollo**. El proyecto ha sido refactorizado de un sistema con enums hardcodeados a un sistema parametrizado con `TiposParametros`.

---

## 🎯 ¿Por qué este reset?

Las migraciones antiguas fueron creadas ANTES de la refactorización y tienen:
- ❌ Referencias a campos `role` que ahora son `rol` (FK)
- ❌ Campos CharField con choices que ahora son ForeignKeys
- ❌ Enums hardcodeados que ahora están en DB (TiposParametros)

**Solución**: Reset de migraciones para alinear con los nuevos modelos.

---

## 📋 Checklist Pre-Reset

Antes de empezar, verifica:

- [ ] Estás en la rama `CristianF/backend-arregloBD`
- [ ] Has hecho `git pull` para tener los últimos cambios
- [ ] Tienes el archivo `poblar_tipos_parametros.py` en el backend
- [ ] Puedes perder los datos actuales de tu DB local (es desarrollo)

---

## 🚀 Proceso de Reset (Paso a Paso)

### **Paso 1: Backup de tu DB local** (Opcional pero recomendado)

```bash
# Navega al directorio backend
cd callcenter/backend

# Crea backup de tu DB (por si acaso)
cp db.sqlite3 db.sqlite3.backup
```

---

### **Paso 2: Eliminar la base de datos local**

```bash
# Windows (PowerShell)
Remove-Item db.sqlite3

# Linux/Mac
rm db.sqlite3
```

**Nota**: Es IMPORTANTE eliminar la DB antes de las migraciones para evitar conflictos.

---

### **Paso 3: Limpiar migraciones antiguas**

#### Opción A: Usar el script automático (Recomendado)
```bash
python reset_migrations.py
# Responde 's' cuando pregunte
```

#### Opción B: Manual (si el script falla)

Elimina todos los archivos `000X_*.py` de estas carpetas (EXCEPTO `__init__.py`):
- `apps/authn/migrations/`
- `apps/calls/migrations/`
- `apps/campaigns/migrations/`
- `apps/integrations/migrations/`
- `apps/kpis/migrations/`
- `apps/recordings/migrations/`
- `apps/users/migrations/`

**Mantén SOLO**:
- `__init__.py` en cada carpeta migrations

---

### **Paso 4: Crear nuevas migraciones**

```bash
python manage.py makemigrations
```

**Deberías ver**:
```
Migrations for 'users':
  apps/users/migrations/0001_initial.py
    - Create model TiposParametros
    - Create model User
    - Create model EstadoAgenteActual
    - Create model EstadoAgenteDetalle
    ...
Migrations for 'campaigns':
  apps/campaigns/migrations/0001_initial.py
    ...
Migrations for 'calls':
  apps/calls/migrations/0001_initial.py
    ...
```

---

### **Paso 5: Aplicar migraciones**

```bash
python manage.py migrate
```

**Deberías ver**:
```
Running migrations:
  Applying contenttypes.0001_initial... OK
  Applying users.0001_initial... OK
  Applying campaigns.0001_initial... OK
  Applying calls.0001_initial... OK
  ...
```

---

### **Paso 6: Poblar TiposParametros con estados**

```bash
python poblar_tipos_parametros.py
```

**Deberías ver**:
```
✅ Creados 26 parámetros en total
📊 Distribución:
   - ROL_USUARIO: 3 valores
   - ESTADO_AGENTE: 7 valores
   - ESTADO_CAMPANA: 4 valores
   ...
```

**Verificar que se crearon**:
```bash
python consultar_estados.py
```

---

### **Paso 7: Crear superusuario**

```bash
python manage.py createsuperuser
```

Ingresa:
- Email: tu email
- Nombre: tu nombre
- Apellido: tu apellido
- Documento ID: tu documento (será primary key)
- Password: tu password

**Nota**: El rol de ADMIN se asignará automáticamente si el sistema está configurado correctamente.

---

### **Paso 8: Verificar que todo funciona**

#### Verificar estados helper:
```bash
python manage.py shell
```

```python
from common.estados_helper import get_estado_id, get_estado

# Probar obtener estados
rol_admin = get_estado_id('ROL_USUARIO', 'ADMIN')
print(f"ID Admin: {rol_admin}")

estado_disp = get_estado('ESTADO_AGENTE', 'DISPONIBLE')
print(f"Estado Disponible: {estado_disp}")

# Si todo funciona, deberías ver los IDs
exit()
```

#### Iniciar servidor:
```bash
python manage.py runserver
```

Visita: `http://localhost:8000/admin/` y verifica que puedes login.

---

## ❌ Troubleshooting

### Error: "No module named 'decouple'"
```bash
pip install python-decouple
```

### Error: "No such table: tipos_parametros"
- Asegúrate de haber ejecutado `python manage.py migrate`
- Verifica que las migraciones se crearon correctamente

### Error: "get_estado_id() returns None"
- Ejecuta `python poblar_tipos_parametros.py`
- Verifica con `python consultar_estados.py`

### Error al crear superusuario: "rol_id cannot be null"
**Solución temporal**: Editar `apps/users/models.py` línea 25:
```python
# Cambiar:
extra_fields.setdefault('role', User.Role.ADMIN)
# Por:
extra_fields.setdefault('rol_id', 1)  # Asumiendo que 1 es ADMIN
```

O mejor, modificar el comando `createsuperuser` para asignar el rol automáticamente.

---

## 🔄 Si necesitas volver a empezar

Si algo salió mal y quieres reintentar:

```bash
# 1. Eliminar DB
rm db.sqlite3

# 2. Eliminar migraciones nuevas
python reset_migrations.py

# 3. Hacer git pull por si hay cambios
git pull origin CristianF/backend-arregloBD

# 4. Repetir desde Paso 4
python manage.py makemigrations
python manage.py migrate
python poblar_tipos_parametros.py
python manage.py createsuperuser
```

---

## 📊 Estructura Final

Después del reset, deberías tener:

```
backend/
├── db.sqlite3  (nueva, limpia)
├── apps/
│   ├── users/migrations/
│   │   ├── __init__.py
│   │   └── 0001_initial.py  (única migración)
│   ├── calls/migrations/
│   │   ├── __init__.py
│   │   └── 0001_initial.py
│   ├── campaigns/migrations/
│   │   ├── __init__.py
│   │   └── 0001_initial.py
│   └── ...
└── common/
    └── estados_helper.py
```

---

## 🎯 Para Nuevos Miembros del Equipo

Si eres nuevo en el proyecto:

1. **Clonar el repo**:
   ```bash
   git clone <repo-url>
   cd callcenter
   git checkout CristianF/backend-arregloBD
   ```

2. **Crear entorno virtual**:
   ```bash
   python -m venv venv
   # Windows
   venv\Scripts\activate
   # Linux/Mac
   source venv/bin/activate
   ```

3. **Instalar dependencias**:
   ```bash
   pip install -r backend/requirements.txt
   ```

4. **Configurar .env** (copiar de .env.example)

5. **Seguir esta guía desde el Paso 4** (no necesitas reset)

---

## 📞 Soporte

Si tienes problemas:

1. Revisa la documentación en `/backend/`:
   - `CHECKLIST_VALIDACION.md`
   - `VIEWS_COMPLETAS_ACTUALIZADAS.md`
   - `ESTADOS_HELPER_GUIA.md`

2. Verifica que tus modelos estén actualizados con `git pull`

3. Consulta con el equipo en el canal de desarrollo

---

## ✅ Checklist Final

Después de completar el proceso, verifica:

- [ ] `python manage.py check` no muestra errores
- [ ] Puedes iniciar el servidor: `python manage.py runserver`
- [ ] Puedes acceder al admin: `http://localhost:8000/admin/`
- [ ] Existe la tabla `tipos_parametros` con ~26 registros
- [ ] El helper funciona: `get_estado_id('ROL_USUARIO', 'ADMIN')` retorna un número
- [ ] Los endpoints básicos responden correctamente

---

**🎉 ¡Listo! Ya tienes el sistema parametrizado funcionando.**

Fecha de última actualización: 11 de Octubre, 2025
