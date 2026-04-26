import { ObjectId } from "mongodb";
import { getDB, client } from "../config/db.js";
import { sendError, sendSuccess } from "../utils/apiResponse.js";
import {
  buildTweetCardProjection,
  buildViewerEngagementLookupStages,
  LIKES_COLLECTION,
} from "../utils/tweetAggregation.js";
import updateProfileSchema from "../validations/updateProfileSchema.js";

const USERS_COLLECTION = "users";
const PROFILES_COLLECTION = "profiles";
const TWEETS_COLLECTION = "tweets";

const toObjectId = (id) => new ObjectId(id);
const isValidObjectId = (id) => ObjectId.isValid(id);

function buildUserPostsPipeline(userId, viewerId, { onlyMedia = false } = {}) {
  return [
    {
      $match: {
        userId,
        ...(onlyMedia && {
          $or: [
            { media: { $type: "string", $ne: "" } },
            { "media.0": { $exists: true } },
          ],
        }),
      },
    },
    {
      $lookup: {
        from: PROFILES_COLLECTION,
        localField: "userId",
        foreignField: "userId",
        as: "user",
      },
    },
    { $unwind: "$user" },
    ...buildViewerEngagementLookupStages(viewerId),
    { $project: buildTweetCardProjection() },
    { $sort: { createdAt: -1 } },
  ];
}

function buildUserLikesPipeline(userId, viewerId) {
  return [
    { $match: { userId } },
    { $sort: { createdAt: -1 } },
    {
      $lookup: {
        from: TWEETS_COLLECTION,
        localField: "tweetId",
        foreignField: "_id",
        as: "tweet",
      },
    },
    { $unwind: "$tweet" },
    {
      $lookup: {
        from: PROFILES_COLLECTION,
        localField: "tweet.userId",
        foreignField: "userId",
        as: "user",
      },
    },
    { $unwind: "$user" },
    ...buildViewerEngagementLookupStages(viewerId, "$tweet._id"),
    {
      $project: buildTweetCardProjection({
        _id: "$tweet._id",
        userId: "$tweet.userId",
        content: "$tweet.content",
        media: "$tweet.media",
        likesCount: "$tweet.likesCount",
        commentsCount: "$tweet.commentsCount",
        viewsCount: "$tweet.viewsCount",
        retweetsCount: "$tweet.retweetsCount",
        createdAt: "$tweet.createdAt",
        "user.fullName": "$user.fullName",
        "user.username": "$user.username",
        "user.profilePic": "$user.profilePic",
      }),
    },
  ];
}

export async function getProfile(req, res, next) {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return sendError(res, {
        statusCode: 400,
        code: "INVALID_USER_ID",
        message: "Invalid user ID.",
      });
    }

    const db = getDB();
    const userId = toObjectId(id);

    const user = await db
      .collection(USERS_COLLECTION)
      .findOne({ _id: userId }, { projection: { fullName: 1 } });

    if (!user) {
      return sendError(res, {
        statusCode: 404,
        code: "USER_NOT_FOUND",
        message: "User not found.",
      });
    }

    const profile = await db
      .collection(PROFILES_COLLECTION)
      .findOne({ userId });

    if (!profile) {
      return sendError(res, {
        statusCode: 404,
        code: "PROFILE_NOT_FOUND",
        message: "Profile not found.",
      });
    }

    return sendSuccess(res, {
      message: "Profile fetched.",
      data: {
        ...profile,
        fullName: user.fullName,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function updateProfile(req, res, next) {
  try {
    const db = getDB();
    const user = req.user;

    if (!user?.id || !isValidObjectId(user.id)) {
      return sendError(res, {
        statusCode: 401,
        code: "INVALID_TOKEN",
        message: "Unauthorized.",
      });
    }

    const parsed = await updateProfileSchema.safeParseAsync(req.body);

    if (!parsed.success) {
      throw createValidationError(parsed.error.issues, "Validation failed.");
    }

    const { fullName, username, bio, location, profilePic, coverPhoto } =
      parsed.data;

    const userId = toObjectId(user.id);

    const existing = await db.collection(PROFILES_COLLECTION).findOne({
      username,
      userId: { $ne: userId },
    });

    if (existing) {
      return sendError(res, {
        statusCode: 409,
        code: "USERNAME_TAKEN",
        message: "Username already taken.",
      });
    }

    const session = client.startSession();
    const updatedAt = new Date();

    try {
      await session.withTransaction(async () => {
        await db
          .collection(USERS_COLLECTION)
          .updateOne(
            { _id: userId },
            { $set: { fullName, updatedAt } },
            { session },
          );

        await db.collection(PROFILES_COLLECTION).updateOne(
          { userId },
          {
            $set: {
              fullName,
              username,
              bio,
              location,
              profilePic,
              coverPhoto,
              updatedAt,
            },
          },
          { session },
        );
      });
    } finally {
      await session.endSession();
    }

    return sendSuccess(res, {
      message: "Profile updated.",
      data: { fullName, bio, location, profilePic, coverPhoto },
    });
  } catch (error) {
    next(error);
  }
}

export async function getUserPosts(req, res, next) {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return sendError(res, {
        statusCode: 400,
        code: "INVALID_USER_ID",
        message: "Invalid user ID.",
      });
    }

    const db = getDB();

    const posts = await db
      .collection(TWEETS_COLLECTION)
      .aggregate(
        buildUserPostsPipeline(toObjectId(id), toObjectId(req.user.id)),
      )
      .toArray();

    return sendSuccess(res, {
      message: "Posts fetched.",
      data: posts,
      meta: { count: posts.length },
    });
  } catch (error) {
    next(error);
  }
}

export async function getUserMedia(req, res, next) {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return sendError(res, {
        statusCode: 400,
        code: "INVALID_USER_ID",
        message: "Invalid user ID.",
      });
    }

    const db = getDB();

    const posts = await db
      .collection(TWEETS_COLLECTION)
      .aggregate(
        buildUserPostsPipeline(toObjectId(id), toObjectId(req.user.id), {
          onlyMedia: true,
        }),
      )
      .toArray();

    return sendSuccess(res, {
      message: "Media fetched.",
      data: posts,
      meta: { count: posts.length },
    });
  } catch (error) {
    next(error);
  }
}

export async function getUserLikes(req, res, next) {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return sendError(res, {
        statusCode: 400,
        code: "INVALID_USER_ID",
        message: "Invalid user ID.",
      });
    }

    const db = getDB();

    const posts = await db
      .collection(LIKES_COLLECTION)
      .aggregate(
        buildUserLikesPipeline(toObjectId(id), toObjectId(req.user.id)),
      )
      .toArray();

    return sendSuccess(res, {
      message: "Likes fetched.",
      data: posts,
      meta: { count: posts.length },
    });
  } catch (error) {
    next(error);
  }
}

export async function getUserReplies(req, res) {
  return sendError(res, {
    statusCode: 501,
    code: "NOT_IMPLEMENTED",
    message: "Not implemented.",
  });
}
