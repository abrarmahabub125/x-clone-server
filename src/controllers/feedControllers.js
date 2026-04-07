import { ObjectId } from "mongodb";
import { getDB } from "../config/db.js";

function buildUserPostsPipelineForFeed(userObjectId) {
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
      .aggregate(buildUserPostsPipelineForFeed(new ObjectId(loggedInUserId)))
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
  res.send("following feed");
}
