import { ObjectId } from "mongodb";
import { getDB } from "../config/db.js";

export async function getProfile(req, res, next) {
  try {
    const id = req.params.id;
    const db = getDB();

    // ✅ Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid user ID",
      });
    }

    const objectId = new ObjectId(id);

    // ✅ Fetch user name
    const userFullName = await db
      .collection("users")
      .findOne({ _id: objectId }, { projection: { fullName: 1 } });

    if (!userFullName) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // ✅ Fetch profile
    const userProfile = await db.collection("profiles").findOne({
      userId: objectId,
    });

    if (!userProfile) {
      return res.status(404).json({
        message: "Profile not found",
      });
    }

    // ✅ Merge data safely
    const profile = {
      ...userProfile,
      fullName: userFullName.fullName,
    };

    return res.status(200).json(profile);
  } catch (error) {
    // ✅ Pass to centralized error handler
    next(error);
  }
}

export async function getUserPosts(req, res, next) {
  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    return res.status(401).json({
      status: false,
      message: "User id is invalid!",
    });
  }

  try {
    const db = getDB();

    const posts = await db
      .collection("tweets")
      .aggregate([
        {
          $match: {
            userId: new ObjectId(id),
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
      ])
      .toArray();

    res.status(200).json({
      status: true,
      posts: posts,
    });
  } catch (err) {
    next(err);
  }
}
export async function getUserReplies(req, res, next) {
  res.send("user posts");
}
export async function getUserMedia(req, res, next) {
  res.send("user posts");
}
export async function getUserLikes(req, res, next) {
  res.send("user posts");
}
