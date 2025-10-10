from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .states.views_estado import TiposParametrosViewSet, EquipoViewSet, EstadoAgenteViewSet

app_name = 'users'

router = DefaultRouter()
router.register(r'', views.UserViewSet, basename='user')
router.register(r'parametros', TiposParametrosViewSet, basename='parametros')
router.register(r'equipos', EquipoViewSet, basename='equipos')
router.register(r'estado', EstadoAgenteViewSet, basename='estado')

urlpatterns = [
    path('', include(router.urls)),
]
