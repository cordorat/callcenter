from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from apps.users.states import views_estado

app_name = 'users'

router = DefaultRouter()
# IMPORTANTE: Registrar rutas específicas ANTES de la raíz para evitar conflictos
router.register(r'parametros', views_estado.TiposParametrosViewSet, basename='parametros')
router.register(r'estados', views_estado.EstadoAgenteViewSet, basename='estado')
#router.register(r'equipos', views_estado.EquipoViewSet, basename='equipos')
router.register(r'', views.UserViewSet, basename='user')  # Cambiado de raíz a 'agents'

urlpatterns = [
    path('', include(router.urls)),
]
