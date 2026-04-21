import { Navigate, Outlet } from "react-router-dom";
import { useAppSelector } from "../app/hooks";

const AuthWrapper = () => {
  const isAuth = useAppSelector((s) => s.user.isAuth);

  if (!isAuth) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default AuthWrapper;