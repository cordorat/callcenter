from rest_framework.permissions import BasePermission
from common.estados_helper import get_estado

class IsAdmin(BasePermission):
    """
    Permiso personalizado para permitir solo a administradores.
    """
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.rol==get_estado('ROL_USUARIO', 'ADMIN')


class IsCoordinador(BasePermission):
    """
    Permiso personalizado para permitir solo a coordinadores.
    """
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.rol==get_estado('ROL_USUARIO', 'COORDINADOR')


class IsAdminOrCoordinador(BasePermission):
    """
    Permiso personalizado para permitir a administradores o coordinadores.
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        admin_role = get_estado('ROL_USUARIO', 'ADMIN')
        coordinador_role = get_estado('ROL_USUARIO', 'COORDINADOR')
        
        return request.user.rol in [admin_role, coordinador_role]


class IsAdminOrOwner(BasePermission):
    """
    Permiso personalizado para permitir a administradores o al propietario del recurso.
    """
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        # Los administradores pueden acceder a cualquier objeto
        if request.user.is_admin():
            return True
        # Los usuarios solo pueden acceder a su propio objeto
        return obj.id == request.user.id
    
class IsJefeCampana(BasePermission):
    """
    Permiso personalizado para permitir solo a Jefes de Campaña.
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        jefe_campana_role = get_estado('ROL_USUARIO', 'JEFE_CAMPANA')
        admin_role = get_estado('ROL_USUARIO', 'ADMIN')
        
        # Admin también tiene acceso
        return request.user.rol in [jefe_campana_role, admin_role]
