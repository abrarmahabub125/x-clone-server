import express from "express";

import {
  addBookmarks,
  deleteBookmarks,
  getBookmarks,
} from "../controllers/bookmarkControllers.js";

const router = express.Router();

/**
 * GET --- /api/users/:userId/bookmarks
 * POST --- /api/users/:userId/bookmarks
 * DELETE --- /api/users/:userId/bookmarks/:id
 */

// Bookmark routes are scoped to a specific user.
router.get("/users/:userId/bookmarks", getBookmarks);
router.post("/users/:userId/bookmarks", addBookmarks);
router.delete("/users/:userId/bookmarks/:tweetId", deleteBookmarks);

export { router };
