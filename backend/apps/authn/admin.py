from django.contrib import admin
from .models import PasswordResetToken


@admin.register(PasswordResetToken)
class PasswordResetTokenAdmin(admin.ModelAdmin):
    """
    Administrador para tokens de recuperación de contraseña.
    """
    list_display = [
        'user',
        'created_at',
        'expires_at',
        'is_used',
        'used_at',
        'ip_address',
        'token_status'
    ]
    list_filter = ['is_used', 'created_at', 'expires_at']
    search_fields = ['user__email', 'user__documento_id', 'token', 'ip_address']
    readonly_fields = ['token', 'created_at', 'expires_at', 'used_at', 'ip_address']
    date_hierarchy = 'created_at'
    ordering = ['-created_at']
    
    def token_status(self, obj):
        """Muestra el estado del token de forma legible."""
        if obj.is_used:
            return '✓ Usado'
        elif obj.is_valid():
            return '✓ Válido'
        else:
            return '✗ Expirado'
    
    token_status.short_description = 'Estado'
    
    def has_add_permission(self, request):
        """No permitir crear tokens manualmente desde el admin."""
        return False
    
    def has_change_permission(self, request, obj=None):
        """Solo lectura."""
        return False
