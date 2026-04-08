import { ObjectId } from "mongodb";
import { getDB } from "../config/db.js";

const BOOKMARKS_COLLECTION = "bookmarks";

function buildBookmarkLookupStages(loggedInUserObjectId) {
  return [
    {
      $lookup: {
        from: BOOKMARKS_COLLECTION,
        let: {
          tweetId: "$_id",
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$tweetId", "$$tweetId"] },
                  { $eq: ["$userId", loggedInUserObjectId] },
                ],
              },
            },
          },
          {
            $limit: 1,
          },
        ],
        as: "bookmarkMatch",
      },
    },
    {
      $addFields: {
        isBookmarked: {
          $gt: [{ $size: "$bookmarkMatch" }, 0],
        },
      },
    },
  ];
}

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
    ...buildBookmarkLookupStages(loggedInUserObjectId),
    {
      $project: {
        _id: 1,
        userId: 1,
        content: 1,
        media: 1,
        likesCount: 1,
        commentsCount: 1,
        viewsCount: 1,
        retweetsCount: 1,
        createdAt: 1,
        isBookmarked: 1,
        "user.fullName": 1,
        "user.username": 1,
        "user.profilePic": 1,
      },
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
