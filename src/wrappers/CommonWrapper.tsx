import { Outlet } from "react-router-dom";
import { useAppSelector } from "../app/hooks";
import Loader from "../components/Loader/Loader";
import ErrorModal from "../components/ErrorModal/ErrorModal";

const CommonWrapper = () => {
  const { loading, error, isErrorModalOpen } = useAppSelector(
    (state) => state.settings
  );

  return (
    <>
      {loading && <Loader />}
      <ErrorModal
        isOpen={isErrorModalOpen}
        message={error}
      />
      <Outlet />
    </>
  );
};

export default CommonWrapper;
