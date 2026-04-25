import { ObjectId } from "mongodb";
import { getDB } from "../config/db.js";
import { sendSuccess } from "../utils/apiResponse.js";

const PROFILES_COLLECTION = "profiles";
const FOLLOW_COLLECTION = "relations";

/**
 * find user who are not Followed
 *  skip logged in user
 */

export async function getWhoToFollow(req, res, next) {
  const loggedInUserId = new ObjectId(req.user.id);
  const { limit } = req.query;

  console.log(limit);

  try {
    const db = getDB();

    const peopleWhoToFollow = await db
      .collection(PROFILES_COLLECTION)
      .aggregate([
        { $match: { userId: { $ne: loggedInUserId } } },
        {
          $lookup: {
            from: FOLLOW_COLLECTION,
            let: { userID: "$userId" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$followerId", loggedInUserId] },
                      { $eq: ["$followingId", "$$userID"] },
                    ],
                  },
                },
              },
            ],
            as: "followData",
          },
        },
        {
          $match: {
            followData: { $size: 0 },
          },
        },
        { $limit: Number(limit) },
        {
          $project: {
            followData: 0,
            coverPhoto: 0,
            location: 0,
            totalPost: 0,
            followers: 0,
            following: 0,
          },
        },
      ])
      .toArray();

    res.status(200).json({
      success: true,
      message: "Suggestion found",
      data: peopleWhoToFollow,
    });
  } catch (err) {
    next(err);
  }
}

export async function getCreators(req, res, next) {
  const loggedInUserId = new ObjectId(req.user.id);
  const { limit } = req.query;

  try {
    const db = getDB();

    const peopleWhoToFollow = await db
      .collection(PROFILES_COLLECTION)
      .aggregate([
        { $match: { userId: { $ne: loggedInUserId } } },
        {
          $lookup: {
            from: FOLLOW_COLLECTION,
            let: { userID: "$userId" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$followerId", loggedInUserId] },
                      { $eq: ["$followingId", "$$userID"] },
                    ],
                  },
                },
              },
            ],
            as: "followData",
          },
        },
        {
          $match: {
            followData: { $size: 0 },
          },
        },
        {
          $project: {
            followData: 0,
            coverPhoto: 0,
            location: 0,
            totalPost: 0,
            followers: 0,
            following: 0,
          },
        },
      ])
      .toArray();

    res.status(200).json({
      success: true,
      message: "Suggestion found",
      data: peopleWhoToFollow,
    });
  } catch (err) {
    next(err);
  }
}

// ------------------------- Follow controllers ---------------------------

// Check is following
export async function getFollowStatus(req, res, next) {
  const db = getDB();
  const followerId = new ObjectId(req.user.id);
  const followingId = new ObjectId(req.params.followingId);

  const exists = await db.collection(FOLLOW_COLLECTION).findOne({
    followerId,
    followingId,
  });

  res.json({ isFollowing: !!exists });
}

// Follow user
export async function followUser(req, res, next) {
  const db = getDB();
  const followerId = new ObjectId(req.user.id); //  following update +1
  const followingId = new ObjectId(req.params.followingId); // follower update +1

  // check is user trying to follow yourself
  if (followerId.equals(followingId)) {
    return res.status(400).json({ message: "You cannot follow yourself." });
  }

  try {
    const existing = await db.collection(FOLLOW_COLLECTION).findOne({
      followerId,
      followingId,
    });

    if (existing) {
      return res.status(409).json({ message: "Already following." });
    }

    await db.collection(FOLLOW_COLLECTION).insertOne({
      followerId,
      followingId,
      createdAt: new Date(),
    });

    await db.collection(PROFILES_COLLECTION).updateOne(
      { userId: followerId },
      {
        $addToSet: { following: followingId },
      },
    );

    await db.collection(PROFILES_COLLECTION).updateOne(
      { userId: followingId },
      {
        $addToSet: { followers: followerId },
      },
    );

    return res.status(201).json({ message: "Followed successfully." });
  } catch (err) {
    return res.status(500).json({ message: "Something went wrong." });
  }
}
// Unfollow user
export async function unfollowUser(req, res, next) {
  const db = getDB();
  const followerId = new ObjectId(req.user.id);
  const followingId = new ObjectId(req.params.followingId);

  try {
    const result = await db.collection(FOLLOW_COLLECTION).deleteOne({
      followerId,
      followingId,
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Not following this user." });
    }

    await db.collection(PROFILES_COLLECTION).updateOne(
      { userId: followerId },
      {
        $pull: { following: followingId },
      },
    );

    await db.collection(PROFILES_COLLECTION).updateOne(
      { userId: followingId },
      {
        $pull: { followers: followerId },
      },
    );

    return res.status(200).json({ message: "Unfollowed successfully." });
  } catch (err) {
    return res.status(500).json({ message: "Something went wrong." });
  }
}
