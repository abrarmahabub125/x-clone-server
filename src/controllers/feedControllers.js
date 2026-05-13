import { ObjectId } from "mongodb";
import { getDB } from "../config/db.js";
import { sendSuccess } from "../utils/apiResponse.js";
import {
  buildTweetCardProjection,
  buildViewerEngagementLookupStages,
} from "../utils/tweetAggregation.js";

/**
 * Normalize and validate pagination limit
 * @param {*} limit - Limit from query
 * @param {number} fallback - Default limit
 * @returns {number} - Normalized limit (1-50)
 */
function normalizeFeedLimit(limit, fallback = 10) {
  const parsedLimit = Number(limit);

  if (!Number.isFinite(parsedLimit) || parsedLimit < 1) {
    return fallback;
  }

  return Math.min(parsedLimit, 50);
}

/**
 * Get "For You" feed - mixed posts from all users (alternating followed and non-followed)
 */
export async function forYouFeed(req, res, next) {
  try {
    const db = getDB();
    const loggedInUserId = new ObjectId(req.user.id);
    const { cursor, limit = 10 } = req.query;
    const parsedLimit = normalizeFeedLimit(limit);

    const matchStage = {
      userId: { $ne: loggedInUserId },
    };

    if (cursor && ObjectId.isValid(cursor)) {
      matchStage._id = {
        $lt: new ObjectId(cursor),
      };
    }

    const feedPosts = await db
      .collection("tweets")
      .aggregate([
        {
          $match: matchStage,
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
        {
          $lookup: {
            from: "relations",
            let: { postUserId: "$userId" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$followerId", loggedInUserId] },
                      { $eq: ["$followingId", "$$postUserId"] },
                    ],
                  },
                },
              },
              {
                $limit: 1,
              },
            ],
            as: "followingMatch",
          },
        },
        {
          $addFields: {
            isUserFollowed: {
              $gt: [{ $size: "$followingMatch" }, 0],
            },
          },
        },
        ...buildViewerEngagementLookupStages(loggedInUserId),
        {
          $sort: { _id: -1 },
        },
        {
          $limit: parsedLimit + 1,
        },
        {
          $project: buildTweetCardProjection({ isUserFollowed: 1 }),
        },
      ])
      .toArray();

    const visiblePosts = feedPosts.slice(0, parsedLimit);
    const nextCursor =
      visiblePosts.length > 0
        ? visiblePosts[visiblePosts.length - 1]._id
        : null;
    const hasMore = feedPosts.length > parsedLimit;

    return sendSuccess(res, {
      message: "For You feed retrieved successfully.",
      data: visiblePosts,
      meta: {
        count: visiblePosts.length,
        nextCursor,
        hasMore,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get following feed - posts from users you follow
 */
export async function followingFeed(req, res, next) {
  try {
    const db = getDB();
    const loggedInUserId = new ObjectId(req.user.id);
    const { cursor, limit = 10 } = req.query;
    const parsedLimit = normalizeFeedLimit(limit);

    const followingPosts = await db
      .collection("relations")
      .aggregate([
        {
          $match: {
            followerId: loggedInUserId,
          },
        },
        {
          $lookup: {
            from: "tweets",
            localField: "followingId",
            foreignField: "userId",
            as: "tweets",
          },
        },
        {
          $unwind: "$tweets",
        },
        {
          $replaceRoot: {
            newRoot: "$tweets",
          },
        },
        {
          $group: {
            _id: "$_id",
            tweet: {
              $first: "$$ROOT",
            },
          },
        },
        {
          $replaceRoot: {
            newRoot: "$tweet",
          },
        },
        ...(cursor && ObjectId.isValid(cursor)
          ? [
              {
                $match: {
                  _id: {
                    $lt: new ObjectId(cursor),
                  },
                },
              },
            ]
          : []),
        {
          $sort: {
            _id: -1,
          },
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
        ...buildViewerEngagementLookupStages(loggedInUserId),
        {
          $project: buildTweetCardProjection(),
        },
        {
          $limit: parsedLimit + 1,
        },
      ])
      .toArray();

    const visiblePosts = followingPosts.slice(0, parsedLimit);
    const nextCursor =
      visiblePosts.length > 0
        ? visiblePosts[visiblePosts.length - 1]._id
        : null;
    const hasMore = followingPosts.length > parsedLimit;

    return sendSuccess(res, {
      message: "Following feed retrieved successfully.",
      data: visiblePosts,
      meta: {
        count: visiblePosts.length,
        nextCursor,
        hasMore,
      },
    });
  } catch (error) {
    next(error);
  }
}
