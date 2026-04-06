import express from "express";

import {
  addBookmarks,
  deleteBookmarks,
  getBookmarks,
} from "../controllers/bookmarkControllers.js";

const router = express.Router();

// Bookmark routes are scoped to a specific user.
router.get("/users/:userId/bookmarks", getBookmarks);
router.post("/users/:userId/bookmarks/:tweetId", addBookmarks);
router.delete("/users/:userId/bookmarks/:tweetId", deleteBookmarks);

export { router };
