import { ObjectId } from "mongodb";
import { getDB } from "../config/db.js";
import {
  buildTweetCardProjection,
  buildViewerEngagementLookupStages,
} from "../utils/tweetAggregation.js";

function normalizeFeedLimit(limit, fallback = 10) {
  const parsedLimit = Number(limit);

  if (!Number.isFinite(parsedLimit) || parsedLimit < 1) {
    return fallback;
  }

  return Math.min(parsedLimit, 50);
}

export async function forYouFeed(req, res, next) {
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

  try {
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
        ...buildViewerEngagementLookupStages(loggedInUserId),
        {
          $sort: { _id: -1 },
        },
        {
          $limit: parsedLimit + 1,
        },
        {
          $project: buildTweetCardProjection(),
        },
      ])
      .toArray();

    const visiblePosts = feedPosts.slice(0, parsedLimit);
    const nextCursor =
      visiblePosts.length > 0
        ? visiblePosts[visiblePosts.length - 1]._id
        : null;

    const hasMore = feedPosts.length > parsedLimit;

    res.status(200).json({
      message: "Feed posts retrieved successfully.",
      nextCursor,
      hasMore,
      data: visiblePosts,
    });
  } catch (err) {
    next(err);
  }
}

export async function followingFeed(req, res, next) {
  const db = getDB();
  const loggedInUserId = new ObjectId(req.user.id);

  const { cursor, limit = 10 } = req.query;
  const parsedLimit = normalizeFeedLimit(limit);

  try {
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

    res.status(200).json({
      message: "Following posts retrieved successfully.",
      nextCursor,
      hasMore,
      data: visiblePosts,
    });
  } catch (err) {
    next(err);
  }
}
