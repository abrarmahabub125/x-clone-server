import z from "zod";

const tweetSchema = z.object({
  userId: z.string(),
  content: z.string(),
  media: z.string(),
  likesCount: z.number(),
  commentsCount: z.number(),
  viewsCount: z.number(),
  retweetsCount: z.number(),
});

export { tweetSchema };
