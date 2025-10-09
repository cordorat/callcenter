from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .states.views_estado import EquipoViewSet

app_name = 'users'

router = DefaultRouter()
router.register(r'usuarios', views.UserViewSet, basename='user')
router.register(r'equipos', EquipoViewSet, basename='equipos')
router.register(r'parametros', views.TiposParametrosViewSet, basename='parametros')
router.register(r'estado', views.EstadoAgenteViewSet, basename='estado-agente')

urlpatterns = [
    path('', include(router.urls)),
]
