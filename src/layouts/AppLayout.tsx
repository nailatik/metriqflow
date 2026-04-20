import { Outlet } from "react-router-dom";

const AppLayout = () => {
  return (
    <div>
      <h2>App Layout</h2>
      <hr />
      <Outlet />
    </div>
  );
};

export default AppLayout;