import { ObjectId } from "mongodb";

import { getDB } from "../config/db.js";
import { createAppError } from "../utils/apiError.js";
import { sendSuccess } from "../utils/apiResponse.js";
import {
  buildTweetCardProjection,
  buildViewerEngagementLookupStages,
} from "../utils/tweetAggregation.js";

/**
 * Search for users and tweets
 */
export async function findResults(req, res, next) {
  try {
    const { q } = req.query;

    // Validate query parameter
    if (!q || typeof q !== "string" || q.trim().length === 0) {
      throw createAppError({
        statusCode: 400,
        code: "SEARCH_QUERY_REQUIRED",
        message: "Search query is required.",
      });
    }

    const searchQuery = q.trim();
    const db = getDB();
    const words = searchQuery.split(" ").filter(Boolean);

    // Search users by full name
    const userResult = await db
      .collection("profiles")
      .find({
        $or: words.map((word) => ({
          fullName: { $regex: word, $options: "i" },
        })),
      })
      .sort({ fullName: 1 })
      .limit(15)
      .toArray();

    // Search tweets by content
    const tweetResult = await db
      .collection("tweets")
      .aggregate([
        {
          $match: words.length
            ? {
                content: {
                  $regex: words.join("|"),
                  $options: "i",
                },
              }
            : {},
        },
        {
          $lookup: {
            from: "profiles",
            localField: "userId",
            foreignField: "userId",
            as: "user",
          },
        },
        {
          $unwind: "$user",
        },
        ...buildViewerEngagementLookupStages(new ObjectId(req.user.id)),
        {
          $project: buildTweetCardProjection(),
        },
        {
          $sort: { createdAt: -1 },
        },
        {
          $limit: 15,
        },
      ])
      .toArray();

    return sendSuccess(res, {
      message: "Search results retrieved successfully.",
      data: {
        users: userResult,
        tweets: tweetResult,
      },
      meta: {
        query: searchQuery,
        userCount: userResult.length,
        tweetCount: tweetResult.length,
      },
    });
  } catch (error) {
    next(error);
  }
}
