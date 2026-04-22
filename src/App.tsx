import { BrowserRouter, Routes, Route } from 'react-router-dom';
import CommonWrapper from './wrappers/CommonWrapper';
import AuthWrapper from './wrappers/AuthWrapper';
import AppLayout from './layouts/AppLayout';
import Landing from './pages/landing/Landing';
import Login from './pages/login/Login';
import Register from './pages/register/Register';
import Dashboard from './pages/dashboard/DashBoard';
import Reports from './pages/reports/Reports';
import Settings from './pages/settings/Settings';
import Integrations from './pages/integrations/Integrations';
import NotFound from './pages/notfound/NotFound';
import { useAppDispatch } from "./app/hooks";
import { useEffect } from "react";
import { fetchMe } from "./store/userSlice";

function App() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (token) {
      dispatch(fetchMe());
    }
  }, [dispatch]);
  return (
    <BrowserRouter>
      <CommonWrapper>
        <AuthWrapper>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/app" element={<AppLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="reports" element={<Reports />} />
              <Route path="settings" element={<Settings />} />
              <Route path="integrations" element={<Integrations />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthWrapper>
      </CommonWrapper>
    </BrowserRouter>
  );
}


export default App;