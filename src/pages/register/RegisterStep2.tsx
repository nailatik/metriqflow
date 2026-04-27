import { useState } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { completeProfile } from "../../store/userSlice";
import { useNavigate } from "react-router-dom";
import Button from "../../ui/Button/Button";

const RegisterStep2 = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const loading = useAppSelector((s) => s.settings.loading);

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

  const handleSubmit = async () => {
    if (!formData.fullName || !formData.agreedToProcessing) {
      return;
    }

    const result = await dispatch(
      completeProfile({
        fullName: formData.fullName,
        birthDate: formData.birthDate || null,
        organization: formData.organization || null,
        phone: formData.phone || null,
        agreedToProcessing: formData.agreedToProcessing,
      })
    );

    if (completeProfile.fulfilled.match(result)) {
      localStorage.removeItem("pending_profile");
      navigate("/app");
    }
  };

  return (
    <div className="w-full max-w-md bg-white border border-border rounded-2xl p-8 shadow-sm">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-semibold text-textMain">Complete your profile</h1>
        <p className="text-textSecondary mt-2 text-sm">Tell us about yourself</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm text-textSecondary">Full Name *</label>
          <input
            className="w-full mt-1 px-4 py-3 border border-border rounded-xl outline-none focus:border-primary"
            placeholder="Ivan Ivanov"
            value={formData.fullName}
            onChange={(e) => handleChange("fullName", e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm text-textSecondary">Date of Birth</label>
          <input
            type="date"
            className="w-full mt-1 px-4 py-3 border border-border rounded-xl outline-none focus:border-primary"
            value={formData.birthDate}
            onChange={(e) => handleChange("birthDate", e.target.value)}
          />
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
          <label className="text-sm text-textSecondary">Phone</label>
          <input
            type="tel"
            className="w-full mt-1 px-4 py-3 border border-border rounded-xl outline-none focus:border-primary"
            placeholder="+7 (999) 123-45-67"
            value={formData.phone}
            onChange={(e) => handleChange("phone", e.target.value)}
          />
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
            I agree to the processing of my personal data
          </label>
        </div>

        <Button
          variant="primary"
          disabled={loading || !formData.fullName || !formData.agreedToProcessing}
          onClick={handleSubmit}
          className="w-full"
        >
          {loading ? "Saving..." : "Complete Registration"}
        </Button>
      </div>
    </div>
  );
};

export default RegisterStep2;