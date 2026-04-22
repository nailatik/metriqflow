import { useAppDispatch, useAppSelector } from '../app/hooks';
import Loader from '../components/Loader/Loader';
import ErrorModal from '../components/ErrorModal/ErrorModal';
import { useEffect } from 'react';
import { fetchMe } from '../store/userSlice';

const CommonWrapper = ({ children }: { children: React.ReactNode }) => {
  const dispatch = useAppDispatch();
  const token = useAppSelector((state) => state.user.token);
  const user = useAppSelector((state) => state.user.user);
  useEffect(() => {
    if (token && !user) {
      dispatch(fetchMe());
    }
  }, [token, user, dispatch]);
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