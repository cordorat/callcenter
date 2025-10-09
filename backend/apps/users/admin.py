from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.translation import gettext_lazy as _
from django.utils.html import format_html
from .models import User, TiposParametros, EstadoAgenteDetalle, EstadoActualAgente


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Configuración del admin para el modelo User personalizado."""
    
    list_display = ['email', 'first_name', 'last_name', 'role', 'is_active', 'is_staff', 'created_at']
    list_filter = ['role', 'is_active', 'is_staff', 'is_superuser', 'created_at']
    search_fields = ['email', 'first_name', 'last_name', 'phone']
    ordering = ['-created_at']
    
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        (_('Información Personal'), {'fields': ('first_name', 'last_name', 'phone')}),
        (_('Permisos'), {
            'fields': ('role', 'is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions'),
        }),
        (_('Fechas Importantes'), {'fields': ('last_login', 'created_at', 'updated_at')}),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'first_name', 'last_name', 'phone', 'role', 'password1', 'password2'),
        }),
    )
    
    readonly_fields = ['created_at', 'updated_at', 'last_login']


# ===================================
# ADMIN DE ESTADOS DE AGENTES
# ===================================

@admin.register(TiposParametros)
class TiposParametrosAdmin(admin.ModelAdmin):
    list_display = ['parametros_id', 'nombre', 'valor', 'descripcion']
    list_filter = ['nombre']
    search_fields = ['nombre', 'valor', 'descripcion']
    ordering = ['nombre', 'valor']


@admin.register(EstadoActualAgente)
class EstadoActualAgenteAdmin(admin.ModelAdmin):
    list_display = ['agente', 'get_agente_nombre', 'estado', 'fecha_inicio', 'get_duracion']
    list_filter = ['estado']
    search_fields = ['agente__first_name', 'agente__last_name', 'agente__email']
    readonly_fields = ['fecha_inicio', 'ultima_actualizacion', 'get_duracion']
    
    def get_agente_nombre(self, obj):
        return obj.agente.full_name
    get_agente_nombre.short_description = 'Nombre'
    
    def get_duracion(self, obj):
        segundos = obj.duracion_actual_segundos
        return EstadoAgenteDetalle.formatear_tiempo(segundos)
    get_duracion.short_description = 'Duración Actual'


@admin.register(EstadoAgenteDetalle)
class EstadoAgenteDetalleAdmin(admin.ModelAdmin):
    list_display = ['id', 'get_agente_nombre', 'get_estado', 'fecha', 'tiempo', 'get_cambios_count']
    list_filter = ['fecha', 'estado']
    search_fields = ['agente__first_name', 'agente__last_name', 'agente__email', 'cambios']
    date_hierarchy = 'fecha'
    readonly_fields = ['get_cambios_formateados']
    
    def get_agente_nombre(self, obj):
        return obj.agente.full_name
    get_agente_nombre.short_description = 'Agente'
    
    def get_estado(self, obj):
        return obj.estado.valor
    get_estado.short_description = 'Estado'
    
    def get_cambios_count(self, obj):
        if not obj.cambios:
            return 0
        return len(obj.cambios.split(', '))
    get_cambios_count.short_description = '# Cambios'
    
    def get_cambios_formateados(self, obj):
        if not obj.cambios:
            return "Sin cambios"
        
        cambios_lista = obj.cambios.split(', ')
        html = "<ul>"
        for cambio in cambios_lista:
            html += f"<li>{cambio}</li>"
        html += "</ul>"
        
        return format_html(html)
    get_cambios_formateados.short_description = 'Historial de Cambios'
