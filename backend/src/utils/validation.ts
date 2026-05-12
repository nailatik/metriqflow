const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const validateEmail = (email: string): string => {
  if (!email) return "Email is required";
  if (email.length > 254) return "Email too long";
  if (!EMAIL_RE.test(email)) return "Invalid email format";
  return "";
};

export const validatePassword = (password: string): string => {
  if (!password) return "Password is required";
  if (password.length < 6) return "Password must be at least 6 characters";
  if (password.length > 128) return "Password must be at most 128 characters";
  if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter (A-Z)";
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return "Password must contain at least one special character (@$!...)";
  return "";
};
