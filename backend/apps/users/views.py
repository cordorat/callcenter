from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model

from .models import User
from .serializers import (
    UserSerializer,
    UserCreateSerializer,
    UserUpdateSerializer,
    ChangePasswordSerializer
)
from .permissions import IsAdmin, IsAdminOrOwner

User = get_user_model()


class UserViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar usuarios.
    
    - Los administradores pueden ver, crear, actualizar y eliminar cualquier usuario
    - Los agentes solo pueden ver su propia información y actualizarla
    """
    queryset = User.objects.all()
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        """Devuelve el serializador apropiado según la acción."""
        if self.action == 'create':
            return UserCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return UserUpdateSerializer
        elif self.action == 'change_password':
            return ChangePasswordSerializer
        return UserSerializer
    
    def get_permissions(self):
        """Define permisos según la acción."""
        if self.action in ['create', 'destroy']:
            # Solo administradores pueden crear y eliminar usuarios
            permission_classes = [IsAdmin]
        elif self.action in ['update', 'partial_update', 'retrieve']:
            # Administradores o el propio usuario
            permission_classes = [IsAdminOrOwner]
        else:
            # Por defecto, usuarios autenticados
            permission_classes = [IsAuthenticated]
        
        return [permission() for permission in permission_classes]
    
    def get_queryset(self):
        """
        Los administradores ven todos los usuarios.
        Los agentes solo ven su propia información.
        """
        user = self.request.user
        if user.is_admin():
            return User.objects.all()
        return User.objects.filter(id=user.id)
    
    def create(self, request, *args, **kwargs):
        """Crea un nuevo usuario (solo administradores)."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        return Response(
            UserSerializer(user).data,
            status=status.HTTP_201_CREATED
        )
    
    def destroy(self, request, *args, **kwargs):
        """
        Desactiva un usuario en lugar de eliminarlo.
        Solo administradores pueden hacer esto.
        """
        instance = self.get_object()
        
        # No permitir que un usuario se elimine a sí mismo
        if instance.id == request.user.id:
            return Response(
                {"detail": "No puedes desactivarte a ti mismo."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        instance.is_active = False
        instance.save()
        
        return Response(
            {"detail": "Usuario desactivado exitosamente."},
            status=status.HTTP_200_OK
        )
    
    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """
        Activa un usuario desactivado.
        Solo administradores pueden hacer esto.
        """
        user = self.get_object()
        
        if user.is_active:
            return Response(
                {"detail": "El usuario ya está activo."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user.is_active = True
        user.save()
        
        return Response(
            {"detail": "Usuario activado exitosamente."},
            status=status.HTTP_200_OK
        )
    
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def change_password(self, request):
        """
        Permite a cualquier usuario cambiar su propia contraseña.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        
        return Response(
            {"detail": "Contraseña cambiada exitosamente."},
            status=status.HTTP_200_OK
        )
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def me(self, request):
        """
        Devuelve la información del usuario autenticado.
        """
        serializer = UserSerializer(request.user)
        return Response(serializer.data)
