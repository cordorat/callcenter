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


class EstadoAgenteDetalle(models.Model):
    """
    Historial de cambios de estado de agentes.
    - Cada registro representa un período en un estado específico
    - hora_inicio: Momento en que entró al estado
    - hora_fin: Momento en que salió del estado (NULL si aún está activo)
    - duracion_segundos: Duración calculada automáticamente
    """
    agente = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='estados_detalle',
        limit_choices_to={'role': User.Role.AGENT}
    )
    estado = models.CharField(
        'Estado',
        max_length=20,
        help_text='Estado del agente durante este período'
    )
    fecha = models.DateField(
        'Fecha',
        default=date.today
    )
    hora_inicio = models.DateTimeField(
        'Hora Inicio',
        default=timezone.now
    )
    hora_fin = models.DateTimeField(
        'Hora Fin',
        null=True,
        blank=True,
        help_text='Hora en que salió del estado (NULL = aún activo)'
    )
    duracion_segundos = models.IntegerField(
        'Duración en Segundos',
        null=True,
        blank=True,
        help_text='Duración calculada automáticamente'
    )
    comentarios = models.TextField(
        'Comentarios',
        blank=True,
        help_text='Motivo o notas sobre el cambio de estado'
    )
    
    # Metadatos de conexión
    ip_address = models.GenericIPAddressField(
        'Dirección IP',
        null=True,
        blank=True
    )
    user_agent = models.CharField(
        'User Agent',
        max_length=500,
        blank=True
    )
    
    created_at = models.DateTimeField('Fecha de creación', auto_now_add=True)
    
    class Meta:
        db_table = 'estado_agente_detalle'
        verbose_name = 'Estado Agente Detalle'
        verbose_name_plural = 'Estados Agente Detalle'
        ordering = ['-fecha', '-hora_inicio']
        indexes = [
            models.Index(fields=['agente', 'fecha']),
            models.Index(fields=['estado', 'fecha']),
            models.Index(fields=['agente', '-hora_inicio']),
        ]
    
    def __str__(self):
        if self.hora_fin:
            return f"{self.agente.full_name} - {self.estado} - {self.fecha} ({self.duracion_formateada})"
        return f"{self.agente.full_name} - {self.estado} - {self.fecha} (en curso)"
    
    @property
    def duracion_formateada(self):
        """Retorna la duración en formato HH:MM:SS"""
        if self.duracion_segundos is None:
            return "00:00:00"
        return self.formatear_tiempo(self.duracion_segundos)
    
    @property
    def esta_activo(self):
        """Retorna True si el estado aún está activo (sin hora_fin)"""
        return self.hora_fin is None
    
    def finalizar(self):
        """Finaliza el registro estableciendo hora_fin y calculando duración"""
        if self.hora_fin is None:
            self.hora_fin = timezone.now()
            delta = self.hora_fin - self.hora_inicio
            self.duracion_segundos = int(delta.total_seconds())
            self.save()
    
    @staticmethod
    def formatear_tiempo(segundos):
        """Convierte segundos a formato HH:MM:SS"""
        horas = segundos // 3600
        minutos = (segundos % 3600) // 60
        segs = segundos % 60
        return f"{horas:02d}:{minutos:02d}:{segs:02d}"


class EstadoAgenteActual(models.Model):
    """
    Estado actual del agente en tiempo real.
    - Solo existe 1 registro por agente
    - Se actualiza cada vez que el agente cambia de estado
    - Permite consultas rápidas del estado actual sin buscar en histórico
    """
    
    class EstadoAgente(models.TextChoices):
        DISPONIBLE = 'DISPONIBLE', 'Disponible'
        EN_LLAMADA = 'EN_LLAMADA', 'En Llamada'
        POSTCALL = 'POSTCALL', 'Post Llamada'
        BREAK = 'BREAK', 'Break'
        ALMUERZO = 'ALMUERZO', 'Almuerzo'
        CAPACITACION = 'CAPACITACION', 'Capacitación'
        REUNION = 'REUNION', 'Reunión'
        AUSENTE = 'AUSENTE', 'Ausente'
        DESCONECTADO = 'DESCONECTADO', 'Desconectado'
    
    agente = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        primary_key=True,
        related_name='estado_actual',
        limit_choices_to={'role': User.Role.AGENT}
    )
    estado = models.CharField(
        'Estado Actual',
        max_length=20,
        choices=EstadoAgente.choices,
        default=EstadoAgente.DESCONECTADO
    )
    hora_inicio_estado = models.DateTimeField(
        'Hora Inicio Estado',
        default=timezone.now,
        help_text='Hora en que entró al estado actual'
    )
    ultima_actualizacion = models.DateTimeField(
        'Última Actualización',
        auto_now=True
    )
    
    # Flags de disponibilidad
    acepta_llamadas = models.BooleanField(
        'Acepta Llamadas',
        default=False,
        help_text='Si el agente está disponible para recibir llamadas'
    )
    conexion_activa = models.BooleanField(
        'Conexión Activa',
        default=False,
        help_text='Si el agente está conectado al sistema'
    )
    tiene_audio = models.BooleanField(
        'Tiene Audio',
        default=False,
        help_text='Si el agente tiene audio/micrófono activo'
    )
    
    # Metadatos de conexión
    ip_address = models.GenericIPAddressField(
        'Dirección IP',
        null=True,
        blank=True
    )
    user_agent = models.CharField(
        'User Agent',
        max_length=500,
        blank=True,
        help_text='Información del navegador'
    )
    
    # Comentarios
    comentarios = models.TextField(
        'Comentarios',
        blank=True,
        help_text='Motivo del estado actual'
    )
    
    created_at = models.DateTimeField(
        'Fecha de creación',
        auto_now_add=True,
        null=True,
        blank=True
    )
    
    class Meta:
        db_table = 'estado_agente_actual'
        verbose_name = 'Estado Actual del Agente'
        verbose_name_plural = 'Estados Actuales de Agentes'
        indexes = [
            models.Index(fields=['estado', 'acepta_llamadas']),
            models.Index(fields=['conexion_activa']),
        ]
    
    def __str__(self):
        return f"{self.agente.full_name} - {self.get_estado_display()}"
    
    def puede_recibir_llamadas(self):
        """Verifica si el agente puede recibir llamadas."""
        return (
            self.acepta_llamadas and
            self.conexion_activa and
            self.tiene_audio and
            self.estado == self.EstadoAgente.DISPONIBLE
        )
    
    def tiempo_en_estado_actual(self):
        """Calcula el tiempo en el estado actual en segundos."""
        ahora = timezone.now()
        delta = ahora - self.hora_inicio_estado
        return int(delta.total_seconds())
    
    def cambiar_estado(self, nuevo_estado, comentarios='', usuario=None):
        """
        Cambia el estado del agente y crea un registro en el historial.
        
        Args:
            nuevo_estado: Nuevo estado (valor de EstadoAgente.choices)
            comentarios: Motivo del cambio
            usuario: Usuario que realiza el cambio
        
        Returns:
            EstadoAgenteDetalle: Registro del cambio creado
        """
        from datetime import date
        
        # Cerrar estado anterior si existe
        estados_activos = EstadoAgenteDetalle.objects.filter(
            agente=self.agente,
            hora_fin__isnull=True
        )
        
        for estado_anterior in estados_activos:
            estado_anterior.hora_fin = timezone.now()
            # Calcular duración
            duracion = estado_anterior.hora_fin - estado_anterior.hora_inicio
            estado_anterior.duracion_segundos = int(duracion.total_seconds())
            estado_anterior.save()
        
        # Crear nuevo registro en historial
        nuevo_registro = EstadoAgenteDetalle.objects.create(
            agente=self.agente,
            estado=nuevo_estado,
            fecha=date.today(),
            hora_inicio=timezone.now(),
            comentarios=comentarios,
            ip_address=self.ip_address,
            user_agent=self.user_agent
        )
        
        # Actualizar estado actual
        estado_anterior = self.estado
        self.estado = nuevo_estado
        self.hora_inicio_estado = timezone.now()
        self.comentarios = comentarios
        
        # Actualizar flags según el estado
        if nuevo_estado == self.EstadoAgente.DISPONIBLE:
            self.acepta_llamadas = True
        else:
            self.acepta_llamadas = False
        
        if nuevo_estado == self.EstadoAgente.DESCONECTADO:
            self.conexion_activa = False
            self.tiene_audio = False
        
        self.save()
        
        return nuevo_registro




