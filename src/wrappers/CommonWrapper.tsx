// wrappers/CommonWrapper.tsx
import { useAppSelector } from '../app/hooks';
import Loader from '../components/Loader/Loader';
import ErrorModal from '../components/ErrorModal/ErrorModal';

const CommonWrapper = ({ children }: { children: React.ReactNode }) => {
  const { loading } = useAppSelector(
    (state) => state.settings
  );

  return (
    <>
      {loading && <Loader />}
      <ErrorModal />
      {children}
    </>
  );
};

export default CommonWrapper;