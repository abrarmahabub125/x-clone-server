import express from "express";
import {
  getTweets,
  getSingleTweet,
  getUserTweets,
  createTweet,
} from "../controllers/tweet.controllers.js";
import { verifyAccessToken } from "../middleware/verifyAccessToken.js";

const router = express.Router();

/**
 * GET    /api/tweets
 * GET    /api/tweets/:tweetId
 * GET    /api/users/:userId/tweets
 *
 * POST   /api/tweets
 *
 * PUT    /api/tweets/:tweetId
 *
 * DELETE /api/tweets/:tweetId
 */

// get tweets
router.get("/tweets", getTweets);
router.get("/tweets/:id", getSingleTweet);
router.get("/users/:userId/tweets", getUserTweets);

// Create new tweet
router.post("/tweets", verifyAccessToken, createTweet);

export { router };
