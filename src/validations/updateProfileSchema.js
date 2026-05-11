import z from "zod";

const updateProfileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, "Full name is required")
    .max(50, "Full name cannot exceed 50 characters"),
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username cannot exceed 30 characters")
    .toLowerCase()
    .regex(
      /^[a-z0-9_]+$/,
      "Username can only contain lowercase letters, numbers, and underscores",
    )
    .refine((val) => !val.startsWith("_") && !val.endsWith("_"), {
      message: "Username cannot start or end with an underscore",
    }),
  bio: z
    .string()
    .trim()
    .max(160, "Bio cannot exceed 160 characters")
    .default(""),
  location: z
    .string()
    .trim()
    .max(100, "Location cannot exceed 100 characters")
    .default(""),
  profilePic: z
    .string()
    .trim()
    .url("Profile picture must be a valid URL")
    .or(z.literal(""))
    .default(""),
  coverPhoto: z
    .string()
    .trim()
    .url("Cover photo must be a valid URL")
    .or(z.literal(""))
    .default(""),
});

export default updateProfileSchema;
