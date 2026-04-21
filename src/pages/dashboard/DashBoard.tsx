import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { logout } from "../../store/userSlice";
import Button from "../../ui/Button/Button";

const Dashboard = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const user = useAppSelector((state) => state.user.user);

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  return (
    <div className="space-y-8">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-textMain">
            Dashboard
          </h1>

          <p className="text-textSecondary mt-1">
            Welcome back{user?.email ? `, ${user.email}` : ""}
          </p>
        </div>

        <Button variant="secondary" onClick={handleLogout}>
          Logout
        </Button>
      </div>

      {/* USER CARD */}
      <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">
          Account info
        </h2>

        <div className="space-y-2 text-textSecondary">
          <p>
            <span className="font-medium text-textMain">ID:</span>{" "}
            {user?.id ?? "—"}
          </p>

          <p>
            <span className="font-medium text-textMain">Email:</span>{" "}
            {user?.email ?? "—"}
          </p>
        </div>
      </div>

      {/* STATS (mock пока) */}
      <div className="grid grid-cols-3 gap-4">

        <div className="bg-white border border-border rounded-xl p-5">
          <p className="text-textSecondary text-sm">Reports</p>
          <p className="text-2xl font-semibold mt-2">12</p>
        </div>

        <div className="bg-white border border-border rounded-xl p-5">
          <p className="text-textSecondary text-sm">Integrations</p>
          <p className="text-2xl font-semibold mt-2">3</p>
        </div>

        <div className="bg-white border border-border rounded-xl p-5">
          <p className="text-textSecondary text-sm">Activity</p>
          <p className="text-2xl font-semibold mt-2">Active</p>
        </div>

      </div>

      {/* ACTIVITY */}
      <div className="bg-white border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-2">
          Recent activity
        </h2>

        <p className="text-textSecondary">
          No recent activity yet
        </p>
      </div>

    </div>
  );
};

export default Dashboard;