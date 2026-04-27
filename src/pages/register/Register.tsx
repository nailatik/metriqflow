import { useState } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { registerUser } from "../../store/userSlice";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { getPasswordChecks, validateEmail, validatePassword } from "../../utils/validation";
import Button from "../../ui/Button/Button";
import RegisterStep2 from "./RegisterStep2";

const Register = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const loading = useAppSelector((s) => s.settings.loading);
  const [searchParams] = useSearchParams();
  const step = searchParams.get("step") === "2" ? 2 : 1;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleRegister = async () => {
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);
  
    if (emailError || passwordError) {
      setErrors({
        email: emailError,
        password: passwordError,
      });
      return;
    }
  
    setErrors({});
  
    localStorage.setItem("pending_profile", "true");
  
    const result = await dispatch(registerUser({ email, password }));
  
    if (registerUser.fulfilled.match(result)) {
      navigate("/register?step=2");
    }
  };

  const checks = getPasswordChecks(password);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
  }>({});

  if (step === 2) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-bg px-4">
        <Link to="/" className="mb-8">
          <h1 className="text-4xl text-primary font-semibold tracking-tight">
            Metriq Flow
          </h1>
        </Link>
        <RegisterStep2 />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-bg px-4">
      <Link to="/" className="mb-8">
        <h1 className="text-4xl text-primary font-semibold tracking-tight">
          Metriq Flow
        </h1>
      </Link>

      <div className="w-full max-w-md bg-white border border-border rounded-2xl p-8 shadow-sm transition-all duration-500 transform preserve-3d">
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
              className={`w-full mt-1 px-4 py-3 border rounded-xl outline-none 
                ${errors.email ? "border-red-500" : "border-border"} 
                focus:border-primary`}
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            {errors.email && (
              <p className="text-red-500 text-sm mt-1">
                {errors.email}
              </p>
            )}
          </div>

          <div>
            <label className="text-sm text-textSecondary">Password</label>

            <input
              className={`w-full mt-1 px-4 py-3 border rounded-xl outline-none 
                ${errors.password ? "border-red-500" : "border-border"} 
                focus:border-primary`}
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {password && (
              <div className="mt-2 space-y-1 text-sm">

                <p className={checks.minLength ? "text-green-500" : "text-red-400"}>
                  {checks.minLength ? "✔" : "✖"} At least 6 characters
                </p>

                <p className={checks.uppercase ? "text-green-500" : "text-red-400"}>
                  {checks.uppercase ? "✔" : "✖"} One uppercase letter
                </p>

                <p className={checks.special ? "text-green-500" : "text-red-400"}>
                  {checks.special ? "✔" : "✖"} One special character
                </p>
  
              </div>
            )}

            {errors.password && (
              <p className="text-red-500 text-sm mt-1">
                {errors.password}
              </p>
            )}
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