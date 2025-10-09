from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.utils import timezone
from datetime import date


class UserManager(BaseUserManager):
    """Manager personalizado para el modelo de usuario."""
    
    def create_user(self, email, password=None, **extra_fields):
        """Crea y guarda un usuario normal."""
        if not email:
            raise ValueError('El email es obligatorio')
        
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self, email, password=None, **extra_fields):
        """Crea y guarda un superusuario."""
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', User.Role.ADMIN)
        
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser debe tener is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser debe tener is_superuser=True.')
        
        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    """
    Modelo de usuario personalizado con roles para el sistema de call center.
    """
    
    class Role(models.TextChoices):
        ADMIN = 'ADMIN', 'Administrador'
        AGENT = 'AGENT', 'Agente'
    
    # Eliminamos el campo username por defecto y usamos email
    username = None
    email = models.EmailField('Correo electrónico', unique=True)
    
    # Información personal
    first_name = models.CharField('Nombre', max_length=150)
    last_name = models.CharField('Apellido', max_length=150)
    phone = models.CharField('Teléfono', max_length=20, blank=True)
    
    # Documento de identidad (opcional)
    documento_id = models.CharField(
        'Documento de Identidad',
        max_length=50,
        unique=True,
        null=True,
        blank=True,
        help_text='Cédula, DNI, Pasaporte u otro documento de identificación'
    )
    
    # Foto de perfil
    foto_perfil = models.URLField(
        'Foto de Perfil',
        max_length=500,
        blank=True,
        null=True,
        help_text='URL de la foto de perfil del usuario'
    )
    
    # Rol y estado
    role = models.CharField(
        'Rol',
        max_length=10,
        choices=Role.choices,
        default=Role.AGENT
    )
    is_active = models.BooleanField('Activo', default=True)
    
    # Metadatos
    created_at = models.DateTimeField('Fecha de creación', auto_now_add=True)
    updated_at = models.DateTimeField('Fecha de actualización', auto_now=True)
    
    objects = UserManager()
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']
    
    class Meta:
        verbose_name = 'Usuario'
        verbose_name_plural = 'Usuarios'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.email} - {self.get_role_display()}"
    
    @property
    def full_name(self):
        """Devuelve el nombre completo del usuario."""
        return f"{self.first_name} {self.last_name}".strip()
    
    def is_admin(self):
        """Verifica si el usuario es administrador."""
        return self.role == self.Role.ADMIN
    
    def is_agent(self):
        """Verifica si el usuario es agente."""
        return self.role == self.Role.AGENT


# =============================================================================
# Modelos para gestión de agentes y sus estados
# =============================================================================

class Equipo(models.Model):
    """
    Equipos de trabajo para organizar agentes.
    """
    nombre = models.CharField(
        'Nombre del Equipo',
        max_length=100,
        unique=True
    )
    descripcion = models.TextField(
        'Descripción',
        blank=True
    )
    supervisor = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='equipos_supervisados',
        limit_choices_to={'role': User.Role.ADMIN},
        help_text='Supervisor o administrador del equipo'
    )
    activo = models.BooleanField(
        'Activo',
        default=True
    )
    
    created_at = models.DateTimeField('Fecha de creación', auto_now_add=True)
    updated_at = models.DateTimeField('Fecha de actualización', auto_now=True)
    
    class Meta:
        verbose_name = 'Equipo'
        verbose_name_plural = 'Equipos'
        ordering = ['nombre']
    
    def __str__(self):
        return self.nombre


class EquipoAgenteDetalle(models.Model):
    """
    Relación muchos a muchos entre equipos y agentes.
    Permite que un agente pertenezca a múltiples equipos.
    """
    equipo = models.ForeignKey(
        Equipo,
        on_delete=models.CASCADE,
        related_name='agentes_detalle'
    )
    agente = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='equipos_detalle',
        limit_choices_to={'role': User.Role.AGENT}
    )
    fecha_asignacion = models.DateTimeField(
        'Fecha de Asignación',
        default=timezone.now
    )
    activo = models.BooleanField(
        'Activo',
        default=True
    )
    
    created_at = models.DateTimeField('Fecha de creación', auto_now_add=True)
    updated_at = models.DateTimeField('Fecha de actualización', auto_now=True)
    
    class Meta:
        verbose_name = 'Detalle Equipo-Agente'
        verbose_name_plural = 'Detalles Equipo-Agente'
        unique_together = ['equipo', 'agente']
        ordering = ['-fecha_asignacion']
        indexes = [
            models.Index(fields=['agente', 'activo']),
            models.Index(fields=['equipo', 'activo']),
        ]
    
    def __str__(self):
        return f"{self.agente.full_name} en {self.equipo.nombre}"

class TiposParametros(models.Model):
    """
    Tabla normalizada para:
    - Roles de usuario (nombre='ROL_USUARIO')
    - Estados de agente (nombre='ESTADO_AGENTE')
    - Estados de campaña (nombre='ESTADO_CAMPANA')
    """
    parametros_id = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=50)  # ROL_USUARIO, ESTADO_AGENTE, ESTADO_CAMPANA
    valor = models.CharField(max_length=100)  # Disponible, Break, Admin, etc.
    descripcion = models.TextField(blank=True)
    
    class Meta:
        db_table = 'tipos_parametros'
        verbose_name = 'Tipo de Parámetro'
        verbose_name_plural = 'Tipos de Parámetros'
        unique_together = [['nombre', 'valor']]
    
    def __str__(self):
        return f"{self.nombre} - {self.valor}"

class EstadoAgenteDetalle(models.Model):
    """
    Registro diario de estados por agente.
    - Se crea 1 registro por cada combinación (agente + estado + fecha)
    - Cada día se generan 9 registros por agente (uno por cada estado)
    - El campo 'tiempo' almacena en formato HH:MM:SS
    - El campo 'cambios' registra el historial: "HH:MM:SS - nombre_usuario, HH:MM:SS - nombre_usuario, ..."
    
    NOTA: Django crea automáticamente los campos INTEGER:
    - agente_id (PK de esta tabla)
    - agente_id (FK → Usuario) se crea automáticamente desde el campo 'agente'
    - estado_id (FK → TiposParametros) se crea automáticamente desde el campo 'estado'
    """
    # Django creará automáticamente el campo 'id' como PK
    agente = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        db_column='agente_id',  # Esto crea la columna agente_id en BD
        related_name='estados_detalle'
    )
    estado = models.ForeignKey(
        TiposParametros, 
        on_delete=models.PROTECT,
        db_column='estado_id',  # Esto crea la columna estado_id en BD
        limit_choices_to={'nombre': 'ESTADO_AGENTE'},
        related_name='estados_agente_detalle'
    )
    tiempo = models.CharField(max_length=8, default='00:00:00', help_text="Tiempo total acumulado en el día (HH:MM:SS)")
    fecha = models.DateField(default=date.today)
    cambios = models.TextField(
        blank=True,
        default='',
        help_text="Historial: 'HH:MM:SS - usuario, HH:MM:SS - usuario, ...'"
    )
    
    class Meta:
        db_table = 'estado_agente_detalle'
        verbose_name = 'Estado Agente Detalle'
        verbose_name_plural = 'Estados Agente Detalle'
        unique_together = [['agente', 'estado', 'fecha']]
        indexes = [
            models.Index(fields=['agente', 'fecha']),
            models.Index(fields=['estado', 'fecha']),
        ]
    
    def __str__(self):
        return f"{self.agente.full_name} - {self.estado.valor} - {self.fecha}"
    
    def agregar_cambio(self, usuario_nombre):
        """
        Agrega un registro al historial de cambios.
        Formato: "HH:MM:SS - nombre_usuario"
        """
        nuevo_cambio = f"{self.tiempo} - {usuario_nombre}"
        
        if self.cambios:
            self.cambios += f", {nuevo_cambio}"
        else:
            self.cambios = nuevo_cambio
    
    def agregar_tiempo(self, segundos):
        """Agrega segundos al tiempo total y lo convierte a HH:MM:SS"""
        # Convertir tiempo actual a segundos
        partes = self.tiempo.split(':')
        horas_actuales = int(partes[0])
        minutos_actuales = int(partes[1])
        segundos_actuales = int(partes[2])
        total_segundos = (horas_actuales * 3600) + (minutos_actuales * 60) + segundos_actuales
        
        # Agregar nuevos segundos
        total_segundos += segundos
        
        # Convertir de vuelta a HH:MM:SS
        horas = total_segundos // 3600
        minutos = (total_segundos % 3600) // 60
        segs = total_segundos % 60
        self.tiempo = f"{horas:02d}:{minutos:02d}:{segs:02d}"
    
    @staticmethod
    def formatear_tiempo(segundos):
        """Convierte segundos a formato HH:MM:SS"""
        horas = segundos // 3600
        minutos = (segundos % 3600) // 60
        segs = segundos % 60
        return f"{horas:02d}:{minutos:02d}:{segs:02d}"


