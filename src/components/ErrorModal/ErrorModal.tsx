import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { clearError } from "../../store/settingsSlice";

const ErrorModal = () => {
  const dispatch = useAppDispatch();

  const { error, isErrorModalOpen } = useAppSelector(
    (state) => state.settings
  );

  if (!isErrorModalOpen || !error) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h2>Ошибка</h2>
        <p>{error}</p>

        <button onClick={() => dispatch(clearError())}>
          Закрыть
        </button>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: "fixed" as const,
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10000,
  },
  modal: {
    background: "#fff",
    padding: 20,
    borderRadius: 10,
    minWidth: 300,
    textAlign: "center" as const,
  },
};

export default ErrorModal;