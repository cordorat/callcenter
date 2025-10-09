"""
Tests para el validador de contraseñas personalizado.
"""
from django.test import TestCase
from django.core.exceptions import ValidationError
from apps.users.validators import CustomPasswordValidator


class CustomPasswordValidatorTest(TestCase):
    """Tests para CustomPasswordValidator."""
    
    def setUp(self):
        """Configuración inicial de los tests."""
        self.validator = CustomPasswordValidator()
    
    # ========== Tests de Contraseñas VÁLIDAS ==========
    
    def test_valid_password_minimal(self):
        """Contraseña válida con longitud mínima (8 caracteres)."""
        valid_passwords = [
            "Pass123!",      # 8 caracteres exactos
            "Abc1234!",      # Letras + números + especial
            "Test@123",      # Con @ como especial
        ]
        
        for password in valid_passwords:
            with self.subTest(password=password):
                try:
                    self.validator.validate(password)
                except ValidationError:
                    self.fail(f"'{password}' debería ser válida pero fue rechazada")
    
    def test_valid_password_maximal(self):
        """Contraseña válida con longitud máxima (16 caracteres)."""
        valid_passwords = [
            "Password1234567!",   # 16 caracteres exactos
            "LongPass123456!",    # Con mayúsculas
            "Test@1234567890",    # Números múltiples
        ]
        
        for password in valid_passwords:
            with self.subTest(password=password):
                try:
                    self.validator.validate(password)
                except ValidationError:
                    self.fail(f"'{password}' debería ser válida pero fue rechazada")
    
    def test_valid_password_all_special_chars(self):
        """Contraseñas válidas con diferentes caracteres especiales."""
        special_chars = "!@#$%^&*(),.?\":{}|<>_-+="
        
        for char in special_chars:
            password = f"Pass123{char}"
            with self.subTest(password=password, special_char=char):
                try:
                    self.validator.validate(password)
                except ValidationError:
                    self.fail(f"'{password}' con carácter especial '{char}' debería ser válida")
    
    def test_valid_password_mixed_case(self):
        """Contraseñas válidas con mayúsculas y minúsculas."""
        valid_passwords = [
            "PaSsWoRd123!",
            "MyTest@123",
            "UPPER123!lower",
        ]
        
        for password in valid_passwords:
            with self.subTest(password=password):
                try:
                    self.validator.validate(password)
                except ValidationError:
                    self.fail(f"'{password}' debería ser válida")
    
    # ========== Tests de Contraseñas INVÁLIDAS ==========
    
    def test_password_too_short(self):
        """Rechaza contraseñas menores a 8 caracteres."""
        invalid_passwords = [
            "Pass1!",       # 6 caracteres
            "Abc12!",       # 6 caracteres
            "Test@1",       # 6 caracteres
            "",             # Vacía
            "Ab1!",         # 4 caracteres
        ]
        
        for password in invalid_passwords:
            with self.subTest(password=password):
                with self.assertRaises(ValidationError) as context:
                    self.validator.validate(password)
                
                errors = context.exception.error_list
                error_codes = [e.code for e in errors]
                self.assertIn('password_too_short', error_codes,
                            f"'{password}' debería ser rechazada por ser muy corta")
    
    def test_password_too_long(self):
        """Rechaza contraseñas mayores a 16 caracteres."""
        invalid_passwords = [
            "Password12345678!",    # 17 caracteres
            "VeryLongPassword123!",  # 21 caracteres
            "ThisIsWayTooLongForOurSystem123!",  # 33 caracteres
        ]
        
        for password in invalid_passwords:
            with self.subTest(password=password):
                with self.assertRaises(ValidationError) as context:
                    self.validator.validate(password)
                
                errors = context.exception.error_list
                error_codes = [e.code for e in errors]
                self.assertIn('password_too_long', error_codes,
                            f"'{password}' debería ser rechazada por ser muy larga")
    
    def test_password_no_number(self):
        """Rechaza contraseñas sin números."""
        invalid_passwords = [
            "Password!",
            "Test@Word",
            "OnlyLetters!",
            "abcdefgh!",
            "UPPERCASE!",
        ]
        
        for password in invalid_passwords:
            with self.subTest(password=password):
                with self.assertRaises(ValidationError) as context:
                    self.validator.validate(password)
                
                errors = context.exception.error_list
                error_codes = [e.code for e in errors]
                self.assertIn('password_no_number', error_codes,
                            f"'{password}' debería ser rechazada por no tener números")
    
    def test_password_no_letter(self):
        """Rechaza contraseñas sin letras."""
        invalid_passwords = [
            "12345678!",
            "9876543!@",
            "123!@#456",
            "000000!1",
        ]
        
        for password in invalid_passwords:
            with self.subTest(password=password):
                with self.assertRaises(ValidationError) as context:
                    self.validator.validate(password)
                
                errors = context.exception.error_list
                error_codes = [e.code for e in errors]
                self.assertIn('password_no_letter', error_codes,
                            f"'{password}' debería ser rechazada por no tener letras")
    
    def test_password_no_special_char(self):
        """Rechaza contraseñas sin caracteres especiales."""
        invalid_passwords = [
            "Password123",
            "Test1234",
            "Abcdefgh1",
            "MyPass123",
            "Secure0000",
        ]
        
        for password in invalid_passwords:
            with self.subTest(password=password):
                with self.assertRaises(ValidationError) as context:
                    self.validator.validate(password)
                
                errors = context.exception.error_list
                error_codes = [e.code for e in errors]
                self.assertIn('password_no_special', error_codes,
                            f"'{password}' debería ser rechazada por no tener caracteres especiales")
    
    def test_password_multiple_errors(self):
        """Contraseña que viola múltiples reglas."""
        # Contraseña sin números, sin especiales y muy corta
        password = "Pass"
        
        with self.assertRaises(ValidationError) as context:
            self.validator.validate(password)
        
        errors = context.exception.error_list
        error_codes = [e.code for e in errors]
        
        # Debe tener al menos estos 3 errores
        self.assertIn('password_too_short', error_codes)
        self.assertIn('password_no_number', error_codes)
        self.assertIn('password_no_special', error_codes)
    
    def test_password_only_numbers(self):
        """Contraseña solo con números."""
        password = "12345678"
        
        with self.assertRaises(ValidationError) as context:
            self.validator.validate(password)
        
        errors = context.exception.error_list
        error_codes = [e.code for e in errors]
        
        # Debe faltar letras y caracteres especiales
        self.assertIn('password_no_letter', error_codes)
        self.assertIn('password_no_special', error_codes)
    
    def test_password_only_letters(self):
        """Contraseña solo con letras."""
        password = "abcdefgh"
        
        with self.assertRaises(ValidationError) as context:
            self.validator.validate(password)
        
        errors = context.exception.error_list
        error_codes = [e.code for e in errors]
        
        # Debe faltar números y caracteres especiales
        self.assertIn('password_no_number', error_codes)
        self.assertIn('password_no_special', error_codes)
    
    # ========== Tests de Help Text ==========
    
    def test_get_help_text(self):
        """Verifica que el texto de ayuda esté presente."""
        help_text = self.validator.get_help_text()
        
        self.assertIsNotNone(help_text)
        self.assertIsInstance(help_text, str)
        self.assertIn("8", help_text)  # Menciona longitud mínima
        self.assertIn("16", help_text)  # Menciona longitud máxima
    
    # ========== Tests de Casos Edge ==========
    
    def test_password_with_spaces(self):
        """Contraseña con espacios (debería ser válida si cumple otros requisitos)."""
        password = "Pass 123!"
        
        try:
            self.validator.validate(password)
        except ValidationError:
            self.fail(f"'{password}' con espacios debería ser válida")
    
    def test_password_with_unicode(self):
        """Contraseña con caracteres unicode."""
        password = "Passñ123!"
        
        try:
            self.validator.validate(password)
        except ValidationError:
            self.fail(f"'{password}' con unicode debería ser válida")
    
    def test_password_boundary_length_8(self):
        """Test de límite inferior exacto (8 caracteres)."""
        password = "Pass123!"  # Exactamente 8 caracteres
        
        try:
            self.validator.validate(password)
        except ValidationError:
            self.fail(f"'{password}' con 8 caracteres exactos debería ser válida")
    
    def test_password_boundary_length_16(self):
        """Test de límite superior exacto (16 caracteres)."""
        password = "Password1234567!"  # Exactamente 16 caracteres
        
        try:
            self.validator.validate(password)
        except ValidationError:
            self.fail(f"'{password}' con 16 caracteres exactos debería ser válida")
    
    def test_password_boundary_length_7(self):
        """Test justo debajo del límite inferior (7 caracteres)."""
        password = "Pass12!"  # 7 caracteres
        
        with self.assertRaises(ValidationError) as context:
            self.validator.validate(password)
        
        errors = context.exception.error_list
        error_codes = [e.code for e in errors]
        self.assertIn('password_too_short', error_codes)
    
    def test_password_boundary_length_17(self):
        """Test justo encima del límite superior (17 caracteres)."""
        password = "Password12345678!"  # 17 caracteres
        
        with self.assertRaises(ValidationError) as context:
            self.validator.validate(password)
        
        errors = context.exception.error_list
        error_codes = [e.code for e in errors]
        self.assertIn('password_too_long', error_codes)


class PasswordValidationIntegrationTest(TestCase):
    """Tests de integración con el sistema de usuarios."""
    
    def test_create_user_with_valid_password(self):
        """Crear usuario con contraseña válida."""
        from apps.users.models import User
        
        user = User.objects.create_user(
            email='test@example.com',
            password='ValidPass123!',
            first_name='Test',
            last_name='User'
        )
        
        self.assertIsNotNone(user)
        self.assertTrue(user.check_password('ValidPass123!'))
    
    def test_create_user_with_invalid_password_too_short(self):
        """Intentar crear usuario con contraseña muy corta."""
        from apps.users.serializers import UserCreateSerializer
        from django.core.exceptions import ValidationError
        
        # Usar el serializer que sí ejecuta validaciones
        serializer = UserCreateSerializer(data={
            'email': 'test2@example.com',
            'first_name': 'Test',
            'last_name': 'User',
            'password': 'Pass1!',  # Solo 6 caracteres
            'password_confirm': 'Pass1!',
            'role': 'AGENT'
        })
        
        self.assertFalse(serializer.is_valid())
        self.assertIn('password', serializer.errors)
    
    def test_create_user_with_invalid_password_no_special(self):
        """Intentar crear usuario con contraseña sin caracteres especiales."""
        from apps.users.serializers import UserCreateSerializer
        
        # Usar el serializer que sí ejecuta validaciones
        serializer = UserCreateSerializer(data={
            'email': 'test3@example.com',
            'first_name': 'Test',
            'last_name': 'User',
            'password': 'Password123',  # Sin caracteres especiales
            'password_confirm': 'Password123',
            'role': 'AGENT'
        })
        
        self.assertFalse(serializer.is_valid())
        self.assertIn('password', serializer.errors)
