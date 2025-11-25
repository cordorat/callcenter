from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ClienteViewSet,
    CampanaViewSet,
    LlamadaViewSet,
    FormularioVentaViewSet,
    VentaViewSet,
    ReporteLlamadaViewSet,
    HistorialJefeCampanaViewSet,
    ComisionViewSet
)

app_name = 'calls'

router = DefaultRouter()
router.register(r'clientes', ClienteViewSet, basename='cliente')
router.register(r'campanas', CampanaViewSet, basename='campana')
router.register(r'llamadas', LlamadaViewSet, basename='llamada')
router.register(r'formularios', FormularioVentaViewSet, basename='formulario')
router.register(r'ventas', VentaViewSet, basename='venta')
router.register(r'historial-jefecampana', HistorialJefeCampanaViewSet, basename='historial-jefecampana')
router.register(r'reportes', ReporteLlamadaViewSet, basename='reporte')
router.register(r'comisiones', ComisionViewSet, basename='comision')

urlpatterns = [
    path('', include(router.urls)),
]
