from django.urls import path
from . import views
from .views import CargarBaseDatosView
app_name = 'campaigns'


urlpatterns = [
    path('cargar-base-datos/', CargarBaseDatosView.as_view(), name='cargar-base-datos'),
    path('subir-bd/', views.SubirBDTemplateView.as_view(), name='subir-bd'),
]
