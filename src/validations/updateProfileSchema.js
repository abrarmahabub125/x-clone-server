import z from "zod";

const updateProfileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, "Full name is required")
    .max(50, "Full name is too long"),
  bio: z
    .string()
    .trim()
    .max(160, "Bio must be 160 characters or fewer")
    .default(""),
  location: z
    .string()
    .trim()
    .max(100, "Address is too long")
    .default(""),
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
