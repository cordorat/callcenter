from django.urls import path
from . import views

app_name = 'authn'

urlpatterns = [
    # Autenticación
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('refresh/', views.refresh_token_view, name='refresh'),
    
    # Recuperación de contraseña
    path('password-reset/request/', views.password_reset_request_view, name='password_reset_request'),
    path('password-reset/confirm/', views.password_reset_confirm_view, name='password_reset_confirm'),
    path('password-reset/validate-token/', views.validate_reset_token_view, name='validate_reset_token'),
]
