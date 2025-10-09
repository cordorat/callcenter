from django.urls import path
from . import views
from .views import CargarBaseDatosView
app_name = 'campaigns'


urlpatterns = [
    path('cargar-base-datos/', CargarBaseDatosView.as_view(), name='cargar-base-datos'),
    path('listar-bases-datos/', views.listar_bases_datos, name='listar-bases-datos'),
    path('base-datos/<int:pk>/', views.detalle_base_datos, name='detalle-base-datos'),
    path('cargar-bd-registros/<int:pk>/', views.cargar_bd_registros, name='cargar-bd-registros'),
]
