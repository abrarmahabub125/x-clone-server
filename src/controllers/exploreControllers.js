import { getDB } from "../config/db.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";

export async function findResults(req, res, next) {
  const db = getDB();
  try {
    const { q } = req.query;

    const words = q.split(" ");

    console.log(q, words);

    const userResult = await db
      .collection("profiles")
      .find({
        $or: words.map((word) => ({
          fullName: { $regex: word, $options: "i" },
        })),
      })
      .sort({ fullName: 1 })
      .limit(15)
      .toArray();

    const tweetResult = await db
      .collection("tweets")
      .aggregate([
        {
          $match: words.length
            ? {
                content: {
                  $regex: words.join("|"),
                  $options: "i",
                },
              }
            : {},
        },
        {
          $lookup: {
            from: "profiles", // collection name
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
        {
          $limit: 15,
        },
      ])
      .toArray();

    return sendSuccess(res, {
      message: "Explore search results fetched successfully.",
      data: {
        users: userResult,
        tweets: tweetResult,
      },
    });
  } catch (err) {
    return sendError(res, {
      statusCode: 500,
      code: "EXPLORE_SEARCH_FAILED",
      message: "Unable to fetch explore search results.",
      details: err.message,
    });
  }
}
