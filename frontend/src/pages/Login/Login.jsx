// Path: frontend/src/pages/Login/Login.jsx 

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/core/context/AuthContext';
import './Login.css';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // errores por campo (sin mensaje general)
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const [loading, setLoading] = useState(false);
  const [isPasswordReset, setIsPasswordReset] = useState(false);

  const handlePasswordReset = () => setIsPasswordReset(true);
  const handleBackToLogin = () => setIsPasswordReset(false);

  
  const validateFront = () => {
    let ok = true;
    if (!email.trim()) { setEmailError("El usuario es obligatorio"); ok = false; } else setEmailError("");
    if (!password) { setPasswordError("La contraseña es obligatoria"); ok = false; } else setPasswordError("");
    return ok;
  };

 
  const mapBackendErrors = (status, data) => {
    let uErr = "", pErr = "";
    const textify = (v) => (Array.isArray(v) ? String(v[0] ?? "") : (v ? String(v) : "")).toLowerCase();

    const code = (data?.code || data?.error_code || "").toString().toUpperCase();
    const detail = textify(data?.detail);
    const nfe = textify(data?.non_field_errors);
    const uMsg = textify(data?.username ?? data?.user ?? data?.email);
    const pMsg = textify(data?.password);


    if (status === 404 || code === "USER_NOT_FOUND") {
      uErr = "Usuario inexistente";
    } else if (status === 401 || code === "WRONG_PASSWORD") {
      pErr = "Contraseña incorrecta";
    }

    if (!uErr && uMsg) {
      if (/(no existe|inexistente|not found|unknown|does not exist)/.test(uMsg)) uErr = "Usuario inexistente";
    }
    if (!pErr && pMsg) {
      if (/(incorrecta|incorrect|invalid|wrong)/.test(pMsg)) pErr = "Contraseña incorrecta";
    }

    const general = detail || nfe || textify(data?.message) || textify(data?.error);
    if (general) {
      if (!uErr && /(usuario|username|email|user|not\s+found|does\s+not\s+exist)/.test(general)) {
        uErr = "Usuario inexistente";
      } else if (!pErr && /(contraseñ|password|incorrect|invalid|wrong)/.test(general)) {
        pErr = "Contraseña incorrecta";
      }
    }

    
    if (!uErr && !pErr) {
      if (status === 404) uErr = "Usuario inexistente";
      else if (status === 401 || status === 400) pErr = "Contraseña incorrecta";
    }

    setEmailError(uErr);
    setPasswordError(pErr);
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    setEmailError("");
    setPasswordError("");

    if (!validateFront()) return;

    setLoading(true);
    try {
      await login(email, password); 
      navigate("/dashboard");
    } catch (err) {
      const status = err?.response?.status;
      const data = err?.response?.data || null;
      mapBackendErrors(status, data);
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
            {/* Usuario */}
            <div className="form-group">
              <label htmlFor="username">Usuario</label>
              <input
                type="text"
                id="username"
                placeholder="Ingresa tu usuario"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError("");
                }}
                onBlur={() => { if (!email.trim()) setEmailError("El usuario es obligatorio"); }}
                className={emailError ? "input has-error" : "input"}
                aria-invalid={!!emailError}
                aria-describedby={emailError ? "username-error" : undefined}
                autoComplete="username"
              />
              {emailError && <p id="username-error" className="field-error">{emailError}</p>}
            </div>

            {}
            <div className="form-group">
              <label htmlFor="password">Contraseña</label>
              <div className={`password-wrapper ${passwordError ? 'has-error' : ''}`}>
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  placeholder="Ingresa tu contraseña"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (passwordError) setPasswordError("");
                  }}
                  onBlur={() => { if (!password) setPasswordError("La contraseña es obligatoria"); }}
                  className={passwordError ? "input has-error" : "input"}
                  aria-invalid={!!passwordError}
                  aria-describedby={passwordError ? "password-error" : undefined}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                         aria-hidden="true">
                      <path d="M3 3l18 18" />
                      <path d="M10.58 10.58A2 2 0 0012 14a2 2 0 001.42-.58" />
                      <path d="M16.68 16.68C15.23 17.52 13.67 18 12 18c-5 0-9-4.5-10-6 0 0 1.6-2.34 4.28-4.03" />
                      <path d="M9.88 5.09C10.56 5.03 11.27 5 12 5c5 0 9 4.5 10 6 0 0-1.02 1.49-2.95 3.02" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                         aria-hidden="true">
                      <ellipse cx="12" cy="12" rx="9" ry="6" />
                      <circle cx="12" cy="12" r="2.5" />
                    </svg>
                  )}
                </button>
              </div>
              {passwordError && <p id="password-error" className="field-error">{passwordError}</p>}
            </div>

            {}
            <p className="forgot-password" onClick={handlePasswordReset}>
              ¿Olvidaste tu contraseña?
            </p>

            <button
              className="login-btn"
              onClick={handleLogin}
              disabled={loading}
            >
              {loading ? "Ingresando..." : "Ingresar"}
            </button>
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
