import { Outlet, Link } from "react-router-dom";
import Loader from "../components/Loader/Loader";
import ErrorModal from "../components/ErrorModal/ErrorModal";
import { useAppSelector } from "../app/hooks";

const AppLayout = () => {
  const loading = useAppSelector((state) => state.settings.loading);
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      
      <aside
        style={{
          width: 220,
          padding: 20,
          borderRight: "1px solid #eee",
        }}
      >
        <h2>MetriqFlow</h2>

        <nav style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Link to="/app">Dashboard</Link>
          <Link to="/app/reports">Reports</Link>
          <Link to="/app/integrations">Integrations</Link>
          <Link to="/app/settings">Settings</Link>
        </nav>
      </aside>

      <main style={{ flex: 1, padding: 24 }}>
        <Outlet />
      </main>

      {loading && <Loader />}
      <ErrorModal />
    </div>
  );
};

export default AppLayout;