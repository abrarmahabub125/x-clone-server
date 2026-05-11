import { ObjectId } from "mongodb";
import { getDB } from "../config/db.js";
import { createAppError } from "../utils/apiError.js";
import { sendSuccess } from "../utils/apiResponse.js";

const PROFILES_COLLECTION = "profiles";
const FOLLOW_COLLECTION = "relations";

/**
 * Get users to follow - exclude logged in user and already followed users
 */
export async function getWhoToFollow(req, res, next) {
  const loggedInUserId = new ObjectId(req.user.id);
  const limit = Math.min(Number(req.query.limit) || 10, 50); // Cap at 50 to prevent abuse

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
        { $limit: limit },
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

    return sendSuccess(res, {
      message: "Suggested users retrieved successfully.",
      data: peopleWhoToFollow,
      meta: {
        count: peopleWhoToFollow.length,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get top creators - exclude logged in user and already followed users
 */
export async function getCreators(req, res, next) {
  const loggedInUserId = new ObjectId(req.user.id);
  const limit = Math.min(Number(req.query.limit) || 10, 50); // Cap at 50 to prevent abuse

  try {
    const db = getDB();

    const creators = await db
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
        { $limit: limit },
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

    return sendSuccess(res, {
      message: "Top creators retrieved successfully.",
      data: creators,
      meta: {
        count: creators.length,
      },
    });
  } catch (error) {
    next(error);
  }
}

// --------- Follow Status & Actions ---------

/**
 * Get follow status between two users
 */
export async function getFollowStatus(req, res, next) {
  try {
    const { followingId } = req.params;
    const followerId = new ObjectId(req.user.id);

    // Validate ObjectId
    if (!ObjectId.isValid(followingId)) {
      throw createAppError({
        statusCode: 400,
        code: "INVALID_USER_ID",
        message: "Invalid user ID format.",
      });
    }

    const followingIdObj = new ObjectId(followingId);
    const db = getDB();

    const exists = await db.collection(FOLLOW_COLLECTION).findOne({
      followerId,
      followingId: followingIdObj,
    });

    return sendSuccess(res, {
      message: "Follow status retrieved successfully.",
      data: {
        isFollowing: !!exists,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Follow a user
 */
export async function followUser(req, res, next) {
  try {
    const { followingId } = req.params;
    const followerId = new ObjectId(req.user.id);

    // Validate ObjectId
    if (!ObjectId.isValid(followingId)) {
      throw createAppError({
        statusCode: 400,
        code: "INVALID_USER_ID",
        message: "Invalid user ID format.",
      });
    }

    const followingIdObj = new ObjectId(followingId);

    // Prevent self-follow
    if (followerId.equals(followingIdObj)) {
      throw createAppError({
        statusCode: 400,
        code: "CANNOT_FOLLOW_SELF",
        message: "You cannot follow yourself.",
      });
    }

    const db = getDB();

    // Check if already following
    const existing = await db.collection(FOLLOW_COLLECTION).findOne({
      followerId,
      followingId: followingIdObj,
    });

    if (existing) {
      throw createAppError({
        statusCode: 409,
        code: "ALREADY_FOLLOWING",
        message: "You're already following this user.",
      });
    }

    // Create follow relationship
    await db.collection(FOLLOW_COLLECTION).insertOne({
      followerId,
      followingId: followingIdObj,
      createdAt: new Date(),
    });

    // Update follower's following list
    await db.collection(PROFILES_COLLECTION).updateOne(
      { userId: followerId },
      {
        $addToSet: { following: followingIdObj },
      },
    );

    // Update followee's followers list
    await db.collection(PROFILES_COLLECTION).updateOne(
      { userId: followingIdObj },
      {
        $addToSet: { followers: followerId },
      },
    );

    return sendSuccess(res, {
      statusCode: 201,
      message: "User followed successfully.",
      data: {
        followingId: followingIdObj.toString(),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Unfollow a user
 */
export async function unfollowUser(req, res, next) {
  try {
    const { followingId } = req.params;
    const followerId = new ObjectId(req.user.id);

    // Validate ObjectId
    if (!ObjectId.isValid(followingId)) {
      throw createAppError({
        statusCode: 400,
        code: "INVALID_USER_ID",
        message: "Invalid user ID format.",
      });
    }

    const followingIdObj = new ObjectId(followingId);
    const db = getDB();

    // Delete follow relationship
    const result = await db.collection(FOLLOW_COLLECTION).deleteOne({
      followerId,
      followingId: followingIdObj,
    });

    if (result.deletedCount === 0) {
      throw createAppError({
        statusCode: 404,
        code: "NOT_FOLLOWING",
        message: "You're not following this user.",
      });
    }

    // Update follower's following list
    await db.collection(PROFILES_COLLECTION).updateOne(
      { userId: followerId },
      {
        $pull: { following: followingIdObj },
      },
    );

    // Update followee's followers list
    await db.collection(PROFILES_COLLECTION).updateOne(
      { userId: followingIdObj },
      {
        $pull: { followers: followerId },
      },
    );

    return sendSuccess(res, {
      message: "User unfollowed successfully.",
      data: {
        followingId: followingIdObj.toString(),
      },
    });
  } catch (error) {
    next(error);
  }
}
