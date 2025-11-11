from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import KPIViewSet

app_name = 'kpi'

router = DefaultRouter()
router.register(r'', KPIViewSet, basename='kpis')

# URLs personalizadas para endpoints específicos
urlpatterns = [
    path('', include(router.urls)),
    # Endpoint adicional: GET /api/kpis/agentes/
    path('agentes/', KPIViewSet.as_view({'get': 'agentes_list'}), name='agentes-list'),
    # Endpoint adicional: GET /api/kpis/agentes/<documento_id>/detalle/
    path('agentes/<str:documento_id>/detalle/', KPIViewSet.as_view({'get': 'agente_detalle'}), name='agente-detalle'),
    # Endpoint adicional: GET /api/kpis/equipo/overview/
    path('equipo/overview/', KPIViewSet.as_view({'get': 'equipo_overview'}), name='equipo-overview'),
    path('coordinador/overview/', KPIViewSet.as_view({'get': 'coordinador_overview'}), name='coordinador-overview'),
]
