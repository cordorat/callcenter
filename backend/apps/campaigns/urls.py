from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .views import CargarBaseDatosView, ClienteViewSet, EquipoViewSet

app_name = 'campaigns'

# Router para ViewSets
router = DefaultRouter()
router.register(r'clientes', ClienteViewSet, basename='cliente')
router.register(r'equipos', EquipoViewSet, basename='equipo')
router.register(r'productos', views.ProductoViewSet, basename='producto')
router.register(r'', views.CampanaViewSet, basename='campana')
urlpatterns = [
    # Endpoints existentes de bases de datos
    path('cargar-base-datos/', CargarBaseDatosView.as_view(), name='cargar-base-datos'),
    path('listar-bases-datos/', views.listar_bases_datos, name='listar-bases-datos'),
    path('base-datos/<int:pk>/', views.detalle_base_datos, name='detalle-base-datos'),
    path('cargar-bd-registros/<int:pk>/', views.cargar_bd_registros, name='cargar-bd-registros'),
    
    # Endpoint para iteración de bases de datos
    path('base-datos/<int:pk>/programar-iteracion/', views.programar_iteracion_bd, name='programar-iteracion-bd'),
    
    # Endpoint para eliminar bases de datos
    path('base-datos/<int:pk>/eliminar/', views.eliminar_base_datos, name='eliminar-base-datos'),
    
    # Incluir rutas del router
    path('', include(router.urls)),
]
