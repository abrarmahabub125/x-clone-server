import express from "express";

import {
  addBookmarks,
  deleteBookmarks,
  getBookmarks,
} from "../controllers/bookmarkControllers.js";
import { verifyAccessToken } from "../middleware/verifyAccessToken.js";

const router = express.Router();

/**
 * GET --- /api/bookmarks
 * POST --- /api/bookmarks
 * DELETE --- /api/bookmarks/:id
 */

// Bookmark routes are scoped to a specific user.
router.get("/bookmarks", verifyAccessToken, getBookmarks);
router.post("/bookmarks", verifyAccessToken, addBookmarks);
router.delete("/bookmarks/:tweetId", verifyAccessToken, deleteBookmarks);

export { router };
