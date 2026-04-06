import { ObjectId } from "mongodb";

import { getDB } from "../config/db.js";
import { createAppError, createValidationError } from "../utils/apiError.js";
import { sendError, sendSuccess } from "../utils/apiResponse.js";
import { tweetSchema } from "../validations/tweetSchema.js";

const TWEETS_COLLECTION = "tweets";

export async function getTweets(req, res) {
  return sendError(res, {
    statusCode: 501,
    code: "NOT_IMPLEMENTED",
    message: "Tweet feed retrieval is not implemented yet.",
  });
}

export async function getSingleTweet(req, res, next) {
  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    return sendError(res, {
      statusCode: 400,
      code: "INVALID_TWEET_ID",
      message: "The provided tweet id is invalid.",
    });
  }

  try {
    const db = getDB();
    const tweet = await db
      .collection(TWEETS_COLLECTION)
      .findOne({ _id: new ObjectId(id) });

    if (!tweet) {
      return sendError(res, {
        statusCode: 404,
        code: "TWEET_NOT_FOUND",
        message: "No tweet was found for the provided id.",
      });
    }

    return sendSuccess(res, {
      message: "Tweet retrieved successfully.",
      data: tweet,
    });
  } catch (error) {
    next(error);
  }
}

export async function getUserTweets(req, res, next) {
  const { userId } = req.params;

  if (!ObjectId.isValid(userId)) {
    return sendError(res, {
      statusCode: 400,
      code: "INVALID_USER_ID",
      message: "The provided user id is invalid.",
    });
  }

  try {
    const db = getDB();
    const tweets = await db
      .collection(TWEETS_COLLECTION)
      .find({ userId: new ObjectId(userId) })
      .sort({ createdAt: 1 })
      .toArray();

    return sendSuccess(res, {
      message: "User tweets retrieved successfully.",
      data: tweets,
      meta: {
        count: tweets.length,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function createTweet(req, res, next) {
  try {
    const result = await tweetSchema.safeParseAsync(req.body);

    if (!result.success) {
      throw createValidationError(
        result.error.issues,
        "Tweet request validation failed.",
      );
    }

    const {
      userId,
      content,
      media,
      likesCount,
      commentsCount,
      viewsCount,
      retweetsCount,
    } = result.data;

    if (!ObjectId.isValid(userId)) {
      return sendError(res, {
        statusCode: 400,
        code: "INVALID_USER_ID",
        message: "The provided user id is invalid.",
      });
    }

    const db = getDB();
    const tweetDocument = {
      userId: new ObjectId(userId),
      content,
      media,
      likesCount,
      commentsCount,
      viewsCount,
      retweetsCount,
      createdAt: new Date(),
    };

    const dbResponse = await db
      .collection(TWEETS_COLLECTION)
      .insertOne(tweetDocument);

    if (!dbResponse.insertedId) {
      throw createAppError({
        statusCode: 500,
        code: "TWEET_CREATION_FAILED",
        message: "We could not create the tweet. Please try again.",
      });
    }

    return sendSuccess(res, {
      statusCode: 201,
      message: "Tweet created successfully.",
      data: {
        tweetId: dbResponse.insertedId.toString(),
      },
    });
  } catch (error) {
    next(error);
  }
}
