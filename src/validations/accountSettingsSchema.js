import z from "zod";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters long")
  .max(20, "Password cannot exceed 20 characters")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(
    /[^A-Za-z0-9]/,
    "Password must contain at least one special character (e.g., !@#$%)",
  );

export const updateEmailSchema = z.object({
  newEmail: z
    .string()
    .trim()
    .email("Please enter a valid email address")
    .toLowerCase(),
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
    message: "Password confirmation does not match. Please try again.",
  });

export const deleteAccountSchema = z.object({
  currentPassword: passwordSchema,
  confirmationText: z
    .string()
    .trim()
    .refine((value) => value === "DELETE", {
      message: 'Type "DELETE" to confirm account deletion.',
    }),
});
