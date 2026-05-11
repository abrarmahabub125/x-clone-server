import z from "zod";

const tweetSchema = z.object({
  userId: z.string().optional(),
  content: z.string().default(""),
  media: z.string().url().or(z.literal("")).default(""),
  mediaDataUrl: z.string().default(""),
  location: z.string().trim().max(100, "Location is too long").default(""),
  likesCount: z.number(),
  commentsCount: z.number(),
  viewsCount: z.number(),
  retweetsCount: z.number(),
}).refine(
  (value) => value.content.trim().length > 0 || value.mediaDataUrl || value.media,
  {
    message: "A post must contain text or an image.",
    path: ["content"],
  },
);

export { tweetSchema };
