import { z } from "zod";

// Mirrors backend/src/utils/validation.ts validatePassword():
// 8-128 chars, at least one uppercase letter and one special character.
// Kept in sync so zod (primary gate) and the controller agree.
const strongPassword = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be at most 128 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter (A-Z)")
  .regex(/[!@#$%^&*(),.?":{}|<>]/, "Password must contain at least one special character");

const email = z.email("Invalid email format").max(254, "Email too long");

// REGISTER — must cover every field the controller reads, because the
// validate() middleware replaces req.body with the parsed (key-stripped)
// output. Omitting a field here would drop it before the controller runs.
export const registerSchema = z.object({
  email,
  password: strongPassword,
  fullName: z.string().trim().min(1, "Full name is required").max(100, "Full name too long"),
  birthDate: z.string().min(1, "Date of birth is required"),
  phone: z.string().trim().min(1, "Phone is required").max(32, "Phone too long"),
  agreedToProcessing: z.literal(true, "Consent to data processing is required"),
  agreedToTerms: z.literal(true, "Acceptance of terms is required"),
  agreedToMarketing: z.boolean().optional().default(false),
  organization: z.string().trim().max(200, "Organization too long").optional(),
  locale: z.string().optional(),
});

// LOGIN — no complexity rules (legacy passwords must still authenticate);
// max(128) only to cap bcrypt.compare() input.
export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Password is required").max(128, "Password too long"),
});

// CHANGE PASSWORD — new password must satisfy strength rules and differ
// from the current one.
export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required").max(128, "Password too long"),
    newPassword: strongPassword,
  })
  .refine((d) => d.newPassword !== d.currentPassword, {
    message: "New password must differ from the current one",
    path: ["newPassword"],
  });
