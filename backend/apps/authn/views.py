from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError

from apps.users.serializers import UserSerializer
from .serializers import LoginSerializer


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
