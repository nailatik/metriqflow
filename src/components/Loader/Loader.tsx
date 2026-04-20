import { useAppSelector } from "../../app/hooks";

const Loader = () => {
  const loading = useAppSelector((state) => state.settings.loading);

  if (!loading) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.spinner}></div>
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
    background: "rgba(0,0,0,0.3)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
  spinner: {
    width: 50,
    height: 50,
    border: "5px solid #ccc",
    borderTop: "5px solid #333",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
};

export default Loader;