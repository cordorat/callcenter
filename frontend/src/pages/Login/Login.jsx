import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // Importar useNavigate
import './Login.css';

const Login = () => {
  const [isPasswordReset, setIsPasswordReset] = useState(false);
  const navigate = useNavigate(); // Inicializar navigate

  const handlePasswordReset = () => {
    setIsPasswordReset(true);
  };

  const handleBackToLogin = () => {
    setIsPasswordReset(false);
  };

  const handleLogin = (e) => {
    e.preventDefault();
    // Aquí iría tu lógica de autenticación
    // ...
    // Si el login es exitoso, redirige al dashboard
    navigate('/dashboard');
  };

  return (
    <div className="login-container">
      <div className={`login-form ${isPasswordReset ? 'shift-right' : ''}`}>
        <h2>Iniciar sesión</h2>
        {!isPasswordReset ? (
          <>
            <div className="form-group">
              <label htmlFor="username">Usuario</label>
              <input type="text" id="username" placeholder="Ingresa tu usuario" />
            </div>
            <div className="form-group">
              <label htmlFor="password">Contraseña</label>
              <input type="password" id="password" placeholder="Ingresa tu contraseña" />
            </div>
            <button className="login-btn" onClick={handleLogin}>Ingresar</button>
            <p className="forgot-password" onClick={handlePasswordReset}>
              ¿Olvidaste tu contraseña?
            </p>
          </>
        ) : (
          <div className="password-reset">
            <p className="back-to-login" onClick={handleBackToLogin}>
              Volver al inicio de sesión
            </p>
          </div>
        )}
      </div>
      
      <div className={`welcome-section ${isPasswordReset ? 'shift-left' : ''}`}>
        <div className="semi-circle">
          <h1>¡Bienvenido!</h1>
          <p>Accede a nuestro aplicativo CallCenter ingresando tus credenciales y disfruta de todas sus funcionalidades.</p>
        </div>
      </div>
    </div>
  );
};

export default Login;