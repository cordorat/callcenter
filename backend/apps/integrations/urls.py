"""
URLs para integración con Twilio.
"""
from django.urls import path
from . import views

app_name = 'integrations'

urlpatterns = [
    # Token de acceso para Twilio Client (WebRTC)
    path('twilio-client-token/', views.generate_twilio_client_token, name='twilio_client_token'),
]
