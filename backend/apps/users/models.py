from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.utils import timezone
from datetime import date
from apps.campaigns.models import Campana


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

# =============================================================================
# Modelos para gestión de agentes y sus estados
# =============================================================================


class TiposParametros(models.Model):
    """
    Tabla normalizada para parámetros del sistema:
    - Roles de usuario (nombre='ROL_USUARIO')
    - Estados de agente (nombre='ESTADO_AGENTE')
    - Estados de campaña (nombre='ESTADO_CAMPANA')
    - Estados de llamada (nombre='ESTADO_LLAMADA')
    - Estados de interacción/llamada (nombre='ESTADO_INTERACION_LLAMADA')
    """
    parametros_id = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=50)  # Tipo de parámetro
    valor = models.CharField(max_length=100)  # Valor específico
    descripcion = models.TextField(blank=True)
    
    class Meta:
        db_table = 'tipos_parametros'
        verbose_name = 'Tipo de Parámetro'
        verbose_name_plural = 'Tipos de Parámetros'
        unique_together = [['nombre', 'valor']]
        indexes = [
            models.Index(fields=['nombre']),
        ]
    
    def __str__(self):
        return f"{self.nombre} - {self.valor}"
    
class User(AbstractUser):

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
        primary_key=True,
        max_length=50,
        unique=True,
        null=True,
        blank=True,
        help_text='Numero de documento de indentidad'
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
    rol = models.ForeignKey(
        TiposParametros,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='rol_id',
        related_name='usuarios_rol',
        help_text='Referencia al tipo de rol (ROL_USUARIO)'
    )
    is_active = models.BooleanField('Activo', default=True)
    

    
    objects = UserManager()
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']
    
    class Meta:
        verbose_name = 'Usuario'
        verbose_name_plural = 'Usuarios'
    
    def __str__(self):
        return f"{self.email} - {self.get_role_display()}"
    
    @property
    def full_name(self):
        """Devuelve el nombre completo del usuario."""
        return f"{self.first_name} {self.last_name}".strip()
    




class Centro(models.Model):
    """
    Centros de atención o sucursales del call center.
    """
    centro_id = models.AutoField(primary_key=True)
    nombre = models.CharField('Nombre del Centro', max_length=150)
    direccion = models.TextField('Dirección', blank=True)
    jefe_centro = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='jefe_centro_id',
        related_name='centros_dirigidos'
    )    
    
    class Meta:
        db_table = 'centro'
        verbose_name = 'Centro'
        verbose_name_plural = 'Centros'
        ordering = ['nombre']
    
    def __str__(self):
        return self.nombre


class Equipo(models.Model):
    """
    Equipos de trabajo para organizar agentes.
    """
    equipo_id = models.AutoField(primary_key=True)
    coordinador = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='equipos_coordinados',
        db_column='coordinador_id'
    )
    campana = models.ForeignKey(
        Campana,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='equipos',
        db_column='campania_id'
    )
    nombre = models.CharField('Nombre del Equipo', max_length=100)
    
    class Meta:
        db_table = 'equipo'
        verbose_name = 'Equipo'
        verbose_name_plural = 'Equipos'
        ordering = ['nombre']
    
    def __str__(self):
        return self.nombre


class EquipoAgenteDetalle(models.Model):
    """
    Relación muchos a muchos entre equipos y agentes.
    """
    agente_id = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='equipos_detalle',
        db_column='agente_id'
    )
    equipo_id = models.ForeignKey(
        Equipo,
        on_delete=models.CASCADE,
        related_name='agentes_detalle',
        db_column='equipo_id'
    )
    
    class Meta:
        db_table = 'equipo_agente_detalle'
        verbose_name = 'Detalle Equipo-Agente'
        verbose_name_plural = 'Detalles Equipo-Agente'
        unique_together = ['equipo_id', 'agente_id']
        indexes = [
            models.Index(fields=['agente_id']),
            models.Index(fields=['equipo_id']),
        ]
    
    def __str__(self):
        return f"{self.agente_id.full_name} en {self.equipo_id.nombre}"


class EstadoAgenteDetalle(models.Model):
    """
    Historial de cambios de estado de agentes.
    """
    agente_id = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='estados_detalle',
        db_column='agente_id'
    )
    estado_id = models.ForeignKey(
        TiposParametros,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='estados_agente',
        db_column='estado_id',
        help_text='Estado del agente (ESTADO_AGENTE)'
    )
    tiempo = models.DateTimeField('Tiempo', default=timezone.now)
    fecha = models.DateField('Fecha', default=timezone.now)
    cambios = models.TextField('Cambios', blank=True)
    
    class Meta:
        db_table = 'estado_agente_detalle'
        verbose_name = 'Estado Agente Detalle'
        verbose_name_plural = 'Estados Agente Detalle'
        ordering = ['-fecha', '-tiempo']
        indexes = [
            models.Index(fields=['agente_id', 'fecha']),
            models.Index(fields=['estado_id', 'fecha']),
            models.Index(fields=['agente_id', '-tiempo']),
        ]
    
    def __str__(self):
        estado_valor = self.estado_id.valor if self.estado_id else "Sin estado"
        return f"{self.agente_id.full_name} - {estado_valor} - {self.fecha}"


class EstadoAgenteActual(models.Model):
    """
    Estado actual del agente en tiempo real.
    Solo existe 1 registro por agente.
    """
    agente_id = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        primary_key=True,
        related_name='estado_actual',
        db_column='agente_id'
    )
    estado_id = models.ForeignKey(
        TiposParametros,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='agentes_estado_actual',
        db_column='estado_id',
        help_text='Estado actual del agente (ESTADO_AGENTE)'
    )
    tiempo = models.DateTimeField('Tiempo', default=timezone.now)
    
    class Meta:
        db_table = 'estado_agente_actual'
        verbose_name = 'Estado Actual del Agente'
        verbose_name_plural = 'Estados Actuales de Agentes'
    
    @property
    def duracion(self):
        """Devuelve la duración en segundos desde que se inició el estado."""
        return int((timezone.now() - self.fecha_inicio).total_seconds())
    def __str__(self):
        estado_valor = self.estado_id.valor if self.estado_id else "Sin estado"
        return f"{self.agente_id.full_name} - {estado_valor}"




