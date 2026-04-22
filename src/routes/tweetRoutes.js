import express from "express";

import {
  createTweet,
  getSingleTweet,
  getUserTweets,
  likeTweet,
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

// ================= DELETE REQUESTS ===============
router.delete("/tweets/:tweetId/likes", verifyAccessToken, unlikeTweet);

export { router };
