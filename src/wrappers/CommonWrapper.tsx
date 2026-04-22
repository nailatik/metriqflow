import { Outlet } from "react-router-dom";
import { useAppSelector } from "../app/hooks";
import Loader from "../components/Loader/Loader";
import ErrorModal from "../components/ErrorModal/ErrorModal";

const CommonWrapper = () => {
  const loading = useAppSelector(
    (state) => state.settings
  );

  return (
    <>
      {loading && <Loader />}
      <ErrorModal/>
      <Outlet />
    </>
  );
};

export default CommonWrapper;
