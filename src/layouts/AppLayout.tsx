import { Outlet } from "react-router-dom";
import Loader from "../components/Loader/Loader";
import ErrorModal from "../components/ErrorModal/ErrorModal";

const AppLayout = () => {
  return (
    <div>
      <Loader />
      <ErrorModal />

      <Outlet />
    </div>
  );
};

export default AppLayout;