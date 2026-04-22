import { Outlet } from "react-router-dom";
import Loader from "../components/Loader/Loader";
import ErrorModal from "../components/ErrorModal/ErrorModal";
import Sidebar from "../components/Sidebar/Sidebar";
import { useAppDispatch } from "../app/hooks";
import { useEffect } from "react";
import { fetchMe } from "../store/userSlice";

const AppLayout = () => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (token) {
      dispatch(fetchMe());
    }
  }, [dispatch]);

  return (
    <div className="flex min-h-screen bg-bg">

      <Sidebar />

      <main className="flex-1 p-8">
        <Outlet />
      </main>

      <ErrorModal />
    </div>
  );
};

export default AppLayout;