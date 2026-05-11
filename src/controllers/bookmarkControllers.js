import { ObjectId } from "mongodb";

import { getDB } from "../config/db.js";
import { createAppError } from "../utils/apiError.js";
import { sendSuccess } from "../utils/apiResponse.js";
import {
  buildTweetCardProjection,
  buildViewerEngagementLookupStages,
} from "../utils/tweetAggregation.js";

const BOOKMARKS_COLLECTION = "bookmarks";

/**
 * Get all bookmarks for the authenticated user
 */
export async function getBookmarks(req, res, next) {
  try {
    const userId = new ObjectId(req.user.id);
    const db = getDB();

    const bookmarks = await db
      .collection(BOOKMARKS_COLLECTION)
      .aggregate([
        {
          $match: {
            userId,
          },
        },
        {
          $sort: {
            createdAt: -1,
          },
        },
        {
          $lookup: {
            from: "tweets",
            localField: "tweetId",
            foreignField: "_id",
            as: "tweet",
          },
        },
        {
          $unwind: "$tweet",
        },
        {
          $lookup: {
            from: "profiles",
            localField: "tweet.userId",
            foreignField: "userId",
            as: "user",
          },
        },
        {
          $unwind: "$user",
        },
        ...buildViewerEngagementLookupStages(userId, "$tweet._id"),
        {
          $project: buildTweetCardProjection({
            _id: "$tweet._id",
            userId: "$tweet.userId",
            content: "$tweet.content",
            media: "$tweet.media",
            location: "$tweet.location",
            likesCount: "$tweet.likesCount",
            commentsCount: "$tweet.commentsCount",
            viewsCount: "$tweet.viewsCount",
            retweetsCount: "$tweet.retweetsCount",
            createdAt: "$tweet.createdAt",
            "user.fullName": "$user.fullName",
            "user.username": "$user.username",
            "user.profilePic": "$user.profilePic",
          }),
        },
      ])
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

/**
 * Add a bookmark
 */
export async function addBookmarks(req, res, next) {
  try {
    const userId = new ObjectId(req.user.id);
    const { tweetId } = req.body;

    // Validate input
    if (!tweetId) {
      throw createAppError({
        statusCode: 400,
        code: "TWEET_ID_REQUIRED",
        message: "Tweet ID is required to bookmark.",
      });
    }

    if (!ObjectId.isValid(tweetId)) {
      throw createAppError({
        statusCode: 400,
        code: "INVALID_TWEET_ID",
        message: "Invalid tweet ID format.",
      });
    }

    const tweetIdObj = new ObjectId(tweetId);
    const db = getDB();

    // Check if already bookmarked
    const existing = await db
      .collection(BOOKMARKS_COLLECTION)
      .findOne({ userId, tweetId: tweetIdObj });

    if (existing) {
      throw createAppError({
        statusCode: 409,
        code: "ALREADY_BOOKMARKED",
        message: "You've already bookmarked this post.",
      });
    }

    // Add bookmark
    await db.collection(BOOKMARKS_COLLECTION).insertOne({
      userId,
      tweetId: tweetIdObj,
      createdAt: new Date(),
    });

    return sendSuccess(res, {
      statusCode: 201,
      message: "Post bookmarked successfully.",
      data: {
        tweetId: tweetIdObj.toString(),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete a bookmark
 */
export async function deleteBookmarks(req, res, next) {
  try {
    const userId = new ObjectId(req.user.id);
    const { tweetId } = req.params;

    // Validate input
    if (!ObjectId.isValid(tweetId)) {
      throw createAppError({
        statusCode: 400,
        code: "INVALID_TWEET_ID",
        message: "Invalid tweet ID format.",
      });
    }

    const tweetIdObj = new ObjectId(tweetId);
    const db = getDB();

    // Delete bookmark
    const result = await db.collection(BOOKMARKS_COLLECTION).deleteOne({
      userId,
      tweetId: tweetIdObj,
    });

    if (result.deletedCount === 0) {
      throw createAppError({
        statusCode: 404,
        code: "NOT_BOOKMARKED",
        message: "You haven't bookmarked this post.",
      });
    }

    return sendSuccess(res, {
      message: "Post removed from bookmarks successfully.",
      data: {
        tweetId: tweetIdObj.toString(),
      },
    });
  } catch (error) {
    next(error);
  }
}
