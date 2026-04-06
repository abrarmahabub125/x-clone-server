import { ObjectId } from "mongodb";

import { sendError, sendSuccess } from "../utils/apiResponse.js";
import { getDB } from "../config/db.js";

const BOOKMARKS_COLLECTION = "bookmarks";

// Get all bookmarks following user id
export async function getBookmarks(req, res, next) {
  const { userId } = req.params;

  if (!ObjectId.isValid(userId)) {
    return sendError(res, {
      statusCode: 400,
      code: "INVALID_USER_ID",
      message: "The provided user id is invalid.",
    });
  }

  try {
    const db = getDB();
    const bookmarks = await db
      .collection(BOOKMARKS_COLLECTION)
      .find({ userId: new ObjectId(userId) })
      .sort({ createdAt: 1 })
      .toArray();

    return sendSuccess(res, {
      message: "Bookmarks retrieved successfully.",
      data: bookmarks,
      meta: {
        count: bookmarks.length,
      },
    });
  } catch (error) {
    next(error);
  }
}

// Add tweet to bookmark
export async function addBookmarks(req, res, next) {
  const { tweetId } = req.body;
  const { userId } = req.params;
  const db = getDB();

  if (!ObjectId.isValid(tweetId)) {
    return res.status(400).json({
      statusCode: 400,
      status: "Error",
      message: "Invalid tweet Id",
    });
  }

  if (!ObjectId.isValid(userId)) {
    return res.status(400).json({
      statusCode: 400,
      status: "Error",
      message: "Invalid user Id",
    });
  }

  try {
    const existing = await db.collection(BOOKMARKS_COLLECTION).findOne({
      userId: new ObjectId(userId),
      tweetId: new ObjectId(tweetId),
    });

    if (existing) {
      return res.status(409).json({
        statusCode: 409,
        code: "BOOKMARK ALREADY EXISTS",
        message: "Already bookmarked",
      });
    }

    await db.collection(BOOKMARKS_COLLECTION).insertOne({
      userId: new ObjectId(userId),
      tweetId: new ObjectId(tweetId),
      createAt: new Date(),
    });

    return res.status(201).json({
      status: "success",
      statusCode: 201,
      message: "Bookmarked successfully",
    });
  } catch (err) {
    next(err);
  }
}

// Remove bookmark item
export async function deleteBookmarks(req, res, next) {
  const { userId, tweetId } = req.params;
  const db = getDB();

  if (!ObjectId.isValid(tweetId)) {
    return res.status(400).json({
      statusCode: 400,
      status: "Error",
      message: "Invalid tweet Id",
    });
  }

  try {
    const existing = await db
      .collection(BOOKMARKS_COLLECTION)
      .findOne({ tweetId: new ObjectId(tweetId) });

    if (!existing) {
      return res.status(400).json({
        statusCode: 400,
        status: "Error",
        message: "Bookmark not found",
      });
    }

    await db.collection(BOOKMARKS_COLLECTION).deleteOne({
      tweetId: new ObjectId(tweetId),
      userId: new ObjectId(userId),
    });

    return res.status(200).json({
      statusCode: 200,
      status: "success",
      message: "Bookmark removed",
    });
  } catch (err) {
    next(err);
  }
}
