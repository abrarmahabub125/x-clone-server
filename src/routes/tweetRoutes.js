import express from "express";

import {
  createTweet,
  getSingleTweet,
  getTweets,
  getUserTweets,
} from "../controllers/tweetControllers.js";
import { verifyAccessToken } from "../middleware/verifyAccessToken.js";

const router = express.Router();

// Tweet routes cover feed reads and tweet creation.
router.get("/tweets", getTweets);
router.get("/tweets/:id", getSingleTweet);
router.get("/users/:userId/tweets", getUserTweets);
router.post("/tweets", verifyAccessToken, createTweet);

export { router };
