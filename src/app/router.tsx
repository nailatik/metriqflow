import { createBrowserRouter } from "react-router-dom";
import Login from "../pages/login/Login";
import Landing from "../pages/landing/Landing";
import Register from "../pages/register/Register";
import Dashboard from "../pages/dashboard/DashBoard";
import NotFound from "../pages/notfound/NotFound";


export const router = createBrowserRouter([
  {
    path: "/",
    element: <Landing />,
  },
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/register",
    element: <Register />,
  },
  {
    path: "/app",
    element: <Dashboard />,
  },
  {
    path: "*",
    element: <NotFound />,
  },
]);