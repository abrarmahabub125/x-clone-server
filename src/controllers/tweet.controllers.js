import { ObjectId } from "mongodb";
import { getDB } from "../config/db.js";
import { tweetSchema } from "../validations/tweetSchema.js";

export async function getTweets(req, res, next) {
  res.send("all tweets");
}

//Get one tweet post
export async function getSingleTweet(req, res, next) {
  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    return res.status(401).json({
      status: false,
      message: "Tweet id is not valid!",
    });
  }

  try {
    const db = getDB();
    const tweet = await db
      .collection("tweets")
      .findOne({ _id: new ObjectId(id) });

    res.status(200).json({
      success: true,
      data: tweet,
    });
  } catch (err) {
    next(err);
  }
}

// Get all tweets following user id
export async function getUserTweets(req, res, next) {
  const userId = req.params.userId;

  if (!ObjectId.isValid(userId)) {
    return res.status(401).json({
      status: false,
      message: "User id is not valid!",
    });
  }

  const db = getDB();

  try {
    const result = await db
      .collection("tweets")
      .find({ userId: new ObjectId(userId) })
      .sort({ createAt: 1 })
      .toArray();

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * {
 * id :
 * userId:
 * content :
 * media :
 * likesCount :
 * commentCount :
 * viewsCount :
 * retweetsCount:
 * createdAt :
 * }
 */
export async function createTweet(req, res, next) {
  try {
    const result = await tweetSchema.safeParseAsync(req.body);

    // Check if user data is valid
    if (!result.success) {
      const formattedErrors = result.error.issues.map((error) => ({
        field: error.path[0],
        message: error.message,
      }));

      const err = new Error(JSON.stringify(formattedErrors));
      err.statusCode = 400;
      return;
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

    const db = getDB();
    const tweet = {
      userId: new ObjectId(userId),
      content,
      media,
      likesCount,
      commentsCount,
      viewsCount,
      retweetsCount,
      createdAt: new Date(),
    };

    const dbResponse = await db.collection("tweets").insertOne(tweet);

    if (!dbResponse.insertedId) {
      return res.status(401).json({
        status: false,
        message: "Failed to create new post.",
      });
    }

    res.status(200).json({
      status: true,
      message: "Post created successfully.",
    });
  } catch (err) {
    next(err);
  }
}
