from django.urls import path
from . import views

app_name = 'authn'

urlpatterns = [
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('refresh/', views.refresh_token_view, name='refresh'),
]
