import express from "express";

import {
  getProfile,
  getUserPosts,
  getUserReplies,
  getUserMedia,
  getUserLikes,
} from "../controllers/profile.controllers.js";
import { verifyAccessToken } from "../middleware/verifyAccessToken.js";

const router = express.Router();

/**
 * ------ http://localhost:3000/api/users/:id
 * ------ http://localhost:3000/api/users/:id/posts
 * ------ http://localhost:3000/api/users/:id/replies
 * ------ http://localhost:3000/api/users/:id/likes
 */

// Get users profile info
router.get("/users/:id", verifyAccessToken, getProfile);
router.get("/users/:id/posts", getUserPosts);
router.get("/users/:id/replies", verifyAccessToken, getUserReplies);
router.get("/users/:id/media", verifyAccessToken, getUserMedia);
router.get("/users/:id/likes", verifyAccessToken, getUserLikes);

export { router };
