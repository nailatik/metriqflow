import { Outlet } from "react-router-dom";
import ErrorModal from "../components/ErrorModal/ErrorModal";
import Sidebar from "../components/Sidebar/Sidebar";


const AppLayout = () => {

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