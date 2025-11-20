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
    path('jefe-campana/equipos/', KPIViewSet.as_view({'get': 'equipos_campana_list'}), name='jefe-campana-equipos-list'),
    path('jefe-campana/equipos/<int:equipo_id>/detalle/', KPIViewSet.as_view({'get': 'equipo_detalle_kpis'}), name='jefe-campana-equipo-detalle'),
    path('jefe-campana/exportar-pdf/', KPIViewSet.as_view({'get': 'exportar_kpis_campana_pdf'}), name='jefe-campana-exportar-pdf'),
    path('jefe-centro/exportar-pdf/', KPIViewSet.as_view({'get': 'exportar_kpis_centro_pdf'}), name='jefe-centro-exportar-pdf'),
]