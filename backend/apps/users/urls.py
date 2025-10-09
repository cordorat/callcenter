from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = 'users'

router = DefaultRouter()
router.register(r'users', views.UserViewSet, basename='user')
router.register(r'parametros', views.TiposParametrosViewSet, basename='parametros')
router.register(r'estado', views.EstadoAgenteViewSet, basename='estado-agente')

urlpatterns = [
    path('', include(router.urls)),
]
