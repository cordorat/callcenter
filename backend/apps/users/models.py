from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.utils import timezone
from datetime import date, timedelta

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
        # Import local para evitar circular import
        from common.estados_helper import get_estado
        
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('rol', get_estado('ROL_USUARIO', 'ADMIN'))
        
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
    - Estados de venta (nombre='ESTADO_VENTA')
    - Estados de reporte (nombre='ESTADO_REPORTE')
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
    
    def _str_(self):
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
        max_length=20,
        unique=True,
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
    
    def is_admin(self):
        """Verifica si el usuario tiene rol de ADMIN."""
        if not self.rol:
            return False
        return self.rol.valor == 'ADMIN'
    
    def is_agent(self):
        """Verifica si el usuario tiene rol de AGENTE."""
        if not self.rol:
            return False
        return self.rol.valor == 'AGENTE'
    
    def is_coordinador(self):
        """Verifica si el usuario tiene rol de COORDINADOR."""
        if not self.rol:
            return False
        return self.rol.valor == 'COORDINADOR'
    
    def is_backoffice(self):
        """Verifica si el usuario tiene rol de BACKOFFICE."""
        if not self.rol:
            return False
        return self.rol.valor == 'BACKOFFICE'
    
    def is_jefe_centro(self):
        """Verifica si el usuario tiene rol de JEFE_CENTRO."""
        if not self.rol:
            return False
        return self.rol.valor == 'JEFE_CENTRO'
    
    def is_jefe_campana(self):
        """Verifica si el usuario tiene rol de JEFE_CAMPANA."""
        if not self.rol:
            return False
        return self.rol.valor == 'JEFE_CAMPANA'
    
    def get_role_display(self):
        """Devuelve el valor del rol para mostrar."""
        if self.rol:
            return self.rol.valor
        return 'Sin rol'
    
    def get_role_value(self):
        """Devuelve el valor del rol."""
        if self.rol:
            return self.rol.valor
        return None




class Centro(models.Model):
    """
    Centros o sedes del call center.
    Tabla del MER: Centro (campos exactos del MER)
    """
    # centro_id se genera automáticamente como AutoField (PK)
    
    jefe_centro = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='centros_a_cargo',
        verbose_name='Jefe de Centro'
    )
    nombre = models.CharField(
        'Nombre del Centro',
        max_length=200
    )
    direccion = models.TextField(
        'Dirección'
    )
    
    created_at = models.DateTimeField('Fecha de creación', auto_now_add=True)
    updated_at = models.DateTimeField('Fecha de actualización', auto_now=True)
    
    class Meta:
        db_table = 'centro'
        verbose_name = 'Centro'
        verbose_name_plural = 'Centros'
        ordering = ['nombre']
    
    def __str__(self):
        return self.nombre




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
    agente_id = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='estados_detalle',
        db_column='agente_id'
    )
    estado_id = models.ForeignKey(
        TiposParametros,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='estados_agente',
        db_column='estado_id',
        help_text='Estado del agente (ESTADO_AGENTE)'
    )
    tiempo = models.CharField(max_length=15, default='00:00:00', help_text='Tiempo total acumulado en el dia HH:MM:SS')
    fecha = models.DateField('Fecha', default=date.today)
    cambios = models.TextField('Cambios', blank=True, default='', help_text='Historial de cambios  "HH:MM:SS - nombre_usuario, ..."')
    
    class Meta:
        db_table = 'estado_agente_detalle'
        verbose_name = 'Estado Agente Detalle'
        verbose_name_plural = 'Estados Agente Detalle'
        unique_together = [['agente_id', 'estado_id', 'fecha']]
        ordering = ['-fecha', '-tiempo']
        indexes = [
            models.Index(fields=['agente_id', 'fecha']),
            models.Index(fields=['estado_id', 'fecha']),
        ]
    
    def _str_(self):
        estado_valor = self.estado_id.valor if self.estado_id else "Sin estado"
        return f"{self.agente_id.full_name} - {estado_valor} - {self.fecha}"

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
    ultima_actualizacion = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'estado_agente_actual'
        verbose_name = 'Estado Actual del Agente'
        verbose_name_plural = 'Estados Actuales de Agentes'
    
    @property
    def duracion_actual_segundos(self):
        """Devuelve la duración en segundos desde que se inició el estado."""
        return int((timezone.now() - self.tiempo).total_seconds())

    def __str__(self):
        estado_valor = self.estado_id.valor if self.estado_id else "Sin estado"
        return f"{self.agente_id.full_name} - {estado_valor}"



