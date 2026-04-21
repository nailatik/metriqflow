import { createBrowserRouter } from "react-router-dom";
import Login from "../pages/login/Login";
import Landing from "../pages/landing/Landing";
import Register from "../pages/register/Register";
import Dashboard from "../pages/dashboard/DashBoard";
import NotFound from "../pages/notfound/NotFound";
import AuthWrapper from "../wrappers/AuthWrapper";
import CommonWrapper from "../wrappers/CommonWrapper";
import AppLayout from "../layouts/AppLayout";
import Reports from "../pages/reports/Reports";
import Settings from "../pages/settings/Settings";
import Integrations from "../pages/integrations/Integrations";

export const router = createBrowserRouter([
  {
    element: <CommonWrapper />,
    children: [
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
        element: <AuthWrapper />,
        children: [
          {
            element: <AppLayout />,
            children: [
              { index: true, element: <Dashboard /> },
              { path: "reports", element: <Reports /> },
              { path: "settings", element: <Settings /> },
              { path: "integrations", element: <Integrations /> },
            ],
          },
        ],
      },
      {
        path: "*",
        element: <NotFound />,
      },
    ],
  },
]);