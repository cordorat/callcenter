from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from django.core.mail import send_mail
from django.conf import settings
import logging

from apps.users.serializers import UserSerializer
from .serializers import (
    LoginSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer
)
from .models import PasswordResetToken

logger = logging.getLogger(__name__)


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """
    Endpoint para iniciar sesión y obtener tokens JWT.
    
    Body:
    {
        "email": "user@example.com",
        "password": "contraseña"
    }
    
    Response:
    {
        "user": {...},
        "tokens": {
            "access": "...",
            "refresh": "..."
        }
    }
    """
    serializer = LoginSerializer(data=request.data, context={'request': request})
    serializer.is_valid(raise_exception=True)
    
    user = serializer.validated_data['user']
    
    # Generar tokens JWT
    refresh = RefreshToken.for_user(user)
    
    return Response({
        'user': UserSerializer(user).data,
        'tokens': {
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        }
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """
    Endpoint para cerrar sesión (blacklist del refresh token).
    
    Body:
    {
        "refresh": "refresh_token_aquí"
    }
    """
    try:
        refresh_token = request.data.get("refresh")
        
        if not refresh_token:
            return Response(
                {"detail": "El refresh token es requerido."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        token = RefreshToken(refresh_token)
        token.blacklist()
        
        return Response(
            {"detail": "Sesión cerrada exitosamente."},
            status=status.HTTP_200_OK
        )
    except TokenError:
        return Response(
            {"detail": "Token inválido o expirado."},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def refresh_token_view(request):
    """
    Endpoint para refrescar el access token usando el refresh token.
    
    Body:
    {
        "refresh": "refresh_token_aquí"
    }
    
    Response:
    {
        "access": "nuevo_access_token"
    }
    """
    try:
        refresh_token = request.data.get("refresh")
        
        if not refresh_token:
            return Response(
                {"detail": "El refresh token es requerido."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        token = RefreshToken(refresh_token)
        
        return Response({
            'access': str(token.access_token),
        }, status=status.HTTP_200_OK)
    except TokenError:
        return Response(
            {"detail": "Token inválido o expirado."},
            status=status.HTTP_400_BAD_REQUEST
        )


def get_client_ip(request):
    """
    Obtiene la dirección IP del cliente desde el request.
    Toma en cuenta proxies (X-Forwarded-For).
    """
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_request_view(request):
    """
    Endpoint para solicitar recuperación de contraseña.
    
    Valida que el usuario exista por su email.
    Si es válido, genera un token de un solo uso y lo envía por email.
    
    Body:
    {
        "email": "user@example.com"
    }
    
    Response 200:
    {
        "message": "Se ha enviado un enlace de recuperación a tu correo electrónico",
        "token": "token_generado"  // Solo en desarrollo
    }
    
    Errores:
    - 400: Email no registrado o cuenta desactivada
    - 500: Error al enviar el email
    """
    serializer = PasswordResetRequestSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )
    
    user = serializer.validated_data['user']
    
    # Obtener IP del cliente
    ip_address = get_client_ip(request)
    
    # Generar token de recuperación
    reset_token = PasswordResetToken.generate_token(user, ip_address)
    
    # Construir URL de reseteo (frontend)
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
    reset_url = f"{frontend_url}/reset-password?token={reset_token.token}"
    
    # Construir mensaje de email
    subject = 'Recuperación de Contraseña - Call Center'
    
    # Versión texto plano (para clientes que no soportan HTML)
    message = f"""
Hola {user.full_name},

Recibimos una solicitud para restablecer tu contraseña.

Haz clic en el siguiente enlace para crear una nueva contraseña:
{reset_url}

Este enlace expira en 1 hora y solo puede usarse una vez.

Si no solicitaste este cambio, ignora este mensaje.

---
Equipo Call Center
    """.strip()
    
    # Versión HTML (estética y limpia)
    html_message = f"""
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px 0;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600; letter-spacing: -0.5px;">
                                Recuperación de Contraseña
                            </h1>
                        </td>
                    </tr>
                    
                    <!-- Body -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                                Hola <strong>{user.full_name}</strong>,
                            </p>
                            
                            <p style="margin: 0 0 30px; color: #666666; font-size: 15px; line-height: 1.6;">
                                Recibimos una solicitud para restablecer la contraseña de tu cuenta. Haz clic en el botón de abajo para crear una nueva contraseña.
                            </p>
                            
                            <!-- Button -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding: 10px 0 30px;">
                                        <a href="{reset_url}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);">
                                            Restablecer Contraseña
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Alternative link -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-radius: 6px; padding: 20px; margin-bottom: 30px;">
                                <tr>
                                    <td>
                                        <p style="margin: 0 0 10px; color: #666666; font-size: 13px;">
                                            Si el botón no funciona, copia y pega este enlace en tu navegador:
                                        </p>
                                        <p style="margin: 0; word-break: break-all;">
                                            <a href="{reset_url}" style="color: #667eea; text-decoration: none; font-size: 13px;">
                                                {reset_url}
                                            </a>
                                        </p>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Warning -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="border-left: 4px solid #ffc107; background-color: #fffbf0; padding: 15px; margin-bottom: 20px;">
                                <tr>
                                    <td>
                                        <p style="margin: 0; color: #856404; font-size: 13px; line-height: 1.5;">
                                            ⚠️ <strong>Importante:</strong> Este enlace expira en <strong>1 hora</strong> y solo puede usarse una vez.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin: 0; color: #999999; font-size: 13px; line-height: 1.6;">
                                Si no solicitaste este cambio, puedes ignorar este mensaje. Tu contraseña permanecerá sin cambios.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef;">
                            <p style="margin: 0 0 5px; color: #999999; font-size: 13px;">
                                Equipo Call Center
                            </p>
                            <p style="margin: 0; color: #cccccc; font-size: 12px;">
                                Este es un correo automático, por favor no responder.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    """.strip()
    
    # Intentar enviar el email
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False,
        )
        
        logger.info(f"Email de recuperación enviado a {user.email} (IP: {ip_address})")
        
        response_data = {
            'message': 'Se ha enviado un enlace de recuperación a tu correo electrónico'
        }
        
        # En desarrollo, incluir información adicional para testing
        if settings.DEBUG:
            response_data['token'] = reset_token.token
            response_data['debug_info'] = {
                'url': reset_url,
                'expires_in': '1 hora',
                'note': 'En desarrollo, el email se imprime en la consola del servidor. El debug_url es el enlace que recibiría el usuario en su correo.'
            }
        
        return Response(response_data, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error al enviar email de recuperación a {user.email}: {str(e)}")
        
        # En desarrollo, devolver el token aunque falle el email
        if settings.DEBUG:
            return Response({
                'message': 'Error al enviar email, pero aquí está el token de desarrollo',
                'token': reset_token.token,
                'debug_info': {
                    'url': reset_url,
                    'note': 'Token generado correctamente. El error al enviar el email es esperado en desarrollo.'
                },
                'error': str(e)
            }, status=status.HTTP_200_OK)
        
        return Response(
            {'error': 'Error al enviar el correo electrónico. Por favor, intenta nuevamente.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_confirm_view(request):
    """
    Endpoint para confirmar el reseteo de contraseña usando el token.
    
    Valida el token, verifica que las contraseñas cumplan requisitos
    y coincidan, luego actualiza la contraseña del usuario.
    
    Body:
    {
        "token": "token_recibido_por_email",
        "new_password": "Nueva123!",
        "confirm_password": "Nueva123!"
    }
    
    Response 200:
    {
        "message": "Contraseña actualizada con éxito"
    }
    
    Errores:
    - 400: Validaciones fallidas (token inválido, contraseñas no coinciden, etc.)
    """
    serializer = PasswordResetConfirmSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )
    
    token_value = serializer.validated_data['token']
    new_password = serializer.validated_data['new_password']
    
    # Buscar el token en la base de datos
    try:
        reset_token = PasswordResetToken.objects.get(token=token_value)
    except PasswordResetToken.DoesNotExist:
        return Response(
            {'error': 'Token inválido'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Verificar si el token es válido (no usado y no expirado)
    if not reset_token.is_valid():
        if reset_token.is_used:
            error_message = 'Este token ya fue utilizado'
        else:
            error_message = 'El token ha expirado'
        
        return Response(
            {'error': error_message},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Actualizar la contraseña del usuario
    user = reset_token.user
    user.set_password(new_password)
    user.save()
    
    # Marcar el token como usado
    reset_token.mark_as_used()
    
    logger.info(f"Contraseña actualizada exitosamente para usuario {user.email}")
    
    return Response(
        {'message': 'Contraseña actualizada con éxito'},
        status=status.HTTP_200_OK
    )


@api_view(['GET'])
@permission_classes([AllowAny])
def validate_reset_token_view(request):
    """
    Endpoint para validar si un token de recuperación es válido.
    Útil para verificar antes de mostrar el formulario de cambio de contraseña.
    
    Query params:
    ?token=token_a_validar
    
    Response 200:
    {
        "valid": true,
        "email": "u***@example.com"  // Email parcialmente oculto
    }
    
    Response 400:
    {
        "valid": false,
        "error": "Token inválido o expirado"
    }
    """
    token_value = request.query_params.get('token')
    
    if not token_value:
        return Response(
            {
                'valid': False,
                'error': 'Token no proporcionado'
            },
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        reset_token = PasswordResetToken.objects.get(token=token_value)
    except PasswordResetToken.DoesNotExist:
        return Response(
            {
                'valid': False,
                'error': 'Token inválido'
            },
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if not reset_token.is_valid():
        if reset_token.is_used:
            error_message = 'Este token ya fue utilizado'
        else:
            error_message = 'El token ha expirado'
        
        return Response(
            {
                'valid': False,
                'error': error_message
            },
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Ocultar parcialmente el email para privacidad
    email = reset_token.user.email
    email_parts = email.split('@')
    if len(email_parts[0]) > 3:
        masked_email = f"{email_parts[0][:2]}***@{email_parts[1]}"
    else:
        masked_email = f"{email_parts[0][0]}***@{email_parts[1]}"
    
    return Response(
        {
            'valid': True,
            'email': masked_email
        },
        status=status.HTTP_200_OK
    )
