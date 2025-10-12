from django.contrib import admin
from .models import Cliente, Llamada, IteracionCliente, FormularioLlamada


@admin.register(Cliente)
class ClienteAdmin(admin.ModelAdmin):
    list_display = ['cliente_id', 'nombre', 'telefono', 'campana', 'base_datos']
    list_filter = ['campana', 'base_datos']
    search_fields = ['nombre', 'telefono']
    

@admin.register(Llamada)
class LlamadaAdmin(admin.ModelAdmin):
    list_display = ['id', 'agente', 'cliente', 'venta', 'estado_llamada', 'duracion', 'fecha_hora_inicio']
    list_filter = ['estado_llamada', 'estado_venta', 'estado_reportada', 'fecha_hora_inicio']
    search_fields = ['telefono_origen', 'telefono_destino', 'twilio_call_sid']
    date_hierarchy = 'fecha_hora_inicio'
    readonly_fields = ['created_at', 'updated_at', 'duracion']


@admin.register(IteracionCliente)
class IteracionClienteAdmin(admin.ModelAdmin):
    list_display = ['id', 'campana', 'cliente', 'estado_iteracion', 'intento', 'created_at']
    list_filter = ['campana', 'estado_iteracion', 'intento']
    search_fields = ['cliente__nombre']
    date_hierarchy = 'created_at'
    readonly_fields = ['created_at', 'updated_at']


@admin.register(FormularioLlamada)
class FormularioLlamadaAdmin(admin.ModelAdmin):
    list_display = ['id', 'llamada', 'agente', 'completado', 'fecha_completado']
    list_filter = ['completado', 'fecha_completado']
    search_fields = ['llamada__id', 'agente__email']
    readonly_fields = ['created_at', 'updated_at']

