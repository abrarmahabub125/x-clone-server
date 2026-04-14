import { ObjectId } from "mongodb";

import { getDB } from "../config/db.js";
import { sendError, sendSuccess } from "../utils/apiResponse.js";
import {
  buildTweetCardProjection,
  buildViewerEngagementLookupStages,
  LIKES_COLLECTION,
} from "../utils/tweetAggregation.js";

const USERS_COLLECTION = "users";
const PROFILES_COLLECTION = "profiles";
const TWEETS_COLLECTION = "tweets";

function buildUserPostsPipeline(
  userObjectId,
  loggedInUserObjectId,
  options = {},
) {
  const { onlyMedia = false } = options;

  return [
    {
      $match: {
        userId: userObjectId,
        ...(onlyMedia && {
          $or: [
            {
              media: {
                $type: "string",
                $ne: "",
              },
            },
            {
              "media.0": { $exists: true },
            },
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

function buildUserLikesPipeline(userObjectId, loggedInUserObjectId) {
  return [
    {
      $match: {
        userId: userObjectId,
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      $lookup: {
        from: TWEETS_COLLECTION,
        localField: "tweetId",
        foreignField: "_id",
        as: "tweet",
      },
    },
    {
      $unwind: "$tweet",
    },
    {
      $lookup: {
        from: PROFILES_COLLECTION,
        localField: "tweet.userId",
        foreignField: "userId",
        as: "user",
      },
    },
    {
      $unwind: "$user",
    },
    ...buildViewerEngagementLookupStages(loggedInUserObjectId, "$tweet._id"),
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

    if (!ObjectId.isValid(id)) {
      return sendError(res, {
        statusCode: 400,
        code: "INVALID_USER_ID",
        message: "The provided user id is invalid.",
      });
    }

    const db = getDB();
    const userObjectId = new ObjectId(id);
    const userFullName = await db
      .collection(USERS_COLLECTION)
      .findOne({ _id: userObjectId }, { projection: { fullName: 1 } });

    if (!userFullName) {
      return sendError(res, {
        statusCode: 404,
        code: "USER_NOT_FOUND",
        message: "No user was found for the provided id.",
      });
    }

    const userProfile = await db.collection(PROFILES_COLLECTION).findOne({
      userId: userObjectId,
    });

    if (!userProfile) {
      return sendError(res, {
        statusCode: 404,
        code: "PROFILE_NOT_FOUND",
        message: "No profile was found for the provided user id.",
      });
    }

    return sendSuccess(res, {
      message: "Profile retrieved successfully.",
      data: {
        ...userProfile,
        fullName: userFullName.fullName,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getUserPosts(req, res, next) {
  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    return sendError(res, {
      statusCode: 400,
      code: "INVALID_USER_ID",
      message: "The provided user id is invalid.",
    });
  }

  try {
    const db = getDB();
    const posts = await db
      .collection(TWEETS_COLLECTION)
      .aggregate(
        buildUserPostsPipeline(new ObjectId(id), new ObjectId(req.user.id)),
      )
      .toArray();

    return sendSuccess(res, {
      message: "User posts retrieved successfully.",
      data: posts,
      meta: {
        count: posts.length,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getUserReplies(req, res) {
  return sendError(res, {
    statusCode: 501,
    code: "NOT_IMPLEMENTED",
    message: "User replies retrieval is not implemented yet.",
  });
}

export async function getUserMedia(req, res, next) {
  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    return sendError(res, {
      statusCode: 400,
      code: "INVALID_USER_ID",
      message: "The provided user id is invalid.",
    });
  }

  try {
    const db = getDB();
    const posts = await db
      .collection(TWEETS_COLLECTION)
      .aggregate(
        buildUserPostsPipeline(new ObjectId(id), new ObjectId(req.user.id), {
          onlyMedia: true,
        }),
      )
      .toArray();

    return sendSuccess(res, {
      message: "User medias retrieved successfully.",
      data: posts,
      meta: {
        count: posts.length,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getUserLikes(req, res, next) {
  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    return sendError(res, {
      statusCode: 400,
      code: "INVALID_USER_ID",
      message: "The provided user id is invalid.",
    });
  }

  try {
    const db = getDB();
    const posts = await db
      .collection(LIKES_COLLECTION)
      .aggregate(
        buildUserLikesPipeline(new ObjectId(id), new ObjectId(req.user.id)),
      )
      .toArray();

    return sendSuccess(res, {
      message: "User likes retrieved successfully.",
      data: posts,
      meta: {
        count: posts.length,
      },
    });
  } catch (error) {
    next(error);
  }
}
