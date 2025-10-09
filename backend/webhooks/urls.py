"""
URLs para webhooks de Twilio.
"""
from django.urls import path
from apps.integrations import views

app_name = 'webhooks'

urlpatterns = [
    # Webhooks de Twilio para llamadas
    path('twilio/voice-request/', views.twilio_voice_request, name='twilio_voice_request'),
    path('twilio/incoming-call/', views.twilio_incoming_call, name='twilio_incoming_call'),
    path('twilio/call-status/<int:llamada_id>/', views.twilio_call_status_webhook, name='twilio_call_status_webhook'),
    path('twilio/call-status/', views.twilio_call_status_webhook, name='twilio_call_status_webhook_no_id'),
    path('twilio/recording/', views.twilio_recording_webhook, name='twilio_recording_webhook'),
]
