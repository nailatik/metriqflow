import { Outlet, Link, useNavigate } from "react-router-dom";
import Loader from "../components/Loader/Loader";
import ErrorModal from "../components/ErrorModal/ErrorModal";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { useEffect } from "react";
import { fetchMe, logout } from "../store/userSlice";
import { NavLink } from "react-router-dom";

const AppLayout = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (token) {
      dispatch(fetchMe());
    }
  }, [dispatch]);

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 rounded-lg transition ${
      isActive
        ? "bg-primary text-white"
        : "hover:bg-gray-100 text-textSecondary"
    }`;

  return (
    <div className="flex min-h-screen bg-bg">

      <aside className="w-64 border-r border-border flex flex-col justify-between p-6">

        <div>
          <h2 className="text-xl font-semibold mb-8">Metriq Flow</h2>

          <nav className="flex flex-col gap-2 text-sm">

          <nav className="flex flex-col gap-2 text-sm">

          <NavLink to="/app" end className={navClass}>
            Dashboard
          </NavLink>

          <NavLink to="/app/reports" className={navClass}>
            Reports
          </NavLink>

          <NavLink to="/app/integrations" className={navClass}>
            Integrations
          </NavLink>

          <NavLink to="/app/settings" className={navClass}>
            Settings
          </NavLink>

        </nav>

          </nav>
        </div>

        <div className="flex flex-col gap-2 text-sm">

          <button className="text-left px-3 py-2 rounded-lg hover:bg-gray-100 transition">
            Support
          </button>

          <button className="text-left px-3 py-2 rounded-lg hover:bg-gray-100 transition">
            EU
          </button>

          <button
            onClick={handleLogout}
            className="text-left px-3 py-2 rounded-lg text-red-500 hover:bg-red-50 transition"
          >
            Logout
          </button>

        </div>

      </aside>

      <main className="flex-1 p-8">
        <Outlet />
      </main>

      <Loader />
      <ErrorModal />

    </div>
  );
};

export default AppLayout;