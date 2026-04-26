import z from "zod";

const updateProfileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, "Full name is required")
    .max(50, "Full name is too long"),
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(50, "Username must be at most 50 characters")
    .toLowerCase()
    .regex(
      /^[a-z0-9_]+$/,
      "Only lowercase letters, numbers, and underscores allowed",
    )
    .refine((val) => !val.startsWith("_") && !val.endsWith("_"), {
      message: "Username cannot start or end with underscore",
    }),
  bio: z
    .string()
    .trim()
    .max(160, "Bio must be 160 characters or fewer")
    .default(""),
  location: z.string().trim().max(100, "Address is too long").default(""),
  profilePic: z
    .string()
    .trim()
    .max(2048, "Profile photo URL is too long")
    .default(""),
  coverPhoto: z
    .string()
    .trim()
    .max(2048, "Cover photo URL is too long")
    .default(""),
});

export default updateProfileSchema;
