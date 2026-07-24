import { Navigate } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext.jsx';

function ProtectedRoute({ children, requireAdmin = false }) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && !user?.isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default ProtectedRoute;
