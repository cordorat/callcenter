from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    """
    Permiso personalizado para permitir solo a administradores.
    """
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.is_admin()


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
