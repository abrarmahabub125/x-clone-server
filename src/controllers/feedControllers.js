import { ObjectId } from "mongodb";
import { getDB } from "../config/db.js";
import {
  buildTweetCardProjection,
  buildViewerEngagementLookupStages,
} from "../utils/tweetAggregation.js";

export async function forYouFeed(req, res, next) {
  const db = getDB();
  const loggedInUserId = req.user.id;

  const { cursor, limit = 10 } = req.query;

  const matchStage = {
    userId: { $ne: new ObjectId(loggedInUserId) },
  };

  // SAFE CURSOR HANDLING
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
          $sort: { createdAt: -1 },
        },
        {
          $limit: Number(limit),
        },
        {
          $project: buildTweetCardProjection(),
        },
      ])
      .toArray();

    const nextCursor =
      feedPosts.length > 0 ? feedPosts[feedPosts.length - 1]._id : null;

    const hasMore = feedPosts.length === Number(limit);

    res.status(200).json({
      message: "Feed posts retrieved successfully.",
      nextCursor,
      hasMore,
      data: feedPosts,
    });
  } catch (err) {
    next(err);
  }
}

export async function followingFeed(req, res, next) {
  const db = getDB();
  const loggedInUserId = req.user.id;

  const { cursor, limit = 10 } = req.query;
  const parsedLimit = Number(limit);

  try {
    const followingPosts = await db
      .collection("relations")
      .aggregate([
        {
          $match: {
            followerId: new ObjectId(loggedInUserId),
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
            createdAt: -1,
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

        {
          $project: buildTweetCardProjection(),
        },

        // extra 1 item for hasMore check
        {
          $limit: parsedLimit + 1,
        },
      ])
      .toArray();

    const nextCursor =
      followingPosts.length > 0
        ? followingPosts[followingPosts.length - 1]._id
        : null;

    const hasMore = followingPosts.length === Number(limit);

    res.status(200).json({
      message: "Following posts retrieved successfully.",
      nextCursor,
      hasMore,
      data: followingPosts,
    });
  } catch (err) {
    next(err);
  }
}
