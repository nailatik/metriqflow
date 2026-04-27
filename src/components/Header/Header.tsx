import Button from "../../ui/Button/Button";
import { Link } from "react-router-dom";
import { useAppSelector, useAppDispatch } from "../../app/hooks";
import { logout } from "../../store/userSlice";

const Header = () => {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((state) => state.user.isAuth);
  const user = useAppSelector((state) => state.user.user);

  const handleLogout = () => {
    dispatch(logout());
  };

  const userFirstName = user?.full_name?.split(" ")[0] || "";

  return (
    <header className="grid grid-cols-[1fr_auto_1fr] items-center px-8 py-6 border-b border-border">
      {/* Логотип — прижат к левому краю */}
      <h1 className="text-xl font-semibold tracking-tight justify-self-start">
        <Link to="/">Metriq Flow</Link>
      </h1>

      {/* Навигация — строго по центру */}
      <nav className="flex items-center gap-6 text-textSecondary">
        <a href="#features" className="hover:text-textMain">Features</a>
        <a href="#how" className="hover:text-textMain">How it works</a>
      </nav>

      {/* Правый блок — прижат к правому краю */}
      <div className="flex gap-3 items-center justify-self-end">
        {isAuthenticated ? (
          <>
            <Link to="/app">
              <span className="text-textMain font-medium">
                {userFirstName || "User"}
              </span>
            </Link>
            <Button variant="secondary" onClick={handleLogout}>
              Logout
            </Button>
          </>
        ) : (
          <>
            <Link
              to="/login"
              className="text-textSecondary hover:text-textMain flex items-center"
            >
              Login
            </Link>
            <Link to="/register">
              <Button variant="primary">Create account</Button>
            </Link>
          </>
        )}
      </div>
    </header>
  );
};

export default Header;


 {/* <button
              onClick={handleLogout}
              className="text-textSecondary hover:text-textMain flex items-center"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6A2.25 2.25 0 0 0 5.25 5.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9"
                />
              </svg>
              <span className="ml-1">Logout</span>
            </button> */}