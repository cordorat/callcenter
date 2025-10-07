from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models


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
