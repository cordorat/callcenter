# Serializers y ViewSets Explicados Fácilmente 🚀

## 🎯 Analogía del Mundo Real

Imagina que tu API es un **restaurante**:

```
Cliente (Frontend)  →  Mesero (ViewSet)  →  Cocina (Database)
                           ↓
                      Traductor (Serializer)
```

- **ViewSet** = El **mesero** que atiende las solicitudes
- **Serializer** = El **traductor** que convierte entre lenguajes

---

## 📦 ¿Qué es un Serializer?

### Definición Simple

Un **Serializer** es un **traductor bidireccional** entre:
- **Python/Django** (objetos complejos en memoria)
- **JSON** (texto simple que entiende JavaScript)

### Ejemplo Real de Tu Proyecto

**En la base de datos tienes**:
```python
# Objeto Python (User)
user = User(
    id=1,
    email="admin@callcenter.com",
    first_name="Carlos",
    last_name="Rodríguez",
    password="$2b$12$encrypted...",  # ⬅️ Hash encriptado
    role="ADMIN",
    created_at=datetime(2025, 10, 1),
)
```

**El frontend necesita**:
```json
{
  "id": 1,
  "email": "admin@callcenter.com",
  "first_name": "Carlos",
  "last_name": "Rodríguez",
  "full_name": "Carlos Rodríguez",
  "role": "ADMIN",
  "created_at": "2025-10-01T10:30:00Z"
}
```

**¿Notas las diferencias?**
- ✅ No incluye `password` (sensible)
- ✅ Agrega `full_name` (calculado)
- ✅ Convierte `datetime` → string ISO

### El Serializer hace esta magia ✨

**apps/users/serializers.py**:
```python
class UserSerializer(serializers.ModelSerializer):
    """Convierte User (Python) ↔ JSON"""
    
    full_name = serializers.ReadOnlyField()  # Campo calculado
    
    class Meta:
        model = User  # ⬅️ Modelo a serializar
        fields = [    # ⬅️ Qué campos incluir en JSON
            'id',
            'email',
            'first_name',
            'last_name',
            'full_name',  # Calculado en el modelo
            'role',
            'created_at',
        ]
        # ❌ 'password' NO está en fields → no se envía al frontend
```

---

## 🔄 Serializer: Dos Direcciones

### Dirección 1: Python → JSON (Serialización)

```python
# En el ViewSet (backend)
user = User.objects.get(id=1)  # Objeto Python
serializer = UserSerializer(user)  # Convertir
return Response(serializer.data)  # JSON al frontend
```

**Sale del backend**:
```json
{
  "id": 1,
  "email": "admin@callcenter.com",
  "full_name": "Carlos Rodríguez"
}
```

### Dirección 2: JSON → Python (Deserialización)

```python
# Frontend envía
data = {
    "email": "nuevo@callcenter.com",
    "first_name": "Ana",
    "password": "secure123"
}

# Backend procesa
serializer = UserCreateSerializer(data=data)
if serializer.is_valid():  # ⬅️ Valida formato, reglas, etc.
    user = serializer.save()  # ⬅️ Crea objeto Python y guarda en DB
```

---

## 🎨 Tipos de Serializers en Tu Proyecto

### 1. UserSerializer (Lectura/GET)

**Propósito**: Mostrar información de usuarios

```python
class UserSerializer(serializers.ModelSerializer):
    """Para GET /api/users/ y GET /api/users/1/"""
    full_name = serializers.ReadOnlyField()
    
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'full_name', 'role']
```

**Uso**:
```python
# GET /api/users/1/
user = User.objects.get(id=1)
serializer = UserSerializer(user)
return Response(serializer.data)  # → JSON al frontend
```

### 2. UserCreateSerializer (Creación/POST)

**Propósito**: Crear nuevos usuarios con validaciones

```python
class UserCreateSerializer(serializers.ModelSerializer):
    """Para POST /api/users/"""
    password = serializers.CharField(write_only=True)  # No se devuelve
    password_confirm = serializers.CharField(write_only=True)
    
    def validate(self, attrs):
        # Validación personalizada
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError("Contraseñas no coinciden")
        return attrs
    
    def create(self, validated_data):
        # Lógica personalizada de creación
        validated_data.pop('password_confirm')
        return User.objects.create_user(**validated_data)
```

**Uso**:
```python
# POST /api/users/
data = request.data  # JSON del frontend
serializer = UserCreateSerializer(data=data)
if serializer.is_valid():
    user = serializer.save()  # Llama a create()
    return Response(UserSerializer(user).data)  # Devuelve con UserSerializer
else:
    return Response(serializer.errors, status=400)
```

### 3. UserUpdateSerializer (Actualización/PUT/PATCH)

**Propósito**: Actualizar usuarios existentes

```python
class UserUpdateSerializer(serializers.ModelSerializer):
    """Para PATCH /api/users/1/"""
    
    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'phone']
        # ❌ 'email' y 'password' NO están → no se pueden cambiar por aquí
```

---

## 🎬 ¿Qué es un ViewSet?

### Definición Simple

Un **ViewSet** es una **colección de vistas** que maneja todas las operaciones CRUD para un modelo en un solo lugar.

### Sin ViewSet (Tedioso ❌)

```python
# Necesitarías 5 vistas separadas
def list_users(request):
    # GET /api/users/
    pass

def create_user(request):
    # POST /api/users/
    pass

def get_user(request, pk):
    # GET /api/users/1/
    pass

def update_user(request, pk):
    # PUT/PATCH /api/users/1/
    pass

def delete_user(request, pk):
    # DELETE /api/users/1/
    pass
```

### Con ViewSet (Elegante ✅)

```python
class UserViewSet(viewsets.ModelViewSet):
    """Una clase = todas las operaciones"""
    queryset = User.objects.all()
    serializer_class = UserSerializer
    
    # Automáticamente genera:
    # - list() → GET /api/users/
    # - create() → POST /api/users/
    # - retrieve() → GET /api/users/1/
    # - update() → PUT /api/users/1/
    # - partial_update() → PATCH /api/users/1/
    # - destroy() → DELETE /api/users/1/
```

---

## 🔧 ViewSet en Tu Proyecto (Explicado)

**apps/users/views.py**:

```python
class UserViewSet(viewsets.ModelViewSet):
    """El 'mesero' que atiende requests de usuarios"""
    
    queryset = User.objects.all()  # ⬅️ Todos los usuarios disponibles
    permission_classes = [IsAuthenticated]  # ⬅️ Solo usuarios logueados
    
    # 1️⃣ Método: ¿Qué serializer usar?
    def get_serializer_class(self):
        """Elige el traductor según la acción"""
        if self.action == 'create':
            return UserCreateSerializer  # Para crear
        elif self.action in ['update', 'partial_update']:
            return UserUpdateSerializer  # Para actualizar
        return UserSerializer  # Para mostrar
    
    # 2️⃣ Método: ¿Quién tiene permiso?
    def get_permissions(self):
        """Define quién puede hacer qué"""
        if self.action in ['create', 'destroy']:
            # Solo admins crean/eliminan
            return [IsAdmin()]
        elif self.action in ['update', 'retrieve']:
            # Admin o el propio usuario
            return [IsAdminOrOwner()]
        return [IsAuthenticated()]
    
    # 3️⃣ Método: ¿Qué datos puede ver?
    def get_queryset(self):
        """Filtra qué usuarios puede ver"""
        user = self.request.user
        if user.is_admin():
            return User.objects.all()  # Admin ve todos
        return User.objects.filter(id=user.id)  # Agente solo se ve a sí mismo
    
    # 4️⃣ Personalizar acción: CREATE
    def create(self, request, *args, **kwargs):
        """POST /api/users/ - Crear usuario"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)  # Validar
        user = serializer.save()  # Guardar
        
        return Response(
            UserSerializer(user).data,  # Devolver con UserSerializer
            status=201
        )
    
    # 5️⃣ Personalizar acción: DELETE
    def destroy(self, request, *args, **kwargs):
        """DELETE /api/users/1/ - 'Eliminar' usuario"""
        instance = self.get_object()
        
        # Soft delete: desactivar en lugar de borrar
        instance.is_active = False
        instance.save()
        
        return Response({"detail": "Usuario desactivado"})
    
    # 6️⃣ Acción personalizada (endpoint extra)
    @action(detail=True, methods=['post'])
    def change_password(self, request, pk=None):
        """POST /api/users/1/change_password/ - Custom endpoint"""
        user = self.get_object()
        serializer = ChangePasswordSerializer(data=request.data)
        
        if serializer.is_valid():
            user.set_password(serializer.validated_data['new_password'])
            user.save()
            return Response({"detail": "Contraseña cambiada"})
        
        return Response(serializer.errors, status=400)
```

---

## 🗺️ Flujo Completo: Request → Response

### Ejemplo: Login de Usuario

#### 1. Frontend Envía Request

```javascript
// frontend/src/core/api/auth.js
fetch('http://localhost:8000/api/auth/login/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'admin@callcenter.com',
    password: 'admin123'
  })
})
```

#### 2. Django Recibe (URL Routing)

```python
# backend/callcenter/urls.py
urlpatterns = [
    path('api/auth/', include('apps.authn.urls')),
]

# backend/apps/authn/urls.py
urlpatterns = [
    path('login/', LoginView.as_view(), name='login'),
]
```

#### 3. View Procesa Request

```python
# backend/apps/authn/views.py
class LoginView(APIView):
    def post(self, request):
        # 1. Recibir JSON
        data = request.data  # {'email': '...', 'password': '...'}
        
        # 2. Usar Serializer para validar
        serializer = LoginSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        
        # 3. Autenticar usuario
        user = authenticate(
            email=serializer.validated_data['email'],
            password=serializer.validated_data['password']
        )
        
        # 4. Generar tokens JWT
        tokens = {...}
        
        # 5. Usar Serializer para convertir user → JSON
        user_data = UserSerializer(user).data
        
        # 6. Devolver respuesta
        return Response({
            'user': user_data,
            'tokens': tokens
        })
```

#### 4. Serializer Convierte User → JSON

```python
# UserSerializer hace:
User object (Python) → {'id': 1, 'email': '...', 'full_name': '...'} (JSON)
```

#### 5. Django Devuelve Response

```json
{
  "user": {
    "id": 1,
    "email": "admin@callcenter.com",
    "full_name": "Carlos Rodríguez",
    "role": "ADMIN"
  },
  "tokens": {
    "access": "eyJ0eXAiOiJKV1QiLCJh...",
    "refresh": "eyJ0eXAiOiJKV1QiLCJh..."
  }
}
```

#### 6. Frontend Recibe y Usa

```javascript
.then(response => response.json())
.then(data => {
  console.log(data.user.full_name);  // "Carlos Rodríguez"
  localStorage.setItem('access_token', data.tokens.access);
})
```

---

## 🎯 Ejemplo Práctico: GET Lista de Usuarios

### Request del Frontend

```javascript
GET http://localhost:8000/api/users/
Authorization: Bearer eyJ0eXAiOiJKV1Qi...
```

### Proceso en el Backend

```python
# 1. Django routing llama a UserViewSet.list()
class UserViewSet(viewsets.ModelViewSet):
    
    def list(self, request):
        # 2. Obtener queryset filtrado
        queryset = self.get_queryset()  # Filtra según rol del usuario
        
        # 3. Serializar múltiples objetos
        serializer = UserSerializer(queryset, many=True)
        
        # 4. Devolver JSON
        return Response(serializer.data)
```

### Detrás del telón

```python
# Si hay 3 usuarios en la DB:
users = [
    User(id=1, email='admin@cc.com', first_name='Carlos'),
    User(id=2, email='agent1@cc.com', first_name='Ana'),
    User(id=3, email='agent2@cc.com', first_name='Luis'),
]

# UserSerializer convierte CADA uno:
serializer = UserSerializer(users, many=True)

# serializer.data es:
[
    {'id': 1, 'email': 'admin@cc.com', 'full_name': 'Carlos Rodríguez', ...},
    {'id': 2, 'email': 'agent1@cc.com', 'full_name': 'Ana Gómez', ...},
    {'id': 3, 'email': 'agent2@cc.com', 'full_name': 'Luis Martínez', ...},
]
```

### Response al Frontend

```json
[
  {
    "id": 1,
    "email": "admin@cc.com",
    "full_name": "Carlos Rodríguez",
    "role": "ADMIN"
  },
  {
    "id": 2,
    "email": "agent1@cc.com",
    "full_name": "Ana Gómez",
    "role": "AGENT"
  },
  {
    "id": 3,
    "email": "agent2@cc.com",
    "full_name": "Luis Martínez",
    "role": "AGENT"
  }
]
```

---

## 🛡️ Ventajas de Usar Serializers y ViewSets

### Serializers ✅

1. **Validación automática**: Tipos de datos, formatos, reglas
2. **Transformación segura**: Nunca expones campos sensibles
3. **Conversión automática**: datetime, decimales, foreign keys → JSON
4. **Validaciones personalizadas**: Lógica de negocio

### ViewSets ✅

1. **Menos código**: 1 clase = 6 endpoints
2. **Organización**: Todo sobre "usuarios" en un lugar
3. **Permisos centralizados**: Control de acceso por acción
4. **Personalizable**: Puedes override cualquier método

---

## 📊 Resumen Visual

```
┌─────────────────────────────────────────────────────────┐
│                        Frontend                          │
│  fetch('http://localhost:8000/api/users/')              │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼ HTTP Request (JSON)
┌─────────────────────────────────────────────────────────┐
│                     Django URLs                          │
│  path('api/users/', include(router.urls))              │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼ Routing
┌─────────────────────────────────────────────────────────┐
│                      ViewSet                             │
│  class UserViewSet(viewsets.ModelViewSet):              │
│    - Recibe request                                      │
│    - Verifica permisos                                   │
│    - Obtiene datos de DB                                 │
│    - Llama al Serializer                                 │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼ Objetos Python
┌─────────────────────────────────────────────────────────┐
│                     Serializer                           │
│  class UserSerializer(serializers.ModelSerializer):     │
│    User(id=1, email='...') → {'id': 1, 'email': '...'}  │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼ JSON Response
┌─────────────────────────────────────────────────────────┐
│                        Frontend                          │
│  .then(data => console.log(data))                       │
└─────────────────────────────────────────────────────────┘
```

---

## 💡 Analogía Final

**Serializer** = **Google Translate**
- Traduce entre Python ↔ JSON
- Valida que la traducción tenga sentido
- Omite información que no debe compartirse

**ViewSet** = **Recepcionista de Hotel**
- Atiende diferentes solicitudes (check-in, check-out, info)
- Verifica permisos ("¿Tiene reserva?")
- Delega a especialistas (serializers, models)
- Devuelve respuesta organizada

---

## 🎓 Para Recordar

1. **Serializer** = Traductor bidireccional Python ↔ JSON
2. **ViewSet** = Colección de vistas CRUD en una clase
3. **Serializer valida** antes de guardar en DB
4. **ViewSet delega** en serializer para conversiones
5. **Un modelo puede tener múltiples serializers** (UserSerializer, UserCreateSerializer, UserUpdateSerializer)
6. **Un ViewSet puede usar múltiples serializers** según la acción

---

**Conclusión**: Serializers y ViewSets trabajan juntos para que tu API sea segura, organizada y fácil de mantener. El Serializer traduce, el ViewSet orquesta. 🎯
