import { ObjectId } from "mongodb";

import { sendError, sendSuccess } from "../utils/apiResponse.js";
import { getDB } from "../config/db.js";
import {
  buildTweetCardProjection,
  buildViewerEngagementLookupStages,
} from "../utils/tweetAggregation.js";

const BOOKMARKS_COLLECTION = "bookmarks";

// Get all bookmarks following user id
export async function getBookmarks(req, res, next) {
  const userId = req.user.id;
  const db = getDB();

  try {
    const bookmarks = await db
      .collection(BOOKMARKS_COLLECTION)
      .aggregate([
        {
          $match: {
            userId: new ObjectId(userId),
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
        ...buildViewerEngagementLookupStages(new ObjectId(userId), "$tweet._id"),
        {
          $project: buildTweetCardProjection({
            _id: "$tweet._id",
            userId: "$tweet.userId",
            content: "$tweet.content",
            media: "$tweet.media",
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
      statusCode: 200,
      status: "success",
      data: bookmarks,
    });
  } catch (err) {
    next(err);
  }
}

export async function addBookmarks(req, res, next) {
  const userId = req.user.id;
  const { tweetId } = req.body;
  const db = getDB();

  if (!ObjectId.isValid(tweetId)) {
    return res.status(400).json({
      message: "Invalid tweet id",
    });
  }

  const existing = await db
    .collection(BOOKMARKS_COLLECTION)
    .findOne({ userId: new ObjectId(userId), tweetId: new ObjectId(tweetId) });

  if (existing) {
    return sendError(res, {
      statusCode: 409,
      status: "Error",
      message: "Tweet already bookmarked!",
    });
  }
  try {
    await db.collection(BOOKMARKS_COLLECTION).insertOne({
      userId: new ObjectId(userId),
      tweetId: new ObjectId(tweetId),
      createdAt: new Date(),
    });

    return res.status(201).json({
      statusCode: 201,
      status: "Success",
      message: "Bookmarked successfully",
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteBookmarks(req, res, next) {
  const userId = req.user.id;
  const { tweetId } = req.params;
  const db = getDB();

  if (!ObjectId.isValid(tweetId)) {
    return res.status(400).json({
      message: "Invalid tweet id",
    });
  }

  try {
    const result = await db.collection(BOOKMARKS_COLLECTION).deleteOne({
      userId: new ObjectId(userId),
      tweetId: new ObjectId(tweetId),
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        message: "Bookmark not found",
      });
    }

    return res.status(200).json({
      message: "Removed from bookmarks",
    });
  } catch (err) {
    next(err);
  }
}
