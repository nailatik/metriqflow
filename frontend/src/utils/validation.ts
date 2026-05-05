export const validateEmail = (email: string) => {
  if (!email) return "Email is required";

  const regex = /^\S+@\S+\.\S+$/;
  if (!regex.test(email)) return "Invalid email format";

  return "";
};

export const validatePassword = (password: string) => {
  if (!password) return "Password is required";

  if (password.length < 6) {
    return "Password must be at least 6 characters";
  }

  if (!/[A-Z]/.test(password)) {
    return "Password must contain at least one uppercase letter (A - Z)";
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return "Password must contain at least one special character (@$!...)";
  }

  return "";
};

export const getPasswordChecks = (password: string) => {
  return {
    minLength: password.length >= 6,
    uppercase: /[A-Z]/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };
};