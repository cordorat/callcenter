"""
Modelos para autenticación y recuperación de contraseña.
"""
from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
import secrets
from datetime import timedelta

User = get_user_model()


class PasswordResetToken(models.Model):
    """
    Token de un solo uso para recuperar contraseña.
    Se genera cuando el usuario solicita recuperar su contraseña.
    Expira después de 1 hora o al ser usado.
    """
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='password_reset_tokens',
        verbose_name='Usuario'
    )
    token = models.CharField(
        'Token',
        max_length=64,
        unique=True,
        db_index=True,
        help_text='Token único y seguro para resetear contraseña'
    )
    created_at = models.DateTimeField(
        'Fecha de creación',
        auto_now_add=True
    )
    expires_at = models.DateTimeField(
        'Fecha de expiración',
        help_text='Token expira después de 1 hora'
    )
    is_used = models.BooleanField(
        'Usado',
        default=False,
        help_text='Marca si el token ya fue utilizado'
    )
    used_at = models.DateTimeField(
        'Fecha de uso',
        null=True,
        blank=True,
        help_text='Momento en que se usó el token'
    )
    ip_address = models.GenericIPAddressField(
        'Dirección IP',
        null=True,
        blank=True,
        help_text='IP desde donde se solicitó el reseteo'
    )
    
    class Meta:
        db_table = 'password_reset_token'
        verbose_name = 'Token de Recuperación de Contraseña'
        verbose_name_plural = 'Tokens de Recuperación de Contraseña'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['token', 'is_used']),
            models.Index(fields=['user', 'created_at']),
        ]
    
    def __str__(self):
        return f"Token para {self.user.email} - {'Usado' if self.is_used else 'Activo'}"
    
    @classmethod
    def generate_token(cls, user, ip_address=None):
        """
        Genera un nuevo token de recuperación para un usuario.
        
        Args:
            user: Usuario que solicita el reseteo
            ip_address: IP desde donde se hace la solicitud (opcional)
            
        Returns:
            PasswordResetToken: Instancia del token creado
        """
        # Generar token seguro de 64 caracteres
        token_value = secrets.token_urlsafe(48)  # Genera ~64 caracteres en base64
        
        # Establecer fecha de expiración (1 hora desde ahora)
        expires_at = timezone.now() + timedelta(hours=1)
        
        # Invalidar tokens anteriores del mismo usuario que no hayan sido usados
        cls.objects.filter(user=user, is_used=False).update(is_used=True, used_at=timezone.now())
        
        # Crear nuevo token
        token = cls.objects.create(
            user=user,
            token=token_value,
            expires_at=expires_at,
            ip_address=ip_address
        )
        
        return token
    
    def is_valid(self):
        """
        Verifica si el token es válido (no usado y no expirado).
        
        Returns:
            bool: True si el token es válido, False en caso contrario
        """
        if self.is_used:
            return False
        
        if timezone.now() > self.expires_at:
            return False
        
        return True
    
    def mark_as_used(self):
        """
        Marca el token como usado.
        """
        self.is_used = True
        self.used_at = timezone.now()
        self.save(update_fields=['is_used', 'used_at'])
    
    @property
    def time_remaining(self):
        """
        Retorna el tiempo restante antes de que expire el token.
        
        Returns:
            timedelta: Tiempo restante o None si ya expiró
        """
        if timezone.now() > self.expires_at:
            return None
        return self.expires_at - timezone.now()
