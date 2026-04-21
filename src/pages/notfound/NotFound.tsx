import { useNavigate } from "react-router-dom";
import Button from "../../ui/Button/Button";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">

      <div className="text-center max-w-md">

        <h1 className="text-6xl font-bold text-textMain tracking-tight">
          404
        </h1>

        <h2 className="text-xl font-semibold mt-4 text-textMain">
          Page not found
        </h2>

        <p className="text-textSecondary mt-2">
          The page you’re looking for doesn’t exist or has been moved.
        </p>

        <div className="mt-6">
          <Button
            variant="primary"
            onClick={() => navigate("/")}
            className="px-6 py-3"
          >
            Go to homepage
          </Button>
        </div>

      </div>
    </div>
  );
};

export default NotFound;