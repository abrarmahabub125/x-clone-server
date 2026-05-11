import { ObjectId } from "mongodb";

import { client, getDB } from "../config/db.js";
import { createAppError, createValidationError } from "../utils/apiError.js";
import { sendError, sendSuccess } from "../utils/apiResponse.js";
import {
  BOOKMARKS_COLLECTION,
  LIKES_COLLECTION,
  RETWEETS_COLLECTION,
} from "../utils/tweetAggregation.js";
import { tweetSchema } from "../validations/tweetSchema.js";

const TWEETS_COLLECTION = "tweets";
const TWEET_VIEWS_COLLECTION = "tweetViews";
const PROFILES_COLLECTION = "profiles";
const VIEW_WINDOW_MS = 24 * 60 * 60 * 1000;
let tweetViewIndexesPromise;
let retweetIndexesPromise;

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
    .findOne(
      { _id: tweetObjectId },
      { projection: { likesCount: 1, viewsCount: 1, retweetsCount: 1, userId: 1 } },
    );
}

async function ensureTweetViewIndexes(db) {
  if (!tweetViewIndexesPromise) {
    tweetViewIndexesPromise = Promise.all([
      db.collection(TWEET_VIEWS_COLLECTION).createIndex(
        {
          userId: 1,
          tweetId: 1,
        },
        {
          unique: true,
          name: "tweet_views_user_tweet_unique",
        },
      ),
      db.collection(TWEET_VIEWS_COLLECTION).createIndex(
        {
          expiresAt: 1,
        },
        {
          expireAfterSeconds: 0,
          name: "tweet_views_expire_at_ttl",
        },
      ),
    ]);
  }

  return tweetViewIndexesPromise;
}

async function ensureRetweetIndexes(db) {
  if (!retweetIndexesPromise) {
    retweetIndexesPromise = db.collection(RETWEETS_COLLECTION).createIndex(
      {
        userId: 1,
        tweetId: 1,
      },
      {
        unique: true,
        name: "retweets_user_tweet_unique",
      },
    );
  }

  return retweetIndexesPromise;
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

    await db.collection(TWEETS_COLLECTION).updateOne({ _id: tweetObjectId }, [
      {
        $set: {
          likesCount: {
            $max: [{ $subtract: ["$likesCount", 1] }, 0],
          },
        },
      },
    ]);

    const updatedTweet = await getTweetById(db, tweetObjectId);
    const currentLikesCount = Number(tweet.likesCount) || 0;

    return sendSuccess(res, {
      message: "Tweet unliked successfully.",
      data: {
        tweetId,
        isLiked: false,
        likesCount:
          updatedTweet?.likesCount ?? Math.max(currentLikesCount - 1, 0),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function retweetTweet(req, res, next) {
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

    await ensureRetweetIndexes(db);

    try {
      await db.collection(RETWEETS_COLLECTION).insertOne({
        userId: loggedInUserObjectId,
        tweetId: tweetObjectId,
        createdAt: new Date(),
      });
    } catch (error) {
      if (error?.code === 11000) {
        return sendError(res, {
          statusCode: 409,
          code: "TWEET_ALREADY_RETWEETED",
          message: "You have already reposted this tweet.",
        });
      }

      throw error;
    }

    await db
      .collection(TWEETS_COLLECTION)
      .updateOne({ _id: tweetObjectId }, { $inc: { retweetsCount: 1 } });

    const updatedTweet = await getTweetById(db, tweetObjectId);
    const currentRetweetsCount = Number(tweet.retweetsCount) || 0;

    return sendSuccess(res, {
      statusCode: 201,
      message: "Tweet reposted successfully.",
      data: {
        tweetId,
        isRetweeted: true,
        retweetsCount: updatedTweet?.retweetsCount ?? currentRetweetsCount + 1,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function undoRetweetTweet(req, res, next) {
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

    const deleteResult = await db.collection(RETWEETS_COLLECTION).deleteOne({
      userId: loggedInUserObjectId,
      tweetId: tweetObjectId,
    });

    if (deleteResult.deletedCount === 0) {
      return sendError(res, {
        statusCode: 404,
        code: "TWEET_NOT_RETWEETED",
        message: "You have not reposted this tweet yet.",
      });
    }

    await db.collection(TWEETS_COLLECTION).updateOne({ _id: tweetObjectId }, [
      {
        $set: {
          retweetsCount: {
            $max: [{ $subtract: ["$retweetsCount", 1] }, 0],
          },
        },
      },
    ]);

    const updatedTweet = await getTweetById(db, tweetObjectId);
    const currentRetweetsCount = Number(tweet.retweetsCount) || 0;

    return sendSuccess(res, {
      message: "Repost removed successfully.",
      data: {
        tweetId,
        isRetweeted: false,
        retweetsCount:
          updatedTweet?.retweetsCount ??
          Math.max(currentRetweetsCount - 1, 0),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function recordTweetView(req, res, next) {
  const { tweetId } = req.params;

  if (!validateTweetId(res, tweetId)) {
    return;
  }

  try {
    const db = getDB();
    const tweetObjectId = new ObjectId(tweetId);
    const viewerObjectId = new ObjectId(req.user.id);
    const tweet = await getTweetById(db, tweetObjectId);

    if (!tweet) {
      return sendError(res, {
        statusCode: 404,
        code: "TWEET_NOT_FOUND",
        message: "No tweet was found for the provided id.",
      });
    }

    await ensureTweetViewIndexes(db);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + VIEW_WINDOW_MS);
    let shouldIncrementViewCount = false;

    const expiredViewUpdateResult = await db
      .collection(TWEET_VIEWS_COLLECTION)
      .updateOne(
        {
          userId: viewerObjectId,
          tweetId: tweetObjectId,
          expiresAt: { $lte: now },
        },
        {
          $set: {
            lastViewedAt: now,
            expiresAt,
          },
        },
      );

    if (expiredViewUpdateResult.modifiedCount > 0) {
      shouldIncrementViewCount = true;
    } else {
      try {
        await db.collection(TWEET_VIEWS_COLLECTION).insertOne({
          userId: viewerObjectId,
          tweetId: tweetObjectId,
          lastViewedAt: now,
          expiresAt,
          createdAt: now,
        });

        shouldIncrementViewCount = true;
      } catch (error) {
        if (error?.code !== 11000) {
          throw error;
        }
      }
    }

    if (shouldIncrementViewCount) {
      await db
        .collection(TWEETS_COLLECTION)
        .updateOne({ _id: tweetObjectId }, { $inc: { viewsCount: 1 } });
    }

    const updatedTweet = await getTweetById(db, tweetObjectId);
    const currentViewsCount = Number(tweet.viewsCount) || 0;

    return sendSuccess(res, {
      message: shouldIncrementViewCount
        ? "Tweet view recorded successfully."
        : "Tweet view already recorded in the last 24 hours.",
      data: {
        tweetId,
        isViewCounted: shouldIncrementViewCount,
        viewsCount:
          updatedTweet?.viewsCount ??
          (shouldIncrementViewCount ? currentViewsCount + 1 : currentViewsCount),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteTweet(req, res, next) {
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

    if (tweet.userId?.toString() !== loggedInUserObjectId.toString()) {
      return sendError(res, {
        statusCode: 403,
        code: "TWEET_DELETE_FORBIDDEN",
        message: "You can only delete your own tweets.",
      });
    }

    const session = client.startSession();

    try {
      await session.withTransaction(async () => {
        const deleteTweetResult = await db.collection(TWEETS_COLLECTION).deleteOne(
          { _id: tweetObjectId },
          { session },
        );

        if (deleteTweetResult.deletedCount === 0) {
          throw createAppError({
            statusCode: 404,
            code: "TWEET_NOT_FOUND",
            message: "No tweet was found for the provided id.",
          });
        }

        await db
          .collection(LIKES_COLLECTION)
          .deleteMany({ tweetId: tweetObjectId }, { session });
        await db
          .collection(BOOKMARKS_COLLECTION)
          .deleteMany({ tweetId: tweetObjectId }, { session });
        await db
          .collection(TWEET_VIEWS_COLLECTION)
          .deleteMany({ tweetId: tweetObjectId }, { session });
        await db
          .collection(RETWEETS_COLLECTION)
          .deleteMany({ tweetId: tweetObjectId }, { session });
        await db.collection(PROFILES_COLLECTION).updateOne(
          { userId: loggedInUserObjectId },
          [
            {
              $set: {
                totalPost: {
                  $max: [{ $subtract: ["$totalPost", 1] }, 0],
                },
              },
            },
          ],
          { session },
        );
      });
    } finally {
      await session.endSession();
    }

    return sendSuccess(res, {
      message: "Tweet deleted successfully.",
      data: {
        tweetId,
      },
    });
  } catch (error) {
    next(error);
  }
}
