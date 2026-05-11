import express from "express";

import {
  createTweet,
  deleteTweet,
  getSingleTweet,
  getUserTweets,
  likeTweet,
  recordTweetView,
  retweetTweet,
  undoRetweetTweet,
  unlikeTweet,
} from "../controllers/tweetControllers.js";
import { verifyAccessToken } from "../middleware/verifyAccessToken.js";

const router = express.Router();

// Tweet routes cover feed reads and tweet creation.

// ================= GET REQUESTS ==================
router.get("/tweets/:id", getSingleTweet);
router.get("/users/:userId/tweets", getUserTweets);

// ================= POST REQUESTS =================
router.post("/tweets", verifyAccessToken, createTweet);
router.post("/tweets/:tweetId/likes", verifyAccessToken, likeTweet);
router.post("/tweets/:tweetId/retweets", verifyAccessToken, retweetTweet);
router.post("/tweets/:tweetId/views", verifyAccessToken, recordTweetView);

// ================= DELETE REQUESTS ===============
router.delete("/tweets/:tweetId", verifyAccessToken, deleteTweet);
router.delete("/tweets/:tweetId/likes", verifyAccessToken, unlikeTweet);
router.delete("/tweets/:tweetId/retweets", verifyAccessToken, undoRetweetTweet);

export { router };
