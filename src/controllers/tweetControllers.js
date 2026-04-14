import { ObjectId } from "mongodb";

import { getDB } from "../config/db.js";
import { createAppError, createValidationError } from "../utils/apiError.js";
import { sendError, sendSuccess } from "../utils/apiResponse.js";
import { LIKES_COLLECTION } from "../utils/tweetAggregation.js";
import { tweetSchema } from "../validations/tweetSchema.js";

const TWEETS_COLLECTION = "tweets";

function validateTweetId(res, tweetId) {
  if (ObjectId.isValid(tweetId)) {
    return true;
  }

  sendError(res, {
    statusCode: 400,
    code: "INVALID_TWEET_ID",
    message: "The provided tweet id is invalid.",
  });

  return false;
}

async function getTweetById(db, tweetObjectId) {
  return db
    .collection(TWEETS_COLLECTION)
    .findOne({ _id: tweetObjectId }, { projection: { likesCount: 1 } });
}

export async function getTweets(req, res) {
  return sendError(res, {
    statusCode: 501,
    code: "NOT_IMPLEMENTED",
    message: "Tweet feed retrieval is not implemented yet.",
  });
}

export async function getSingleTweet(req, res, next) {
  const { id } = req.params;

  if (!validateTweetId(res, id)) {
    return;
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

    await db
      .collection("profiles")
      .updateOne({ userId: new ObjectId(userId) }, { $inc: { totalPost: 1 } });

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

export async function likeTweet(req, res, next) {
  const { tweetId } = req.params;

  if (!validateTweetId(res, tweetId)) {
    return;
  }

  try {
    const db = getDB();
    const tweetObjectId = new ObjectId(tweetId);
    const loggedInUserObjectId = new ObjectId(req.user.id);
    const tweet = await getTweetById(db, tweetObjectId);

    if (!tweet) {
      return sendError(res, {
        statusCode: 404,
        code: "TWEET_NOT_FOUND",
        message: "No tweet was found for the provided id.",
      });
    }

    const existingLike = await db.collection(LIKES_COLLECTION).findOne({
      userId: loggedInUserObjectId,
      tweetId: tweetObjectId,
    });

    if (existingLike) {
      return sendError(res, {
        statusCode: 409,
        code: "TWEET_ALREADY_LIKED",
        message: "You have already liked this tweet.",
      });
    }

    await db.collection(LIKES_COLLECTION).insertOne({
      userId: loggedInUserObjectId,
      tweetId: tweetObjectId,
      createdAt: new Date(),
    });

    await db
      .collection(TWEETS_COLLECTION)
      .updateOne({ _id: tweetObjectId }, { $inc: { likesCount: 1 } });

    const updatedTweet = await getTweetById(db, tweetObjectId);
    const currentLikesCount = Number(tweet.likesCount) || 0;

    return sendSuccess(res, {
      statusCode: 201,
      message: "Tweet liked successfully.",
      data: {
        tweetId,
        isLiked: true,
        likesCount: updatedTweet?.likesCount ?? currentLikesCount + 1,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function unlikeTweet(req, res, next) {
  const { tweetId } = req.params;

  if (!validateTweetId(res, tweetId)) {
    return;
  }

  try {
    const db = getDB();
    const tweetObjectId = new ObjectId(tweetId);
    const loggedInUserObjectId = new ObjectId(req.user.id);
    const tweet = await getTweetById(db, tweetObjectId);

    if (!tweet) {
      return sendError(res, {
        statusCode: 404,
        code: "TWEET_NOT_FOUND",
        message: "No tweet was found for the provided id.",
      });
    }

    const deleteResult = await db.collection(LIKES_COLLECTION).deleteOne({
      userId: loggedInUserObjectId,
      tweetId: tweetObjectId,
    });

    if (deleteResult.deletedCount === 0) {
      return sendError(res, {
        statusCode: 404,
        code: "TWEET_NOT_LIKED",
        message: "You have not liked this tweet yet.",
      });
    }

    await db.collection(TWEETS_COLLECTION).updateOne(
      { _id: tweetObjectId },
      [
        {
          $set: {
            likesCount: {
              $max: [{ $subtract: ["$likesCount", 1] }, 0],
            },
          },
        },
      ],
    );

    const updatedTweet = await getTweetById(db, tweetObjectId);
    const currentLikesCount = Number(tweet.likesCount) || 0;

    return sendSuccess(res, {
      message: "Tweet unliked successfully.",
      data: {
        tweetId,
        isLiked: false,
        likesCount: updatedTweet?.likesCount ?? Math.max(currentLikesCount - 1, 0),
      },
    });
  } catch (error) {
    next(error);
  }
}
