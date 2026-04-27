import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '../app/hooks';

const AuthWrapper = ({ children }: { children: React.ReactNode }) => {
  const { token } = useAppSelector((state) => state.user);
  const location = useLocation();

  const isAppRoute = location.pathname.startsWith('/app');

  if (!token && isAppRoute) {
    return <Navigate to="/login" replace />;
  }

  if (token && location.pathname === '/login') {
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
};

export default AuthWrapper;