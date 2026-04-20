import { useNavigate } from "react-router-dom";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div style={styles.container}>
      <h1>404</h1>
      <p>Страница не найдена</p>

      <button onClick={() => navigate("/")}>
        Вернуться на главную
      </button>
    </div>
  );
};

const styles = {
  container: {
    height: "100vh",
    display: "flex",
    flexDirection: "column" as const,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
};

export default NotFound;