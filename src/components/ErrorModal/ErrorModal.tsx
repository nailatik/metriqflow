import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { clearError } from "../../store/settingsSlice";

const ErrorModal = () => {
  const dispatch = useAppDispatch();

  const { error, isErrorModalOpen } = useAppSelector(
    (state) => state.settings
  );

  if (!isErrorModalOpen || !error) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm">

      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 text-center animate-fadeIn">

        <h2 className="text-xl font-semibold text-red-600">
          Something went wrong
        </h2>

        <p className="text-textSecondary mt-3">
          {error}
        </p>

        <button
          onClick={() => dispatch(clearError())}
          className="mt-6 px-5 py-2 rounded-xl bg-red-500 text-white hover:bg-red-600 transition"
        >
          Close
        </button>

      </div>

    </div>
  );
};

export default ErrorModal;