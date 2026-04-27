import { useState, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { registerUser } from "../../store/userSlice";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { getPasswordChecks, validateEmail, validatePassword } from "../../utils/validation";
import { PhoneInput } from "react-international-phone";
import "react-international-phone/style.css";
import Button from "../../ui/Button/Button";

const Register = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const loading = useAppSelector((s) => s.settings.loading);
  const [searchParams] = useSearchParams();
  const step = searchParams.get("step") === "2" ? 2 : 1;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formData, setFormData] = useState({
    fullName: "",
    birthDate: "",
    organization: "",
    phone: "",
    agreedToProcessing: false,
  });

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleStep1 = async () => {
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);

    if (emailError || passwordError) {
      setErrors({ email: emailError, password: passwordError });
      return;
    }

    setErrors({});
    
    // Store temp data in sessionStorage
    sessionStorage.setItem("reg_email", email);
    sessionStorage.setItem("reg_password", password);
    
    navigate("/register?step=2");
  };

  const handleStep2 = async () => {
    const storedEmail = sessionStorage.getItem("reg_email");
    const storedPassword = sessionStorage.getItem("reg_password");

    if (!storedEmail || !storedPassword) {
      navigate("/register");
      return;
    }

    if (!formData.fullName || !formData.birthDate || !formData.phone || !formData.agreedToProcessing) {
      setErrors({ 
        fullName: !formData.fullName ? "Full name is required" : undefined,
        birthDate: !formData.birthDate ? "Date of birth is required" : undefined,
        phone: !formData.phone ? "Phone is required" : undefined,
        agreement: !formData.agreedToProcessing ? "Agreement is required" : undefined,
      });
      return;
    }

    setErrors({});

    const result = await dispatch(registerUser({ 
      email: storedEmail, 
      password: storedPassword,
      fullName: formData.fullName,
      birthDate: formData.birthDate,
      organization: formData.organization || undefined,
      phone: formData.phone,
      agreedToProcessing: formData.agreedToProcessing,
    }));

    if (registerUser.fulfilled.match(result)) {
      sessionStorage.removeItem("reg_email");
      sessionStorage.removeItem("reg_password");
      navigate("/app");
    }
  };

  const checks = getPasswordChecks(password);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    fullName?: string;
    birthDate?: string;
    phone?: string;
    agreement?: string;
  }>({});

  if (step === 2) {
    const storedEmail = sessionStorage.getItem("reg_email");
    if (!storedEmail) {
      navigate("/register", { replace: true });
      return null;
    }

    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-bg px-4">
        <Link to="/" className="mb-8">
          <h1 className="text-4xl text-primary font-semibold tracking-tight">
            Metriq Flow
          </h1>
        </Link>

        <div className="w-full max-w-md bg-white border border-border rounded-2xl p-8 shadow-sm">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold text-textMain">Complete your profile</h1>
            <p className="text-textSecondary mt-2 text-sm">Tell us about yourself</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm text-textSecondary">Full Name *</label>
              <input
                className={`w-full mt-1 px-4 py-3 border rounded-xl outline-none 
                  ${errors.fullName ? "border-red-500" : "border-border"} focus:border-primary`}
                placeholder="Ivan Ivanov"
                value={formData.fullName}
                onChange={(e) => handleChange("fullName", e.target.value)}
              />
              {errors.fullName && <p className="text-red-500 text-sm mt-1">{errors.fullName}</p>}
            </div>

            <div>
              <label className="text-sm text-textSecondary">Date of Birth *</label>
              <input
                type="date"
                className={`w-full mt-1 px-4 py-3 border rounded-xl outline-none 
                  ${errors.birthDate ? "border-red-500" : "border-border"} focus:border-primary`}
                value={formData.birthDate}
                onChange={(e) => handleChange("birthDate", e.target.value)}
              />
              {errors.birthDate && <p className="text-red-500 text-sm mt-1">{errors.birthDate}</p>}
            </div>

            <div>
              <label className="text-sm text-textSecondary">Organization</label>
              <input
                className="w-full mt-1 px-4 py-3 border border-border rounded-xl outline-none focus:border-primary"
                placeholder="Company name"
                value={formData.organization}
                onChange={(e) => handleChange("organization", e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm text-textSecondary">Phone *</label>
              <div className="mt-1">
                <PhoneInput
                  value={formData.phone}
                  onChange={(phone) => handleChange("phone", phone)}
                  inputClassName="w-full px-4 py-3 border border-border rounded-xl outline-none focus:border-primary"
                />
              </div>
              {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
            </div>

            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="agreedToProcessing"
                checked={formData.agreedToProcessing}
                onChange={(e) => handleChange("agreedToProcessing", e.target.checked)}
                className="mt-1"
              />
              <label htmlFor="agreedToProcessing" className="text-sm text-textSecondary">
                I agree to the processing of my personal data *
              </label>
            </div>
            {errors.agreement && <p className="text-red-500 text-sm">{errors.agreement}</p>}

            <Button variant="primary" disabled={loading} onClick={handleStep2} className="w-full">
              {loading ? "Creating account..." : "Complete Registration"}
            </Button>
          </div>
        </div>
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

      <div className="w-full max-w-md bg-white border border-border rounded-2xl p-8 shadow-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-textMain">Create account</h1>
          <p className="text-textSecondary mt-2 text-sm">Start using Metriq Flow</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-textSecondary">Email</label>
            <input
              className={`w-full mt-1 px-4 py-3 border rounded-xl outline-none 
                ${errors.email ? "border-red-500" : "border-border"} focus:border-primary`}
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
          </div>

          <div>
            <label className="text-sm text-textSecondary">Password</label>
            <input
              className={`w-full mt-1 px-4 py-3 border rounded-xl outline-none 
                ${errors.password ? "border-red-500" : "border-border"} focus:border-primary`}
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
            {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
          </div>

          <Button variant="primary" disabled={loading} onClick={handleStep1} className="w-full">
            {loading ? "Loading..." : "Next"}
          </Button>
        </div>

        <p className="text-center text-sm text-textSecondary mt-6">
          Already have an account?{" "}
          <Link to="/login" className="text-primary hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;