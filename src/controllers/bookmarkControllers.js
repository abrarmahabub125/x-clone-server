import { ObjectId } from "mongodb";

import { sendError, sendSuccess } from "../utils/apiResponse.js";
import { getDB } from "../config/db.js";

const BOOKMARKS_COLLECTION = "bookmarks";

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

export async function addBookmarks(req, res) {
  return sendError(res, {
    statusCode: 501,
    code: "NOT_IMPLEMENTED",
    message: "Bookmark creation is not implemented yet.",
  });
}

export async function deleteBookmarks(req, res) {
  return sendError(res, {
    statusCode: 501,
    code: "NOT_IMPLEMENTED",
    message: "Bookmark removal is not implemented yet.",
  });
}
