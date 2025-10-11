from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import KPIViewSet

app_name = 'kpi'

router = DefaultRouter()
router.register(r'', KPIViewSet, basename='kpis')

urlpatterns = [
    path('', include(router.urls)),
]
