import z from "zod";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(20, "Password is too long")
  .regex(/[a-z]/, "Must contain at least one lowercase letter")
  .regex(/[0-9]/, "Must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Must contain at least one special character");

export const updateEmailSchema = z.object({
  newEmail: z.email({ message: "Invalid email address" }).trim(),
  currentPassword: passwordSchema,
});

export const updatePasswordSchema = z
  .object({
    currentPassword: passwordSchema,
    newPassword: passwordSchema,
    confirmNewPassword: passwordSchema,
  })
  .refine((value) => value.newPassword === value.confirmNewPassword, {
    path: ["confirmNewPassword"],
    message: "New password confirmation does not match.",
  });

export const deleteAccountSchema = z.object({
  currentPassword: passwordSchema,
  confirmationText: z
    .string()
    .trim()
    .refine((value) => value === "DELETE", {
      message: 'Please type "DELETE" to confirm account deletion.',
    }),
});
