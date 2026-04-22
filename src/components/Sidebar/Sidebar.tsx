import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAppDispatch } from "../../app/hooks";
import { logout } from "../../store/userSlice";

const Sidebar = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

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
    <aside className="w-64 border-r border-border flex flex-col justify-between p-6">

      <div>
        <Link to="/">
        <h2 className="text-xl font-semibold mb-8">Metriq Flow</h2>
        </Link>
        
        <nav className="flex flex-col gap-2 text-sm">
          <NavLink to="/app" end className={navClass}>Dashboard</NavLink>
          <NavLink to="/app/reports" className={navClass}>Reports</NavLink>
          <NavLink to="/app/integrations" className={navClass}>Integrations</NavLink>
          <NavLink to="/app/settings" className={navClass}>Settings</NavLink>
        </nav>
      </div>

      <div className="flex flex-col gap-2 text-sm">
        <button className="text-left px-3 py-2 rounded-lg hover:bg-gray-100">
          EN
        </button>

        <button className="text-left px-3 py-2 rounded-lg hover:bg-gray-100">
          Support
        </button>

        <button
          onClick={handleLogout}
          className="text-left px-3 py-2 rounded-lg text-red-500 hover:bg-red-50"
        >
          Logout
        </button>
      </div>

    </aside>
  );
};

export default Sidebar;