"""
Helper para obtener la URL pública de ngrok dinámicamente.
Útil para configurar webhooks de Twilio en desarrollo.
"""
import requests
import logging
from django.conf import settings
from functools import lru_cache
import time

logger = logging.getLogger(__name__)

# Cache de la URL de ngrok (se invalida cada 60 segundos)
_ngrok_url_cache = {
    'url': None,
    'timestamp': 0
}
CACHE_TTL = 60  # segundos


def get_ngrok_url() -> str:
    """
    Obtiene la URL pública de ngrok consultando su API local.
    
    En Docker, ngrok expone su API en el puerto 4040.
    La URL se cachea por 60 segundos para evitar llamadas excesivas.
    
    Returns:
        URL pública de ngrok (ej: https://abc123.ngrok.io)
        o SITE_URL del settings si ngrok no está disponible
    """
    global _ngrok_url_cache
    
    # Verificar cache
    current_time = time.time()
    if _ngrok_url_cache['url'] and (current_time - _ngrok_url_cache['timestamp']) < CACHE_TTL:
        return _ngrok_url_cache['url']
    
    # Intentar obtener URL de ngrok
    ngrok_api_urls = [
        'http://ngrok:4040/api/tunnels',  # Nombre del servicio en Docker
        'http://localhost:4040/api/tunnels',  # Fallback para desarrollo local
        'http://host.docker.internal:4040/api/tunnels',  # Fallback Windows/Mac
    ]
    
    for api_url in ngrok_api_urls:
        try:
            response = requests.get(api_url, timeout=2)
            if response.status_code == 200:
                data = response.json()
                tunnels = data.get('tunnels', [])
                
                # Buscar el túnel HTTPS
                for tunnel in tunnels:
                    if tunnel.get('proto') == 'https':
                        public_url = tunnel.get('public_url')
                        if public_url:
                            logger.info(f"✅ URL de ngrok obtenida: {public_url}")
                            _ngrok_url_cache['url'] = public_url
                            _ngrok_url_cache['timestamp'] = current_time
                            return public_url
                
                # Si no hay HTTPS, usar HTTP
                for tunnel in tunnels:
                    public_url = tunnel.get('public_url')
                    if public_url:
                        logger.info(f"✅ URL de ngrok obtenida (HTTP): {public_url}")
                        _ngrok_url_cache['url'] = public_url
                        _ngrok_url_cache['timestamp'] = current_time
                        return public_url
                        
        except requests.RequestException:
            continue
        except Exception as e:
            logger.debug(f"Error consultando ngrok en {api_url}: {e}")
            continue
    
    # Fallback a SITE_URL del settings
    site_url = getattr(settings, 'SITE_URL', 'http://localhost:8000')
    logger.warning(f"⚠️ ngrok no disponible, usando SITE_URL: {site_url}")
    return site_url


def get_webhook_url(path: str) -> str:
    """
    Construye una URL completa para un webhook.
    
    Args:
        path: Ruta del webhook (ej: '/webhooks/twilio/voice-request/')
    
    Returns:
        URL completa (ej: https://abc123.ngrok.io/webhooks/twilio/voice-request/)
    """
    base_url = get_ngrok_url().rstrip('/')
    path = path if path.startswith('/') else f'/{path}'
    return f"{base_url}{path}"


def clear_cache():
    """Limpia el cache de la URL de ngrok."""
    global _ngrok_url_cache
    _ngrok_url_cache = {'url': None, 'timestamp': 0}
