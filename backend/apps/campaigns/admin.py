from django.contrib import admin
from .models import Centro, Campana, Producto, ProductoCampanaDetalle, BaseDatosCargada


@admin.register(Centro)
class CentroAdmin(admin.ModelAdmin):
    list_display = ['id', 'nombre', 'jefe_centro', 'direccion']
    search_fields = ['nombre', 'direccion']
    list_filter = ['jefe_centro']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(Campana)
class CampanaAdmin(admin.ModelAdmin):
    list_display = ['id', 'nombre', 'jefe_campana', 'centro', 'estado', 'fecha_inicio', 'fecha_fin']
    list_filter = ['estado', 'centro', 'fecha_inicio']
    search_fields = ['nombre', 'descripcion']
    date_hierarchy = 'fecha_inicio'
    readonly_fields = ['created_at', 'updated_at']


@admin.register(Producto)
class ProductoAdmin(admin.ModelAdmin):
    list_display = ['id', 'nombre', 'precio', 'activo']
    list_filter = ['activo']
    search_fields = ['nombre', 'descripcion']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(ProductoCampanaDetalle)
class ProductoCampanaDetalleAdmin(admin.ModelAdmin):
    list_display = ['id', 'producto', 'campana']
    list_filter = ['campana']
    search_fields = ['producto__nombre', 'campana__nombre']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(BaseDatosCargada)
class BaseDatosCargadaAdmin(admin.ModelAdmin):
    list_display = ['id', 'nombre_bd', 'campana', 'fecha_carga']
    list_filter = ['campana', 'fecha_carga']
    search_fields = ['nombre_bd']
    date_hierarchy = 'fecha_carga'
    readonly_fields = ['created_at', 'updated_at', 'fecha_carga']

