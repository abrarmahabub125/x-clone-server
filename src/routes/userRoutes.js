import express from "express";

import {
  getProfile,
  getUserLikes,
  getUserMedia,
  getUserPosts,
  getUserReplies,
} from "../controllers/userControllers.js";
import { verifyAccessToken } from "../middleware/verifyAccessToken.js";

const router = express.Router();

/**
 * GET --    /api/users/:id
 * GET --    /api/users/:id/followers
 * GET --    /api/users/:id/following
 *
 * PUT --    /api/users/:id
 *
 *
 * DELETE -- /api/users/:id
 */

// Profile routes expose the header and tabbed timeline data.
router.get("/users/:id", verifyAccessToken, getProfile);
router.get("/users/:id/posts", verifyAccessToken, getUserPosts);
router.get("/users/:id/replies", verifyAccessToken, getUserReplies);
router.get("/users/:id/media", verifyAccessToken, getUserMedia);
router.get("/users/:id/likes", verifyAccessToken, getUserLikes);

export { router };
