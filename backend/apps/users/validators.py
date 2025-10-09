"""
Validadores personalizados para el modelo de usuario.
"""
import re
from django.core.exceptions import ValidationError
from django.utils.translation import gettext as _


class CustomPasswordValidator:
    """
    Validador de contraseña personalizado que cumple con los requisitos:
    - Mínimo 8 caracteres
    - Máximo 16 caracteres
    - Al menos 1 número
    - Al menos 1 letra (mayúscula o minúscula)
    - Al menos 1 carácter especial (!@#$%^&*(),.?":{}|<>_-+=)
    
    Este validador se alinea con los criterios de aceptación de la HU de login.
    """
    
    # Caracteres especiales permitidos
    SPECIAL_CHARACTERS = r'[!@#$%^&*(),.?":{}|<>_\-+=]'
    
    def validate(self, password, user=None):
        """
        Valida que la contraseña cumpla con todos los requisitos.
        
        Args:
            password (str): Contraseña a validar
            user (User): Usuario asociado (opcional)
            
        Raises:
            ValidationError: Si la contraseña no cumple algún requisito
        """
        errors = []
        
        # Validar longitud mínima
        if len(password) < 8:
            errors.append(
                ValidationError(
                    _("La contraseña debe tener al menos 8 caracteres."),
                    code='password_too_short',
                )
            )
        
        # Validar longitud máxima
        if len(password) > 16:
            errors.append(
                ValidationError(
                    _("La contraseña no puede exceder 16 caracteres."),
                    code='password_too_long',
                )
            )
        
        # Validar que contenga al menos un número
        if not re.search(r'\d', password):
            errors.append(
                ValidationError(
                    _("La contraseña debe contener al menos un número (0-9)."),
                    code='password_no_number',
                )
            )
        
        # Validar que contenga al menos una letra
        if not re.search(r'[a-zA-Z]', password):
            errors.append(
                ValidationError(
                    _("La contraseña debe contener al menos una letra (a-z, A-Z)."),
                    code='password_no_letter',
                )
            )
        
        # Validar que contenga al menos un carácter especial
        if not re.search(self.SPECIAL_CHARACTERS, password):
            errors.append(
                ValidationError(
                    _("La contraseña debe contener al menos un carácter especial (!@#$%^&*(),.?\":{}|<>_-+=)."),
                    code='password_no_special',
                )
            )
        
        # Lanzar todos los errores juntos
        if errors:
            raise ValidationError(errors)
    
    def get_help_text(self):
        """
        Retorna el texto de ayuda que describe los requisitos de la contraseña.
        Este texto se puede mostrar en formularios y documentación.
        """
        return _(
            "La contraseña debe tener entre 8 y 16 caracteres e incluir "
            "al menos un número, una letra y un carácter especial (!@#$%^&*(),.?\":{}|<>_-+=)."
        )


class EmailDomainValidator:
    """
    Validador opcional que puede restringir dominios de email permitidos.
    Útil si solo quieres permitir emails corporativos.
    """
    
    def __init__(self, allowed_domains=None):
        """
        Args:
            allowed_domains (list): Lista de dominios permitidos. 
                                Ej: ['callcenter.com', 'empresa.com']
                                Si es None, permite todos los dominios.
        """
        self.allowed_domains = allowed_domains or []
    
    def __call__(self, email):
        """
        Valida que el email pertenezca a uno de los dominios permitidos.
        
        Args:
            email (str): Email a validar
            
        Raises:
            ValidationError: Si el dominio no está permitido
        """
        if not self.allowed_domains:
            return  # Sin restricciones
        
        if '@' not in email:
            raise ValidationError(
                _("Email inválido: debe contener @"),
                code='invalid_email',
            )
        
        domain = email.split('@')[1].lower()
        
        if domain not in self.allowed_domains:
            raise ValidationError(
                _(f"Solo se permiten emails de los dominios: {', '.join(self.allowed_domains)}"),
                code='invalid_domain',
            )
