import { ObjectId } from "mongodb";
import { getDB } from "../config/db.js";

// Get bookmarks
export async function getBookmarks(req, res, next) {
  const { userId } = req.params;
  const db = getDB();

  if (!ObjectId.isValid(userId)) {
    return res.status(400).json({
      status: false,
      message: "Invalid Id!",
    });
  }

  try {
    const bookmarks = await db
      .collection("bookmarks")
      .find({ userId: new ObjectId(userId) })
      .sort({ createdAt: 1 })
      .toArray();

    res.status(200).json(bookmarks);
  } catch (err) {
    next(err);
  }
}

// Add new bookmarks
export async function addBookmarks(req, res, next) {
  res.send("bookmark added");
}

// Remove bookmarks
export async function deleteBookmarks(req, res, next) {
  res.send("bookmark deleted");
}
