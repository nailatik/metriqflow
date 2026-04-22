// wrappers/AuthWrapper.tsx
import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '../app/hooks';

const AuthWrapper = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAppSelector((state) => state.user.isAuth);
  const location = useLocation();

  const isAppRoute = location.pathname.startsWith('/app');

  if (!isAuthenticated && isAppRoute) {
    return <Navigate to="/login" replace />;
  }

  if (isAuthenticated && (location.pathname === '/login' || location.pathname === '/register')) {
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
};

export default AuthWrapper;