import { useState } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { loginUser, registerUser } from "../../store/userSlice";
import { useNavigate, Link } from "react-router-dom";
import Button from "../../ui/Button/Button";

const Register = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const loading = useAppSelector((s) => s.settings.loading);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleRegister = async () => {
    await dispatch(registerUser({ email, password }));

    const result = await dispatch(loginUser({ email, password }));

    if (loginUser.fulfilled.match(result)) {
      navigate("/app");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-bg px-4">
      <Link to="/" className="mb-8">
        <h1 className="text-4xl text-primary font-semibold tracking-tight">
          Metriq Flow
        </h1>
      </Link>

      <div className="w-full max-w-md bg-white border border-border rounded-2xl p-8 shadow-sm">

        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-textMain">
            Create account
          </h1>

          <p className="text-textSecondary mt-2 text-sm">
            Start using Metriq Flow
          </p>
        </div>

        <div className="space-y-4">

          <div>
            <label className="text-sm text-textSecondary">Email</label>
            <input
              className="w-full mt-1 px-4 py-3 border border-border rounded-xl outline-none focus:border-primary"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm text-textSecondary">Password</label>
            <input
              className="w-full mt-1 px-4 py-3 border border-border rounded-xl outline-none focus:border-primary"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <Button
            variant="primary"
            disabled={loading}
            onClick={handleRegister}
            className="w-full"
          >
            {loading ? "Creating account..." : "Create account"}
          </Button>

        </div>

        <p className="text-center text-sm text-textSecondary mt-6">
          Already have an account?{" "}
          <Link to="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>

      </div>
    </div>
  );
};

export default Register;