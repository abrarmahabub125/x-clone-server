import z from "zod";

const tweetSchema = z
  .object({
    userId: z.string().optional(),
    content: z
      .string()
      .max(280, "Post cannot exceed 280 characters")
      .default(""),
    media: z
      .string()
      .url("Media must be a valid URL")
      .or(z.literal(""))
      .default(""),
    mediaDataUrl: z.string().default(""),
    location: z
      .string()
      .trim()
      .max(100, "Location cannot exceed 100 characters")
      .default(""),
    likesCount: z.number().default(0),
    commentsCount: z.number().default(0),
    viewsCount: z.number().default(0),
    retweetsCount: z.number().default(0),
  })
  .refine(
    (value) =>
      value.content.trim().length > 0 || value.mediaDataUrl || value.media,
    {
      message: "Your post needs text or an image to be published.",
      path: ["content"],
    },
  );

export { tweetSchema };
