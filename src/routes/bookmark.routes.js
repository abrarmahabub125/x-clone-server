import express from "express";
import {
  getBookmarks,
  addBookmarks,
  deleteBookmarks,
} from "../controllers/bookmarks.controllers.js";

const router = express.Router();
/**
 * ------- http://localhost:3000/api/users/:id/bookmarks
 * ------- http://localhost:3000/api/users/:id/bookmarks/:id
 */

// Get bookmarks
router.get("/users/:userId/bookmarks", getBookmarks);

// Add bookmark route
router.post("/users/:userId/bookmarks/:tweetId", addBookmarks);

// Delete bookmark route
router.delete("/users/:userId/bookmarks/:tweetId", deleteBookmarks);

export { router };
