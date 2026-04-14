const BOOKMARKS_COLLECTION = "bookmarks";
const LIKES_COLLECTION = "likes";

function buildEngagementLookupStage({
  collectionName,
  alias,
  loggedInUserObjectId,
  tweetIdExpression = "$_id",
}) {
  return {
    $lookup: {
      from: collectionName,
      let: {
        tweetId: tweetIdExpression,
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
      as: alias,
    },
  };
}

export function buildViewerEngagementLookupStages(
  loggedInUserObjectId,
  tweetIdExpression = "$_id",
) {
  if (!loggedInUserObjectId) {
    return [
      {
        $addFields: {
          isBookmarked: false,
          isLiked: false,
        },
      },
    ];
  }

  return [
    buildEngagementLookupStage({
      collectionName: BOOKMARKS_COLLECTION,
      alias: "bookmarkMatch",
      loggedInUserObjectId,
      tweetIdExpression,
    }),
    buildEngagementLookupStage({
      collectionName: LIKES_COLLECTION,
      alias: "likeMatch",
      loggedInUserObjectId,
      tweetIdExpression,
    }),
    {
      $addFields: {
        isBookmarked: {
          $gt: [{ $size: "$bookmarkMatch" }, 0],
        },
        isLiked: {
          $gt: [{ $size: "$likeMatch" }, 0],
        },
      },
    },
  ];
}

export function buildTweetCardProjection(overrides = {}) {
  return {
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
    isLiked: 1,
    "user.fullName": 1,
    "user.username": 1,
    "user.profilePic": 1,
    ...overrides,
  };
}

export { BOOKMARKS_COLLECTION, LIKES_COLLECTION };
