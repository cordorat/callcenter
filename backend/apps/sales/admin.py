from django.contrib import admin
from .models import Venta, Contrato


@admin.register(Venta)
class VentaAdmin(admin.ModelAdmin):
    list_display = ['id', 'campana', 'created_at']
    list_filter = ['campana', 'created_at']
    search_fields = ['campana__nombre']
    date_hierarchy = 'created_at'
    readonly_fields = ['created_at', 'updated_at']


@admin.register(Contrato)
class ContratoAdmin(admin.ModelAdmin):
    list_display = ['id', 'campana', 'created_at']
    list_filter = ['campana', 'created_at']
    search_fields = ['campana__nombre', 'contrato_texto']
    readonly_fields = ['created_at', 'updated_at']
