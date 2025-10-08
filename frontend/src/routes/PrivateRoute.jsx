import { Navigate } from 'react-router-dom';
import { useAuth } from '@/core/context/AuthContext';

/**
 * Componente para proteger rutas que requieren autenticación
 * Si el usuario no está autenticado, redirige a /login
 */
const PrivateRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default PrivateRoute;
