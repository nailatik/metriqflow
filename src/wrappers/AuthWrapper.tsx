import { Navigate, Outlet } from "react-router-dom";
import { useAppSelector, useAppDispatch } from "../app/hooks";
import { useEffect } from "react";
import { fetchMe } from "../store/userSlice";

const AuthWrapper = () => {
  const dispatch = useAppDispatch();
  const isAuth = useAppSelector((state) => state.user.isAuth);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (token && !isAuth) {
      dispatch(fetchMe());
    }
  }, [dispatch, isAuth]);

  if (!isAuth) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default AuthWrapper;