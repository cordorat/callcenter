//Path: frontend/src/pages/Login/Login.jsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/core/context/AuthContext';
import './Login.css';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isPasswordReset, setIsPasswordReset] = useState(false);

  const handlePasswordReset = () => {
    setIsPasswordReset(true);
  };

  const handleBackToLogin = () => {
    setIsPasswordReset(false);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate("/dashboard"); // redirige al Dashboard correspondiente
    } catch (err) {
      setError("Credenciales inválidas o error en el servidor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className={`login-form ${isPasswordReset ? 'shift-right' : ''}`}>
        <h2>Iniciar sesión</h2>
        {!isPasswordReset ? (
          <>
            <div className="form-group">
              <label htmlFor="username">Usuario</label>
              <input
                type="text"
                id="username"
                placeholder="Ingresa tu usuario"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">Contraseña</label>
              <input
                type="password"
                id="password"
                placeholder="Ingresa tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && <p className="error-message">{error}</p>}

            <button
              className="login-btn"
              onClick={handleLogin}
              disabled={loading}
            >
              {loading ? "Ingresando..." : "Ingresar"}
            </button>

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
          <p>
            Accede a nuestro aplicativo CallCenter ingresando tus credenciales
            y disfruta de todas sus funcionalidades.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
