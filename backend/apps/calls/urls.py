from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ClienteViewSet,
    CampanaViewSet,
    LlamadaViewSet,
    FormularioVentaViewSet
)

app_name = 'calls'

router = DefaultRouter()
router.register(r'clientes', ClienteViewSet, basename='cliente')
router.register(r'campanas', CampanaViewSet, basename='campana')
router.register(r'llamadas', LlamadaViewSet, basename='llamada')
router.register(r'formularios', FormularioVentaViewSet, basename='formulario')

urlpatterns = [
    path('', include(router.urls)),
]
