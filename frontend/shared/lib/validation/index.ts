type ValidationResult = string | null;

const EMAIL_RE = /^\S+@\S+\.\S+$/;
const UPPER_RE = /[A-Z]/;
const SPECIAL_RE = /[!@#$%^&*(),.?":{}|<>]/;

export function validateEmail(email: string): ValidationResult {
  if (!email) return "emailRequired";
  if (!EMAIL_RE.test(email)) return "emailInvalid";
  return null;
}

export function validatePassword(password: string): ValidationResult {
  if (!password) return "passwordRequired";
  if (password.length < 6) return "passwordMinLength";
  if (!UPPER_RE.test(password)) return "passwordUppercase";
  if (!SPECIAL_RE.test(password)) return "passwordSpecial";
  return null;
}

export function getPasswordChecks(password: string) {
  return {
    minLength: password.length >= 6,
    uppercase: UPPER_RE.test(password),
    special: SPECIAL_RE.test(password),
  };
}
