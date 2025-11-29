// Path: frontend/src/pages/Login/Login.jsx 

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/core/context/AuthContext';
import { useThemeMode } from '@/core/context/ThemeModeContext';
import { requestPasswordReset, validateResetToken, confirmPasswordReset } from '@/core/api/passwordReset';
import './Login.css';

const Login = () => {
  const { login } = useAuth();
  const { mode } = useThemeMode();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Estados del login
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Estados de recuperación de contraseña
  const [resetEmail, setResetEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Control de vistas: 'login' | 'request-reset' | 'confirm-reset'
  const [view, setView] = useState('login');
  
  // Token de recuperación desde URL
  const [resetToken, setResetToken] = useState(null);
  const [maskedEmail, setMaskedEmail] = useState("");

  // Errores por campo
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [resetEmailError, setResetEmailError] = useState("");
  const [newPasswordError, setNewPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");

  // Estados de carga y mensajes
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Detectar token en URL al montar
  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      validateToken(token);
    }
  }, [searchParams]);

  const validateToken = async (token) => {
    try {
      const response = await validateResetToken(token);
      if (response.valid) {
        setResetToken(token);
        setMaskedEmail(response.email || "");
        setView('confirm-reset');
      } else {
        alert(response.error || 'El enlace de recuperación es inválido o ha expirado');
        setView('login');
      }
    } catch (error) {
      alert('Error al validar el enlace de recuperación');
      setView('login');
    }
  };

  const handlePasswordReset = () => {
    setView('request-reset');
    setResetEmail("");
    setResetEmailError("");
    setSuccessMessage("");
  };

  const handleBackToLogin = () => {
    setView('login');
    setResetEmail("");
    setNewPassword("");
    setConfirmPassword("");
    setResetEmailError("");
    setNewPasswordError("");
    setConfirmPasswordError("");
    setSuccessMessage("");
  };

  const validateFront = () => {
    let ok = true;
    if (!email.trim()) { setEmailError("El correo es obligatorio"); ok = false; } else setEmailError("");
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
      uErr = "Correo inexistente";
    } else if (status === 401 || code === "WRONG_PASSWORD") {
      pErr = "Contraseña incorrecta";
    }

    if (!uErr && uMsg) {
      if (/(no existe|inexistente|not found|unknown|does not exist)/.test(uMsg)) uErr = "Correo inexistente";
    }
    if (!pErr && pMsg) {
      if (/(incorrecta|incorrect|invalid|wrong)/.test(pMsg)) pErr = "Contraseña incorrecta";
    }

    const general = detail || nfe || textify(data?.message) || textify(data?.error);
    if (general) {
      if (!uErr && /(usuario|username|email|user|not\s+found|does\s+not\s+exist)/.test(general)) {
        uErr = "Correo inexistente";
      } else if (!pErr && /(contraseñ|password|incorrect|invalid|wrong)/.test(general)) {
        pErr = "Contraseña incorrecta";
      }
    }

    if (!uErr && !pErr) {
      if (status === 404) uErr = "Correo inexistente";
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

  const handleRequestReset = async (e) => {
    e.preventDefault();
    
    setResetEmailError("");
    setSuccessMessage("");

    if (!resetEmail.trim()) {
      setResetEmailError("El correo electrónico es obligatorio");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(resetEmail)) {
      setResetEmailError("Ingrese un correo electrónico válido");
      return;
    }

    setLoading(true);
    try {
      const response = await requestPasswordReset(resetEmail);
      setSuccessMessage(response.message || "Se ha enviado un enlace de recuperación a tu correo electrónico");
      setResetEmail("");
      
      // En 5 segundos, volver al login
      setTimeout(() => {
        handleBackToLogin();
      }, 5000);
    } catch (error) {
      const data = error?.response?.data;
      if (data?.email) {
        setResetEmailError(Array.isArray(data.email) ? data.email[0] : data.email);
      } else {
        setResetEmailError(data?.error || "Error al solicitar recuperación de contraseña");
      }
    } finally {
      setLoading(false);
    }
  };

  const validatePasswordStrength = (pass) => {
    const errors = [];
    
    if (pass.length < 8) {
      errors.push("mínimo 8 caracteres");
    }
    if (pass.length > 16) {
      errors.push("máximo 16 caracteres");
    }
    if (!/\d/.test(pass)) {
      errors.push("al menos un número");
    }
    if (!/[a-zA-Z]/.test(pass)) {
      errors.push("al menos una letra");
    }
    if (!/[!@#$%^&*(),.?":{}|<>_\-+=]/.test(pass)) {
      errors.push("al menos un carácter especial");
    }

    return errors;
  };

  const handleConfirmReset = async (e) => {
    e.preventDefault();

    setNewPasswordError("");
    setConfirmPasswordError("");
    setSuccessMessage("");

    let hasError = false;

    if (!newPassword) {
      setNewPasswordError("La nueva contraseña es obligatoria");
      hasError = true;
    } else {
      const errors = validatePasswordStrength(newPassword);
      if (errors.length > 0) {
        setNewPasswordError(`La contraseña debe tener: ${errors.join(", ")}`);
        hasError = true;
      }
    }

    if (!confirmPassword) {
      setConfirmPasswordError("Debe confirmar la contraseña");
      hasError = true;
    } else if (newPassword !== confirmPassword) {
      setConfirmPasswordError("Las contraseñas no coinciden");
      hasError = true;
    }

    if (hasError) return;

    setLoading(true);
    try {
      const response = await confirmPasswordReset(resetToken, newPassword, confirmPassword);
      setSuccessMessage(response.message || "Contraseña actualizada con éxito");
      
      setNewPassword("");
      setConfirmPassword("");
      
      setTimeout(() => {
        handleBackToLogin();
      }, 2000);
    } catch (error) {
      const data = error?.response?.data;
      
      if (data?.new_password) {
        const errorMsg = Array.isArray(data.new_password) ? data.new_password.join(", ") : data.new_password;
        setNewPasswordError(errorMsg);
      }
      
      if (data?.confirm_password) {
        const errorMsg = Array.isArray(data.confirm_password) ? data.confirm_password[0] : data.confirm_password;
        setConfirmPasswordError(errorMsg);
      }
      
      if (data?.error) {
        alert(data.error);
      }
      
      if (data?.token) {
        alert(Array.isArray(data.token) ? data.token[0] : data.token);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`login-container ${view !== 'login' ? 'recover-mode' : ''} ${mode === 'dark' ? 'dark-mode' : ''}`}>
      <div className={`login-form sign-in ${view === 'login' ? 'active' : ''}`}>
        <h2>
          {view === 'login' && 'Iniciar sesión'}
          {view === 'request-reset' && 'Recuperar Contraseña'}
          {view === 'confirm-reset' && 'Nueva Contraseña'}
        </h2>

        {/* VISTA: LOGIN */}
        {view === 'login' && (
          <>
            <div className="form-group">
              <label htmlFor="username">Correo</label>
              <input
                type="text"
                id="username"
                placeholder="Ingresa tu correo"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError("");
                }}
                onBlur={() => { if (!email.trim()) setEmailError("El correo es obligatorio"); }}
                className={emailError ? "input has-error" : "input"}
                aria-invalid={!!emailError}
                aria-describedby={emailError ? "username-error" : undefined}
                autoComplete="username"
              />
              {emailError && <p id="username-error" className="field-error">{emailError}</p>}
            </div>

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
        )}

        {/* VISTA: SOLICITAR RECUPERACIÓN */}
        {view === 'request-reset' && (
          <>
            {successMessage ? (
              <div className="success-message-box">
                <p>✓ {successMessage}</p>
                <p className="success-subtext">
                  Revisa tu bandeja de entrada y sigue las instrucciones.
                </p>
              </div>
            ) : (
              <>
                <p className="reset-instructions">
                  Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
                </p>

                <div className="form-group">
                  <label htmlFor="reset-email">Correo Electrónico</label>
                  <input
                    type="email"
                    id="reset-email"
                    placeholder="ejemplo@correo.com"
                    value={resetEmail}
                    onChange={(e) => {
                      setResetEmail(e.target.value);
                      if (resetEmailError) setResetEmailError("");
                    }}
                    className={resetEmailError ? "input has-error" : "input"}
                    aria-invalid={!!resetEmailError}
                    autoComplete="email"
                  />
                  {resetEmailError && <p className="field-error">{resetEmailError}</p>}
                </div>

                <button
                  className="login-btn"
                  onClick={handleRequestReset}
                  disabled={loading}
                >
                  {loading ? "Enviando..." : "Enviar Enlace"}
                </button>
              </>
            )}

            <p className="back-to-login" onClick={handleBackToLogin}>
              ← Volver al inicio de sesión
            </p>
          </>
        )}

        {/* VISTA: CONFIRMAR NUEVA CONTRASEÑA */}
        {view === 'confirm-reset' && (
          <>
            {successMessage ? (
              <div className="success-message-box">
                <p>✓ {successMessage}</p>
                <p className="success-subtext">
                  Redirigiendo al inicio de sesión...
                </p>
              </div>
            ) : (
              <>
                {maskedEmail && (
                  <p className="reset-instructions">
                    Recuperando contraseña para: <strong>{maskedEmail}</strong>
                  </p>
                )}

                <div className="form-group">
                  <label htmlFor="new-password">Nueva Contraseña</label>
                  <div className={`password-wrapper ${newPasswordError ? 'has-error' : ''}`}>
                    <input
                      type={showNewPassword ? "text" : "password"}
                      id="new-password"
                      placeholder="Ingresa tu nueva contraseña"
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        if (newPasswordError) setNewPasswordError("");
                      }}
                      className={newPasswordError ? "input has-error" : "input"}
                      autoComplete="new-password"
                      title="8-16 caracteres, debe incluir números, letras y caracteres especiales"
                    />
                    <button
                      type="button"
                      className="toggle-password"
                      onClick={() => setShowNewPassword((s) => !s)}
                      aria-label={showNewPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    >
                      {showNewPassword ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 3l18 18" />
                          <path d="M10.58 10.58A2 2 0 0012 14a2 2 0 001.42-.58" />
                          <path d="M16.68 16.68C15.23 17.52 13.67 18 12 18c-5 0-9-4.5-10-6 0 0 1.6-2.34 4.28-4.03" />
                          <path d="M9.88 5.09C10.56 5.03 11.27 5 12 5c5 0 9 4.5 10 6 0 0-1.02 1.49-2.95 3.02" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <ellipse cx="12" cy="12" rx="9" ry="6" />
                          <circle cx="12" cy="12" r="2.5" />
                        </svg>
                      )}
                    </button>
                  </div>
                  {newPasswordError && <p className="field-error">{newPasswordError}</p>}
                  <p className="password-hint">
                    8-16 caracteres, debe incluir números, letras y caracteres especiales
                  </p>
                </div>

                <div className="form-group">
                  <label htmlFor="confirm-password">Confirmar Contraseña</label>
                  <div className={`password-wrapper ${confirmPasswordError ? 'has-error' : ''}`}>
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      id="confirm-password"
                      placeholder="Confirma tu nueva contraseña"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (confirmPasswordError) setConfirmPasswordError("");
                      }}
                      className={confirmPasswordError ? "input has-error" : "input"}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="toggle-password"
                      onClick={() => setShowConfirmPassword((s) => !s)}
                      aria-label={showConfirmPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    >
                      {showConfirmPassword ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 3l18 18" />
                          <path d="M10.58 10.58A2 2 0 0012 14a2 2 0 001.42-.58" />
                          <path d="M16.68 16.68C15.23 17.52 13.67 18 12 18c-5 0-9-4.5-10-6 0 0 1.6-2.34 4.28-4.03" />
                          <path d="M9.88 5.09C10.56 5.03 11.27 5 12 5c5 0 9 4.5 10 6 0 0-1.02 1.49-2.95 3.02" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <ellipse cx="12" cy="12" rx="9" ry="6" />
                          <circle cx="12" cy="12" r="2.5" />
                        </svg>
                      )}
                    </button>
                  </div>
                  {confirmPasswordError && <p className="field-error">{confirmPasswordError}</p>}
                </div>

                <button
                  className="login-btn"
                  onClick={handleConfirmReset}
                  disabled={loading}
                >
                  {loading ? "Guardando..." : "Cambiar Contraseña"}
                </button>

                <p className="back-to-login" onClick={handleBackToLogin}>
                  ← Cancelar
                </p>
              </>
            )}
          </>
        )}
      </div>

      <div className="welcome-section">
        <div className="semi-circle toggle-left">
          <h1>¿Problemas con tu contraseña?</h1>
          <p>
            'Te ayudaremos a recuperar tu contraseña de forma segura. Sigue las instrucciones para restablecerla.'
          </p>
        </div>

        <div className="semi-circle toggle-right">
          <h1>¡Bienvenido!</h1>
          <p>
            Accede a nuestro aplicativo CallCenter ingresando tus credenciales y disfruta de todas sus funcionalidades.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
