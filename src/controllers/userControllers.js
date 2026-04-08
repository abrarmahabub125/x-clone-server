import { ObjectId } from "mongodb";

import { getDB } from "../config/db.js";
import { sendError, sendSuccess } from "../utils/apiResponse.js";

const USERS_COLLECTION = "users";
const PROFILES_COLLECTION = "profiles";
const TWEETS_COLLECTION = "tweets";
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

function buildUserPostsPipeline(userObjectId, loggedInUserObjectId) {
  return [
    {
      $match: {
        userId: userObjectId,
      },
    },
    {
      // Join profile data once so every tweet card includes its author fields.
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
    const userFullName = await db.collection(USERS_COLLECTION).findOne(
      { _id: userObjectId },
      { projection: { fullName: 1 } },
    );

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
        buildUserPostsPipeline(
          new ObjectId(id),
          new ObjectId(req.user.id),
        ),
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

export async function getUserMedia(req, res) {
  return sendError(res, {
    statusCode: 501,
    code: "NOT_IMPLEMENTED",
    message: "User media retrieval is not implemented yet.",
  });
}

export async function getUserLikes(req, res) {
  return sendError(res, {
    statusCode: 501,
    code: "NOT_IMPLEMENTED",
    message: "User likes retrieval is not implemented yet.",
  });
}
