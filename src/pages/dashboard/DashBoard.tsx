import { useAppSelector } from "../../app/hooks";

const Dashboard = () => {
  const user = useAppSelector((state) => state.user);

  return (
    <div>
      <h1>Dashboard</h1>

      <pre>{JSON.stringify(user, null, 2)}</pre>
    </div>
  );
};

export default Dashboard;