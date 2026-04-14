import { ObjectId } from "mongodb";
import { getDB } from "../config/db.js";
import {
  buildTweetCardProjection,
  buildViewerEngagementLookupStages,
} from "../utils/tweetAggregation.js";

function buildFeedPostsPipeline(userObjectId, loggedInUserObjectId) {
  return [
    {
      $match: {
        userId: { $ne: userObjectId },
      },
    },
    {
      // Join profile data once so every tweet card includes its author fields.
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
    ...buildViewerEngagementLookupStages(loggedInUserObjectId),
    {
      $project: buildTweetCardProjection(),
    },
    {
      $sort: { createdAt: -1 },
    },
  ];
}

export async function forYouFeed(req, res, next) {
  const db = getDB();
  const loggedInUserId = req.user.id;

  try {
    const feedPosts = await db
      .collection("tweets")
      .aggregate(
        buildFeedPostsPipeline(
          new ObjectId(loggedInUserId),
          new ObjectId(loggedInUserId),
        ),
      )
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).json({
      message: "Feed posts retrieved successfully.",
      data: feedPosts,
    });
  } catch (err) {
    next(err);
  }
}
export async function followingFeed(req, res, next) {
  const db = getDB();
  const loggedInUserId = req.user.id;

  try {
    const followingPost = await db
      .collection("tweets")
      .aggregate(
        buildFeedPostsPipeline(
          new ObjectId(loggedInUserId),
          new ObjectId(loggedInUserId),
        ),
      )
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).json({
      message: "Feed posts retrieved successfully.",
      data: followingPost,
    });
  } catch (err) {
    next(err);
  }
}
